import {
  getInvoicesListRepo,
  getInvoiceDetailRepo,
  getInvoiceMetaRepo,
  createInvoiceRepo,
  recordPaymentRepo,
} from '../repositories/invoice.repository.js';
import { resolveUserCustomerId } from './quotation.controller.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination.util.js';

export const getInvoicesList = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const { page, limit, offset } = parsePaginationParams(req.query, { defaultLimit: 10 });
    const user = req.user;
    let customerId = null;

    if (user?.role === 'customer') {
      customerId = await resolveUserCustomerId(user);
      if (!customerId) {
        return res.status(200).json({
          success: true,
          data: {
            invoices: [],
            statusCounts: { unpaid_count: 0, paid_count: 0, partially_paid_count: 0, total_count: 0 },
          },
          pagination: buildPaginationMeta(0, page, limit),
        });
      }
    }

    const data = await getInvoicesListRepo({
      statusFilter: status,
      customerId,
      search,
      limit,
      offset,
    });

    const totalCount = data.invoices[0]?.total_count || 0;
    const pagination = buildPaginationMeta(totalCount, page, limit);

    return res.status(200).json({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceMeta = async (req, res, next) => {
  try {
    const data = await getInvoiceMetaRepo();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const data = await getInvoiceDetailRepo(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (user?.role === 'customer') {
      const customerId = await resolveUserCustomerId(user);
      if (!customerId || String(data.invoice.customer_id) !== String(customerId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view invoices for your own organization.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const { customerId, orderId, dueDate, items } = req.body;
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Customer is required to create an invoice',
      });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product line item is required',
      });
    }

    const created = await createInvoiceRepo({
      customerId,
      orderId,
      dueDate,
      items,
    });

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, transactionReference } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid payment amount is required',
      });
    }

    const result = await recordPaymentRepo({
      invoiceId: id,
      amount,
      paymentMethod,
      transactionReference,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
