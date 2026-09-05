import { pool } from '../config/database.js';
import {
  GET_APPROVALS_SUMMARY_COUNTS,
  GET_ALL_APPROVALS_LIST,
  GET_APPROVAL_DETAIL_HEADER,
  GET_APPROVAL_FLAGGED_LINES,
  GET_APPROVAL_AUDIT_LOGS,
  GET_APPROVAL_REQUEST_STEPS,
} from '../queries/approval.query.js';

export const getApprovalsListRepo = async () => {
  const [countsRes, listRes] = await Promise.all([
    pool.query(GET_APPROVALS_SUMMARY_COUNTS),
    pool.query(GET_ALL_APPROVALS_LIST),
  ]);

  return {
    counts: countsRes.rows[0] || {
      pending_count: 0,
      returned_count: 0,
      approved_count: 0,
      total_count: 0,
    },
    approvals: listRes.rows,
  };
};

export const getApprovalDetailRepo = async (quotationId) => {
  const [headerRes, linesRes, logsRes, stepsRes] = await Promise.all([
    pool.query(GET_APPROVAL_DETAIL_HEADER, [quotationId]),
    pool.query(GET_APPROVAL_FLAGGED_LINES, [quotationId]),
    pool.query(GET_APPROVAL_AUDIT_LOGS, [quotationId]),
    pool.query(GET_APPROVAL_REQUEST_STEPS, [quotationId]),
  ]);

  if (headerRes.rows.length === 0) {
    return null;
  }

  const header = headerRes.rows[0];
  const flaggedLines = linesRes.rows;
  const auditLogs = logsRes.rows;
  const steps = stepsRes.rows;

  // Build stepper progression
  // Stepper flow: Submitted -> Sales Manager -> Finance (if high risk) -> Confirmed
  const isHighRisk = Number(header.blended_risk_score) > 10 || header.risk_level === 'HIGH';
  const isApprovedOrConfirmed = ['approved', 'confirmed', 'sent'].includes(header.status);
  const isPending = header.status === 'pending_approval';
  const isRejected = header.status === 'rejected';

  const stepper = [
    {
      id: 'submitted',
      label: 'Submitted',
      status: 'completed',
    },
    {
      id: 'sales_manager',
      label: 'Sales Manager',
      status: isPending ? 'active' : (isApprovedOrConfirmed ? 'completed' : (isRejected ? 'rejected' : 'pending')),
    },
  ];

  if (isHighRisk || steps.some((s) => s.approver_role === 'finance')) {
    stepper.push({
      id: 'finance',
      label: 'Finance',
      status: isApprovedOrConfirmed ? 'completed' : 'pending',
    });
  }

  stepper.push({
    id: 'confirmed',
    label: 'Confirmed',
    status: isApprovedOrConfirmed ? 'completed' : 'pending',
  });

  return {
    header,
    flaggedLines,
    auditLogs,
    steps,
    stepper,
  };
};

export const submitApprovalDecisionRepo = async ({
  quotationId,
  action, // 'approve', 'return_revision', 'reject'
  reason = '',
  userId,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Determine new quotation status
    let newStatus = 'approved';
    let auditAction = 'approved';

    if (action === 'approve') {
      newStatus = 'approved';
      auditAction = 'approved';
    } else if (action === 'return_revision') {
      newStatus = 'draft';
      auditAction = 'returned';
    } else if (action === 'reject') {
      newStatus = 'rejected';
      auditAction = 'rejected';
    }

    // 2. Update quotation
    await client.query(
      `UPDATE quotations 
       SET status = $1::quotation_status_enum, updated_at = NOW() 
       WHERE id = $2`,
      [newStatus, quotationId]
    );

    // 3. Update approval request & steps if present
    const reqRes = await client.query(
      `SELECT id FROM approval_requests 
       WHERE quotation_id = $1 
       ORDER BY requested_at DESC LIMIT 1`,
      [quotationId]
    );

    if (reqRes.rows.length > 0) {
      const reqId = reqRes.rows[0].id;
      const approvalReqStatus = action === 'approve' ? 'approved' : (action === 'reject' ? 'rejected' : 'returned');

      await client.query(
        `UPDATE approval_requests 
         SET status = $1::approval_status_enum, completed_at = NOW() 
         WHERE id = $2`,
        [approvalReqStatus, reqId]
      );

      // Update pending step
      await client.query(
        `UPDATE approval_steps 
         SET status = $1::approval_status_enum, comments = $2, acted_at = NOW(), approver_user_id = $3
         WHERE approval_request_id = $4 AND status = 'pending'`,
        [approvalReqStatus, reason || '', userId || null, reqId]
      );
    }

    // 4. Insert Audit Log
    await client.query(
      `INSERT INTO quotation_audit_logs (
        quotation_id, user_id, action, reason, created_at
      ) VALUES ($1, $2, $3::approval_action_enum, $4, NOW())`,
      [quotationId, userId || null, auditAction, reason || `Quotation ${auditAction} by manager`]
    );

    await client.query('COMMIT');

    return await getApprovalDetailRepo(quotationId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
