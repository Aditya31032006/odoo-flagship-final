// ============================================================
// DEALFLOW360 - QUOTATION NEGOTIATION QUERIES
// ============================================================

export const GET_ACTIVE_NEGOTIATION = `
  SELECT 
    qn.id,
    qn.quotation_id,
    qn.status,
    qn.counter_discount_percentage,
    qn.requested_delivery_date,
    qn.created_by_user_id,
    u.name AS created_by_name,
    u.email AS created_by_email,
    u.role AS created_by_role,
    qn.created_at,
    qn.updated_at
  FROM quotation_negotiations qn
  JOIN users u ON qn.created_by_user_id = u.id
  WHERE qn.quotation_id = $1
  ORDER BY qn.created_at DESC
  LIMIT 1
`;

export const GET_NEGOTIATION_MESSAGES = `
  SELECT 
    nm.id,
    nm.negotiation_id,
    nm.quotation_item_id,
    qi.product_name_snapshot,
    qi.sku_snapshot,
    nm.sender_user_id,
    u.name AS sender_name,
    u.email AS sender_email,
    u.role AS sender_role,
    nm.sender_type,
    nm.message,
    nm.created_at
  FROM negotiation_messages nm
  JOIN users u ON nm.sender_user_id = u.id
  LEFT JOIN quotation_items qi ON nm.quotation_item_id = qi.id
  WHERE nm.negotiation_id = $1
  ORDER BY nm.created_at ASC
`;

export const CREATE_NEGOTIATION = `
  INSERT INTO quotation_negotiations (
    quotation_id,
    status,
    counter_discount_percentage,
    requested_delivery_date,
    created_by_user_id
  )
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *
`;

export const UPDATE_NEGOTIATION_COUNTER = `
  UPDATE quotation_negotiations
  SET 
    counter_discount_percentage = $1,
    requested_delivery_date = $2,
    status = $3,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $4
  RETURNING *
`;

export const INSERT_NEGOTIATION_MESSAGE = `
  INSERT INTO negotiation_messages (
    negotiation_id,
    quotation_item_id,
    sender_user_id,
    sender_type,
    message
  )
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *
`;

export const UPDATE_QUOTATION_STATUS = `
  UPDATE quotations
  SET 
    status = $1::quotation_status_enum,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $2
  RETURNING *
`;

export const CREATE_ORDER_FROM_QUOTATION = `
  INSERT INTO orders (
    order_number,
    quotation_id,
    customer_id,
    status
  )
  VALUES ($1, $2, $3, 'confirmed')
  ON CONFLICT (quotation_id) DO UPDATE 
  SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
  RETURNING *
`;
