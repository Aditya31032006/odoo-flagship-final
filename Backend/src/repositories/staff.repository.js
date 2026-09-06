import { pool } from '../config/database.js';
import {
    LIST_STAFF_MEMBERS,
    FIND_STAFF_BY_ID,
    CREATE_STAFF_USER,
    UPDATE_STAFF_STATUS,
    UPDATE_STAFF_DETAILS,
    DELETE_STAFF_USER
} from '../queries/staff.query.js';

export const listStaffRepo = async ({ search, role, status, limit, offset } = {}) => {
    const client = await pool.connect();
    try {
        const conditions = ["role != 'customer'"];
        const values = [];
        let paramIndex = 1;

        if (search) {
            conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR mobile ILIKE $${paramIndex})`);
            values.push(`%${search}%`);
            paramIndex++;
        }

        if (role && role !== 'all') {
            conditions.push(`role = $${paramIndex}`);
            values.push(role);
            paramIndex++;
        }

        if (status && status !== 'all') {
            const isActive = status === 'active' || status === true || status === 'true';
            conditions.push(`is_active = $${paramIndex}`);
            values.push(isActive);
            paramIndex++;
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        let paginationClause = '';
        if (limit !== undefined && offset !== undefined) {
            paginationClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            values.push(limit, offset);
        }

        const query = `
            SELECT 
                id, 
                name, 
                email, 
                mobile, 
                role, 
                is_active, 
                created_at, 
                updated_at,
                COUNT(*) OVER()::INT AS total_count
            FROM users
            ${whereClause}
            ORDER BY created_at DESC
            ${paginationClause}
        `;

        const result = await client.query(query, values);
        return result.rows;
    } catch (error) {
        console.error("Error in listStaffRepo:", error);
        throw error;
    } finally {
        client.release();
    }
};

export const findStaffByIdRepo = async (id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(FIND_STAFF_BY_ID, [id]);
        await client.query("COMMIT");
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error in findStaffByIdRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const createStaffRepo = async ({ name, email, password_hash, mobile, role }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(CREATE_STAFF_USER, [
            name.trim(),
            email.toLowerCase().trim(),
            password_hash,
            mobile ? mobile.trim() : null,
            role,
            true // is_active
        ]);
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        console.error("Error in createStaffRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const updateStaffStatusRepo = async (id, isActive) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(UPDATE_STAFF_STATUS, [isActive, id]);
        await client.query("COMMIT");
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error in updateStaffStatusRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const updateStaffDetailsRepo = async (id, { name, mobile, role }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(UPDATE_STAFF_DETAILS, [
            name ? name.trim() : null,
            mobile ? mobile.trim() : null,
            role || null,
            id
        ]);
        await client.query("COMMIT");
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error in updateStaffDetailsRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const deleteStaffRepo = async (id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(DELETE_STAFF_USER, [id]);
        await client.query("COMMIT");
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error in deleteStaffRepo:", error);
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
