import { pool } from '../config/database.js';
import { FIND_ADMIN_USER, CREATE_USER } from '../queries/auth.query.js';
import { hashPassword } from './password.util.js';

/**
 * Automatically seeds a default Admin user if none exists in the database
 */
export const seedAdminUser = async () => {
    const client = await pool.connect();
    try {
        const adminCheck = await client.query(FIND_ADMIN_USER);
        if (adminCheck.rows.length === 0) {
            const defaultAdminEmail = (process.env.ADMIN_EMAIL || 'techshock01@gmail.com').toLowerCase().trim();
            const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
            const defaultAdminName = process.env.ADMIN_NAME || 'System Administrator';
            const defaultAdminMobile = process.env.ADMIN_MOBILE || '9999999999';

            const hashedPassword = await hashPassword(defaultAdminPassword);

            const result = await client.query(CREATE_USER, [
                defaultAdminName,
                defaultAdminEmail,
                hashedPassword,
                defaultAdminMobile,
                'admin',
                true
            ]);

            console.log(`[SEED] Default Admin user created successfully: ${result.rows[0].email} (Password: ${defaultAdminPassword})`);
        } else {
            console.log(`[SEED] Admin user already exists (${adminCheck.rows[0].email}).`);
        }
    } catch (error) {
        console.error('[SEED] Error seeding admin user:', error);
    } finally {
        client.release();
    }
};
