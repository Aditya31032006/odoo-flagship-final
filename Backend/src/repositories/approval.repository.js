import { pool } from '../config/database.js';
import {
  GET_APPROVALS_SUMMARY_COUNTS,
  GET_ALL_APPROVALS_LIST_BY_ROLE,
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

export const getApprovalsListRepo = async ({
  role = 'admin',
  userId = null,
  search = null,
  limit = null,
  offset = null,
} = {}) => {
  const client = await pool.connect();
  try {
    const countsRes = await client.query(GET_APPROVALS_SUMMARY_COUNTS);

    let query = GET_ALL_APPROVALS_LIST_BY_ROLE;
    const params = [role || 'admin', search ? search.trim() : null];

    if (limit !== null && offset !== null) {
      params.push(limit, offset);
      query += ` LIMIT $3 OFFSET $4`;
    }

    const listRes = await client.query(query, params);

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

    const isApprovedOrConfirmed = ['approved', 'confirmed', 'sent'].includes(header.status);
    const isPending = header.status === 'pending_approval';
    const isRejected = header.status === 'rejected';

    const smStep = steps.find((s) => s.approver_role === 'sales_manager');
    const finStep = steps.find((s) => s.approver_role === 'finance');

    const smCompleted = smStep?.step_status === 'approved' || isApprovedOrConfirmed;
    const smRejected = smStep?.step_status === 'rejected';
    const smActive = isPending && smStep?.step_status === 'pending';

    const stepper = [
      {
        id: 'submitted',
        label: 'Submitted',
        status: 'completed',
      },
      {
        id: 'sales_manager',
        label: 'Sales Manager (Stage 1)',
        status: smCompleted ? 'completed' : smRejected ? 'rejected' : smActive ? 'active' : (isPending ? 'active' : 'pending'),
      },
    ];

    if (finStep || Number(header.blended_risk_score) > 5.00) {
      const finCompleted = finStep?.step_status === 'approved' || isApprovedOrConfirmed;
      const finRejected = finStep?.step_status === 'rejected';
      const finActive = isPending && smCompleted && finStep?.step_status === 'pending';

      stepper.push({
        id: 'finance',
        label: 'Finance (Stage 2)',
        status: finCompleted ? 'completed' : finRejected ? 'rejected' : finActive ? 'active' : 'pending',
      });
    }

    stepper.push({
      id: 'confirmed',
      label: 'Approved & Active',
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
  userRole = 'admin',
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch latest approval request & steps
    const reqRes = await client.query(
      `SELECT id, status FROM approval_requests WHERE quotation_id = $1 ORDER BY requested_at DESC LIMIT 1`,
      [quotationId]
    );

    let reqId = reqRes.rows[0]?.id || null;
    let steps = [];

    if (reqId) {
      const stepsRes = await client.query(
        `SELECT id, step_number, approver_role, status, comments, acted_at 
         FROM approval_steps 
         WHERE approval_request_id = $1 
         ORDER BY step_number ASC`,
        [reqId]
      );
      steps = stepsRes.rows;
    }

    if (action === 'return_revision') {
      if (reqId) {
        await client.query(
          `UPDATE approval_steps SET status = 'returned', comments = $1, acted_at = NOW(), approver_user_id = $2 
           WHERE approval_request_id = $3 AND status = 'pending'`,
          [reason || 'Returned for revision', userId || null, reqId]
        );
        await client.query(
          `UPDATE approval_requests SET status = 'returned', completed_at = NOW() WHERE id = $1`,
          [reqId]
        );
      }
      await client.query(UPDATE_QUOTATION_STATUS, ['draft', quotationId]);
      await client.query(INSERT_QUOTATION_AUDIT_LOG, [
        quotationId,
        userId || null,
        'returned',
        reason || 'Returned for discount revision',
      ]);
    } else if (action === 'reject') {
      if (reqId) {
        await client.query(
          `UPDATE approval_steps SET status = 'rejected', comments = $1, acted_at = NOW(), approver_user_id = $2 
           WHERE approval_request_id = $3 AND status = 'pending'`,
          [reason || 'Quotation terms rejected', userId || null, reqId]
        );
        await client.query(
          `UPDATE approval_requests SET status = 'rejected', completed_at = NOW() WHERE id = $1`,
          [reqId]
        );
      }
      await client.query(UPDATE_QUOTATION_STATUS, ['rejected', quotationId]);
      await client.query(INSERT_QUOTATION_AUDIT_LOG, [
        quotationId,
        userId || null,
        'rejected',
        reason || 'Quotation rejected',
      ]);
    } else if (action === 'approve') {
      // Find the current pending step in sequence
      const currentPendingStep = steps.find((s) => s.status === 'pending');

      if (currentPendingStep) {
        // Approve this specific step
        await client.query(
          `UPDATE approval_steps SET status = 'approved', comments = $1, acted_at = NOW(), approver_user_id = $2 
           WHERE id = $3`,
          [reason || 'Approved', userId || null, currentPendingStep.id]
        );

        // Check if there is another pending step after this one (e.g. Stage 2 Finance)
        const remainingPendingSteps = steps.filter(
          (s) => s.id !== currentPendingStep.id && s.step_number > currentPendingStep.step_number && s.status === 'pending'
        );

        if (remainingPendingSteps.length > 0) {
          // Quotation REMAINS in pending_approval! Stage 2 (Finance) is now ready.
          const nextRoleName = remainingPendingSteps[0].approver_role === 'finance' ? 'Finance' : 'Stage 2';
          await client.query(INSERT_QUOTATION_AUDIT_LOG, [
            quotationId,
            userId || null,
            'approved',
            reason || `Stage 1 approved by Sales Manager. Forwarded to ${nextRoleName} (Stage 2) for final clearance.`,
          ]);
        } else {
          // All steps completed! Full governance clearance granted!
          if (reqId) {
            await client.query(
              `UPDATE approval_requests SET status = 'approved', completed_at = NOW() WHERE id = $1`,
              [reqId]
            );
          }
          await client.query(UPDATE_QUOTATION_STATUS, ['approved', quotationId]);
          await client.query(INSERT_QUOTATION_AUDIT_LOG, [
            quotationId,
            userId || null,
            'approved',
            reason || 'Final approval granted. Quotation approved for ordering.',
          ]);
        }
      } else {
        // Direct approve
        await client.query(UPDATE_QUOTATION_STATUS, ['approved', quotationId]);
        await client.query(INSERT_QUOTATION_AUDIT_LOG, [
          quotationId,
          userId || null,
          'approved',
          reason || 'Quotation approved',
        ]);
      }
    }

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
