import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectTables() {
  const client = await pool.connect();
  try {
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log("TABLES:", tables.rows.map(r => r.table_name));

    for (const t of tables.rows) {
      const cols = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [t.table_name]);
      console.log(`\n--- TABLE: ${t.table_name} ---`);
      console.log(cols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    pool.end();
  }
}
inspectTables();
