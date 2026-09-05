import { pool } from "../config/database.js";
import {
    CREATE_USER,
    FIND_USER,
    FIND_USER_BY_ID,
    CREATE_CUSTOMER,
    FIND_CUSTOMER_BY_ID,
    LIST_ACTIVE_CUSTOMERS,
    LINK_CUSTOMER_USER,
    UPDATE_PASSWORD
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
        const companyCheck = await client.query(FIND_CUSTOMER_BY_ID, [company_id]);
        if (companyCheck.rows.length === 0) {
            throw new Error(`Company with ID "${company_id}" was not found.`);
        }
        const existingCompany = companyCheck.rows[0];

        // 2. Create user with assigned role (default 'customer')
        const userResult = await client.query(CREATE_USER, [
            user.name.trim(),
            user.email.toLowerCase().trim(),
            user.password_hash || '',
            user.mobile ? user.mobile.trim() : null,
            role,
            true
        ]);
        const createdUser = userResult.rows[0];

        // 3. Link user to company
        await client.query(LINK_CUSTOMER_USER, [
            existingCompany.id,
            createdUser.id,
            false // is_primary_contact
        ]);

        await client.query("COMMIT");

        return {
            ...createdUser,
            customer_id: existingCompany.id,
            company_name: existingCompany.company_name,
            gst_number: existingCompany.gst_number,
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
            await client.query("UPDATE users SET mobile = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [mobile.trim(), user_id]);
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
        const result = await client.query(LIST_ACTIVE_CUSTOMERS);
        return result.rows;
    } catch (error) {
        console.error("Error in listActiveCompaniesRepo:", error);
        throw error;
    } finally {
        client.release();
    }
};

export const findUserRepo = async (email) => {
    const client = await pool.connect();
    try {
        const result = await client.query(FIND_USER, [email]);
        return result.rows[0];
    } catch (error) {
        console.error("Error in findUserRepo:", error);
        throw error;
    } finally {
        client.release();
    }
};

export const findUserByIdRepo = async (id) => {
    const client = await pool.connect();
    try {
        const result = await client.query(FIND_USER_BY_ID, [id]);
        return result.rows[0];
    } catch (error) {
        console.error("Error in findUserByIdRepo:", error);
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