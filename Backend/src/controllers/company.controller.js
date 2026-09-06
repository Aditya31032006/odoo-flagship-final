import { STATUS_CODES } from '../constants/statusCodes.js';
import {
  listCompaniesWithPrimaryUserRepo,
  findCompanyByIdRepo,
  createCompanyWithPrimaryUserRepo,
  toggleCompanyStatusRepo,
} from '../repositories/company.repository.js';
import { findUserRepo } from '../repositories/auth.repository.js';
import { hashPassword, generateRandomPassword } from '../utils/password.util.js';
import { addCompanyInvitationJob } from '../jobs/emailQueue.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination.util.js';

/**
 * List all client companies with primary contact info, metrics, and pagination
 */
export const listCompaniesController = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const { page, limit, offset } = parsePaginationParams(req.query, { defaultLimit: 10 });
    const companies = await listCompaniesWithPrimaryUserRepo({ search, status, limit, offset });
    const totalCount = companies[0]?.total_count || 0;
    const pagination = buildPaginationMeta(totalCount, page, limit);

    return res.status(STATUS_CODES.OK).json({
      message: 'Companies retrieved successfully',
      companies,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get details for a specific company by ID
 */
export const getCompanyByIdController = async (req, res, next) => {
  try {
    const companyId = Number(req.params.id);
    const company = await findCompanyByIdRepo(companyId);

    if (!company) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        message: 'Company not found',
      });
    }

    return res.status(STATUS_CODES.OK).json({
      message: 'Company retrieved successfully',
      company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin creates a new client company with an automatic primary user and dispatches credentials email
 */
export const createCompanyController = async (req, res, next) => {
  try {
    const {
      company_name,
      contact_name,
      name,
      email,
      contact_email,
      mobile,
      contact_mobile,
      gst_number,
      billing_address,
      shipping_address,
    } = req.body;

    const finalContactName = (contact_name || name || '').trim();
    const finalEmail = (email || contact_email || '').toLowerCase().trim();
    const finalMobile = (mobile || contact_mobile || '').trim();
    const finalCompanyName = (company_name || '').trim();
    const finalGst = gst_number ? gst_number.toUpperCase().trim() : null;

    if (!finalCompanyName) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        message: 'Company name is required.',
      });
    }

    if (!finalContactName) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        message: 'Contact person name is required.',
      });
    }

    if (!finalEmail) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        message: 'Email address is required.',
      });
    }

    // 1. Check if user already exists
    const existingUser = await findUserRepo(finalEmail);
    if (existingUser) {
      return res.status(STATUS_CODES.CONFLICT).json({
        message: `A user account with email "${finalEmail}" already exists.`,
      });
    }

    // 2. Generate secure random password and hash it
    const tempPassword = generateRandomPassword(10);
    const hashedPassword = await hashPassword(tempPassword);

    // 3. Atomically create company + user + link using common email & mobile
    const newCompany = await createCompanyWithPrimaryUserRepo({
      company: {
        company_name: finalCompanyName,
        gst_number: finalGst,
        email: finalEmail,
        phone: finalMobile || null,
        billing_address: billing_address ? billing_address.trim() : null,
        shipping_address: (shipping_address || billing_address || '').trim() || null,
      },
      user: {
        name: finalContactName,
        email: finalEmail,
        password_hash: hashedPassword,
        mobile: finalMobile || null,
      },
    });

    // 4. Enqueue onboarding email with credentials
    try {
      await addCompanyInvitationJob({
        name: finalContactName,
        email: finalEmail,
        companyName: finalCompanyName,
        tempPassword,
      });
    } catch (mailErr) {
      console.warn('[Company Provisioning] Failed to enqueue invite email:', mailErr.message);
    }

    return res.status(STATUS_CODES.CREATED).json({
      message: `Company "${newCompany.company_name}" created successfully. Credentials email sent to ${finalEmail}.`,
      company: newCompany,
      tempPassword,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle active/inactive status of a company
 */
export const toggleCompanyStatusController = async (req, res, next) => {
  try {
    const companyId = Number(req.params.id);
    const { is_active } = req.body;

    const updated = await toggleCompanyStatusRepo(companyId, Boolean(is_active));
    if (!updated) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        message: 'Company not found',
      });
    }

    return res.status(STATUS_CODES.OK).json({
      message: `Company status updated to ${is_active ? 'Active' : 'Inactive'}`,
      company: updated,
    });
  } catch (error) {
    next(error);
  }
};
