export const LIST_STAFF_MEMBERS = `
  SELECT 
    id, 
    name, 
    email, 
    mobile, 
    role, 
    is_active, 
    created_at, 
    updated_at
  FROM users
  WHERE role != 'customer'
  ORDER BY created_at DESC
`;

export const FIND_STAFF_BY_ID = `
  SELECT 
    id, 
    name, 
    email, 
    mobile, 
    role, 
    is_active, 
    created_at, 
    updated_at
  FROM users
  WHERE id = $1 AND role != 'customer'
`;

export const CREATE_STAFF_USER = `
  INSERT INTO users (name, email, password_hash, mobile, role, is_active)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING id, name, email, mobile, role, is_active, created_at, updated_at
`;

export const UPDATE_STAFF_STATUS = `
  UPDATE users
  SET is_active = $1, updated_at = CURRENT_TIMESTAMP
  WHERE id = $2 AND role != 'customer'
  RETURNING id, name, email, mobile, role, is_active, updated_at
`;

export const UPDATE_STAFF_DETAILS = `
  UPDATE users
  SET 
    name = COALESCE($1, name),
    mobile = COALESCE($2, mobile),
    role = COALESCE($3, role),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $4 AND role != 'customer'
  RETURNING id, name, email, mobile, role, is_active, updated_at
`;

export const DELETE_STAFF_USER = `
  DELETE FROM users
  WHERE id = $1 AND role != 'customer'
  RETURNING id, name, email, role
`;
