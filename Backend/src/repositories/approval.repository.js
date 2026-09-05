import { pool } from '../config/database.js';
import {
  GET_APPROVALS_SUMMARY_COUNTS,
  GET_ALL_APPROVALS_LIST,
  GET_APPROVAL_DETAIL_HEADER,
  GET_APPROVAL_FLAGGED_LINES,
  GET_APPROVAL_AUDIT_LOGS,
  GET_APPROVAL_REQUEST_STEPS,
  GET_LATEST_APPROVAL_REQUEST_FOR_QUOTATION,
  UPDATE_APPROVAL_REQUEST_STATUS,
  UPDATE_PENDING_APPROVAL_STEP,
  INSERT_QUOTATION_AUDIT_LOG,
  UPDATE_QUOTATION_STATUS,
} from '../queries/approval.query.js';

export const getApprovalsListRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const countsRes = await client.query(GET_APPROVALS_SUMMARY_COUNTS);
    const listRes = await client.query(GET_ALL_APPROVALS_LIST);
    await client.query('COMMIT');

    return {
      counts: countsRes.rows[0] || {
        pending_count: 0,
        returned_count: 0,
        approved_count: 0,
        total_count: 0,
      },
      approvals: listRes.rows,
    };
  } catch (error) {
    console.error('Error in getApprovalsListRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getApprovalDetailRepo = async (quotationId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const headerRes = await client.query(GET_APPROVAL_DETAIL_HEADER, [quotationId]);
    if (headerRes.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const linesRes = await client.query(GET_APPROVAL_FLAGGED_LINES, [quotationId]);
    const logsRes = await client.query(GET_APPROVAL_AUDIT_LOGS, [quotationId]);
    const stepsRes = await client.query(GET_APPROVAL_REQUEST_STEPS, [quotationId]);

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

    await client.query('COMMIT');

    return {
      header,
      flaggedLines,
      auditLogs,
      steps,
      stepper,
    };
  } catch (error) {
    console.error('Error in getApprovalDetailRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
    await client.query(UPDATE_QUOTATION_STATUS, [newStatus, quotationId]);

    // 3. Update approval request & steps if present
    const reqRes = await client.query(GET_LATEST_APPROVAL_REQUEST_FOR_QUOTATION, [quotationId]);

    if (reqRes.rows.length > 0) {
      const reqId = reqRes.rows[0].id;
      const approvalReqStatus = action === 'approve' ? 'approved' : (action === 'reject' ? 'rejected' : 'returned');

      await client.query(UPDATE_APPROVAL_REQUEST_STATUS, [approvalReqStatus, reqId]);

      // Update pending step
      await client.query(UPDATE_PENDING_APPROVAL_STEP, [
        approvalReqStatus,
        reason || '',
        userId || null,
        reqId,
      ]);
    }

    // 4. Insert Audit Log
    await client.query(INSERT_QUOTATION_AUDIT_LOG, [
      quotationId,
      userId || null,
      auditAction,
      reason || `Quotation ${auditAction} by manager`,
    ]);

    await client.query('COMMIT');

    return await getApprovalDetailRepo(quotationId);
  } catch (error) {
    console.error('Error in submitApprovalDecisionRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
