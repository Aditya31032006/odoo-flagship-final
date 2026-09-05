import { pool } from '../config/database.js';
import {
    LIST_STAFF_MEMBERS,
    FIND_STAFF_BY_ID,
    CREATE_STAFF_USER,
    UPDATE_STAFF_STATUS,
    UPDATE_STAFF_DETAILS,
    DELETE_STAFF_USER
} from '../queries/staff.query.js';

export const listStaffRepo = async () => {
    const client = await pool.connect();
    try {
        const result = await client.query(LIST_STAFF_MEMBERS);
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
        const result = await client.query(FIND_STAFF_BY_ID, [id]);
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error in findStaffByIdRepo:", error);
        throw error;
    } finally {
        client.release();
    }
};

export const createStaffRepo = async ({ name, email, password_hash, mobile, role }) => {
    const client = await pool.connect();
    try {
        const result = await client.query(CREATE_STAFF_USER, [
            name.trim(),
            email.toLowerCase().trim(),
            password_hash,
            mobile ? mobile.trim() : null,
            role,
            true // is_active
        ]);
        return result.rows[0];
    } catch (error) {
        console.error("Error in createStaffRepo:", error);
        throw error;
    } finally {
        client.release();
    }
};

export const updateStaffStatusRepo = async (id, isActive) => {
    const client = await pool.connect();
    try {
        const result = await client.query(UPDATE_STAFF_STATUS, [isActive, id]);
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error in updateStaffStatusRepo:", error);
        throw error;
    } finally {
        client.release();
    }
};

export const updateStaffDetailsRepo = async (id, { name, mobile, role }) => {
    const client = await pool.connect();
    try {
        const result = await client.query(UPDATE_STAFF_DETAILS, [
            name ? name.trim() : null,
            mobile ? mobile.trim() : null,
            role || null,
            id
        ]);
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error in updateStaffDetailsRepo:", error);
        throw error;
    } finally {
        client.release();
    }
};

export const deleteStaffRepo = async (id) => {
    const client = await pool.connect();
    try {
        const result = await client.query(DELETE_STAFF_USER, [id]);
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error in deleteStaffRepo:", error);
        throw error;
    } finally {
        client.release();
    }
};
