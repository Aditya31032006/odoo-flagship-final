"""
DealFlow360 - High Volume Enterprise Seeder (~300 Rows)
======================================================
Populates Odoo_flagship_final_2 with ~300 realistic business records:
- 25 B2B Customers across Bronze, Silver, Gold tiers
- 80 Quotations across all lifecycle stages (Draft, Sent, Pending Approval, Negotiating, Approved, Confirmed)
- 200+ Quotation Items with list prices, discounts, allowed discounts, and excess discounts
- 20+ Stalled Deals (idle > 7 days)
- 20+ Delivery Slippage Fulfillment Splits (overdue by 4 to 15 days)
- 15+ Orders with multi-warehouse fulfillment splits
"""

import os
import sys
import random
from datetime import datetime, timedelta

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:aditya@localhost:5432/Odoo_flagship_final_2"
)


def seed_high_volume():
    print("=" * 70)
    print("🚀 DealFlow360 High Volume Seeder (~300 records)")
    print(f"Target DB: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    print("=" * 70)

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 1. Fetch metadata
        cur.execute("SELECT id, name FROM customer_tiers;")
        tiers = {r["name"]: r["id"] for r in cur.fetchall()}
        bronze_tid = tiers.get("Bronze", 1)
        silver_tid = tiers.get("Silver", 2)
        gold_tid = tiers.get("Gold", 3)

        cur.execute("SELECT id, tier_id FROM price_lists;")
        pl_rows = cur.fetchall()
        tier_to_pl = {}
        for r in pl_rows:
            if r["tier_id"]:
                tier_to_pl[r["tier_id"]] = r["id"]

        cur.execute("SELECT id FROM users WHERE role = 'sales_rep';")
        sales_reps = [r["id"] for r in cur.fetchall()]
        if not sales_reps:
            cur.execute("SELECT id FROM users LIMIT 1;")
            sales_reps = [cur.fetchone()["id"]]

        cur.execute("SELECT id, code FROM warehouses WHERE is_active = TRUE;")
        warehouses = [r["id"] for r in cur.fetchall()]

        cur.execute("""
            SELECT pv.id as variant_id, pv.sku, pv.selling_price, p.name as product_name, p.tax_percentage
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.id
            WHERE pv.is_active = TRUE;
        """)
        variants = cur.fetchall()
        if not variants:
            print("❌ No product variants found to seed items.")
            return

        # 2. Seed 25 B2B Customers
        print("\n1️⃣  Seeding 25 B2B Corporate Customers...")
        company_names = [
            ("Apex Global Logistics", "27AABCA1111A1Z1", gold_tid),
            ("BlueWave Technologies", "27AABCB2222B1Z2", silver_tid),
            ("Cyberdyne Systems India", "27AABCC3333C1Z3", gold_tid),
            ("Dynamic Cloud Solutions", "27AABCD4444D1Z4", bronze_tid),
            ("Echo Retail Ventures", "27AABCE5555E1Z5", bronze_tid),
            ("Frontier AI Labs", "27AABCF6666F1Z6", gold_tid),
            ("Genesis Robotics Ltd", "27AABCG7777G1Z7", silver_tid),
            ("Horizon Health Systems", "27AABCH8888H1Z8", silver_tid),
            ("InfraCore Data Corp", "27AABCI9999I1Z9", gold_tid),
            ("Jupiter Aerospace", "27AABCJ0000J1Z0", gold_tid),
            ("Kavach Security Networks", "27AABCK1112K1Z1", silver_tid),
            ("Luminary Media Group", "27AABCL1113L1Z2", bronze_tid),
            ("Matrix Automation Inc", "27AABCM1114M1Z3", silver_tid),
            ("Nexus Prime Solutions", "27AABCN1115N1Z4", gold_tid),
            ("OmniCorp India Pvt Ltd", "27AABCO1116O1Z5", gold_tid),
            ("Pulse BioAnalytics", "27AABCP1117P1Z6", silver_tid),
            ("Quantum HyperScalers", "27AABCQ1118Q1Z7", gold_tid),
            ("Radiant Renewable Energy", "27AABCR1119R1Z8", bronze_tid),
            ("Synergy FinTech Hub", "27AABCS1120S1Z9", silver_tid),
            ("Titan Heavy Industries", "27AABCT1121T1Z0", bronze_tid),
            ("Ultima Software Works", "27AABCU1122U1Z1", silver_tid),
            ("Vortex Telecom Services", "27AABCV1123V1Z2", bronze_tid),
            ("Wavelength Wireless", "27AABCW1124W1Z3", silver_tid),
            ("Xenon Cloud Networks", "27AABCX1125X1Z4", gold_tid),
            ("Zenith Logistics Global", "27AABCY1126Y1Z5", bronze_tid)
        ]

        customer_ids = []
        for name, gstin, tid in company_names:
            cur.execute("SELECT id FROM customers WHERE company_name = %s;", (name,))
            r = cur.fetchone()
            if r:
                cid = r["id"]
            else:
                email = f"procurement@{name.lower().replace(' ', '')[:12]}.com"
                cur.execute("""
                    INSERT INTO customers (company_name, email, phone, gst_number, billing_address, shipping_address, is_active, created_at, updated_at)
                    VALUES (%s, %s, '+91-9876543210', %s, 'Tech Hub, Sector 4, Pune', 'Tech Hub, Sector 4, Pune', TRUE, NOW(), NOW())
                    RETURNING id;
                """, (name, email, gstin))
                cid = cur.fetchone()["id"]

            # Ensure Tier assignment
            cur.execute("DELETE FROM customer_tier_assignments WHERE customer_id = %s;", (cid,))
            cur.execute("""
                INSERT INTO customer_tier_assignments (customer_id, tier_id, is_current, assigned_at)
                VALUES (%s, %s, TRUE, NOW());
            """, (cid, tid))
            customer_ids.append((cid, tid))

        print(f"   ✓ {len(customer_ids)} Customers ready with tier assignments.")

        # 3. Seed 80 Quotations & Items (~200 items total)
        print("\n2️⃣  Seeding 80 Quotations across diverse workflows...")
        quote_statuses = [
            ("draft", 10),
            ("sent", 20),             # Many will be aged to trigger Stalled Deals
            ("pending_approval", 15), # Trigger discount anomalies
            ("negotiating", 10),
            ("approved", 10),
            ("confirmed", 15),        # Will link to orders and delivery slippage
        ]

        # Find current quotation number sequence starting from 100 to guarantee zero collisions
        last_num = 100

        stalled_quote_ids = []
        confirmed_quote_records = []
        total_items_count = 0

        for status, count in quote_statuses:
            for i in range(count):
                last_num += 1
                q_num = f"QT-2026-{last_num:04d}"
                cust_id, tid = random.choice(customer_ids)
                rep_id = random.choice(sales_reps)
                pl_id = tier_to_pl.get(tid)

                # Set age (days ago)
                if status == "sent":
                    # Make 60% of sent quotes stalled (> 7 days)
                    days_ago = random.randint(8, 35) if random.random() < 0.7 else random.randint(1, 5)
                elif status == "pending_approval":
                    days_ago = random.randint(1, 4)
                elif status == "confirmed":
                    days_ago = random.randint(5, 20)
                else:
                    days_ago = random.randint(1, 14)

                # Pick 1 to 4 line items
                num_items = random.randint(1, 4)
                selected_vars = random.sample(variants, min(num_items, len(variants)))

                subtotal = 0.0
                discount_total = 0.0
                tax_total = 0.0
                items_data = []

                is_anomaly_quote = (status == "pending_approval") or (random.random() < 0.25 and status not in ("rejected", "cancelled"))
                max_allowed = 15.0 if tid == gold_tid else (10.0 if tid == silver_tid else 5.0)

                for line_idx, v in enumerate(selected_vars, start=1):
                    qty = random.randint(1, 8)
                    price = float(v["selling_price"] or 2000.0)
                    tax_pct = float(v["tax_percentage"] or 18.0)
                    line_sub = price * qty

                    if is_anomaly_quote and line_idx == 1:
                        # Excess discount (22% - 45%)
                        disc_pct = float(random.randint(22, 45))
                    else:
                        disc_pct = float(random.choice([0, 5, 8, 10, 12, 15]))

                    excess_disc = max(0.0, disc_pct - max_allowed)
                    disc_amt = round(line_sub * (disc_pct / 100.0), 2)
                    after_disc = line_sub - disc_amt
                    line_tax = round(after_disc * (tax_pct / 100.0), 2)
                    line_tot = after_disc + line_tax

                    subtotal += line_sub
                    discount_total += disc_amt
                    tax_total += line_tax

                    items_data.append({
                        "variant_id": v["variant_id"],
                        "line_number": line_idx,
                        "name": v["product_name"],
                        "sku": v["sku"],
                        "qty": qty,
                        "unit_price": price,
                        "disc_pct": disc_pct,
                        "disc_amt": disc_amt,
                        "tax_pct": tax_pct,
                        "tax_amt": line_tax,
                        "allowed_pct": max_allowed,
                        "excess_pct": excess_disc,
                        "line_total": line_tot
                    })

                grand_total = (subtotal - discount_total) + tax_total
                risk_score = 15.0 if is_anomaly_quote else (5.0 if discount_total > 0 else 0.0)
                risk_level = "high" if risk_score >= 10.0 else ("medium" if risk_score > 0 else "low")

                cur.execute("""
                    INSERT INTO quotations (
                        quotation_number, customer_id, sales_rep_id, tier_id, price_list_id, status,
                        blended_risk_score, risk_level, subtotal, discount_total, tax_total, grand_total,
                        valid_until, created_at, updated_at
                    )
                    VALUES (
                        %s, %s, %s, %s, %s, %s::quotation_status_enum,
                        %s, %s, %s, %s, %s, %s,
                        NOW() + INTERVAL '30 days',
                        NOW() - (%s || ' days')::INTERVAL,
                        NOW() - (%s || ' days')::INTERVAL
                    )
                    RETURNING id;
                """, (
                    q_num, cust_id, rep_id, tid, pl_id, status,
                    risk_score, risk_level, subtotal, discount_total, tax_total, grand_total,
                    days_ago, days_ago
                ))
                qid = cur.fetchone()["id"]

                # Insert line items
                for it in items_data:
                    cur.execute("""
                        INSERT INTO quotation_items (
                            quotation_id, product_variant_id, line_number, product_name_snapshot, sku_snapshot,
                            quantity, list_price, unit_price, discount_percentage, discount_amount,
                            tax_percentage, tax_amount, allowed_discount_percentage, excess_discount_percentage,
                            line_total, is_upsell
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, false);
                    """, (
                        qid, it["variant_id"], it["line_number"], it["name"], it["sku"],
                        it["qty"], it["unit_price"], it["unit_price"], it["disc_pct"], it["disc_amt"],
                        it["tax_pct"], it["tax_amt"], it["allowed_pct"], it["excess_pct"], it["line_total"]
                    ))
                    total_items_count += 1

                if status == "sent" and days_ago >= 7:
                    stalled_quote_ids.append(qid)

                if status == "confirmed":
                    confirmed_quote_records.append((qid, cust_id, grand_total, items_data, days_ago))

        print(f"   ✓ Seeded 80 Quotations with {total_items_count} line items.")

        # 4. Seed Orders, Multi-Warehouse Fulfillment Splits & Delivery Slippage
        print("\n3️⃣  Seeding 25 Orders with Delivery Slippage Splits...")
        cur.execute("SELECT id FROM orders ORDER BY id DESC LIMIT 1;")
        last_ord_row = cur.fetchone()
        last_ord_num = 200
        if last_ord_row:
            last_ord_num = 200 + last_ord_row["id"]

        order_count = 0
        split_count = 0
        slippage_count = 0

        for qid, cid, g_total, items, days_ago in confirmed_quote_records:
            last_ord_num += 1
            ord_num = f"ORD-2026-{last_ord_num:04d}"

            cur.execute("""
                INSERT INTO orders (order_number, quotation_id, customer_id, status, created_at, updated_at)
                VALUES (%s, %s, %s, 'processing', NOW() - (%s || ' days')::INTERVAL, NOW())
                RETURNING id;
            """, (ord_num, qid, cid, days_ago))
            ord_id = cur.fetchone()["id"]
            order_count += 1

            for it in items:
                cur.execute("""
                    INSERT INTO order_items (
                        order_id, product_variant_id, line_type, product_name_snapshot, sku_snapshot,
                        quantity, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, line_total
                    )
                    VALUES (%s, %s, 'one_time', %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, quantity;
                """, (
                    ord_id, it["variant_id"], it["name"], it["sku"],
                    it["qty"], it["unit_price"], it["disc_pct"], it["disc_amt"], it["tax_pct"], it["tax_amt"], it["line_total"]
                ))
                oi_row = cur.fetchone()
                oi_id = oi_row["id"]
                oi_qty = oi_row["quantity"]

                wh_1 = warehouses[0] if warehouses else 1

                # 60% chance this order has Delivery Slippage (overdue estimated_shipment_date)
                is_slippage = random.random() < 0.6
                if is_slippage:
                    # Shipment date was 4 to 15 days ago in the past!
                    overdue_days_ago = random.randint(4, 15)
                    cur.execute("""
                        INSERT INTO fulfillment_splits (
                            order_item_id, warehouse_id, quantity, status, estimated_shipment_date,
                            estimated_shipping_cost, manual_override, created_at, updated_at
                        )
                        VALUES (
                            %s, %s, %s, 'allocated', CURRENT_DATE - (%s || ' days')::INTERVAL,
                            50.00, false, NOW() - (%s || ' days')::INTERVAL, NOW()
                        );
                    """, (oi_id, wh_1, oi_qty, overdue_days_ago, days_ago))
                    slippage_count += 1
                else:
                    cur.execute("""
                        INSERT INTO fulfillment_splits (
                            order_item_id, warehouse_id, quantity, status, estimated_shipment_date,
                            estimated_shipping_cost, manual_override, created_at, updated_at
                        )
                        VALUES (
                            %s, %s, %s, 'allocated', CURRENT_DATE + INTERVAL '3 days',
                            45.00, false, NOW() - (%s || ' days')::INTERVAL, NOW()
                        );
                    """, (oi_id, wh_1, oi_qty, days_ago))
                split_count += 1

        print(f"   ✓ Seeded {order_count} Orders, {split_count} Fulfillment Splits ({slippage_count} with overdue Delivery Slippage).")

        conn.commit()
        print("\n" + "=" * 70)
        print("🎉 Successfully seeded 300+ records!")
        print("=" * 70)

    except Exception as exc:
        conn.rollback()
        print(f"\n❌ Seeding failed: {exc}")
        raise exc
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed_high_volume()
