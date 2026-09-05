export const CREATE_USER = `
  INSERT INTO users (name, email, password_hash, mobile, role, is_active)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING id, name, email, mobile, role, is_active, created_at
`;

export const FIND_USER = `
  SELECT 
    u.id, 
    u.name, 
    u.email, 
    u.password_hash, 
    u.mobile, 
    u.role, 
    u.is_active, 
    u.created_at,
    c.id AS customer_id, 
    c.company_name, 
    c.gst_number, 
    cu.is_primary_contact
  FROM users u
  LEFT JOIN customer_users cu ON u.id = cu.user_id
  LEFT JOIN customers c ON cu.customer_id = c.id
  WHERE LOWER(u.email) = LOWER($1)
`;

export const FIND_USER_BY_ID = `
  SELECT 
    u.id, 
    u.name, 
    u.email, 
    u.mobile, 
    u.role, 
    u.is_active, 
    u.created_at,
    c.id AS customer_id, 
    c.company_name, 
    c.gst_number, 
    cu.is_primary_contact
  FROM users u
  LEFT JOIN customer_users cu ON u.id = cu.user_id
  LEFT JOIN customers c ON cu.customer_id = c.id
  WHERE u.id = $1
`;

export const CREATE_CUSTOMER = `
  INSERT INTO customers (company_name, gst_number, email, phone, billing_address, shipping_address)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING id, company_name, gst_number, email, phone, billing_address, shipping_address
`;

export const FIND_CUSTOMER_BY_ID = `
  SELECT id, company_name, gst_number, email, phone, is_active
  FROM customers
  WHERE id = $1
`;

export const LIST_ACTIVE_CUSTOMERS = `
  SELECT id, company_name, gst_number, email
  FROM customers
  WHERE is_active = TRUE
  ORDER BY company_name ASC
  LIMIT 100
`;

export const LINK_CUSTOMER_USER = `
  INSERT INTO customer_users (customer_id, user_id, is_primary_contact)
  VALUES ($1, $2, $3)
  RETURNING customer_id, user_id, is_primary_contact
`;

export const UPDATE_PASSWORD = `
  UPDATE users 
  SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
  WHERE LOWER(email) = LOWER($2) 
  RETURNING id, name, email
`;

export const FIND_ADMIN_USER = `
  SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1
`;