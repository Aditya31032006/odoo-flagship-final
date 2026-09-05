import {
  getInvoicesListRepo,
  getInvoiceDetailRepo,
  getInvoiceMetaRepo,
  createInvoiceRepo,
  recordPaymentRepo,
} from '../repositories/invoice.repository.js';

export const getInvoicesList = async (req, res, next) => {
  try {
    const { status } = req.query;
    const data = await getInvoicesListRepo(status);
    return res.status(200).json({
      success: true,
      data,
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
    const data = await getInvoiceDetailRepo(id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
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
