"""
DealFlow360 - Comprehensive Enterprise Database Seeding Script (Python)
=======================================================================
This script populates PostgreSQL with realistic demonstration data for DealFlow360:
1. Users across all roles (Admin, Sales Manager, Sales Reps, Finance, Operations, Customer)
2. Customer Tiers (Bronze, Silver, Gold) with discount thresholds
3. The 3 Tier-Specific Price Lists (Bronze 0%, Silver -5%, Gold -10%)
4. B2B Customers with GSTIN, billing/shipping addresses, and current Tier Assignments
5. Customer-User Links for Portal Access
6. Product Categories & Category Discount Ceilings
7. Discount & Approval Governance Rules (Low Risk Auto-Approve, Medium Risk Manager, High Risk Dual-Approval)
8. Multi-Facility Warehouses & Inventory Stock Quantities
9. Products (Hardware, Services, Subscriptions) & Variants with SKUs
10. SaaS & Support Subscription Plans
11. Upsell & Cross-Sell Recommendation Rules
12. Deal Health & Anomaly Governance Config
13. Live Demonstration Quotations (Draft, Stalled, Approval Escalation, Counter Negotiation, Approved, Confirmed Orders)
14. Orders, Fulfillment Multi-Warehouse Splits, Invoices, Payments, and Subscriptions

REQUIREMENTS:
    pip install psycopg2-binary python-dotenv

USAGE:
    python seed_data.py
"""

import os
import sys
from datetime import datetime, timedelta
from urllib.parse import urlparse

# Force UTF-8 encoding for standard output (Windows console cp1252 support)
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Optional dotenv support to load Backend/.env automatically
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# PostgreSQL connector detection (supports psycopg2 or psycopg3)
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG_VERSION = 2
except ImportError:
    try:
        import psycopg  # type: ignore
        from psycopg.rows import dict_row  # type: ignore
        PSYCOPG_VERSION = 3
    except ImportError:
        psycopg2 = None
        psycopg = None
        PSYCOPG_VERSION = None

# Default database connection string (from environment or local default)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:aditya@localhost:5432/Odoo_flagship_final"
)

# Standard Argon2 hash for default demo password: 'password123'
DEFAULT_PASSWORD_HASH = "$argon2id$v=19$m=65536,p=4,t=3$ULqQEJApNCQE/g0GxCP6Vw$X5IGBZuh5SgrxhwkvT0ZsLiSgVJLDtahOriomltDTPk"


def get_db_connection():
    """Establishes and returns a database connection using psycopg2 or psycopg3."""
    if PSYCOPG_VERSION == 2:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        return conn
    elif PSYCOPG_VERSION == 3:
        conn = psycopg.connect(DATABASE_URL)
        conn.autocommit = False
        return conn
    else:
        raise RuntimeError(
            "Neither 'psycopg2' nor 'psycopg' is installed.\n"
            "Please install via: pip install psycopg2-binary python-dotenv"
        )


def seed_database():
    """Executes the complete database seed inside a single transaction."""
    print("=" * 70)
    print("🚀 DealFlow360 Comprehensive Demo Database Seeder (Python)")
    print(f"Target Database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    print("=" * 70)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # ---------------------------------------------------------------------
        # 1. SEED USERS ACROSS ALL ROLES
        # ---------------------------------------------------------------------
        print("\n1️⃣  Seeding System Users (All 6 Roles)...")
        users_data = [
            ("System Administrator", "admin@dealflow.com", "admin", "+1-555-0100"),
            ("Sarah Jenkins", "manager@dealflow.com", "sales_manager", "+1-555-0101"),
            ("Aditya Gandhi", "rep@dealflow.com", "sales_rep", "+1-555-0102"),
            ("Alex Rivera", "alex.rep@dealflow.com", "sales_rep", "+1-555-0103"),
            ("Frank Sterling", "finance@dealflow.com", "finance", "+1-555-0104"),
            ("Oliver Vance", "ops@dealflow.com", "operations", "+1-555-0105"),
            ("John Doe (Acme Corp)", "customer@acme.corp", "customer", "+1-555-0106"),
            ("Harshil Upadhyay", "harshilu01@gmail.com", "customer", "+1-555-0107"),
            ("Admin Lead", "techshock01@gmail.com", "admin", "+1-555-0108"),
            ("Aditya Gandhi (Rep)", "adityangandhi@gmail.com", "sales_rep", "+1-555-0109")
        ]

        user_id_map = {}
        for name, email, role, mobile in users_data:
            cur.execute("SELECT id FROM users WHERE email = %s;", (email,))
            row = cur.fetchone()
            if row:
                u_id = row[0]
                cur.execute("""
                    UPDATE users 
                    SET name = %s, password_hash = %s, role = %s::user_role_enum, is_active = TRUE, updated_at = NOW()
                    WHERE id = %s;
                """, (name, DEFAULT_PASSWORD_HASH, role, u_id))
            else:
                cur.execute("""
                    INSERT INTO users (name, email, password_hash, mobile, role, is_active, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s::user_role_enum, TRUE, NOW(), NOW())
                    RETURNING id;
                """, (name, email, DEFAULT_PASSWORD_HASH, mobile, role))
                u_id = cur.fetchone()[0]
            user_id_map[email] = u_id
            print(f"   ✓ User: {name:25} | Role: {role:14} | ID: {u_id}")

        # ---------------------------------------------------------------------
        # 2. SEED CUSTOMER TIERS (Bronze, Silver, Gold)
        # ---------------------------------------------------------------------
        print("\n2️⃣  Seeding Customer Tiers...")
        tiers_data = [
            (1, "Bronze", 5.0),
            (2, "Silver", 10.0),
            (3, "Gold", 15.0)
        ]
        tier_id_map = {}
        for t_id, name, max_disc in tiers_data:
            cur.execute("SELECT id FROM customer_tiers WHERE id = %s OR name = %s;", (t_id, name))
            row = cur.fetchone()
            if row:
                current_id = row[0]
                cur.execute("""
                    UPDATE customer_tiers 
                    SET max_discount_percentage = %s 
                    WHERE id = %s;
                """, (max_disc, current_id))
                tier_id_map[name] = current_id
            else:
                cur.execute("""
                    INSERT INTO customer_tiers (name, max_discount_percentage, created_at)
                    VALUES (%s, %s, NOW())
                    RETURNING id;
                """, (name, max_disc))
                tier_id_map[name] = cur.fetchone()[0]
            print(f"   ✓ Tier: {name:10} | Max Discount Ceiling: {max_disc}%")

        # ---------------------------------------------------------------------
        # 3. SEED THE 3 TIER-SPECIFIC PRICE LISTS
        # ---------------------------------------------------------------------
        print("\n3️⃣  Seeding The 3 Tier-Specific Price Lists...")
        # Clear legacy price lists and replace with the 3 tier lists
        cur.execute("DELETE FROM price_list_items;")
        cur.execute("UPDATE quotations SET price_list_id = NULL;")
        cur.execute("DELETE FROM price_lists;")

        price_lists_data = [
            ("Bronze Tier Price List", tier_id_map.get("Bronze", 1), "INR", 0.0),
            ("Silver Tier Price List", tier_id_map.get("Silver", 2), "INR", -5.0),
            ("Gold Tier Price List",   tier_id_map.get("Gold", 3),   "INR", -10.0),
        ]
        price_list_id_map = {}
        for pl_name, t_id, curr, adj in price_lists_data:
            cur.execute("""
                INSERT INTO price_lists (name, tier_id, currency, adjustment_percentage, is_active, created_at)
                VALUES (%s, %s, %s, %s, TRUE, NOW())
                RETURNING id;
            """, (pl_name, t_id, curr, adj))
            new_pl_id = cur.fetchone()[0]
            price_list_id_map[t_id] = new_pl_id
            print(f"   ✓ Price List: {pl_name:25} | Currency: {curr} | Adj: {adj}% (ID: {new_pl_id})")

        # ---------------------------------------------------------------------
        # 4. SEED B2B CUSTOMERS & TIER ASSIGNMENTS
        # ---------------------------------------------------------------------
        print("\n4️⃣  Seeding B2B Customers & Auto-Assigned Tiers...")
        customers_data = [
            ("Acme Corp", "customer@acme.corp", "Gold", "27AABCA1234F1Z5", "100 Innovation Way, Silicon Valley, CA"),
            ("Beta Industries", "accounts@betaind.com", "Silver", "27AABCB5678F2Z6", "450 Industrial Parkway, Chicago, IL"),
            ("Delta Logistics", "finance@deltallc.com", "Bronze", "27AABCD9012F3Z7", "782 Freight Blvd, Dallas, TX"),
            ("Nova Retail", "orders@novaretail.com", "Bronze", "27AABCE3456F4Z8", "300 Commercial Ave, Atlanta, GA"),
            ("Zenith Co", "procurement@zenithco.com", "Gold", "27AABCF7890F5Z9", "12 Corporate Towers, New York, NY"),
            ("Neela Corporation", "harshilu01@gmail.com", "Gold", "27AABCG1122F6Z0", "550 Tech Park, Austin, TX")
        ]

        customer_id_map = {}
        for c_name, c_email, tier_name, gst, address in customers_data:
            cur.execute("SELECT id FROM customers WHERE email = %s;", (c_email,))
            row = cur.fetchone()
            if row:
                c_id = row[0]
                cur.execute("""
                    UPDATE customers 
                    SET company_name = %s, gst_number = %s, billing_address = %s, shipping_address = %s, updated_at = NOW()
                    WHERE id = %s;
                """, (c_name, gst, address, address, c_id))
            else:
                cur.execute("""
                    INSERT INTO customers (company_name, gst_number, email, phone, billing_address, shipping_address, is_active, created_at, updated_at)
                    VALUES (%s, %s, %s, '+1-800-555-0199', %s, %s, TRUE, NOW(), NOW())
                    RETURNING id;
                """, (c_name, gst, c_email, address, address))
                c_id = cur.fetchone()[0]
            customer_id_map[c_email] = c_id

            # Ensure active tier assignment in customer_tier_assignments
            t_id = tier_id_map.get(tier_name, 1)
            cur.execute("DELETE FROM customer_tier_assignments WHERE customer_id = %s;", (c_id,))
            cur.execute("""
                INSERT INTO customer_tier_assignments (customer_id, tier_id, is_current, assigned_at)
                VALUES (%s, %s, TRUE, NOW());
            """, (c_id, t_id))
            print(f"   ✓ Customer: {c_name:20} | Tier: {tier_name:6} (Tier ID: {t_id}) | ID: {c_id}")

        # ---------------------------------------------------------------------
        # 5. LINK CUSTOMER USERS (Portal Login access)
        # ---------------------------------------------------------------------
        print("\n5️⃣  Linking Customer Users to Portal Accounts...")
        portal_links = [
            ("customer@acme.corp", "customer@acme.corp"),
            ("harshilu01@gmail.com", "harshilu01@gmail.com"),
        ]
        for cust_email, user_email in portal_links:
            c_id = customer_id_map.get(cust_email)
            u_id = user_id_map.get(user_email)
            if c_id and u_id:
                cur.execute("DELETE FROM customer_users WHERE customer_id = %s AND user_id = %s;", (c_id, u_id))
                cur.execute("""
                    INSERT INTO customer_users (customer_id, user_id, is_primary_contact, created_at)
                    VALUES (%s, %s, TRUE, NOW());
                """, (c_id, u_id))
                print(f"   ✓ Linked User {user_email} to Customer {cust_email}")

        # ---------------------------------------------------------------------
        # 6. PRODUCT CATEGORIES & CEILINGS
        # ---------------------------------------------------------------------
        print("\n6️⃣  Seeding Product Categories & Discount Ceilings...")
        categories_data = [
            ("Hardware", 15.0),
            ("Services", 10.0),
            ("Subscriptions", 20.0)
        ]
        category_id_map = {}
        for cat_name, ceiling in categories_data:
            cur.execute("SELECT id FROM product_categories WHERE name = %s;", (cat_name,))
            row = cur.fetchone()
            if row:
                cat_id = row[0]
            else:
                cur.execute("INSERT INTO product_categories (name, created_at) VALUES (%s, NOW()) RETURNING id;", (cat_name,))
                cat_id = cur.fetchone()[0]
            category_id_map[cat_name] = cat_id

            cur.execute("""
                INSERT INTO category_discount_ceilings (category_id, max_discount_percentage)
                VALUES (%s, %s)
                ON CONFLICT (category_id) DO UPDATE SET max_discount_percentage = EXCLUDED.max_discount_percentage;
            """, (cat_id, ceiling))
            print(f"   ✓ Category: {cat_name:15} | Discount Ceiling: {ceiling}% (ID: {cat_id})")

        # ---------------------------------------------------------------------
        # 7. APPROVAL GOVERNANCE RULES
        # ---------------------------------------------------------------------
        print("\n7️⃣  Seeding Approval Governance Rules (Low, Medium, High Risk)...")
        approval_rules_data = [
            ("Low Risk Standard Governance", 0.0, 0.0, False, False),
            ("Moderate Excess Discount (Up to +5pt)", 0.01, 5.0, True, False),
            ("High Risk Excess Discount (> +5pt)", 5.01, 100.0, True, True),
        ]
        cur.execute("DELETE FROM approval_rules;")
        for rule_name, min_s, max_s, req_mgr, req_fin in approval_rules_data:
            cur.execute("""
                INSERT INTO approval_rules (name, min_risk_score, max_risk_score, requires_sales_manager, requires_finance, is_active, created_at)
                VALUES (%s, %s, %s, %s, %s, TRUE, NOW());
            """, (rule_name, min_s, max_s, req_mgr, req_fin))
            print(f"   ✓ Rule: {rule_name:40} | Range: {min_s}-{max_s} | Mgr: {req_mgr} | Fin: {req_fin}")

        # ---------------------------------------------------------------------
        # 8. WAREHOUSES & FACILITIES
        # ---------------------------------------------------------------------
        print("\n8️⃣  Seeding Warehouses...")
        warehouses_data = [
            ("Main Warehouse - Central", "WH-CENTRAL", "100 Logistics Way, Indianapolis, IN", 1.0),
            ("East Coast Depot", "WH-EAST", "200 Harbor Road, Newark, NJ", 1.25),
            ("West Coast Facility", "WH-WEST", "300 Pacific Ave, Oakland, CA", 1.5)
        ]
        warehouse_id_map = {}
        for w_name, code, addr, weight in warehouses_data:
            cur.execute("SELECT id FROM warehouses WHERE code = %s;", (code,))
            row = cur.fetchone()
            if row:
                w_id = row[0]
            else:
                cur.execute("""
                    INSERT INTO warehouses (name, code, address, shipping_cost_weight, is_active, created_at)
                    VALUES (%s, %s, %s, %s, TRUE, NOW())
                    RETURNING id;
                """, (w_name, code, addr, weight))
                w_id = cur.fetchone()[0]
            warehouse_id_map[code] = w_id
            print(f"   ✓ Warehouse: {w_name:28} | Code: {code:12} (ID: {w_id})")

        # ---------------------------------------------------------------------
        # 9. PRODUCTS, VARIANTS & WAREHOUSE INVENTORY
        # ---------------------------------------------------------------------
        print("\n9️⃣  Seeding Products, Product Variants & Stock Levels...")
        products_catalog = [
            {
                "name": "Enterprise Server Rack X-100",
                "category": "Hardware",
                "desc": "High-density 42U Server Rack with dual redundant PDUs and intelligent cooling.",
                "unit": "unit",
                "base_price": 4500.0,
                "tax": 18.0,
                "variants": [
                    {"sku": "HW-SRV-42U", "name": "Standard 42U Dual PDU", "price": 4500.0, "stock": {"WH-CENTRAL": 15, "WH-EAST": 8, "WH-WEST": 4}}
                ]
            },
            {
                "name": "High-Performance Workstation Pro",
                "category": "Hardware",
                "desc": "Intel Xeon 32-Core, 128GB ECC RAM, NVIDIA RTX 6000 Ada Workstation.",
                "unit": "unit",
                "base_price": 1800.0,
                "tax": 18.0,
                "variants": [
                    {"sku": "HW-WS-64GB", "name": "64GB DDR5 / RTX 4080", "price": 1800.0, "stock": {"WH-CENTRAL": 25, "WH-EAST": 12, "WH-WEST": 10}},
                    {"sku": "HW-WS-128GB", "name": "128GB DDR5 / RTX 6000", "price": 2400.0, "stock": {"WH-CENTRAL": 10, "WH-EAST": 5, "WH-WEST": 2}}
                ]
            },
            {
                "name": "Industrial Network Switch 48-Port",
                "category": "Hardware",
                "desc": "Managed 10GbE PoE+ switch for enterprise core campus deployments.",
                "unit": "unit",
                "base_price": 850.0,
                "tax": 18.0,
                "variants": [
                    {"sku": "HW-SW-48P", "name": "48-Port Managed PoE+", "price": 850.0, "stock": {"WH-CENTRAL": 40, "WH-EAST": 20, "WH-WEST": 15}}
                ]
            },
            {
                "name": "On-Site Network Installation & Setup",
                "category": "Services",
                "desc": "Full white-glove rack mounting, cable dressing, VLAN tagging, and SLA cert.",
                "unit": "service",
                "base_price": 600.0,
                "tax": 18.0,
                "variants": [
                    {"sku": "SRV-INST-ON", "name": "Standard 8-Hour Setup Service", "price": 600.0, "stock": {"WH-CENTRAL": 999, "WH-EAST": 999, "WH-WEST": 999}}
                ]
            },
            {
                "name": "Annual Maintenance Contract (AMC)",
                "category": "Services",
                "desc": "Advance hardware exchange, quarterly health audits, and 4-hour on-site guarantee.",
                "unit": "service",
                "base_price": 1200.0,
                "tax": 18.0,
                "variants": [
                    {"sku": "SRV-AMC-1YR", "name": "1-Year Hardware AMC", "price": 1200.0, "stock": {"WH-CENTRAL": 999, "WH-EAST": 999, "WH-WEST": 999}}
                ]
            },
            {
                "name": "DealFlow360 Cloud Platform License",
                "category": "Subscriptions",
                "desc": "Full-suite B2B CPQ, automated discount governance, and fulfillment visibility.",
                "unit": "recurring",
                "base_price": 120.0,
                "tax": 18.0,
                "variants": [
                    {"sku": "SUB-DF360-MO", "name": "Monthly Per-User SaaS License", "price": 120.0, "stock": {"WH-CENTRAL": 9999, "WH-EAST": 9999, "WH-WEST": 9999}},
                    {"sku": "SUB-DF360-YR", "name": "Annual Enterprise License (10 Users)", "price": 1200.0, "stock": {"WH-CENTRAL": 9999, "WH-EAST": 9999, "WH-WEST": 9999}}
                ]
            },
            {
                "name": "24/7 Dedicated Support & SLA Plan",
                "category": "Subscriptions",
                "desc": "Round-the-clock priority engineer hotline with 15-minute response SLA.",
                "unit": "recurring",
                "base_price": 250.0,
                "tax": 18.0,
                "variants": [
                    {"sku": "SUB-SLA-MO", "name": "Monthly Dedicated SLA Support", "price": 250.0, "stock": {"WH-CENTRAL": 9999, "WH-EAST": 9999, "WH-WEST": 9999}}
                ]
            }
        ]

        product_id_map = {}
        variant_id_map = {}

        for p in products_catalog:
            cat_id = category_id_map[p["category"]]
            cur.execute("SELECT id FROM products WHERE name = %s;", (p["name"],))
            p_row = cur.fetchone()
            if p_row:
                prod_id = p_row[0]
                cur.execute("""
                    UPDATE products 
                    SET category_id = %s, description = %s, unit = %s, base_price = %s, tax_percentage = %s, is_active = TRUE, updated_at = NOW()
                    WHERE id = %s;
                """, (cat_id, p["desc"], p["unit"], p["base_price"], p["tax"], prod_id))
            else:
                cur.execute("""
                    INSERT INTO products (name, category_id, description, unit, base_price, tax_percentage, is_active, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, TRUE, NOW(), NOW())
                    RETURNING id;
                """, (p["name"], cat_id, p["desc"], p["unit"], p["base_price"], p["tax"]))
                prod_id = cur.fetchone()[0]
            product_id_map[p["name"]] = prod_id

            for v in p["variants"]:
                cur.execute("SELECT id FROM product_variants WHERE sku = %s;", (v["sku"],))
                v_row = cur.fetchone()
                if v_row:
                    var_id = v_row[0]
                    cur.execute("""
                        UPDATE product_variants 
                        SET variant_name = %s, selling_price = %s, is_active = TRUE, updated_at = NOW()
                        WHERE id = %s;
                    """, (v["name"], v["price"], var_id))
                else:
                    cur.execute("""
                        INSERT INTO product_variants (product_id, sku, variant_name, selling_price, is_active, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, TRUE, NOW(), NOW())
                        RETURNING id;
                    """, (prod_id, v["sku"], v["name"], v["price"]))
                    var_id = cur.fetchone()[0]
                variant_id_map[v["sku"]] = var_id

                # Upsert inventory per warehouse
                for wh_code, qty in v["stock"].items():
                    wh_id = warehouse_id_map.get(wh_code)
                    if wh_id:
                        cur.execute("SELECT id FROM warehouse_stock WHERE warehouse_id = %s AND product_variant_id = %s;", (wh_id, var_id))
                        stock_row = cur.fetchone()
                        if stock_row:
                            cur.execute("UPDATE warehouse_stock SET quantity_on_hand = %s, updated_at = NOW() WHERE id = %s;", (qty, stock_row[0]))
                        else:
                            cur.execute("""
                                INSERT INTO warehouse_stock (warehouse_id, product_variant_id, quantity_on_hand, quantity_reserved, reorder_level, lead_time_days, updated_at)
                                VALUES (%s, %s, %s, 0, 5, 3, NOW());
                            """, (wh_id, var_id, qty))
            print(f"   ✓ Product: {p['name']:35} | Cat: {p['category']:13} | ID: {prod_id}")

        # ---------------------------------------------------------------------
        # 10. SUBSCRIPTION PLANS
        # ---------------------------------------------------------------------
        print("\n🔟 Seeding SaaS & Support Subscription Plans...")
        subscription_plans_data = [
            ("DealFlow360 Cloud Platform License", "DealFlow360 Monthly Cloud", "monthly", 120.0),
            ("DealFlow360 Cloud Platform License", "DealFlow360 Annual Enterprise", "yearly", 1200.0),
            ("24/7 Dedicated Support & SLA Plan", "24/7 Dedicated Support Monthly", "monthly", 250.0),
        ]
        sub_plan_id_map = {}
        for prod_name, plan_name, cycle, price in subscription_plans_data:
            p_id = product_id_map.get(prod_name)
            if p_id:
                cur.execute("SELECT id FROM subscription_plans WHERE name = %s;", (plan_name,))
                sp_row = cur.fetchone()
                if sp_row:
                    sp_id = sp_row[0]
                    cur.execute("UPDATE subscription_plans SET price = %s WHERE id = %s;", (price, sp_id))
                else:
                    cur.execute("""
                        INSERT INTO subscription_plans (product_id, name, billing_cycle, price, allow_proration, allow_cancellation, allow_partial_refund, is_active, created_at)
                        VALUES (%s, %s, %s, %s, TRUE, TRUE, TRUE, TRUE, NOW())
                        RETURNING id;
                    """, (p_id, plan_name, cycle, price))
                    sp_id = cur.fetchone()[0]
                sub_plan_id_map[plan_name] = sp_id
                print(f"   ✓ Plan: {plan_name:30} | Cycle: {cycle:8} | Price: ₹{price} (ID: {sp_id})")

        # ---------------------------------------------------------------------
        # 11. UPSELL & CROSS-SELL RULES
        # ---------------------------------------------------------------------
        print("\n1️⃣1️⃣ Seeding Live Upsell & Cross-Sell Rules...")
        cur.execute("DELETE FROM upsell_rules;")
        upsell_pairs = [
            ("High-Performance Workstation Pro", "24/7 Dedicated Support & SLA Plan", 12.0, 1),
            ("Enterprise Server Rack X-100", "On-Site Network Installation & Setup", 18.0, 1),
            ("Industrial Network Switch 48-Port", "Annual Maintenance Contract (AMC)", 15.0, 2),
        ]
        for src_name, sug_name, margin, prio in upsell_pairs:
            src_id = product_id_map.get(src_name)
            sug_id = product_id_map.get(sug_name)
            if src_id and sug_id:
                cur.execute("""
                    INSERT INTO upsell_rules (source_product_id, suggested_product_id, minimum_margin_percentage, priority, is_promoted, is_active, created_at)
                    VALUES (%s, %s, %s, %s, TRUE, TRUE, NOW());
                """, (src_id, sug_id, margin, prio))
                print(f"   ✓ Upsell: '{src_name[:25]}' ➔ Suggests: '{sug_name[:25]}' (Margin {margin}%)")

        # ---------------------------------------------------------------------
        # 12. DEAL HEALTH GOVERNANCE CONFIG
        # ---------------------------------------------------------------------
        print("\n1️⃣2️⃣ Seeding Deal Health & Anomaly Governance Config...")
        cur.execute("SELECT id FROM deal_health_config WHERE is_active = TRUE LIMIT 1;")
        dh_row = cur.fetchone()
        if dh_row:
            cur.execute("""
                UPDATE deal_health_config 
                SET stalled_days = 7, discount_anomaly_multiplier = 1.5, delivery_slippage_days = 3
                WHERE id = %s;
            """, (dh_row[0],))
        else:
            cur.execute("""
                INSERT INTO deal_health_config (stalled_days, discount_anomaly_multiplier, delivery_slippage_days, is_active, created_at)
                VALUES (7, 1.5, 3, TRUE, NOW());
            """)
        print("   ✓ Configured: Stalled threshold 7 days | Anomaly multiplier 1.5x | Delivery slippage 3 days")

        # ---------------------------------------------------------------------
        # 13. DEMONSTRATION QUOTATIONS ACROSS REAL-WORLD WORKFLOWS
        # ---------------------------------------------------------------------
        print("\n1️⃣3️⃣ Seeding Realistic Quotations Across Different Lifecycle Stages...")
        sales_rep_id = user_id_map.get("adityangandhi@gmail.com") or user_id_map.get("rep@dealflow.com")
        acme_cust_id = customer_id_map.get("customer@acme.corp")
        beta_cust_id = customer_id_map.get("accounts@betaind.com")
        delta_cust_id = customer_id_map.get("finance@deltallc.com")

        gold_tier_id = tier_id_map.get("Gold", 3)
        silver_tier_id = tier_id_map.get("Silver", 2)
        bronze_tier_id = tier_id_map.get("Bronze", 1)

        gold_pl_id = price_list_id_map.get(gold_tier_id)
        silver_pl_id = price_list_id_map.get(silver_tier_id)
        bronze_pl_id = price_list_id_map.get(bronze_tier_id)

        def upsert_quote(q_num, c_id, t_id, pl_id, status, risk_score, risk_lvl, sub, disc, tax, total, days_ago):
            cur.execute("SELECT id FROM quotations WHERE quotation_number = %s;", (q_num,))
            row = cur.fetchone()
            if row:
                q_id = row[0]
                cur.execute("""
                    UPDATE quotations 
                    SET customer_id = %s, sales_rep_id = %s, tier_id = %s, price_list_id = %s, status = %s::quotation_status_enum,
                        blended_risk_score = %s, risk_level = %s, subtotal = %s, discount_total = %s, tax_total = %s, grand_total = %s,
                        created_at = NOW() - (%s || ' days')::INTERVAL, updated_at = NOW() - (%s || ' days')::INTERVAL
                    WHERE id = %s;
                """, (c_id, sales_rep_id, t_id, pl_id, status, risk_score, risk_lvl, sub, disc, tax, total, days_ago, days_ago, q_id))
            else:
                cur.execute("""
                    INSERT INTO quotations (quotation_number, customer_id, sales_rep_id, tier_id, price_list_id, status, blended_risk_score, risk_level, subtotal, discount_total, tax_total, grand_total, valid_until, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s::quotation_status_enum, %s, %s, %s, %s, %s, %s, NOW() + INTERVAL '30 days', NOW() - (%s || ' days')::INTERVAL, NOW() - (%s || ' days')::INTERVAL)
                    RETURNING id;
                """, (q_num, c_id, sales_rep_id, t_id, pl_id, status, risk_score, risk_lvl, sub, disc, tax, total, days_ago, days_ago))
                q_id = cur.fetchone()[0]
            return q_id

        # Quote 1: Pending Approval (Excess Discount 25% on Gold tier -> Requires Sales Manager + Finance)
        q1_id = upsert_quote("QT-2026-0001", acme_cust_id, gold_tier_id, gold_pl_id, "pending_approval", 18.5, "high", 10800.0, 2700.0, 1458.0, 9558.0, 2)
        cur.execute("DELETE FROM quotation_items WHERE quotation_id = %s;", (q1_id,))
        cur.execute("""
            INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
            VALUES 
                (%s, %s, 1, 'Enterprise Server Rack X-100', 'HW-SRV-42U', 2, 4500.00, 3375.00, 25.0, 2250.00, 18.0, 1215.00, 15.0, 10.0, 7965.00, false),
                (%s, %s, 2, 'High-Performance Workstation Pro', 'HW-WS-64GB', 1, 1800.00, 1350.00, 25.0, 450.00, 18.0, 243.00, 15.0, 10.0, 1593.00, false);
        """, (q1_id, variant_id_map["HW-SRV-42U"], q1_id, variant_id_map["HW-WS-64GB"]))

        # Quote 1 Approval Request & Approval Chain Steps
        cur.execute("DELETE FROM approval_steps WHERE approval_request_id IN (SELECT id FROM approval_requests WHERE quotation_id = %s);", (q1_id,))
        cur.execute("DELETE FROM approval_requests WHERE quotation_id = %s;", (q1_id,))
        cur.execute("""
            INSERT INTO approval_requests (quotation_id, status, requested_by_user_id, requested_at)
            VALUES (%s, 'pending', %s, NOW() - INTERVAL '1 day')
            RETURNING id;
        """, (q1_id, sales_rep_id))
        app_req_id = cur.fetchone()[0]
        cur.execute("""
            INSERT INTO approval_steps (approval_request_id, step_number, approver_role, status)
            VALUES 
                (%s, 1, 'sales_manager', 'pending'),
                (%s, 2, 'finance', 'pending');
        """, (app_req_id, app_req_id))
        print(f"   ✓ [pending_approval] Quote: QT-2026-0001 | Customer: Acme Corp (Gold) | Excess: +10% ➔ Multi-step Approval")

        # Quote 2: Stalled Deal (Bronze tier, Sent 9 days ago -> Triggers Stalled Deal alert in Deal Health)
        q2_id = upsert_quote("QT-2026-0002", delta_cust_id, bronze_tier_id, bronze_pl_id, "sent", 0.0, "low", 5100.0, 255.0, 872.1, 5717.1, 9)
        cur.execute("DELETE FROM quotation_items WHERE quotation_id = %s;", (q2_id,))
        cur.execute("""
            INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
            VALUES (%s, %s, 1, 'High-Performance Workstation Pro (128GB)', 'HW-WS-128GB', 2, 2400.00, 2280.00, 5.0, 240.00, 18.0, 820.80, 5.0, 0.0, 5380.80, false);
        """, (q2_id, variant_id_map["HW-WS-128GB"]))
        print(f"   ✓ [sent - stalled]   Quote: QT-2026-0002 | Customer: Delta Logistics (Bronze) | Idle for 9 days")

        # Quote 3: Customer Counter Negotiation
        q3_id = upsert_quote("QT-2026-0003", acme_cust_id, gold_tier_id, gold_pl_id, "negotiating", 5.0, "medium", 5700.0, 570.0, 923.4, 6053.4, 3)
        cur.execute("DELETE FROM quotation_items WHERE quotation_id = %s;", (q3_id,))
        cur.execute("""
            INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
            VALUES 
                (%s, %s, 1, 'Enterprise Server Rack X-100', 'HW-SRV-42U', 1, 4500.00, 4050.00, 10.0, 450.00, 18.0, 729.00, 15.0, 0.0, 4779.00, false),
                (%s, %s, 2, 'Annual Maintenance Contract (AMC)', 'SRV-AMC-1YR', 1, 1200.00, 1080.00, 10.0, 120.00, 18.0, 194.40, 10.0, 0.0, 1274.40, false);
        """, (q3_id, variant_id_map["HW-SRV-42U"], q3_id, variant_id_map["SRV-AMC-1YR"]))

        cur.execute("DELETE FROM quotation_negotiations WHERE quotation_id = %s;", (q3_id,))
        acme_user_id = user_id_map.get("customer@acme.corp", sales_rep_id)
        cur.execute("""
            INSERT INTO quotation_negotiations (quotation_id, status, counter_discount_percentage, created_by_user_id, created_at, updated_at)
            VALUES (%s, 'open', 15.0, %s, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours')
            RETURNING id;
        """, (q3_id, acme_user_id))
        neg_id = cur.fetchone()[0]
        cur.execute("""
            INSERT INTO negotiation_messages (negotiation_id, sender_user_id, sender_type, message, created_at)
            VALUES 
                (%s, %s, 'customer', 'Hi! We would like to close this quote if an additional 5%% discount on AMC can be accommodated.', NOW() - INTERVAL '3 hours'),
                (%s, %s, 'sales_rep', 'Thanks John! Reviewing the commercial margin now with management.', NOW() - INTERVAL '1 hour');
        """, (neg_id, acme_user_id, neg_id, sales_rep_id))
        print(f"   ✓ [negotiating]      Quote: QT-2026-0003 | Live Counter-Offer & Negotiation Chat Thread")

        # Quote 4: Approved Quote Ready for 1-Click Confirmation
        q4_id = upsert_quote("QT-2026-0004", beta_cust_id, silver_tier_id, silver_pl_id, "approved", 8.0, "medium", 7500.0, 600.0, 1242.0, 8142.0, 1)
        cur.execute("DELETE FROM quotation_items WHERE quotation_id = %s;", (q4_id,))
        cur.execute("""
            INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
            VALUES 
                (%s, %s, 1, 'High-Performance Workstation Pro', 'HW-WS-64GB', 3, 1800.00, 1656.00, 8.0, 432.00, 18.0, 894.24, 10.0, 0.0, 5862.24, false),
                (%s, %s, 2, 'DealFlow360 Cloud Platform License (Monthly)', 'SUB-DF360-MO', 5, 120.00, 108.00, 10.0, 60.00, 18.0, 97.20, 20.0, 0.0, 637.20, true);
        """, (q4_id, variant_id_map["HW-WS-64GB"], q4_id, variant_id_map["SUB-DF360-MO"]))
        print(f"   ✓ [approved]         Quote: QT-2026-0004 | Customer: Beta Industries (Silver) | Ready to Confirm")

        # Quote 5: Confirmed Order with Multi-Warehouse Fulfillment & Payment
        q5_id = upsert_quote("QT-2026-0005", acme_cust_id, gold_tier_id, gold_pl_id, "confirmed", 0.0, "low", 12600.0, 1260.0, 2041.2, 13381.2, 5)
        cur.execute("DELETE FROM quotation_items WHERE quotation_id = %s;", (q5_id,))
        cur.execute("""
            INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
            VALUES 
                (%s, %s, 1, 'Enterprise Server Rack X-100', 'HW-SRV-42U', 2, 4500.00, 4050.00, 10.0, 900.00, 18.0, 1458.00, 15.0, 0.0, 9558.00, false),
                (%s, %s, 2, 'High-Performance Workstation Pro', 'HW-WS-64GB', 2, 1800.00, 1620.00, 10.0, 360.00, 18.0, 583.20, 15.0, 0.0, 3823.20, false);
        """, (q5_id, variant_id_map["HW-SRV-42U"], q5_id, variant_id_map["HW-WS-64GB"]))

        # ---------------------------------------------------------------------
        # 14. ORDERS, MULTI-WAREHOUSE SPLITS & INVOICES
        # ---------------------------------------------------------------------
        print("\n1️⃣4️⃣ Seeding Orders, Multi-Warehouse Splits, Invoices & Subscriptions...")
        cur.execute("SELECT id FROM orders WHERE quotation_id = %s;", (q5_id,))
        order_row = cur.fetchone()
        if order_row:
            ord_id = order_row[0]
        else:
            cur.execute("""
                INSERT INTO orders (order_number, quotation_id, customer_id, status, created_at, updated_at)
                VALUES ('ORD-2026-0001', %s, %s, 'processing', NOW() - INTERVAL '5 days', NOW())
                RETURNING id;
            """, (q5_id, acme_cust_id))
            ord_id = cur.fetchone()[0]

        cur.execute("DELETE FROM order_items WHERE order_id = %s;", (ord_id,))
        cur.execute("""
            INSERT INTO order_items (
                order_id, product_variant_id, line_type, product_name_snapshot, sku_snapshot,
                quantity, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, line_total
            )
            VALUES 
                (%s, %s, 'one_time', 'Enterprise Server Rack X-100', 'HW-SRV-42U', 2, 4050.00, 0, 0, 18.0, 1458.00, 9558.00),
                (%s, %s, 'one_time', 'High-Performance Workstation Pro', 'HW-WS-64GB', 2, 1620.00, 0, 0, 18.0, 583.20, 3823.20)
            RETURNING id, product_variant_id, quantity;
        """, (ord_id, variant_id_map["HW-SRV-42U"], ord_id, variant_id_map["HW-WS-64GB"]))
        ord_items = cur.fetchall()

        # Multi-warehouse allocation splits
        cur.execute("DELETE FROM fulfillment_splits WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = %s);", (ord_id,))
        wh_central_id = warehouse_id_map.get("WH-CENTRAL")
        wh_east_id = warehouse_id_map.get("WH-EAST")

        for oi_id, var_id, qty in ord_items:
            # Allocate 1 unit from Central and 1 unit from East
            cur.execute("""
                INSERT INTO fulfillment_splits (order_item_id, warehouse_id, quantity, status, estimated_shipment_date, estimated_shipping_cost, manual_override, created_at, updated_at)
                VALUES 
                    (%s, %s, 1, 'allocated', CURRENT_DATE + INTERVAL '2 days', 50.00, false, NOW(), NOW()),
                    (%s, %s, 1, 'pending', CURRENT_DATE + INTERVAL '4 days', 75.00, false, NOW(), NOW());
            """, (oi_id, wh_central_id, oi_id, wh_east_id))
        print(f"   ✓ Order: ORD-2026-0001 | Splits: WH-CENTRAL (allocated) + WH-EAST (pending)")

        # Invoice & Payment Settlement
        cur.execute("SELECT id FROM invoices WHERE order_id = %s;", (ord_id,))
        inv_row = cur.fetchone()
        if inv_row:
            inv_id = inv_row[0]
        else:
            cur.execute("""
                INSERT INTO invoices (
                    invoice_number, order_id, customer_id, status, invoice_date, due_date,
                    subtotal, discount_total, tax_total, grand_total, paid_amount, created_at, updated_at
                )
                VALUES (
                    'INV-2026-0001', %s, %s, 'paid', CURRENT_DATE - 5, CURRENT_DATE + 25,
                    11340.00, 0.00, 2041.20, 13381.20, 13381.20, NOW() - INTERVAL '5 days', NOW()
                )
                RETURNING id;
            """, (ord_id, acme_cust_id))
            inv_id = cur.fetchone()[0]

        cur.execute("DELETE FROM payments WHERE invoice_id = %s;", (inv_id,))
        cur.execute("""
            INSERT INTO payments (invoice_id, customer_id, amount, payment_method, status, transaction_reference, payment_date)
            VALUES (%s, %s, 13381.20, 'bank_transfer', 'completed', 'PAY-TXN-ACME-8849', NOW() - INTERVAL '4 days');
        """, (inv_id, acme_cust_id))
        print(f"   ✓ Invoice: INV-2026-0001 (₹13,381.20) | Payment: Settled via Bank Transfer")

        # ---------------------------------------------------------------------
        # COMMIT TRANSACTION
        # ---------------------------------------------------------------------
        conn.commit()
        print("\n" + "=" * 70)
        print("🎉 ALL SEED DATA SUCCESSFULLY INSERTED & COMMITTED!")
        print("=" * 70)

    except Exception as exc:
        conn.rollback()
        print(f"\n❌ Seeding encountered an error. Transaction rolled back:\n{exc}")
        raise exc
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed_database()
