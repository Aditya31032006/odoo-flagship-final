import pg from "pg";
import config from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

const connectDB = async () => {
  await pool.query("SELECT 1");
  console.log("PostgreSQL connected");
};

export const getPool = () => pool;

export default connectDB;