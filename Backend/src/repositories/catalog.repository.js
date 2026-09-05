import { pool } from '../config/database.js';
import {
  GET_ACTIVE_CUSTOMERS_WITH_TIER,
  GET_ACTIVE_PRICE_LISTS,
  GET_SELLABLE_PRODUCT_VARIANTS,
  GET_PRICE_LIST_ITEMS_BY_PRICE_LIST,
  GET_UPSELL_RULES_FOR_PRODUCTS,
  GET_ACTIVE_APPROVAL_RULES,
} from '../queries/catalog.query.js';

export const getActiveCustomersRepo = async () => {
  const result = await pool.query(GET_ACTIVE_CUSTOMERS_WITH_TIER);
  return result.rows;
};

export const getActivePriceListsRepo = async () => {
  const result = await pool.query(GET_ACTIVE_PRICE_LISTS);
  return result.rows;
};

export const getSellableVariantsRepo = async () => {
  const result = await pool.query(GET_SELLABLE_PRODUCT_VARIANTS);
  return result.rows;
};

export const getPriceListItemsRepo = async (priceListId) => {
  const result = await pool.query(GET_PRICE_LIST_ITEMS_BY_PRICE_LIST, [priceListId]);
  return result.rows;
};

export const getUpsellRulesForProductsRepo = async (productIds = []) => {
  if (!productIds || productIds.length === 0) return [];
  const result = await pool.query(GET_UPSELL_RULES_FOR_PRODUCTS, [productIds]);
  return result.rows;
};

export const getActiveApprovalRulesRepo = async () => {
  const result = await pool.query(GET_ACTIVE_APPROVAL_RULES);
  return result.rows;
};
