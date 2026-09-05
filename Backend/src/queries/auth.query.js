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
    (u.password_hash IS NOT NULL AND u.password_hash != '') AS has_password,
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
    (u.password_hash IS NOT NULL AND u.password_hash != '') AS has_password,
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

export const GET_USER_FULL_PROFILE = `
  SELECT 
    u.id, 
    u.name, 
    u.email, 
    (u.password_hash IS NOT NULL AND u.password_hash != '') AS has_password,
    u.mobile, 
    u.role, 
    u.is_active, 
    u.created_at,
    u.updated_at,
    c.id AS customer_id, 
    c.company_name, 
    c.gst_number, 
    c.email AS company_email,
    c.phone AS company_phone,
    c.billing_address,
    c.shipping_address,
    cu.is_primary_contact
  FROM users u
  LEFT JOIN customer_users cu ON u.id = cu.user_id
  LEFT JOIN customers c ON cu.customer_id = c.id
  WHERE u.id = $1
`;

export const UPDATE_USER_BASIC_PROFILE = `
  UPDATE users
  SET 
    name = $1,
    mobile = $2,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $3
  RETURNING id, name, email, mobile, role, is_active, created_at, updated_at
`;

export const UPDATE_CUSTOMER_DETAILS = `
  UPDATE customers
  SET
    company_name = COALESCE($1, company_name),
    gst_number = COALESCE($2, gst_number),
    billing_address = COALESCE($3, billing_address),
    shipping_address = COALESCE($4, shipping_address),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $5
  RETURNING id, company_name, gst_number, billing_address, shipping_address
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

export const FIND_USER_WITH_PASSWORD_BY_ID = `
  SELECT id, name, email, password_hash FROM users WHERE id = $1
`;

export const UPDATE_USER_PASSWORD_BY_ID = `
  UPDATE users
  SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
  WHERE id = $2
  RETURNING id, name, email
`;

export const FIND_ADMIN_USER = `
  SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1
`;