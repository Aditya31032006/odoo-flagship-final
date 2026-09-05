import pg from 'pg';
import argon2 from 'argon2';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting DealFlow360 Comprehensive Demo Seeding...");
    await client.query("BEGIN");

    const defaultPasswordHash = await argon2.hash("password123");

    // 1. Seed / Upsert Users
    console.log("1️⃣ Seeding Users across all roles...");
    const usersData = [
      { name: "System Administrator", email: "admin@dealflow.com", role: "admin", mobile: "+1-555-0100" },
      { name: "Sarah Jenkins", email: "manager@dealflow.com", role: "sales_manager", mobile: "+1-555-0101" },
      { name: "Aditya Gandhi", email: "rep@dealflow.com", role: "sales_rep", mobile: "+1-555-0102" },
      { name: "Alex Rivera", email: "alex.rep@dealflow.com", role: "sales_rep", mobile: "+1-555-0103" },
      { name: "Frank Sterling", email: "finance@dealflow.com", role: "finance", mobile: "+1-555-0104" },
      { name: "Oliver Vance", email: "ops@dealflow.com", role: "operations", mobile: "+1-555-0105" },
      { name: "John Doe (Acme Corp)", email: "customer@acme.corp", role: "customer", mobile: "+1-555-0106" },
      { name: "Harshil Upadhyay", email: "harshilu01@gmail.com", role: "customer", mobile: "+1-555-0107" },
      { name: "Admin Lead", email: "techshock01@gmail.com", role: "admin", mobile: "+1-555-0108" },
      { name: "Aditya Gandhi (Rep)", email: "adityangandhi@gmail.com", role: "sales_rep", mobile: "+1-555-0109" }
    ];

    const userIdMap = {};
    for (const u of usersData) {
      const existing = await client.query("SELECT id FROM users WHERE email = $1", [u.email]);
      if (existing.rows.length > 0) {
        await client.query(`
          UPDATE users 
          SET name = $1, password_hash = $2, role = $3::user_role_enum, is_active = TRUE, updated_at = NOW()
          WHERE email = $4
        `, [u.name, defaultPasswordHash, u.role, u.email]);
        userIdMap[u.email] = existing.rows[0].id;
      } else {
        const ins = await client.query(`
          INSERT INTO users (name, email, password_hash, mobile, role, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5::user_role_enum, TRUE, NOW(), NOW())
          RETURNING id;
        `, [u.name, u.email, defaultPasswordHash, u.mobile, u.role]);
        userIdMap[u.email] = ins.rows[0].id;
      }
    }

    // 2. Customer Tiers
    console.log("2️⃣ Seeding Customer Tiers...");
    const tiers = [
      { name: "Bronze", max_discount_percentage: 5.0 },
      { name: "Silver", max_discount_percentage: 10.0 },
      { name: "Gold", max_discount_percentage: 15.0 },
      { name: "Standard", max_discount_percentage: 0.0 }
    ];
    const tierIdMap = {};
    for (const t of tiers) {
      const existing = await client.query("SELECT id FROM customer_tiers WHERE name = $1", [t.name]);
      if (existing.rows.length > 0) {
        await client.query(`
          UPDATE customer_tiers 
          SET max_discount_percentage = $1 
          WHERE id = $2
        `, [t.max_discount_percentage, existing.rows[0].id]);
        tierIdMap[t.name] = existing.rows[0].id;
      } else {
        const ins = await client.query(`
          INSERT INTO customer_tiers (name, max_discount_percentage, created_at)
          VALUES ($1, $2, NOW())
          RETURNING id;
        `, [t.name, t.max_discount_percentage]);
        tierIdMap[t.name] = ins.rows[0].id;
      }
    }

    // 3. Customers
    console.log("3️⃣ Seeding Customers...");
    const customersData = [
      { name: "Acme Corp", email: "customer@acme.corp", tierName: "Gold", gst: "GSTIN-ACME-9912", address: "100 Innovation Way, Silicon Valley, CA" },
      { name: "Beta Industries", email: "accounts@betaind.com", tierName: "Silver", gst: "GSTIN-BETA-4431", address: "450 Industrial Parkway, Chicago, IL" },
      { name: "Delta Logistics", email: "finance@deltallc.com", tierName: "Bronze", gst: "GSTIN-DELTA-8812", address: "782 Freight Blvd, Dallas, TX" },
      { name: "OmniCorp Global", email: "procurement@omnicorp.com", tierName: "Standard", gst: "GSTIN-OMNI-1002", address: "1 Rockefeller Plaza, New York, NY" },
      { name: "Neela Corporation", email: "harshilu01@gmail.com", tierName: "Gold", gst: "GSTIN-NEELA-7788", address: "550 Tech Park, Austin, TX" }
    ];

    const customerIdMap = {};
    for (const c of customersData) {
      const existing = await client.query("SELECT id FROM customers WHERE email = $1", [c.email]);
      let custId;
      if (existing.rows.length > 0) {
        custId = existing.rows[0].id;
        await client.query(`
          UPDATE customers 
          SET company_name = $1, gst_number = $2, billing_address = $3, shipping_address = $3, updated_at = NOW()
          WHERE id = $4
        `, [c.name, c.gst, c.address, custId]);
      } else {
        const ins = await client.query(`
          INSERT INTO customers (company_name, gst_number, email, phone, billing_address, shipping_address, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, '+1-800-555-0199', $4, $4, TRUE, NOW(), NOW())
          RETURNING id;
        `, [c.name, c.gst, c.email, c.address]);
        custId = ins.rows[0].id;
      }
      customerIdMap[c.email] = custId;

      const tierId = tierIdMap[c.tierName] || 1;
      await client.query(`DELETE FROM customer_tier_assignments WHERE customer_id = $1;`, [custId]);
      await client.query(`
        INSERT INTO customer_tier_assignments (customer_id, tier_id, assigned_at)
        VALUES ($1, $2, NOW());
      `, [custId, tierId]);
    }

    // Link customer users
    if (userIdMap["customer@acme.corp"] && customerIdMap["customer@acme.corp"]) {
      const cId = customerIdMap["customer@acme.corp"];
      const uId = userIdMap["customer@acme.corp"];
      await client.query(`DELETE FROM customer_users WHERE customer_id = $1 AND user_id = $2;`, [cId, uId]);
      await client.query(`
        INSERT INTO customer_users (customer_id, user_id, is_primary_contact, created_at)
        VALUES ($1, $2, TRUE, NOW());
      `, [cId, uId]);
    }
    if (userIdMap["harshilu01@gmail.com"] && customerIdMap["harshilu01@gmail.com"]) {
      const cId = customerIdMap["harshilu01@gmail.com"];
      const uId = userIdMap["harshilu01@gmail.com"];
      await client.query(`DELETE FROM customer_users WHERE customer_id = $1 AND user_id = $2;`, [cId, uId]);
      await client.query(`
        INSERT INTO customer_users (customer_id, user_id, is_primary_contact, created_at)
        VALUES ($1, $2, TRUE, NOW());
      `, [cId, uId]);
    }

    // 4. Product Categories
    console.log("4️⃣ Seeding Product Categories...");
    const categories = ["Hardware", "Services", "Subscriptions"];
    const categoryIdMap = {};
    for (const catName of categories) {
      const existing = await client.query("SELECT id FROM product_categories WHERE name = $1", [catName]);
      if (existing.rows.length > 0) {
        categoryIdMap[catName] = existing.rows[0].id;
      } else {
        const ins = await client.query("INSERT INTO product_categories (name, created_at) VALUES ($1, NOW()) RETURNING id;", [catName]);
        categoryIdMap[catName] = ins.rows[0].id;
      }
    }

    // 5. Category Discount Ceilings & Approval Rules
    console.log("5️⃣ Seeding Category Discount Ceilings & Approval Rules...");
    const catRules = [
      { catName: "Hardware", maxDiscount: 15.0 },
      { catName: "Services", maxDiscount: 10.0 },
      { catName: "Subscriptions", maxDiscount: 20.0 }
    ];
    for (const r of catRules) {
      const catId = categoryIdMap[r.catName];
      if (catId) {
        await client.query(`
          INSERT INTO category_discount_ceilings (category_id, max_discount_percentage)
          VALUES ($1, $2)
          ON CONFLICT (category_id) DO UPDATE SET max_discount_percentage = EXCLUDED.max_discount_percentage;
        `, [catId, r.maxDiscount]);
      }
    }

    const approvalRules = [
      { name: "Low Risk Auto-Approval", minScore: 0.0, maxScore: 5.0, mgr: false, fin: false },
      { name: "Medium Risk - Sales Manager Required", minScore: 5.01, maxScore: 15.0, mgr: true, fin: false },
      { name: "High Risk - Executive & Finance Required", minScore: 15.01, maxScore: 100.0, mgr: true, fin: true }
    ];
    await client.query("DELETE FROM approval_rules;");
    for (const ar of approvalRules) {
      await client.query(`
        INSERT INTO approval_rules (name, min_risk_score, max_risk_score, requires_sales_manager, requires_finance, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, TRUE, NOW());
      `, [ar.name, ar.minScore, ar.maxScore, ar.mgr, ar.fin]);
    }

    // 6. Warehouses & Stock
    console.log("6️⃣ Seeding Warehouses & Inventory...");
    const warehousesData = [
      { name: "Main Warehouse - Central", code: "WH-CENTRAL", address: "100 Logistics Way, Indianapolis, IN", weight: 1.0 },
      { name: "East Coast Depot", code: "WH-EAST", address: "200 Harbor Road, Newark, NJ", weight: 1.25 },
      { name: "West Coast Facility", code: "WH-WEST", address: "300 Pacific Ave, Oakland, CA", weight: 1.5 }
    ];
    const warehouseIdMap = {};
    for (const w of warehousesData) {
      const existing = await client.query("SELECT id FROM warehouses WHERE code = $1", [w.code]);
      if (existing.rows.length > 0) {
        warehouseIdMap[w.code] = existing.rows[0].id;
      } else {
        const ins = await client.query(`
          INSERT INTO warehouses (name, code, address, shipping_cost_weight, is_active, created_at)
          VALUES ($1, $2, $3, $4, TRUE, NOW())
          RETURNING id;
        `, [w.name, w.code, w.address, w.weight]);
        warehouseIdMap[w.code] = ins.rows[0].id;
      }
    }

    // 7. Products & Variants
    console.log("7️⃣ Seeding Products, Variants & Subscriptions...");
    const productsData = [
      {
        name: "Enterprise Server Rack X-100",
        categoryName: "Hardware",
        description: "High-density 42U Server Rack with redundant power and integrated cooling.",
        unit: "unit",
        base_price: 4500.0,
        tax: 18.0,
        variants: [
          { sku: "HW-SRV-42U", name: "Standard 42U Dual PDU", price: 4500.0, stock: { "WH-CENTRAL": 15, "WH-EAST": 8, "WH-WEST": 4 } }
        ]
      },
      {
        name: "High-Performance Workstation Pro",
        categoryName: "Hardware",
        description: "Intel Xeon 32-Core, 128GB ECC RAM, NVIDIA RTX 6000 Workstation.",
        unit: "unit",
        base_price: 1800.0,
        tax: 18.0,
        variants: [
          { sku: "HW-WS-64GB", name: "64GB DDR5 / RTX 4080", price: 1800.0, stock: { "WH-CENTRAL": 25, "WH-EAST": 12, "WH-WEST": 10 } },
          { sku: "HW-WS-128GB", name: "128GB DDR5 / RTX 6000", price: 2400.0, stock: { "WH-CENTRAL": 10, "WH-EAST": 5, "WH-WEST": 2 } }
        ]
      },
      {
        name: "Industrial Network Switch 48-Port",
        categoryName: "Hardware",
        description: "Managed 10GbE PoE+ switch for mission-critical enterprise backbones.",
        unit: "unit",
        base_price: 850.0,
        tax: 18.0,
        variants: [
          { sku: "HW-SW-48P", name: "48-Port Managed PoE+", price: 850.0, stock: { "WH-CENTRAL": 40, "WH-EAST": 20, "WH-WEST": 15 } }
        ]
      },
      {
        name: "On-Site Network Installation & Setup",
        categoryName: "Services",
        description: "Full white-glove deployment, cabling, rack mounting, and security configuration.",
        unit: "service",
        base_price: 600.0,
        tax: 18.0,
        variants: [
          { sku: "SRV-INST-ON", name: "Standard 8-Hour Setup Service", price: 600.0, stock: { "WH-CENTRAL": 999, "WH-EAST": 999, "WH-WEST": 999 } }
        ]
      },
      {
        name: "Annual Maintenance Contract (AMC)",
        categoryName: "Services",
        description: "Comprehensive hardware replacement guarantee, quarterly diagnostics, and 4-hour SLA.",
        unit: "service",
        base_price: 1200.0,
        tax: 18.0,
        variants: [
          { sku: "SRV-AMC-1YR", name: "1-Year Hardware AMC", price: 1200.0, stock: { "WH-CENTRAL": 999, "WH-EAST": 999, "WH-WEST": 999 } }
        ]
      },
      {
        name: "DealFlow360 Cloud Platform License",
        categoryName: "Subscriptions",
        description: "Full-suite cloud sales governance, automated approval routing, and deal analytics.",
        unit: "recurring",
        base_price: 120.0,
        tax: 18.0,
        variants: [
          { sku: "SUB-DF360-MO", name: "Monthly Per-User SaaS License", price: 120.0, stock: { "WH-CENTRAL": 9999, "WH-EAST": 9999, "WH-WEST": 9999 } },
          { sku: "SUB-DF360-YR", name: "Annual Enterprise License (10 Users)", price: 1200.0, stock: { "WH-CENTRAL": 9999, "WH-EAST": 9999, "WH-WEST": 9999 } }
        ]
      },
      {
        name: "24/7 Dedicated Support & SLA Plan",
        categoryName: "Subscriptions",
        description: "Round-the-clock priority engineer response within 15 minutes.",
        unit: "recurring",
        base_price: 250.0,
        tax: 18.0,
        variants: [
          { sku: "SUB-SLA-MO", name: "Monthly Dedicated SLA Support", price: 250.0, stock: { "WH-CENTRAL": 9999, "WH-EAST": 9999, "WH-WEST": 9999 } }
        ]
      }
    ];

    const productIdMap = {};
    const variantIdMap = {};

    for (const p of productsData) {
      const catId = categoryIdMap[p.categoryName] || 1;
      let prodId;
      const existingProd = await client.query("SELECT id FROM products WHERE name = $1", [p.name]);
      if (existingProd.rows.length > 0) {
        prodId = existingProd.rows[0].id;
        await client.query(`
          UPDATE products 
          SET category_id = $1, description = $2, unit = $3, base_price = $4, tax_percentage = $5, is_active = TRUE, updated_at = NOW()
          WHERE id = $6
        `, [catId, p.description, p.unit, p.base_price, p.tax, prodId]);
      } else {
        const ins = await client.query(`
          INSERT INTO products (name, category_id, description, unit, base_price, tax_percentage, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
          RETURNING id;
        `, [p.name, catId, p.description, p.unit, p.base_price, p.tax]);
        prodId = ins.rows[0].id;
      }
      productIdMap[p.name] = prodId;

      for (const v of p.variants) {
        let varId;
        const existingVar = await client.query("SELECT id FROM product_variants WHERE sku = $1", [v.sku]);
        if (existingVar.rows.length > 0) {
          varId = existingVar.rows[0].id;
          await client.query(`
            UPDATE product_variants 
            SET variant_name = $1, selling_price = $2, is_active = TRUE, updated_at = NOW()
            WHERE id = $3
          `, [v.name, v.price, varId]);
        } else {
          const ins = await client.query(`
            INSERT INTO product_variants (product_id, sku, variant_name, selling_price, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
            RETURNING id;
          `, [prodId, v.sku, v.name, v.price]);
          varId = ins.rows[0].id;
        }
        variantIdMap[v.sku] = varId;

        for (const [whCode, qty] of Object.entries(v.stock)) {
          const whId = warehouseIdMap[whCode];
          if (whId) {
            const existingStock = await client.query(`
              SELECT id FROM warehouse_stock WHERE warehouse_id = $1 AND product_variant_id = $2
            `, [whId, varId]);
            if (existingStock.rows.length > 0) {
              await client.query(`
                UPDATE warehouse_stock 
                SET quantity_on_hand = $1, updated_at = NOW()
                WHERE id = $2
              `, [qty, existingStock.rows[0].id]);
            } else {
              await client.query(`
                INSERT INTO warehouse_stock (warehouse_id, product_variant_id, quantity_on_hand, quantity_reserved, reorder_level, lead_time_days, updated_at)
                VALUES ($1, $2, $3, 0, 5, 3, NOW());
              `, [whId, varId, qty]);
            }
          }
        }
      }
    }

    // 8. Subscription Plans Setup
    console.log("8️⃣ Seeding Subscription Plans...");
    const subPlans = [
      { prodName: "DealFlow360 Cloud Platform License", name: "DealFlow360 Monthly Cloud", cycle: "monthly", price: 120.0 },
      { prodName: "DealFlow360 Cloud Platform License", name: "DealFlow360 Annual Enterprise", cycle: "yearly", price: 1200.0 },
      { prodName: "24/7 Dedicated Support & SLA Plan", name: "24/7 Dedicated Support Monthly", cycle: "monthly", price: 250.0 }
    ];
    for (const sp of subPlans) {
      const prodId = productIdMap[sp.prodName];
      if (prodId) {
        const existing = await client.query("SELECT id FROM subscription_plans WHERE name = $1", [sp.name]);
        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO subscription_plans (product_id, name, billing_cycle, price, allow_proration, allow_cancellation, allow_partial_refund, is_active, created_at)
            VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE, TRUE, NOW());
          `, [prodId, sp.name, sp.cycle, sp.price]);
        }
      }
    }

    // 9. Upsell Rules
    console.log("9️⃣ Seeding Live Upsell / Cross-Sell Rules...");
    const pWS = productIdMap["High-Performance Workstation Pro"];
    const pSLA = productIdMap["24/7 Dedicated Support & SLA Plan"];
    const pRack = productIdMap["Enterprise Server Rack X-100"];
    const pInst = productIdMap["On-Site Network Installation & Setup"];
    const pSwitch = productIdMap["Industrial Network Switch 48-Port"];
    const pAMC = productIdMap["Annual Maintenance Contract (AMC)"];

    await client.query("DELETE FROM upsell_rules;");
    if (pWS && pSLA) {
      await client.query(`
        INSERT INTO upsell_rules (source_product_id, suggested_product_id, minimum_margin_percentage, priority, is_promoted, is_active, created_at)
        VALUES ($1, $2, 12.0, 1, TRUE, TRUE, NOW());
      `, [pWS, pSLA]);
    }
    if (pRack && pInst) {
      await client.query(`
        INSERT INTO upsell_rules (source_product_id, suggested_product_id, minimum_margin_percentage, priority, is_promoted, is_active, created_at)
        VALUES ($1, $2, 18.0, 1, TRUE, TRUE, NOW());
      `, [pRack, pInst]);
    }
    if (pSwitch && pAMC) {
      await client.query(`
        INSERT INTO upsell_rules (source_product_id, suggested_product_id, minimum_margin_percentage, priority, is_promoted, is_active, created_at)
        VALUES ($1, $2, 15.0, 2, FALSE, TRUE, NOW());
      `, [pSwitch, pAMC]);
    }

    // 10. Deal Health Configuration
    console.log("🔟 Seeding Deal Health Configuration & Baseline Flags...");
    const existingConfig = await client.query("SELECT id FROM deal_health_config WHERE is_active = TRUE LIMIT 1;");
    if (existingConfig.rows.length > 0) {
      await client.query(`
        UPDATE deal_health_config 
        SET stalled_days = 7, discount_anomaly_multiplier = 1.5, delivery_slippage_days = 3
        WHERE id = $1
      `, [existingConfig.rows[0].id]);
    } else {
      await client.query(`
        INSERT INTO deal_health_config (stalled_days, discount_anomaly_multiplier, delivery_slippage_days, is_active, created_at)
        VALUES (7, 1.5, 3, TRUE, NOW());
      `);
    }

    // 11. Live Demonstration Quotations Across Every Stage & Persona
    console.log("1️⃣1️⃣ Seeding Live Demonstration Quotations...");
    const repId = userIdMap["adityangandhi@gmail.com"] || userIdMap["rep@dealflow.com"] || Object.values(userIdMap)[0];
    const custAcmeId = customerIdMap["customer@acme.corp"] || Object.values(customerIdMap)[0];
    const custBetaId = customerIdMap["accounts@betaind.com"] || custAcmeId;
    const custDeltaId = customerIdMap["finance@deltallc.com"] || custAcmeId;
    const goldTierId = tierIdMap["Gold"] || 1;

    // Helper to upsert quote
    async function createDemoQuote(num, custId, status, riskScore, riskLevel, sub, disc, tax, total, createdDaysAgo, updatedDaysAgo) {
      const existing = await client.query("SELECT id FROM quotations WHERE quotation_number = $1", [num]);
      if (existing.rows.length > 0) {
        const qId = existing.rows[0].id;
        await client.query(`
          UPDATE quotations 
          SET status = $1::quotation_status_enum, blended_risk_score = $2, risk_level = $3,
              subtotal = $4, discount_total = $5, tax_total = $6, grand_total = $7,
              created_at = NOW() - ($8 || ' days')::INTERVAL, updated_at = NOW() - ($9 || ' days')::INTERVAL
          WHERE id = $10
        `, [status, riskScore, riskLevel, sub, disc, tax, total, createdDaysAgo, updatedDaysAgo, qId]);
        return qId;
      } else {
        const ins = await client.query(`
          INSERT INTO quotations (quotation_number, customer_id, sales_rep_id, tier_id, status, blended_risk_score, risk_level, subtotal, discount_total, tax_total, grand_total, valid_until, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5::quotation_status_enum, $6, $7, $8, $9, $10, $11, NOW() + INTERVAL '30 days', NOW() - ($12 || ' days')::INTERVAL, NOW() - ($13 || ' days')::INTERVAL)
          RETURNING id;
        `, [num, custId, repId, goldTierId, status, riskScore, riskLevel, sub, disc, tax, total, createdDaysAgo, updatedDaysAgo]);
        return ins.rows[0].id;
      }
    }

    // QUO-1: Pending Approval (High Discount 25% & Blended Risk 18.5 -> Manager + Finance)
    const q1Id = await createDemoQuote('QUO-2026-0001', custAcmeId, 'pending_approval', 18.50, 'high', 10800.00, 2700.00, 1458.00, 9558.00, 2, 1);
    const vRack = variantIdMap["HW-SRV-42U"];
    const vWS64 = variantIdMap["HW-WS-64GB"];
    const vWS128 = variantIdMap["HW-WS-128GB"];
    const vSwitch = variantIdMap["HW-SW-48P"];
    const vAMC = variantIdMap["SRV-AMC-1YR"];
    const vSubMo = variantIdMap["SUB-DF360-MO"];
    const vSubYr = variantIdMap["SUB-DF360-YR"];

    await client.query("DELETE FROM quotation_items WHERE quotation_id = $1", [q1Id]);
    if (vRack && vWS64) {
      await client.query(`
        INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
        VALUES 
          ($1, $2, 1, 'Enterprise Server Rack X-100', 'HW-SRV-42U', 2, 4500.00, 3375.00, 25.0, 2250.00, 18.0, 1215.00, 15.0, 10.0, 7965.00, false),
          ($1, $3, 2, 'High-Performance Workstation Pro', 'HW-WS-64GB', 1, 1800.00, 1350.00, 25.0, 450.00, 18.0, 243.00, 15.0, 10.0, 1593.00, false);
      `, [q1Id, vRack, vWS64]);
    }

    // Approval Request for QUO-1
    await client.query("DELETE FROM approval_steps WHERE approval_request_id IN (SELECT id FROM approval_requests WHERE quotation_id = $1)", [q1Id]);
    await client.query("DELETE FROM approval_requests WHERE quotation_id = $1", [q1Id]);
    const appReqRes = await client.query(`
      INSERT INTO approval_requests (quotation_id, status, requested_by_user_id, requested_at)
      VALUES ($1, 'pending', $2, NOW() - INTERVAL '1 day')
      RETURNING id;
    `, [q1Id, repId]);
    if (appReqRes.rows.length > 0) {
      await client.query(`
        INSERT INTO approval_steps (approval_request_id, step_number, approver_role, status)
        VALUES 
          ($1, 1, 'sales_manager', 'pending'),
          ($1, 2, 'finance', 'pending');
      `, [appReqRes.rows[0].id]);
    }

    // QUO-2: Stalled Deal (Idle for 9 days -> triggers Stalled Deal alert in Deal Health)
    const q2Id = await createDemoQuote('QUO-2026-0002', custDeltaId, 'sent', 3.00, 'low', 5100.00, 255.00, 872.10, 5717.10, 12, 9);
    await client.query("DELETE FROM quotation_items WHERE quotation_id = $1", [q2Id]);
    if (vWS128) {
      await client.query(`
        INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
        VALUES ($1, $2, 1, 'High-Performance Workstation Pro (128GB)', 'HW-WS-128GB', 2, 2400.00, 2280.00, 5.0, 240.00, 18.0, 820.80, 5.0, 0.0, 5380.80, false);
      `, [q2Id, vWS128]);
    }

    // QUO-3: Discount Anomaly Quote (40% discount on Hardware -> triggers Discount Anomaly alert)
    const q3Id = await createDemoQuote('QUO-2026-0003', custBetaId, 'draft', 28.00, 'high', 8500.00, 3400.00, 918.00, 6018.00, 3, 1);
    await client.query("DELETE FROM quotation_items WHERE quotation_id = $1", [q3Id]);
    if (vSwitch) {
      await client.query(`
        INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
        VALUES ($1, $2, 1, 'Industrial Network Switch 48-Port', 'HW-SW-48P', 10, 850.00, 510.00, 40.0, 3400.00, 18.0, 918.00, 10.0, 30.0, 6018.00, false);
      `, [q3Id, vSwitch]);
    }

    // QUO-4: Under Customer Negotiation (Customer requested 5% extra discount)
    const q4Id = await createDemoQuote('QUO-2026-0004', custAcmeId, 'negotiating', 12.00, 'medium', 5700.00, 570.00, 923.40, 6053.40, 4, 0.2);
    await client.query("DELETE FROM quotation_items WHERE quotation_id = $1", [q4Id]);
    if (vRack && vAMC) {
      await client.query(`
        INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
        VALUES 
          ($1, $2, 1, 'Enterprise Server Rack X-100', 'HW-SRV-42U', 1, 4500.00, 4050.00, 10.0, 450.00, 18.0, 729.00, 15.0, 0.0, 4779.00, false),
          ($1, $3, 2, 'Annual Maintenance Contract (AMC)', 'SRV-AMC-1YR', 1, 1200.00, 1080.00, 10.0, 120.00, 18.0, 194.40, 10.0, 0.0, 1274.40, false);
      `, [q4Id, vRack, vAMC]);
    }

    await client.query("DELETE FROM quotation_negotiations WHERE quotation_id = $1", [q4Id]);
    const custUserId = userIdMap["customer@acme.corp"] || repId;
    const negIns = await client.query(`
      INSERT INTO quotation_negotiations (quotation_id, status, counter_discount_percentage, created_by_user_id, created_at, updated_at)
      VALUES ($1, 'open', 15.0, $2, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours')
      RETURNING id;
    `, [q4Id, custUserId]);
    if (negIns.rows.length > 0) {
      await client.query(`
        INSERT INTO negotiation_messages (negotiation_id, sender_user_id, sender_type, message, created_at)
        VALUES 
          ($1, $2, 'customer', 'Hi team, could we get an additional 5% discount on the AMC package if we sign today?', NOW() - INTERVAL '4 hours'),
          ($1, $3, 'sales_rep', 'Hello! We can consider this if you commit to the annual support SLA.', NOW() - INTERVAL '2 hours');
      `, [negIns.rows[0].id, custUserId, repId]);
    }

    // QUO-5: Approved Quotation (Ready for 1-Click Customer Direct Confirmation)
    const q5Id = await createDemoQuote('QUO-2026-0005', custAcmeId, 'approved', 8.00, 'medium', 7500.00, 600.00, 1242.00, 8142.00, 2, 0.1);
    await client.query("DELETE FROM quotation_items WHERE quotation_id = $1", [q5Id]);
    if (vWS64 && vSubMo) {
      await client.query(`
        INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
        VALUES 
          ($1, $2, 1, 'High-Performance Workstation Pro', 'HW-WS-64GB', 3, 1800.00, 1656.00, 8.0, 432.00, 18.0, 894.24, 15.0, 0.0, 5862.24, false),
          ($1, $3, 2, 'DealFlow360 Cloud Platform License (Monthly)', 'SUB-DF360-MO', 5, 120.00, 108.00, 10.0, 60.00, 18.0, 97.20, 20.0, 0.0, 637.20, true);
      `, [q5Id, vWS64, vSubMo]);
    }

    // QUO-6: Confirmed Order (With Multi-Warehouse Fulfillment Split, Invoices & Subscriptions)
    const q6Id = await createDemoQuote('QUO-2026-0006', custAcmeId, 'confirmed', 5.00, 'low', 11400.00, 570.00, 1949.40, 12779.40, 5, 4);
    await client.query("DELETE FROM quotation_items WHERE quotation_id = $1", [q6Id]);
    let q6Item1Id, q6Item2Id;
    if (vRack && vSubYr) {
      const qi1 = await client.query(`
        INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
        VALUES ($1, $2, 1, 'Enterprise Server Rack X-100', 'HW-SRV-42U', 2, 4500.00, 4275.00, 5.0, 450.00, 18.0, 1539.00, 15.0, 0.0, 10089.00, false)
        RETURNING id;
      `, [q6Id, vRack]);
      q6Item1Id = qi1.rows[0]?.id;

      const qi2 = await client.query(`
        INSERT INTO quotation_items (quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot, quantity, list_price, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage, line_total, is_upsell)
        VALUES ($1, $2, 2, 'DealFlow360 Enterprise License (Annual)', 'SUB-DF360-YR', 1, 1200.00, 1200.00, 0.0, 0.00, 18.0, 216.00, 20.0, 0.0, 1416.00, false)
        RETURNING id;
      `, [q6Id, vSubYr]);
      q6Item2Id = qi2.rows[0]?.id;
    }

    // Confirmed Order for QUO-6
    let orderId;
    const existingOrd = await client.query("SELECT id FROM orders WHERE quotation_id = $1", [q6Id]);
    if (existingOrd.rows.length > 0) {
      orderId = existingOrd.rows[0].id;
    } else {
      const ins = await client.query(`
        INSERT INTO orders (order_number, quotation_id, customer_id, status, created_at, updated_at)
        VALUES ('ORD-2026-0001', $1, $2, 'processing', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
        RETURNING id;
      `, [q6Id, custAcmeId]);
      orderId = ins.rows[0].id;
    }

    // Order Items
    await client.query("DELETE FROM order_items WHERE order_id = $1", [orderId]);
    let oi1Id, oi2Id;
    if (vRack && vSubYr) {
      const oi1 = await client.query(`
        INSERT INTO order_items (order_id, quotation_item_id, product_variant_id, line_type, product_name_snapshot, sku_snapshot, quantity, unit_price, line_total)
        VALUES ($1, $2, $3, 'one_time', 'Enterprise Server Rack X-100', 'HW-SRV-42U', 2, 4275.00, 10089.00)
        RETURNING id;
      `, [orderId, q6Item1Id, vRack]);
      oi1Id = oi1.rows[0]?.id;

      const oi2 = await client.query(`
        INSERT INTO order_items (order_id, quotation_item_id, product_variant_id, line_type, product_name_snapshot, sku_snapshot, quantity, unit_price, line_total)
        VALUES ($1, $2, $3, 'subscription', 'DealFlow360 Enterprise License (Annual)', 'SUB-DF360-YR', 1, 1200.00, 1416.00)
        RETURNING id;
      `, [orderId, q6Item2Id, vSubYr]);
      oi2Id = oi2.rows[0]?.id;
    }

    // Fulfillment Splits (Warehouse 1: 1 unit, Warehouse 2: 1 unit -> Demonstrates Auto Split)
    if (oi1Id) {
      await client.query("DELETE FROM fulfillment_splits WHERE order_item_id = $1", [oi1Id]);
      const whCentral = warehouseIdMap["WH-CENTRAL"] || 1;
      const whEast = warehouseIdMap["WH-EAST"] || 2;
      await client.query(`
        INSERT INTO fulfillment_splits (order_item_id, warehouse_id, quantity, estimated_shipment_date, estimated_shipping_cost, status, manual_override, created_at, updated_at)
        VALUES 
          ($1, $2, 1, CURRENT_DATE - INTERVAL '4 days', 150.00, 'allocated', false, NOW() - INTERVAL '4 days', NOW()),
          ($1, $3, 1, CURRENT_DATE + INTERVAL '2 days', 180.00, 'pending', false, NOW() - INTERVAL '4 days', NOW());
      `, [oi1Id, whCentral, whEast]);
    }

    // Invoices for Confirmed Order
    let invId;
    const existingInv = await client.query("SELECT id FROM invoices WHERE order_id = $1", [orderId]);
    if (existingInv.rows.length > 0) {
      invId = existingInv.rows[0].id;
    } else {
      const ins = await client.query(`
        INSERT INTO invoices (invoice_number, order_id, customer_id, status, invoice_date, due_date, subtotal, discount_total, tax_total, grand_total, paid_amount, created_at, updated_at)
        VALUES ('INV-2026-0001', $1, $2, 'paid', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE + INTERVAL '26 days', 11400.00, 570.00, 1949.40, 12779.40, 12779.40, NOW() - INTERVAL '4 days', NOW())
        RETURNING id;
      `, [orderId, custAcmeId]);
      invId = ins.rows[0].id;
    }

    if (invId) {
      await client.query("DELETE FROM invoice_items WHERE invoice_id = $1", [invId]);
      await client.query(`
        INSERT INTO invoice_items (invoice_id, order_item_id, product_variant_id, product_name_snapshot, sku_snapshot, quantity, unit_price, line_total)
        VALUES 
          ($1, $2, $3, 'Enterprise Server Rack X-100', 'HW-SRV-42U', 2, 4275.00, 10089.00),
          ($1, $4, $5, 'DealFlow360 Enterprise License (Annual)', 'SUB-DF360-YR', 1, 1200.00, 1416.00);
      `, [invId, oi1Id, vRack, oi2Id, vSubYr]);

      await client.query("DELETE FROM payments WHERE invoice_id = $1", [invId]);
      await client.query(`
        INSERT INTO payments (invoice_id, customer_id, amount, payment_method, status, transaction_reference, payment_date, created_at)
        VALUES ($1, $2, 12779.40, 'bank_transfer', 'completed', 'TXN-WIRE-992140', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');
      `, [invId, custAcmeId]);
    }

    // Subscriptions Record & Recurring Schedule
    if (oi2Id) {
      await client.query("DELETE FROM subscriptions WHERE order_item_id = $1", [oi2Id]);
      const subPlanRes = await client.query("SELECT id FROM subscription_plans WHERE billing_cycle = 'yearly' LIMIT 1;");
      const subPlanId = subPlanRes.rows[0]?.id || 1;

      const subRes = await client.query(`
        INSERT INTO subscriptions (order_item_id, customer_id, subscription_plan_id, quantity, unit_price, billing_cycle, start_date, end_date, status, created_at, updated_at)
        VALUES ($1, $2, $3, 1, 1200.00, 'yearly', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE + INTERVAL '361 days', 'active', NOW() - INTERVAL '4 days', NOW())
        RETURNING id;
      `, [oi2Id, custAcmeId, subPlanId]);

      if (subRes.rows.length > 0) {
        await client.query(`
          INSERT INTO subscription_billing_lines (subscription_id, billing_period_start, billing_period_end, amount, is_prorated, invoice_id, credit_note_required, created_at)
          VALUES ($1, CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE + INTERVAL '361 days', 1416.00, false, $2, false, NOW() - INTERVAL '4 days');
        `, [subRes.rows[0].id, invId]);
      }
    }

    // 12. Seed Deal Health Flags (Demonstrating Open, Acknowledged, and Resolved)
    console.log("1️⃣2️⃣ Seeding Deal Health Alerts (Open, Acknowledged & Resolved)...");
    await client.query("DELETE FROM deal_health_flags;");
    await client.query(`
      INSERT INTO deal_health_flags (quotation_id, flag_type, detail, action, created_at)
      VALUES 
        ($1, 'stalled_deal', 'Quotation idle for 9 days with no customer response', 'open', NOW() - INTERVAL '2 days'),
        ($2, 'discount_anomaly', 'Discount of 40% exceeds average rep discount (8.5%) and Silver tier limit (10%)', 'open', NOW() - INTERVAL '1 day'),
        ($3, 'delivery_slippage', 'Fulfillment split WH-CENTRAL delivery promised date is overdue by 4 days', 'open', NOW() - INTERVAL '12 hours'),
        ($4, 'stalled_deal', 'Escalated to Manager', 'acknowledged', NOW() - INTERVAL '3 days'),
        ($5, 'discount_anomaly', 'Issue resolved - Special marketing partnership approved', 'resolved', NOW() - INTERVAL '4 days');
    `, [q2Id, q3Id, q6Id, q1Id, q5Id]);

    const adminUserId = userIdMap["admin@dealflow.com"] || repId;
    await client.query(`
      UPDATE deal_health_flags 
      SET resolved_at = NOW() - INTERVAL '1 day', resolved_by_user_id = $1 
      WHERE action = 'resolved';
    `, [adminUserId]);

    // 13. Seed Activity Audit Logs for Dashboard
    console.log("1️⃣3️⃣ Seeding Recent Activity Logs...");
    await client.query("DELETE FROM quotation_audit_logs;");
    const demoLogs = [
      { qId: q1Id, uId: repId, act: 'submitted', rsn: 'Submitted high-discount quote for Manager & Finance review', hoursAgo: 24 },
      { qId: q4Id, uId: repId, act: 'edited', rsn: 'Updated payment terms and counter-discount for Acme Corp', hoursAgo: 16 },
      { qId: q5Id, uId: adminUserId, act: 'approved', rsn: 'Approved special multi-workstation tier rate', hoursAgo: 8 },
      { qId: q6Id, uId: repId, act: 'edited', rsn: 'Confirmed sales order and generated fulfillment splits', hoursAgo: 2 }
    ];
    for (const dl of demoLogs) {
      await client.query(`
        INSERT INTO quotation_audit_logs (quotation_id, user_id, action, reason, created_at)
        VALUES ($1, $2, $3::approval_action_enum, $4, NOW() - ($5 || ' hours')::INTERVAL);
      `, [dl.qId, dl.uId, dl.act, dl.rsn, dl.hoursAgo]);
    }

    await client.query("COMMIT");
    console.log("🎉 DealFlow360 Comprehensive Demo Data Seeded Successfully with full ACID integrity!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding Error:", error);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
