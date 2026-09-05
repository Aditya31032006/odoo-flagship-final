import pg from "pg";
import config from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

const connectDB = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    await client.query("CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (company_name gin_trgm_ops);");
    await client.query("CREATE INDEX IF NOT EXISTS idx_quotations_num_trgm ON quotations USING gin (quotation_number gin_trgm_ops);");
    await client.query("CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);");
    await client.query("CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops);");
    await client.query("COMMIT");
    console.log("PostgreSQL connected with pg_trgm fuzzy similarity search initialized");
  } catch (error) {
    await client.query("ROLLBACK");
    console.warn("Notice during pg_trgm extension initialization:", error.message);
  } finally {
    client.release();
  }
};

export const getPool = () => pool;

export default connectDB;