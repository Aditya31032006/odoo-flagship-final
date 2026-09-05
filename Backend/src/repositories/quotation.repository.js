import { pool } from '../config/database.js';
import {
  GET_QUOTATIONS_LIST,
  GET_QUOTATIONS_KANBAN_SUMMARY,
  GET_QUOTATION_BY_ID
} from '../queries/quotation.query.js';

/**
 * Fetch list of quotations with filtering and role scoping
 * @param {Object} params
 * @param {number|null} params.salesRepId
 * @param {string|null} params.status
 * @param {string|null} params.searchQuery
 */
export const getQuotationsListRepo = async ({ salesRepId = null, status = null, searchQuery = null } = {}) => {
  const result = await pool.query(GET_QUOTATIONS_LIST, [
    salesRepId,
    status || null,
    searchQuery || null
  ]);
  return result.rows;
};

/**
 * Fetch aggregated Kanban counts and value by status
 * @param {number|null} salesRepId
 */
export const getQuotationsKanbanSummaryRepo = async (salesRepId = null) => {
  const result = await pool.query(GET_QUOTATIONS_KANBAN_SUMMARY, [salesRepId]);
  return result.rows;
};

/**
 * Fetch a single quotation by ID
 * @param {number} quotationId
 */
export const getQuotationByIdRepo = async (quotationId) => {
  const result = await pool.query(GET_QUOTATION_BY_ID, [quotationId]);
  return result.rows[0] || null;
};
