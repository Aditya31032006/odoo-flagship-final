import { pool } from '../config/database.js';
import {
  GET_ALL_CUSTOMER_TIERS,
  GET_ALL_CATEGORY_DISCOUNT_CEILINGS,
  GET_ALL_APPROVAL_RULES,
  UPDATE_CUSTOMER_TIER,
  UPDATE_APPROVAL_RULE,
} from '../queries/discountRules.query.js';

export const getDiscountConfigurationRepo = async () => {
  const [tiersRes, ceilingsRes, rulesRes] = await Promise.all([
    pool.query(GET_ALL_CUSTOMER_TIERS),
    pool.query(GET_ALL_CATEGORY_DISCOUNT_CEILINGS),
    pool.query(GET_ALL_APPROVAL_RULES),
  ]);

  return {
    customer_tiers: tiersRes.rows,
    category_ceilings: ceilingsRes.rows,
    approval_rules: rulesRes.rows,
  };
};

export const saveDiscountConfigurationRepo = async ({
  customer_tiers = [],
  category_ceilings = [],
  approval_rules = [],
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update customer tiers
    for (const tier of customer_tiers) {
      if (tier.id) {
        await client.query(UPDATE_CUSTOMER_TIER, [
          Number(tier.max_discount_percentage) || 0,
          tier.id,
        ]);
      }
    }

    // 2. Update/Upsert category discount ceilings
    for (const cat of category_ceilings) {
      if (cat.category_id) {
        // Check if row already exists for category_id
        const existing = await client.query(
          'SELECT id FROM category_discount_ceilings WHERE category_id = $1',
          [cat.category_id]
        );

        if (existing.rows.length > 0) {
          await client.query(
            'UPDATE category_discount_ceilings SET max_discount_percentage = $1 WHERE category_id = $2',
            [Number(cat.max_discount_percentage) || 0, cat.category_id]
          );
        } else {
          await client.query(
            'INSERT INTO category_discount_ceilings (category_id, max_discount_percentage) VALUES ($1, $2)',
            [cat.category_id, Number(cat.max_discount_percentage) || 0]
          );
        }
      }
    }

    // 3. Update approval rules
    for (const rule of approval_rules) {
      if (rule.id) {
        await client.query(UPDATE_APPROVAL_RULE, [
          rule.name || '',
          Number(rule.min_risk_score) || 0,
          Number(rule.max_risk_score) || 0,
          Boolean(rule.requires_sales_manager),
          Boolean(rule.requires_finance),
          rule.is_active !== undefined ? Boolean(rule.is_active) : true,
          rule.id,
        ]);
      }
    }

    await client.query('COMMIT');

    // Fetch and return the updated configuration
    const [updatedTiers, updatedCeilings, updatedRules] = await Promise.all([
      pool.query(GET_ALL_CUSTOMER_TIERS),
      pool.query(GET_ALL_CATEGORY_DISCOUNT_CEILINGS),
      pool.query(GET_ALL_APPROVAL_RULES),
    ]);

    return {
      customer_tiers: updatedTiers.rows,
      category_ceilings: updatedCeilings.rows,
      approval_rules: updatedRules.rows,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
