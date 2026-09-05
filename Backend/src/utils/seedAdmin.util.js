import { pool } from '../config/database.js';
import { FIND_ADMIN_USER, CREATE_USER } from '../queries/auth.query.js';
import { hashPassword } from './password.util.js';

/**
 * Automatically seeds a default Admin user on server startup if no admin exists
 */
export async function seedDefaultAdmin() {
  const client = await pool.connect();
  try {
    const existingAdmin = await client.query(FIND_ADMIN_USER);
    if (existingAdmin.rows.length > 0) {
      console.log('ℹ️ Admin user already exists in database.');
      return;
    }

    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@dealflow360.com';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';
    const hashedPassword = await hashPassword(adminPassword);

    await client.query("BEGIN");
    const result = await client.query(CREATE_USER, [
      'System Administrator',
      adminEmail.toLowerCase(),
      hashedPassword,
      '+91 99999 00000',
      'admin',
      true
    ]);
    await client.query("COMMIT");

    console.log(`✅ Default Admin user successfully seeded:`);
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role:     admin (ID: ${result.rows[0].id})`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error('⚠️ Warning: Admin seeding encountered an issue:', error.message);
  } finally {
    client.release();
  }
}

export default seedDefaultAdmin;
