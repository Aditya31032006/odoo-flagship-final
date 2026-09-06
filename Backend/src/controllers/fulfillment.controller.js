import { STATUS_CODES } from '../constants/statusCodes.js';
import {
  getFulfillmentListRepo,
  getFulfillmentMetaRepo,
  getFulfillmentDetailRepo,
  acceptSuggestedSplitRepo,
  saveManualOverrideSplitRepo,
  completeShipmentRepo,
  createWarehouseStockRepo,
  updateWarehouseStockRepo,
  deleteWarehouseStockRepo,
  createOrderRepo,
  updateOrderRepo,
  deleteOrderRepo,
} from '../repositories/fulfillment.repository.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination.util.js';

export const getFulfillmentListController = async (req, res, next) => {
  try {
    const { search } = req.query;
    const { page, limit, offset } = parsePaginationParams(req.query, { defaultLimit: 10 });
    const data = await getFulfillmentListRepo({ search, limit, offset });
    const totalCount = data.orders[0]?.total_count || 0;
    const pagination = buildPaginationMeta(totalCount, page, limit);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getFulfillmentMetaController = async (req, res, next) => {
  try {
    const data = await getFulfillmentMetaRepo();
    return res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getFulfillmentDetailController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const detail = await getFulfillmentDetailRepo(id);
    if (!detail) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: `Fulfillment record for order '${id}' not found`,
      });
    }
    return res.status(STATUS_CODES.OK).json({ success: true, data: detail });
  } catch (error) {
    next(error);
  }
};

export const acceptSuggestedSplitController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await acceptSuggestedSplitRepo(id);
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Suggested warehouse fulfillment split accepted successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const saveManualOverrideSplitController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { splits, backorderQty } = req.body;
    const updated = await saveManualOverrideSplitRepo(id, { splits, backorderQty });
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Manual fulfillment split and backorder saved successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const completeShipmentController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await completeShipmentRepo(id);
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Shipment marked as complete. Order moved to Payment stage.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Warehouse Stock CRUD Controllers
export const createStockController = async (req, res, next) => {
  try {
    const data = await createWarehouseStockRepo(req.body);
    return res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Warehouse stock added successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStockController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await updateWarehouseStockRepo(id, req.body);
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Warehouse stock updated successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStockController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await deleteWarehouseStockRepo(id);
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Warehouse stock deleted successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Orders CRUD Controllers
export const createOrderController = async (req, res, next) => {
  try {
    const data = await createOrderRepo(req.body);
    return res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Order created for fulfillment successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await updateOrderRepo(id, req.body);
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Order updated successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrderController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await deleteOrderRepo(id);
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Order deleted successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
