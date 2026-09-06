/**
 * Parses and sanitizes pagination query parameters.
 * @param {Object} query - req.query object
 * @param {number} [defaultLimit=10] - Default page size if not specified
 * @param {number} [maxLimit=100] - Maximum allowed limit
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePaginationParams(query = {}, defaultLimit = 10, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.max(1, Math.min(maxLimit, rawLimit));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Builds standardized pagination metadata object.
 * @param {Object} params
 * @param {number} params.page - Current 1-based page
 * @param {number} params.limit - Items per page
 * @param {number} params.total - Total number of matching items across DB
 * @returns {Object}
 */
export function buildPaginationMeta({ page, limit, total }) {
  const totalItems = Math.max(0, parseInt(total, 10) || 0);
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    page,
    limit,
    total: totalItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}
