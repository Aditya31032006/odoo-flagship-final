# DealFlow360 — Complete AI Development Context

## Project Overview
DealFlow360 is a B2B sales-operations platform. One selling organization serves multiple B2B customer companies. Individual people are represented by `users`; business organizations are represented by `customers`; multiple customer users can belong to one customer company.

Main workflow:

**Customer → Quotation → Approval / Negotiation → Confirmation → Order → Fulfillment → Invoice → Payment**

Subscription is an optional recurring branch from an order item.

Prioritize business logic, correct data relationships, end-to-end workflow, role-based access, auditability, and usability. Do not add generic ERP, CRM, accounting, vendor, purchasing, campaign, lead-management, or unrelated modules unless explicitly required.

---

## Users and Customers

### users
Stores every person who can log in. Roles include `sales_rep`, `sales_manager`, `finance`, `operations`, `admin`, and `customer`. Used for authentication identity and role-based access.

### customers
Represents the actual B2B customer company, not an individual person. Used by quotations, orders, subscriptions, pricing/tier logic, and customer portal access.

### customer_users
Links individual users to customer companies. One customer company can have multiple customer users. Support one primary contact.

---

## Product Catalog and Variants

### product_categories
Stores product categories and organization. Categories are used for category-level discount ceilings.

### products
Generic/master product containing common information such as name, category, tax information, and active state. A product can have multiple variants.

### product_variant_attributes
Defines variant dimensions such as Color, Size, or Pack.

### product_variant_values
Stores values such as Black, Large, or 10-Pack. Values may have an additional price impact.

### product_variants
Represents the actual sellable SKU. Each variant has a unique SKU and can have its own price/name. Quotes, orders, and inventory operate on exact variants.

### product_variant_value_map
Connects each sellable SKU to its attribute values. Example: TSHIRT-BLK-L → Color=Black + Size=Large.

---

## Customer Tiers and Pricing

### customer_tiers
Defines tiers such as Bronze, Silver, and Gold, including maximum allowed discount.

### customer_tier_assignments
Assigns a customer company to a tier and supports assignment history while allowing only one current tier.

### category_discount_ceilings
Defines the maximum discount allowed for a product category. Example: customer tier permits 15%, but a category permits only 10%.

### price_lists
Stores named pricing collections associated with customer tier and currency.

### price_list_items
Stores the actual price of a specific product variant/SKU inside a price list.

---

## Quotation and Discount Approval

### approval_rules
Defines configurable approval requirements. Administrators must be able to configure which discount ranges require manager approval and which require manager + finance approval.

### quotations
Central sales document. Belongs to a customer and sales representative and stores applicable tier/price list, status, validity, totals, and blended discount/risk information.

### quotation_items
Stores quotation lines using exact product variants/SKUs. Store line number, product/SKU snapshots, quantity, list price, unit price, discount, tax, allowed discount, excess discount, line total, and upsell indicator. Historical snapshots are intentional.

### Example PDF test
A rep creates:
- Product A: 10 × ₹12,000, 5% discount
- Product B: 20 × ₹3,500, 7% discount
- Service C: 5 × ₹8,000, 18% discount

If the customer tier allows 15% but Service C has a 10% category ceiling, the system must detect the excess and calculate blended risk. A high-risk quotation requires manager + finance approval according to configured rules.

### approval_requests
Represents an approval process for a quotation.

### approval_steps
Stores individual approval stages such as manager and finance. Record approver, role, status, decision time, and comments/reason. Approval is complete only after all required steps are complete.

### quotation_audit_logs
Stores important quotation history: created, edited, submitted, approved, rejected, returned, sent, confirmed, and negotiation started. Record quotation, user, action, timestamp, reason, and relevant changes.

---

## Upsell and Cross-Sell

### upsell_rules
Defines source-product → suggested-product relationships with priority, minimum margin requirement, promotion status, and active status. Co-purchase ranking can be derived from existing order history rather than creating unnecessary tables.

### quotation_upsell_suggestions
Stores recommendations generated for a quotation. Show suggested product, ranking, margin delta, promotion information, and status. User can Add/Accept or Dismiss. Accepted suggestions can become quotation lines.

---

## Warehouses and Inventory

### warehouses
Stores fulfillment locations with name, code, address, and shipping-cost weight.

### warehouse_stock
Stores SKU-level stock per warehouse: quantity on hand, reserved quantity, reorder level, and lead time. Inventory must be variant/SKU-level.

---

## Orders

### orders
Represents a confirmed customer order created from an accepted quotation. The order is the parent for order items, fulfillment, subscriptions, and invoicing. Control the quotation-to-order relationship so one quotation cannot accidentally create multiple orders when the business flow expects one.

### order_items
Stores actual purchased lines independently after confirmation while retaining the original quotation-line reference for traceability. Store SKU, product snapshot, quantity, line type (`one_time` or `subscription`), price, discount, tax, and total.

---

## Fulfillment and Backorders

### fulfillment_splits
Splits an order item across warehouses. Example: 20 units → Warehouse A 14 + Warehouse B 6. Store warehouse, quantity, estimated shipment date/cost, status, and manual-override information. Show shipment count/cost and allow manual override.

### backorders
Stores unfulfilled quantity from an order item. Track quantity, preferred warehouse when applicable, and status. Backorders reference order items, not quotation items.

---

## Subscription and Hybrid Billing

### subscription_plans
Defines recurring plans with billing cycle, recurring price, proration behavior, cancellation behavior, and refund/credit rules.

### subscriptions
Represents an actual recurring subscription created from a subscription order item. Reference the exact order item and plan. Store quantity, unit price, billing cycle, dates, and status.

### subscription_billing_lines
Represents individual billing periods. Store period start/end, amount, proration information, invoice reference, and credit-note/refund requirement. Prevent duplicate periods for the same subscription.

Support:
- one-time products and recurring services in the same order
- recurring billing
- proration
- cancellation
- partial refund/credit note

---

## Customer Negotiation Portal

### quotation_negotiations
Represents a negotiation session for a quotation. Customers can counter discounts and request delivery changes. Track status, counter discount, requested delivery date, creator, and timestamps. If negotiated terms exceed approval limits, trigger re-approval.

### negotiation_messages
Stores customer/rep negotiation messages. A message can optionally reference a specific quotation line, enabling line-level questions.

Customer portal flow:
1. View quotation
2. Ask line-level questions
3. Request changes
4. Counter discount
5. Request delivery changes
6. Receive rep responses
7. Trigger re-approval when required

---

## Deal Health

### deal_health_flags
Stores actionable problems for active deals:
- `stalled_deal`
- `discount_anomaly`
- `delivery_slippage`

Store quotation, type, details, recommended/action information, created time, resolved time, and resolver.

### deal_health_config
Stores admin-configurable thresholds:
- stalled deal days
- discount anomaly threshold/multiplier
- delivery slippage days

Admins can change these values without changing application code.

---

## Invoices and Payments

### invoices
Billing document generated from a confirmed order. Store order, customer, invoice status, invoice date, due date, and totals.

### invoice_items
Individual billed lines. Reference order item/product variant where possible and preserve historical snapshots. Store SKU/product information, quantity, price, tax, and line total.

### payments
Payments against invoices. Track invoice, amount, payment method, status, transaction reference, and payment date. Payment activity updates invoice payment state according to business rules.

---

## Reporting

Reports should be generated directly from transactional data. Do not create duplicate report tables.

Useful filters include:
- date range
- customer
- sales representative
- quotation status
- order status
- approval status
- product/category
- discount
- fulfillment status
- subscription status
- payment status

Exports can be generated directly from query results.

---

# End-to-End Workflow

1. **Customer:** create/select B2B customer company and users.
2. **Pricing:** determine customer tier, price list, SKU price, and category discount ceiling.
3. **Quotation:** create exact-SKU lines and calculate pricing, discounts, tax, totals, allowed discount, excess discount, and blended risk.
4. **Approval:** create approval request/steps when thresholds are crossed; manager and finance decisions are logged.
5. **Upsell:** generate ranked recommendations showing margin impact and promotion tag; Add or Dismiss.
6. **Negotiation:** customer reviews quotation, asks questions, counters discount, and requests delivery changes. Terms exceeding limits trigger re-approval.
7. **Confirmation:** accepted quotation creates order and order items.
8. **Fulfillment:** check SKU stock, suggest warehouse allocation, split shipments if needed, calculate shipment count/cost, allow manual override, and create backorders for remaining quantity.
9. **Subscription:** create subscriptions for recurring order items and generate billing periods with proration/cancellation/refund rules.
10. **Invoice:** generate invoice and invoice items.
11. **Payment:** record payments and update invoice payment state.
12. **Deal Health:** detect stalled deals, discount anomalies, and delivery slippage using admin-configured thresholds.
13. **Reporting:** query transactional data and export results.

---

# Database Design Rules

1. Use consistent primary-key types across all tables.
2. Use foreign keys for real relationships.
3. Inventory must be SKU/variant-level.
4. Quotations and orders reference exact product variants.
5. Fulfillment and backorders reference order items.
6. Subscriptions originate from subscription order items.
7. Customer companies and individual customer users remain separate concepts.
8. Preserve historical document snapshots where required for quotations, orders, and invoices.
9. Use unique constraints for relationships that must be one-to-one or one-current-record.
10. Validate percentage values between 0 and 100.
11. Prevent duplicate subscription billing periods.
12. Approval decisions and important quotation changes must be auditable.
13. Derive report data from existing transactional tables instead of creating duplicate report tables.
14. Do not add unrelated ERP/accounting/CRM modules.

---

# Required 38 Tables

1. users
2. customers
3. customer_users
4. product_categories
5. products
6. product_variant_attributes
7. product_variant_values
8. product_variants
9. product_variant_value_map
10. customer_tiers
11. customer_tier_assignments
12. category_discount_ceilings
13. price_lists
14. price_list_items
15. approval_rules
16. quotations
17. quotation_items
18. approval_requests
19. approval_steps
20. quotation_audit_logs
21. upsell_rules
22. quotation_upsell_suggestions
23. warehouses
24. warehouse_stock
25. orders
26. order_items
27. fulfillment_splits
28. backorders
29. subscription_plans
30. subscriptions
31. subscription_billing_lines
32. quotation_negotiations
33. negotiation_messages
34. deal_health_flags
35. deal_health_config
36. invoices
37. invoice_items
38. payments

---

# Final AI Instruction

Treat this document as the complete functional context for implementing DealFlow360.

Build the database, backend APIs, validation, permissions, and frontend around the business workflow rather than isolated CRUD screens.

For every feature, determine:
- what business problem it solves
- which table owns the data
- which tables it relates to
- which business rules must be enforced
- what happens to the workflow after the action

Prioritize correctness and end-to-end functionality over decorative UI.

Do not invent unrelated functionality. If something is not covered by this context or the project PDF, do not add a new business module merely because it is common in ERP/CRM systems.
