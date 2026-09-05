import { STATUS_CODES } from '../constants/statusCodes.js';
import {
  getApprovalsListRepo,
  getApprovalDetailRepo,
  submitApprovalDecisionRepo,
} from '../repositories/approval.repository.js';

export const getApprovalsListController = async (req, res, next) => {
  try {
    const data = await getApprovalsListRepo();
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
