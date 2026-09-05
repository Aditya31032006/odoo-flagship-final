import { pool } from './src/config/database.js';

async function checkBackorderEnum() {
  try {
    const enumVals = await pool.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'backorder_status_enum'
    `);
    console.log('backorder_status_enum values:', enumVals.rows.map(r => r.enumlabel));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkBackorderEnum();
