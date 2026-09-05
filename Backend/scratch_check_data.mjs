import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    const users = await client.query("SELECT id, name, email, role FROM users;");
    console.log("USERS:", users.rows);

    const customers = await client.query("SELECT id, company_name, email FROM customers LIMIT 5;");
    console.log("CUSTOMERS:", customers.rows);

    const products = await client.query("SELECT id, name, category, base_price FROM products LIMIT 5;");
    console.log("PRODUCTS:", products.rows);

    const quotes = await client.query("SELECT id, quotation_number, status, grand_total FROM quotations LIMIT 10;");
    console.log("QUOTATIONS:", quotes.rows);

    const flags = await client.query("SELECT id, flag_type, detail, action FROM deal_health_flags LIMIT 10;");
    console.log("FLAGS:", flags.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    pool.end();
  }
}
check();
