import { pool } from "../config/database.js";
import {
    CREATE_USER,
    FIND_USER,
    UPDATE_PASSWORD
} from '../queries/auth.query.js'

export const createUserRepo = async (user)=>{
    const client = await pool.connect();
    try {
        await client.query("BEGIN")
        const result = await client.query(CREATE_USER, [user.name, user.email, user.password, user.profile_photo_base64])
        await client.query("COMMIT");
        return result.rows[0]
    } catch (error) {
        console.error("Error in createUserRepo:", error);
        await client.query("ROLLBACK")
        throw error;  // Re-throw the error to be caught by the controller
    } finally {
        client.release();  // Release the client back to the pool
    }
}

export const findUserRepo = async (email)=>{
    const client = await pool.connect();
    try {
        await client.query("BEGIN")
        const result = await client.query(FIND_USER, [email])
        await client.query("COMMIT")
        return result.rows[0]
    } catch (error) {
        console.error("Error in findUserRepo:", error);
        await client.query("ROLLBACK")
        throw error;  // Re-throw the error to be caught by the controller
    } finally {
        client.release();  // Release the client back to the pool
    }
}

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