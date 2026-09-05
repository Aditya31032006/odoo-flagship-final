import { pool } from "../config/database.js";
import {
    CREATE_USER,
    FIND_USER,
    FIND_USER_BY_IDENTIFIER,
    FIND_USER_BY_ID,
    GET_USER_FULL_PROFILE,
    UPDATE_USER_BASIC_PROFILE,
    UPDATE_CUSTOMER_DETAILS,
    CREATE_CUSTOMER,
    FIND_CUSTOMER_BY_ID,
    LIST_ACTIVE_CUSTOMERS,
    LINK_CUSTOMER_USER,
    UPDATE_PASSWORD,
    FIND_USER_WITH_PASSWORD_BY_ID,
    UPDATE_USER_PASSWORD_BY_ID,
    UPDATE_USER_MOBILE,
    RESOLVE_CUSTOMER_USER_LINK,
    FIND_CUSTOMER_BY_EMAIL,
    GET_CUSTOMER_NOTIFICATION_CONTACT,
} from '../queries/auth.query.js';

/**
 * Basic user creation (used for OAuth or direct user records)
 */
export const createUserRepo = async (user) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const role = user.role || 'customer';
        const isActive = user.is_active !== undefined ? user.is_active : true;

        const userResult = await client.query(CREATE_USER, [
            user.name.trim(),
            user.email.toLowerCase().trim(),
            user.password_hash || user.password || '',
            user.mobile ? user.mobile.trim() : null,
            role,
            isActive
        ]);

        await client.query("COMMIT");
        return userResult.rows[0];
    } catch (error) {
        console.error("Error in createUserRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Register as a new Company (creates company + primary contact user)
 */
export const registerCompanyWithPrimaryUserRepo = async ({ company, user }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Create company in customers table
        const customerResult = await client.query(CREATE_CUSTOMER, [
            company.company_name.trim(),
            company.gst_number ? company.gst_number.trim() : null,
            company.email ? company.email.trim() : user.email.trim(),
            company.phone ? company.phone.trim() : user.mobile || null,
            company.billing_address ? company.billing_address.trim() : null,
            company.shipping_address ? company.shipping_address.trim() : null
        ]);
        const createdCustomer = customerResult.rows[0];

        // 2. Create primary user with role 'customer'
        const userResult = await client.query(CREATE_USER, [
            user.name.trim(),
            user.email.toLowerCase().trim(),
            user.password_hash || '',
            user.mobile ? user.mobile.trim() : null,
            'customer',
            true
        ]);
        const createdUser = userResult.rows[0];

        // 3. Link customer to user as primary contact
        await client.query(LINK_CUSTOMER_USER, [
            createdCustomer.id,
            createdUser.id,
            true // is_primary_contact
        ]);

        await client.query("COMMIT");

        return {
            ...createdUser,
            customer_id: createdCustomer.id,
            company_name: createdCustomer.company_name,
            gst_number: createdCustomer.gst_number,
            is_primary_contact: true
        };
    } catch (error) {
        console.error("Error in registerCompanyWithPrimaryUserRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Register as an Employee under an existing company (requires valid company_id)
 */
export const registerEmployeeUnderCompanyRepo = async ({ company_id, user, role = 'customer' }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Verify company exists
        const companyResult = await client.query(FIND_CUSTOMER_BY_ID, [company_id]);
        if (companyResult.rows.length === 0) {
            throw new Error(`Company with ID "${company_id}" was not found.`);
        }
        const targetCompany = companyResult.rows[0];

        // 2. Create employee user
        const userResult = await client.query(CREATE_USER, [
            user.name.trim(),
            user.email.toLowerCase().trim(),
            user.password_hash || '',
            user.mobile ? user.mobile.trim() : null,
            role,
            true
        ]);
        const createdUser = userResult.rows[0];

        // 3. Link customer to user (not primary contact by default)
        await client.query(LINK_CUSTOMER_USER, [
            targetCompany.id,
            createdUser.id,
            false // is_primary_contact
        ]);

        await client.query("COMMIT");

        return {
            ...createdUser,
            customer_id: targetCompany.id,
            company_name: targetCompany.company_name,
            gst_number: targetCompany.gst_number,
            is_primary_contact: false
        };
    } catch (error) {
        console.error("Error in registerEmployeeUnderCompanyRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Complete Onboarding for an existing user (e.g. after Google OAuth)
 */
export const completeUserOnboardingRepo = async ({ user_id, register_type, company, company_id, mobile }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Update mobile if provided
        if (mobile) {
            await client.query(UPDATE_USER_MOBILE, [mobile.trim(), user_id]);
        }

        let customerId = null;
        let companyName = null;
        let gstNumber = null;
        let isPrimary = false;

        if (register_type === 'company') {
            const customerResult = await client.query(CREATE_CUSTOMER, [
                company.company_name.trim(),
                company.gst_number ? company.gst_number.trim() : null,
                company.email || null,
                company.phone || mobile || null,
                company.billing_address ? company.billing_address.trim() : null,
                company.shipping_address ? company.shipping_address.trim() : null
            ]);
            customerId = customerResult.rows[0].id;
            companyName = customerResult.rows[0].company_name;
            gstNumber = customerResult.rows[0].gst_number;
            isPrimary = true;

            await client.query(LINK_CUSTOMER_USER, [customerId, user_id, true]);
        } else if (register_type === 'employee') {
            const companyCheck = await client.query(FIND_CUSTOMER_BY_ID, [company_id]);
            if (companyCheck.rows.length === 0) {
                throw new Error(`Company with ID "${company_id}" was not found.`);
            }
            customerId = companyCheck.rows[0].id;
            companyName = companyCheck.rows[0].company_name;
            gstNumber = companyCheck.rows[0].gst_number;
            isPrimary = false;

            await client.query(LINK_CUSTOMER_USER, [customerId, user_id, false]);
        }

        await client.query("COMMIT");

        // Return updated user profile
        const freshUser = await findUserByIdRepo(user_id);
        return freshUser;
    } catch (error) {
        console.error("Error in completeUserOnboardingRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const listActiveCompaniesRepo = async () => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(LIST_ACTIVE_CUSTOMERS);
        await client.query("COMMIT");
        return result.rows;
    } catch (error) {
        console.error("Error in listActiveCompaniesRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const findUserRepo = async (email) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(FIND_USER, [email]);
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        console.error("Error in findUserRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const findUserByIdentifierRepo = async (identifier) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const cleanIdentifier = identifier.trim();
        const result = await client.query(FIND_USER_BY_IDENTIFIER, [cleanIdentifier]);
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        console.error("Error in findUserByIdentifierRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const findUserByIdRepo = async (id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(FIND_USER_BY_ID, [id]);
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        console.error("Error in findUserByIdRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Fetch complete user profile with joined customer/company details
 */
export const getUserFullProfileRepo = async (id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(GET_USER_FULL_PROFILE, [id]);
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        console.error("Error in getUserFullProfileRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Update user editable profile fields and company details (if primary contact)
 */
export const updateUserProfileRepo = async (userId, { name, mobile, company_name, gst_number, billing_address, shipping_address }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Update user fields (name, mobile)
        const updatedUserResult = await client.query(UPDATE_USER_BASIC_PROFILE, [
            name ? name.trim() : null,
            mobile ? mobile.trim() : null,
            userId
        ]);
        const updatedUser = updatedUserResult.rows[0];

        // 2. Check if user is linked to a customer/company
        const profileCheck = await client.query(GET_USER_FULL_PROFILE, [userId]);
        const currentProfile = profileCheck.rows[0];

        // 3. Update company details ONLY if user email matches organization email
        const isCompanyOwner = Boolean(
            currentProfile?.company_email &&
            currentProfile?.email &&
            currentProfile.email.trim().toLowerCase() === currentProfile.company_email.trim().toLowerCase()
        );

        if (currentProfile?.customer_id && isCompanyOwner) {
            await client.query(UPDATE_CUSTOMER_DETAILS, [
                company_name ? company_name.trim() : null,
                gst_number ? gst_number.trim() : null,
                billing_address ? billing_address.trim() : null,
                shipping_address ? shipping_address.trim() : null,
                currentProfile.customer_id
            ]);
        }

        await client.query("COMMIT");

        // Return refreshed profile
        const freshProfile = await client.query(GET_USER_FULL_PROFILE, [userId]);
        return freshProfile.rows[0];
    } catch (error) {
        console.error("Error in updateUserProfileRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const findUserWithPasswordByIdRepo = async (id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(FIND_USER_WITH_PASSWORD_BY_ID, [id]);
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        console.error("Error in findUserWithPasswordByIdRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const changeUserPasswordByIdRepo = async (id, password_hash) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(UPDATE_USER_PASSWORD_BY_ID, [password_hash, id]);
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        console.error("Error in changeUserPasswordByIdRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const updateUserPasswordRepo = async (email, password_hash) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(UPDATE_PASSWORD, [password_hash, email]);
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        console.error("Error in updateUserPasswordRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const resolveCustomerUserLinkIdRepo = async (userId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(RESOLVE_CUSTOMER_USER_LINK, [userId]);
        await client.query("COMMIT");
        return result.rows[0]?.customer_id || null;
    } catch (error) {
        console.error("Error in resolveCustomerUserLinkIdRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const findCustomerByEmailRepo = async (email) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(FIND_CUSTOMER_BY_EMAIL, [email]);
        await client.query("COMMIT");
        return result.rows[0]?.id || null;
    } catch (error) {
        console.error("Error in findCustomerByEmailRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const getCustomerNotificationContactRepo = async (customerId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(GET_CUSTOMER_NOTIFICATION_CONTACT, [customerId]);
        await client.query("COMMIT");
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error in getCustomerNotificationContactRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};