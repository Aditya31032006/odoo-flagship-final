import { pool } from '../config/database.js';

/**
 * Lists client companies with their primary contact person details, metrics, and pagination
 */
export const listCompaniesWithPrimaryUserRepo = async ({ search = null, status = null, limit = null, offset = null } = {}) => {
  let whereConditions = [];
  let queryParams = [];

  if (status === 'active') {
    whereConditions.push(`c.is_active = true`);
  } else if (status === 'inactive') {
    whereConditions.push(`c.is_active = false`);
  }

  if (search && search.trim()) {
    queryParams.push(`%${search.trim()}%`);
    whereConditions.push(`(c.company_name ILIKE $${queryParams.length} OR c.gst_number ILIKE $${queryParams.length} OR u.name ILIKE $${queryParams.length} OR u.email ILIKE $${queryParams.length} OR c.email ILIKE $${queryParams.length})`);
  }

  let query = `
    SELECT 
      c.id,
      c.company_name,
      c.gst_number,
      c.email AS company_email,
      c.phone AS company_phone,
      c.billing_address,
      c.shipping_address,
      c.is_active,
      c.created_at,
      COUNT(*) OVER()::INT AS total_count,
      u.id AS primary_user_id,
      u.name AS primary_contact_name,
      u.email AS primary_contact_email,
      u.mobile AS primary_contact_mobile,
      u.is_active AS primary_user_is_active,
      COUNT(DISTINCT q.id)::INT AS quotation_count,
      COUNT(DISTINCT i.id)::INT AS invoice_count
    FROM customers c
    LEFT JOIN customer_users cu ON c.id = cu.customer_id AND cu.is_primary_contact = true
    LEFT JOIN users u ON cu.user_id = u.id
    LEFT JOIN quotations q ON c.id = q.customer_id
    LEFT JOIN invoices i ON c.id = i.customer_id
  `;

  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  }

  query += ` GROUP BY c.id, u.id ORDER BY c.created_at DESC`;

  if (limit !== null && offset !== null) {
    queryParams.push(limit, offset);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
  }

  const result = await pool.query(query, queryParams);
  return result.rows;
};

/**
 * Retrieves a single company by ID with its primary contact user
 */
export const findCompanyByIdRepo = async (id) => {
  const query = `
    SELECT 
      c.id,
      c.company_name,
      c.gst_number,
      c.email AS company_email,
      c.phone AS company_phone,
      c.billing_address,
      c.shipping_address,
      c.is_active,
      c.created_at,
      u.id AS primary_user_id,
      u.name AS primary_contact_name,
      u.email AS primary_contact_email,
      u.mobile AS primary_contact_mobile
    FROM customers c
    LEFT JOIN customer_users cu ON c.id = cu.customer_id AND cu.is_primary_contact = true
    LEFT JOIN users u ON cu.user_id = u.id
    WHERE c.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Atomically provisions a new company and its primary user in a single ACID transaction
 */
export const createCompanyWithPrimaryUserRepo = async ({ company, user }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create company record
    const customerRes = await client.query(
      `INSERT INTO customers (company_name, gst_number, email, phone, billing_address, shipping_address, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, company_name, gst_number, email, phone, billing_address, shipping_address, is_active, created_at`,
      [
        company.company_name.trim(),
        company.gst_number ? company.gst_number.trim() : null,
        company.email ? company.email.trim() : user.email.trim(),
        company.phone ? company.phone.trim() : user.mobile || null,
        company.billing_address ? company.billing_address.trim() : null,
        company.shipping_address ? company.shipping_address.trim() : null,
      ]
    );
    const createdCompany = customerRes.rows[0];

    // 2. Create primary user with role 'customer'
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, mobile, role, is_active)
       VALUES ($1, $2, $3, $4, 'customer', true)
       RETURNING id, name, email, password_hash, mobile, role, is_active, created_at`,
      [
        user.name.trim(),
        user.email.toLowerCase().trim(),
        user.password_hash,
        user.mobile ? user.mobile.trim() : null,
      ]
    );
    const createdUser = userRes.rows[0];

    // 3. Link customer to user as primary contact
    await client.query(
      `INSERT INTO customer_users (customer_id, user_id, is_primary_contact)
       VALUES ($1, $2, true)`,
      [createdCompany.id, createdUser.id]
    );

    await client.query('COMMIT');

    return {
      ...createdCompany,
      primary_user: createdUser,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Updates company status (active/inactive)
 */
export const toggleCompanyStatusRepo = async (id, is_active) => {
  const result = await pool.query(
    `UPDATE customers SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [is_active, id]
  );
  return result.rows[0];
};
