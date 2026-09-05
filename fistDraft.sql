-- ============================================================
-- DEALFLOW360
-- FOCUSED DATABASE
-- Based ONLY on the Hackathon Problem Statement
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE user_role_enum AS ENUM (
    'sales_rep',
    'sales_manager',
    'finance',
    'operations',
    'admin',
    'customer'
);

CREATE TYPE quotation_status_enum AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'sent',
    'negotiating',
    'confirmed',
    'rejected',
    'expired',
    'cancelled'
);

CREATE TYPE risk_level_enum AS ENUM (
    'low',
    'medium',
    'high'
);

CREATE TYPE approval_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'returned',
    'cancelled'
);

CREATE TYPE approval_action_enum AS ENUM (
    'submitted',
    'approved',
    'rejected',
    'returned',
    'edited'
);

CREATE TYPE order_status_enum AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'partially_fulfilled',
    'fulfilled',
    'cancelled'
);

CREATE TYPE fulfillment_status_enum AS ENUM (
    'pending',
    'allocated',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
);

CREATE TYPE backorder_status_enum AS ENUM (
    'pending',
    'partially_fulfilled',
    'fulfilled',
    'cancelled'
);

CREATE TYPE subscription_cycle_enum AS ENUM (
    'monthly',
    'quarterly',
    'yearly'
);

CREATE TYPE subscription_status_enum AS ENUM (
    'active',
    'paused',
    'cancelled',
    'expired'
);

CREATE TYPE negotiation_status_enum AS ENUM (
    'open',
    'countered',
    'accepted',
    'rejected',
    'closed'
);

CREATE TYPE negotiation_sender_enum AS ENUM (
    'customer',
    'sales_rep'
);

CREATE TYPE upsell_status_enum AS ENUM (
    'suggested',
    'accepted',
    'dismissed'
);

CREATE TYPE deal_health_flag_type_enum AS ENUM (
    'stalled_deal',
    'discount_anomaly',
    'delivery_slippage'
);

CREATE TYPE deal_health_action_enum AS ENUM (
    'open',
    'acknowledged',
    'resolved'
);

CREATE TYPE invoice_status_enum AS ENUM (
    'draft',
    'issued',
    'partially_paid',
    'paid',
    'cancelled'
);

CREATE TYPE payment_status_enum AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);

CREATE TYPE payment_method_enum AS ENUM (
    'cash',
    'bank_transfer',
    'upi',
    'card',
    'online'
);

CREATE TYPE order_line_type_enum AS ENUM (
    'one_time',
    'subscription'
);


-- ============================================================
-- 2. USERS
-- ============================================================

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    mobile VARCHAR(30),

    role user_role_enum NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 3. CUSTOMER COMPANIES
-- One B2B customer can have multiple portal users
-- ============================================================

CREATE TABLE customers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    company_name VARCHAR(255) NOT NULL,

    gst_number VARCHAR(20),

    email VARCHAR(255),

    phone VARCHAR(30),

    billing_address TEXT,

    shipping_address TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 4. CUSTOMER USERS
-- ============================================================

CREATE TABLE customer_users (
    customer_id BIGINT NOT NULL,

    user_id BIGINT NOT NULL,

    is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (customer_id, user_id),

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE UNIQUE INDEX uq_customer_primary_contact
ON customer_users(customer_id)
WHERE is_primary_contact = TRUE;


-- ============================================================
-- 5. PRODUCT CATEGORIES
-- ============================================================

CREATE TABLE product_categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(255) NOT NULL UNIQUE,

    parent_category_id BIGINT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parent_category_id)
        REFERENCES product_categories(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 6. PRODUCTS
-- Generic product
-- ============================================================

CREATE TABLE products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    category_id BIGINT NOT NULL,

    description TEXT,

    unit VARCHAR(50),

    base_price NUMERIC(15,2) NOT NULL,

    tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id)
        REFERENCES product_categories(id)
        ON DELETE CASCADE,

    CHECK (base_price >= 0),

    CHECK (tax_percentage BETWEEN 0 AND 100)
);


-- ============================================================
-- 7. PRODUCT VARIANT ATTRIBUTES
-- Example: Size, Pack, Color
-- ============================================================

CREATE TABLE product_variant_attributes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    product_id BIGINT NOT NULL,

    attribute_name VARCHAR(100) NOT NULL,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    UNIQUE (product_id, attribute_name)
);


-- ============================================================
-- 8. PRODUCT VARIANT VALUES
-- Example: Small, Large, Black, 10 Pack
-- ============================================================

CREATE TABLE product_variant_values (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    attribute_id BIGINT NOT NULL,

    value VARCHAR(150) NOT NULL,

    extra_price NUMERIC(15,2) NOT NULL DEFAULT 0,

    FOREIGN KEY (attribute_id)
        REFERENCES product_variant_attributes(id)
        ON DELETE CASCADE,

    UNIQUE (attribute_id, value),

    CHECK (extra_price >= 0)
);


-- ============================================================
-- 9. ACTUAL SELLABLE PRODUCT VARIANTS / SKUs
-- ============================================================

CREATE TABLE product_variants (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    product_id BIGINT NOT NULL,

    sku VARCHAR(150) NOT NULL UNIQUE,

    variant_name VARCHAR(255),

    selling_price NUMERIC(15,2) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CHECK (selling_price >= 0)
);


-- ============================================================
-- 10. VARIANT VALUE MAP
-- Connects actual SKU to its attribute values
-- ============================================================

CREATE TABLE product_variant_value_map (
    variant_id BIGINT NOT NULL,

    variant_value_id BIGINT NOT NULL,

    PRIMARY KEY (variant_id, variant_value_id),

    FOREIGN KEY (variant_id)
        REFERENCES product_variants(id)
        ON DELETE CASCADE,

    FOREIGN KEY (variant_value_id)
        REFERENCES product_variant_values(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 11. CUSTOMER TIERS
-- Bronze / Silver / Gold
-- ============================================================

CREATE TABLE customer_tiers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,

    max_discount_percentage NUMERIC(5,2) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (max_discount_percentage BETWEEN 0 AND 100)
);


-- ============================================================
-- 12. CUSTOMER TIER ASSIGNMENTS
-- ============================================================

CREATE TABLE customer_tier_assignments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    tier_id BIGINT NOT NULL,

    is_current BOOLEAN NOT NULL DEFAULT TRUE,

    assigned_by_user_id BIGINT,

    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    FOREIGN KEY (tier_id)
        REFERENCES customer_tiers(id)
        ON DELETE CASCADE,

    FOREIGN KEY (assigned_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);


CREATE UNIQUE INDEX uq_current_customer_tier
ON customer_tier_assignments(customer_id)
WHERE is_current = TRUE;


-- ============================================================
-- 13. CATEGORY DISCOUNT CEILINGS
-- ============================================================

CREATE TABLE category_discount_ceilings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    category_id BIGINT NOT NULL UNIQUE,

    max_discount_percentage NUMERIC(5,2) NOT NULL,

    FOREIGN KEY (category_id)
        REFERENCES product_categories(id)
        ON DELETE CASCADE,

    CHECK (max_discount_percentage BETWEEN 0 AND 100)
);


-- ============================================================
-- 14. PRICE LISTS
-- Customer tier / currency specific pricing
-- ============================================================

CREATE TABLE price_lists (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    tier_id BIGINT,

    currency VARCHAR(10) NOT NULL DEFAULT 'INR',

    adjustment_percentage NUMERIC(7,2) DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tier_id)
        REFERENCES customer_tiers(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 15. PRICE LIST ITEMS
-- ============================================================

CREATE TABLE price_list_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    price_list_id BIGINT NOT NULL,

    product_variant_id BIGINT NOT NULL,

    price NUMERIC(15,2) NOT NULL,

    FOREIGN KEY (price_list_id)
        REFERENCES price_lists(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_variant_id)
        REFERENCES product_variants(id)
        ON DELETE CASCADE,

    UNIQUE (price_list_id, product_variant_id),

    CHECK (price >= 0)
);


-- ============================================================
-- 16. APPROVAL RULES
-- Determines required approval based on risk/discount
-- ============================================================

CREATE TABLE approval_rules (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    min_risk_score NUMERIC(6,2) NOT NULL,

    max_risk_score NUMERIC(6,2),

    requires_sales_manager BOOLEAN NOT NULL DEFAULT TRUE,

    requires_finance BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (min_risk_score BETWEEN 0 AND 100),

    CHECK (
        max_risk_score IS NULL
        OR max_risk_score BETWEEN 0 AND 100
    ),

    CHECK (
        max_risk_score IS NULL
        OR max_risk_score >= min_risk_score
    )
);


-- ============================================================
-- 17. QUOTATIONS
-- ============================================================

CREATE TABLE quotations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    quotation_number VARCHAR(100) NOT NULL UNIQUE,

    customer_id BIGINT NOT NULL,

    sales_rep_id BIGINT NOT NULL,

    tier_id BIGINT,

    price_list_id BIGINT,

    status quotation_status_enum NOT NULL DEFAULT 'draft',

    blended_risk_score NUMERIC(6,2),

    risk_level risk_level_enum,

    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,

    discount_total NUMERIC(15,2) NOT NULL DEFAULT 0,

    tax_total NUMERIC(15,2) NOT NULL DEFAULT 0,

    grand_total NUMERIC(15,2) NOT NULL DEFAULT 0,

    valid_until DATE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    FOREIGN KEY (sales_rep_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (tier_id)
        REFERENCES customer_tiers(id)
        ON DELETE SET NULL,

    FOREIGN KEY (price_list_id)
        REFERENCES price_lists(id)
        ON DELETE SET NULL,

    CHECK (
        blended_risk_score IS NULL
        OR blended_risk_score BETWEEN 0 AND 100
    ),

    CHECK (subtotal >= 0),

    CHECK (discount_total >= 0),

    CHECK (tax_total >= 0),

    CHECK (grand_total >= 0)
);


-- ============================================================
-- 18. QUOTATION ITEMS
-- ============================================================

CREATE TABLE quotation_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    quotation_id BIGINT NOT NULL,

    product_variant_id BIGINT NOT NULL,

    line_number INTEGER NOT NULL,

    product_name_snapshot VARCHAR(255) NOT NULL,

    sku_snapshot VARCHAR(150),

    quantity INTEGER NOT NULL,

    list_price NUMERIC(15,2) NOT NULL,

    unit_price NUMERIC(15,2) NOT NULL,

    discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,

    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,

    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    allowed_discount_percentage NUMERIC(5,2),

    excess_discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,

    line_total NUMERIC(15,2) NOT NULL,

    is_upsell BOOLEAN NOT NULL DEFAULT FALSE,

    FOREIGN KEY (quotation_id)
        REFERENCES quotations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_variant_id)
        REFERENCES product_variants(id)
        ON DELETE CASCADE,

    UNIQUE (quotation_id, line_number),

    CHECK (quantity > 0),

    CHECK (list_price >= 0),

    CHECK (unit_price >= 0),

    CHECK (discount_percentage BETWEEN 0 AND 100),

    CHECK (discount_amount >= 0),

    CHECK (tax_percentage BETWEEN 0 AND 100),

    CHECK (tax_amount >= 0),

    CHECK (
        allowed_discount_percentage IS NULL
        OR allowed_discount_percentage BETWEEN 0 AND 100
    ),

    CHECK (excess_discount_percentage >= 0),

    CHECK (line_total >= 0)
);


-- ============================================================
-- 19. APPROVAL REQUESTS
-- ============================================================

CREATE TABLE approval_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    quotation_id BIGINT NOT NULL,

    status approval_status_enum NOT NULL DEFAULT 'pending',

    requested_by_user_id BIGINT NOT NULL,

    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP,

    FOREIGN KEY (quotation_id)
        REFERENCES quotations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (requested_by_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 20. APPROVAL STEPS
-- ============================================================

CREATE TABLE approval_steps (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    approval_request_id BIGINT NOT NULL,

    step_number INTEGER NOT NULL,

    approver_role user_role_enum NOT NULL,

    approver_user_id BIGINT,

    status approval_status_enum NOT NULL DEFAULT 'pending',

    acted_at TIMESTAMP,

    comments TEXT,

    FOREIGN KEY (approval_request_id)
        REFERENCES approval_requests(id)
        ON DELETE CASCADE,

    FOREIGN KEY (approver_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    UNIQUE (approval_request_id, step_number)
);


-- ============================================================
-- 21. QUOTATION AUDIT LOG
-- Required by PDF for approvals, rejections and edits
-- ============================================================

CREATE TABLE quotation_audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    quotation_id BIGINT NOT NULL,

    user_id BIGINT NOT NULL,

    action approval_action_enum NOT NULL,

    reason TEXT,

    changes JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (quotation_id)
        REFERENCES quotations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 22. UPSELL / CROSS-SELL RULES
-- ============================================================

CREATE TABLE upsell_rules (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    source_product_id BIGINT NOT NULL,

    suggested_product_id BIGINT NOT NULL,

    minimum_margin_percentage NUMERIC(5,2),

    priority INTEGER NOT NULL DEFAULT 0,

    is_promoted BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    FOREIGN KEY (suggested_product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CHECK (source_product_id <> suggested_product_id),

    CHECK (
        minimum_margin_percentage IS NULL
        OR minimum_margin_percentage BETWEEN 0 AND 100
    )
);


-- ============================================================
-- 23. QUOTATION UPSELL SUGGESTIONS
-- ============================================================

CREATE TABLE quotation_upsell_suggestions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    quotation_id BIGINT NOT NULL,

    source_quotation_item_id BIGINT,

    suggested_product_id BIGINT NOT NULL,

    rule_id BIGINT,

    margin_delta NUMERIC(15,2),

    promotion_applied BOOLEAN NOT NULL DEFAULT FALSE,

    status upsell_status_enum NOT NULL DEFAULT 'suggested',

    resulting_quotation_item_id BIGINT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (quotation_id)
        REFERENCES quotations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_quotation_item_id)
        REFERENCES quotation_items(id)
        ON DELETE CASCADE,

    FOREIGN KEY (suggested_product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    FOREIGN KEY (rule_id)
        REFERENCES upsell_rules(id)
        ON DELETE SET NULL,

    FOREIGN KEY (resulting_quotation_item_id)
        REFERENCES quotation_items(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 24. WAREHOUSES
-- ============================================================

CREATE TABLE warehouses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(255) NOT NULL UNIQUE,

    code VARCHAR(50) NOT NULL UNIQUE,

    address TEXT,

    shipping_cost_weight NUMERIC(10,2) NOT NULL DEFAULT 1,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (shipping_cost_weight >= 0)
);


-- ============================================================
-- 25. WAREHOUSE STOCK
-- ============================================================

CREATE TABLE warehouse_stock (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    warehouse_id BIGINT NOT NULL,

    product_variant_id BIGINT NOT NULL,

    quantity_on_hand INTEGER NOT NULL DEFAULT 0,

    quantity_reserved INTEGER NOT NULL DEFAULT 0,

    reorder_level INTEGER NOT NULL DEFAULT 0,

    lead_time_days INTEGER,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (warehouse_id)
        REFERENCES warehouses(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_variant_id)
        REFERENCES product_variants(id)
        ON DELETE CASCADE,

    UNIQUE (warehouse_id, product_variant_id),

    CHECK (quantity_on_hand >= 0),

    CHECK (quantity_reserved >= 0),

    CHECK (quantity_reserved <= quantity_on_hand),

    CHECK (reorder_level >= 0),

    CHECK (
        lead_time_days IS NULL
        OR lead_time_days >= 0
    )
);


-- ============================================================
-- 26. ORDERS
-- ============================================================

CREATE TABLE orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_number VARCHAR(100) NOT NULL UNIQUE,

    quotation_id BIGINT NOT NULL UNIQUE,

    customer_id BIGINT NOT NULL,

    status order_status_enum NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (quotation_id)
        REFERENCES quotations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 27. ORDER ITEMS
-- ============================================================

CREATE TABLE order_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_id BIGINT NOT NULL,

    quotation_item_id BIGINT,

    product_variant_id BIGINT NOT NULL,

    line_type order_line_type_enum NOT NULL DEFAULT 'one_time',

    product_name_snapshot VARCHAR(255) NOT NULL,

    sku_snapshot VARCHAR(150),

    quantity INTEGER NOT NULL,

    unit_price NUMERIC(15,2) NOT NULL,

    discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,

    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,

    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    line_total NUMERIC(15,2) NOT NULL,

    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    FOREIGN KEY (quotation_item_id)
        REFERENCES quotation_items(id)
        ON DELETE SET NULL,

    FOREIGN KEY (product_variant_id)
        REFERENCES product_variants(id)
        ON DELETE CASCADE,

    CHECK (quantity > 0),

    CHECK (unit_price >= 0),

    CHECK (discount_percentage BETWEEN 0 AND 100),

    CHECK (discount_amount >= 0),

    CHECK (tax_percentage BETWEEN 0 AND 100),

    CHECK (tax_amount >= 0),

    CHECK (line_total >= 0)
);


-- ============================================================
-- 28. FULFILLMENT SPLITS
-- ============================================================

CREATE TABLE fulfillment_splits (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_item_id BIGINT NOT NULL,

    warehouse_id BIGINT NOT NULL,

    quantity INTEGER NOT NULL,

    estimated_shipment_date DATE,

    estimated_shipping_cost NUMERIC(15,2),

    status fulfillment_status_enum NOT NULL DEFAULT 'pending',

    manual_override BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_item_id)
        REFERENCES order_items(id)
        ON DELETE CASCADE,

    FOREIGN KEY (warehouse_id)
        REFERENCES warehouses(id)
        ON DELETE CASCADE,

    CHECK (quantity > 0),

    CHECK (
        estimated_shipping_cost IS NULL
        OR estimated_shipping_cost >= 0
    )
);


-- ============================================================
-- 29. BACKORDERS
-- ============================================================

CREATE TABLE backorders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_item_id BIGINT NOT NULL,

    quantity INTEGER NOT NULL,

    preferred_warehouse_id BIGINT,

    status backorder_status_enum NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_item_id)
        REFERENCES order_items(id)
        ON DELETE CASCADE,

    FOREIGN KEY (preferred_warehouse_id)
        REFERENCES warehouses(id)
        ON DELETE SET NULL,

    CHECK (quantity > 0)
);


-- ============================================================
-- 30. SUBSCRIPTION PLANS
-- Defined before subscriptions for proper dependency ordering
-- ============================================================

CREATE TABLE subscription_plans (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    product_id BIGINT NOT NULL,

    name VARCHAR(255) NOT NULL,

    billing_cycle subscription_cycle_enum NOT NULL,

    price NUMERIC(15,2) NOT NULL,

    allow_proration BOOLEAN NOT NULL DEFAULT FALSE,

    allow_cancellation BOOLEAN NOT NULL DEFAULT TRUE,

    allow_partial_refund BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CHECK (price >= 0)
);


-- ============================================================
-- 31. SUBSCRIPTIONS
-- ============================================================

CREATE TABLE subscriptions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_item_id BIGINT NOT NULL,

    customer_id BIGINT NOT NULL,

    subscription_plan_id BIGINT NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 1,

    unit_price NUMERIC(15,2) NOT NULL,

    billing_cycle subscription_cycle_enum NOT NULL,

    start_date DATE NOT NULL,

    end_date DATE,

    status subscription_status_enum NOT NULL DEFAULT 'active',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_item_id)
        REFERENCES order_items(id)
        ON DELETE CASCADE,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    FOREIGN KEY (subscription_plan_id)
        REFERENCES subscription_plans(id)
        ON DELETE CASCADE,

    CHECK (quantity > 0),

    CHECK (unit_price >= 0),

    CHECK (
        end_date IS NULL
        OR end_date >= start_date
    )
);


-- ============================================================
-- 32. SUBSCRIPTION BILLING SCHEDULE
-- ============================================================

CREATE TABLE subscription_billing_lines (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    subscription_id BIGINT NOT NULL,

    billing_period_start DATE NOT NULL,

    billing_period_end DATE NOT NULL,

    amount NUMERIC(15,2) NOT NULL,

    is_prorated BOOLEAN NOT NULL DEFAULT FALSE,

    invoice_id BIGINT,

    credit_note_required BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (subscription_id)
        REFERENCES subscriptions(id)
        ON DELETE CASCADE,

    CHECK (billing_period_start < billing_period_end),

    CHECK (amount >= 0),

    UNIQUE (
        subscription_id,
        billing_period_start,
        billing_period_end
    )
);


-- ============================================================
-- 33. NEGOTIATIONS
-- ============================================================

CREATE TABLE quotation_negotiations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    quotation_id BIGINT NOT NULL,

    status negotiation_status_enum NOT NULL DEFAULT 'open',

    counter_discount_percentage NUMERIC(5,2),

    requested_delivery_date DATE,

    created_by_user_id BIGINT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (quotation_id)
        REFERENCES quotations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CHECK (
        counter_discount_percentage IS NULL
        OR counter_discount_percentage BETWEEN 0 AND 100
    )
);


-- ============================================================
-- 34. NEGOTIATION MESSAGES
-- Line-level negotiation / questions
-- ============================================================

CREATE TABLE negotiation_messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    negotiation_id BIGINT NOT NULL,

    quotation_item_id BIGINT,

    sender_user_id BIGINT NOT NULL,

    sender_type negotiation_sender_enum NOT NULL,

    message TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (negotiation_id)
        REFERENCES quotation_negotiations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (quotation_item_id)
        REFERENCES quotation_items(id)
        ON DELETE SET NULL,

    FOREIGN KEY (sender_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 35. DEAL HEALTH FLAGS
-- ============================================================

CREATE TABLE deal_health_flags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    quotation_id BIGINT NOT NULL,

    flag_type deal_health_flag_type_enum NOT NULL,

    detail TEXT,

    action deal_health_action_enum NOT NULL DEFAULT 'open',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    resolved_at TIMESTAMP,

    resolved_by_user_id BIGINT,

    FOREIGN KEY (quotation_id)
        REFERENCES quotations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (resolved_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 36. DEAL HEALTH CONFIGURATION
-- ============================================================

CREATE TABLE deal_health_config (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    stalled_days INTEGER NOT NULL,

    discount_anomaly_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.5,

    delivery_slippage_days INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (stalled_days > 0),

    CHECK (discount_anomaly_multiplier > 0),

    CHECK (delivery_slippage_days >= 0)
);


-- ============================================================
-- 37. INVOICES
-- Required for quotation-to-cash flow
-- ============================================================

CREATE TABLE invoices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    invoice_number VARCHAR(100) NOT NULL UNIQUE,

    order_id BIGINT NOT NULL,

    customer_id BIGINT NOT NULL,

    status invoice_status_enum NOT NULL DEFAULT 'draft',

    invoice_date DATE NOT NULL,

    due_date DATE,

    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,

    discount_total NUMERIC(15,2) NOT NULL DEFAULT 0,

    tax_total NUMERIC(15,2) NOT NULL DEFAULT 0,

    grand_total NUMERIC(15,2) NOT NULL DEFAULT 0,

    paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    CHECK (subtotal >= 0),

    CHECK (discount_total >= 0),

    CHECK (tax_total >= 0),

    CHECK (grand_total >= 0),

    CHECK (paid_amount >= 0),

    CHECK (paid_amount <= grand_total)
);


-- ============================================================
-- 38. INVOICE ITEMS
-- ============================================================

CREATE TABLE invoice_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    invoice_id BIGINT NOT NULL,

    order_item_id BIGINT,

    product_variant_id BIGINT,

    product_name_snapshot VARCHAR(255) NOT NULL,

    sku_snapshot VARCHAR(150),

    quantity INTEGER NOT NULL,

    unit_price NUMERIC(15,2) NOT NULL,

    tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,

    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    line_total NUMERIC(15,2) NOT NULL,

    FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE,

    FOREIGN KEY (order_item_id)
        REFERENCES order_items(id)
        ON DELETE SET NULL,

    FOREIGN KEY (product_variant_id)
        REFERENCES product_variants(id)
        ON DELETE SET NULL,

    CHECK (quantity > 0),

    CHECK (unit_price >= 0),

    CHECK (tax_percentage BETWEEN 0 AND 100),

    CHECK (tax_amount >= 0),

    CHECK (line_total >= 0)
);


-- ============================================================
-- 39. PAYMENTS
-- ============================================================

CREATE TABLE payments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    invoice_id BIGINT NOT NULL,

    customer_id BIGINT NOT NULL,

    amount NUMERIC(15,2) NOT NULL,

    payment_method payment_method_enum,

    status payment_status_enum NOT NULL DEFAULT 'pending',

    transaction_reference VARCHAR(255),

    payment_date TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    CHECK (amount > 0)
);


-- ============================================================
-- 40. INDEXES
-- ============================================================

CREATE INDEX idx_customer_users_user
ON customer_users(user_id);

CREATE INDEX idx_products_category
ON products(category_id);

CREATE INDEX idx_product_variants_product
ON product_variants(product_id);

CREATE INDEX idx_price_list_items_variant
ON price_list_items(product_variant_id);

CREATE INDEX idx_warehouse_stock_variant
ON warehouse_stock(product_variant_id);

CREATE INDEX idx_quotations_customer
ON quotations(customer_id);

CREATE INDEX idx_quotations_sales_rep
ON quotations(sales_rep_id);

CREATE INDEX idx_quotations_status
ON quotations(status);

CREATE INDEX idx_quotation_items_quotation
ON quotation_items(quotation_id);

CREATE INDEX idx_quotation_items_variant
ON quotation_items(product_variant_id);

CREATE INDEX idx_approval_requests_quotation
ON approval_requests(quotation_id);

CREATE INDEX idx_approval_steps_request
ON approval_steps(approval_request_id);

CREATE INDEX idx_order_items_order
ON order_items(order_id);

CREATE INDEX idx_fulfillment_order_item
ON fulfillment_splits(order_item_id);

CREATE INDEX idx_fulfillment_warehouse
ON fulfillment_splits(warehouse_id);

CREATE INDEX idx_backorders_order_item
ON backorders(order_item_id);

CREATE INDEX idx_subscriptions_customer
ON subscriptions(customer_id);

CREATE INDEX idx_subscriptions_order_item
ON subscriptions(order_item_id);

CREATE INDEX idx_subscription_billing_subscription
ON subscription_billing_lines(subscription_id);

CREATE INDEX idx_negotiations_quotation
ON quotation_negotiations(quotation_id);

CREATE INDEX idx_negotiation_messages_negotiation
ON negotiation_messages(negotiation_id);

CREATE INDEX idx_deal_health_quotation
ON deal_health_flags(quotation_id);

CREATE INDEX idx_invoices_order
ON invoices(order_id);

CREATE INDEX idx_invoices_customer
ON invoices(customer_id);

CREATE INDEX idx_invoice_items_invoice
ON invoice_items(invoice_id);

CREATE INDEX idx_payments_invoice
ON payments(invoice_id);