import { STATUS_CODES } from '../constants/statusCodes.js';
import {
    listStaffRepo,
    findStaffByIdRepo,
    createStaffRepo,
    updateStaffStatusRepo,
    updateStaffDetailsRepo,
    deleteStaffRepo
} from '../repositories/staff.repository.js';
import { findUserRepo } from '../repositories/auth.repository.js';
import { hashPassword, generateRandomPassword } from '../utils/password.util.js';
import { addStaffInvitationJob } from '../jobs/emailQueue.js';

/**
 * List all internal staff members (excluding customers)
 */
export const listStaffController = async (req, res, next) => {
    try {
        const staff = await listStaffRepo();
        return res.status(STATUS_CODES.OK).json({
            message: 'Staff list retrieved successfully',
            staff
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Invite a new staff member with an assigned internal role and generated password
 */
export const createStaffController = async (req, res, next) => {
    try {
        const { name, email, mobile, role } = req.body;

        // 1. Check if user already exists
        const existingUser = await findUserRepo(email);
        if (existingUser) {
            return res.status(STATUS_CODES.CONFLICT).json({
                message: `A user account with email "${email}" already exists.`
            });
        }

        // 2. Generate secure random temporary password
        const tempPassword = generateRandomPassword(10);
        const hashedPassword = await hashPassword(tempPassword);

        // 3. Create staff user
        const newStaff = await createStaffRepo({
            name,
            email,
            password_hash: hashedPassword,
            mobile,
            role
        });

        // 4. Enqueue invitation email job with temporary credentials
        try {
            await addStaffInvitationJob({
                name,
                email,
                role,
                tempPassword
            });
        } catch (mailErr) {
            console.warn('[Staff Invite] Failed to enqueue invite email:', mailErr.message);
        }

        return res.status(STATUS_CODES.CREATED).json({
            message: `Staff member ${newStaff.name} created successfully. An invitation email has been sent.`,
            staff: newStaff,
            tempPassword // Also returned in response for admin convenience
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle staff member active/inactive status
 */
export const toggleStaffStatusController = async (req, res, next) => {
    try {
        const staffId = Number(req.params.id);
        const { is_active } = req.body;

        if (req.user?.id === staffId && is_active === false) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                message: 'You cannot deactivate your own admin account.'
            });
        }

        const existing = await findStaffByIdRepo(staffId);
        if (!existing) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                message: 'Staff member not found.'
            });
        }

        const updated = await updateStaffStatusRepo(staffId, is_active);
        return res.status(STATUS_CODES.OK).json({
            message: `Staff member status updated to ${is_active ? 'Active' : 'Inactive'}.`,
            staff: updated
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update staff member name, mobile, and role
 */
export const updateStaffController = async (req, res, next) => {
    try {
        const staffId = Number(req.params.id);
        const { name, mobile, role } = req.body;

        const existing = await findStaffByIdRepo(staffId);
        if (!existing) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                message: 'Staff member not found.'
            });
        }

        const updated = await updateStaffDetailsRepo(staffId, { name, mobile, role });
        return res.status(STATUS_CODES.OK).json({
            message: 'Staff member details updated successfully.',
            staff: updated
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a staff member
 */
export const deleteStaffController = async (req, res, next) => {
    try {
        const staffId = Number(req.params.id);

        if (req.user?.id === staffId) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                message: 'You cannot delete your own admin account.'
            });
        }

        const existing = await findStaffByIdRepo(staffId);
        if (!existing) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                message: 'Staff member not found.'
            });
        }

        const deleted = await deleteStaffRepo(staffId);
        return res.status(STATUS_CODES.OK).json({
            message: `Staff member ${deleted.name} (${deleted.email}) deleted successfully.`,
            staff: deleted
        });
    } catch (error) {
        next(error);
    }
};
