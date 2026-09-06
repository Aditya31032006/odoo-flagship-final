import { STATUS_CODES } from '../constants/statusCodes.js';
import {
  getApprovalsListRepo,
  getApprovalDetailRepo,
  submitApprovalDecisionRepo,
} from '../repositories/approval.repository.js';

export const getApprovalsListController = async (req, res, next) => {
  try {
    const role = req.user?.role || 'admin';
    const userId = req.user?.id || null;
    const data = await getApprovalsListRepo({ role, userId });
    return res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getApprovalDetailController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const detail = await getApprovalDetailRepo(id);
    if (!detail) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Approval record not found' });
    }
    return res.status(STATUS_CODES.OK).json({ success: true, data: detail });
  } catch (error) {
    next(error);
  }
};

export const submitApprovalDecisionController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role || 'admin';

    if (!id || isNaN(Number(id))) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Invalid quotation ID. Quotation must be saved before submitting an approval decision.',
      });
    }

    if (!action || !['approve', 'return_revision', 'reject'].includes(action)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Invalid approval action. Must be approve, return_revision, or reject.',
      });
    }

    const updatedDetail = await submitApprovalDecisionRepo({
      quotationId: id,
      action,
      reason,
      userId,
      userRole,
    });

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: `Quotation ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'returned for revision'} successfully.`,
      data: updatedDetail,
    });
  } catch (error) {
    next(error);
  }
};
