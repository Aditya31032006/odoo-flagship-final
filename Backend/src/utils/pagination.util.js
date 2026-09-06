/**
 * Parses and sanitizes pagination query parameters.
 * Supports:
 *   parsePaginationParams(req.query, { defaultLimit: 10, maxLimit: 100 })
 *   parsePaginationParams(req.query, 10, 100)
 * @param {Object} query - req.query object
 * @param {number|Object} [optionsOrDefault=10] - Default limit or options object
 * @param {number} [maxLimitParam=100] - Maximum allowed limit
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePaginationParams(query = {}, optionsOrDefault = 10, maxLimitParam = 100) {
  let defaultLimit = 10;
  let maxLimit = 100;

  if (typeof optionsOrDefault === 'object' && optionsOrDefault !== null) {
    defaultLimit = optionsOrDefault.defaultLimit ?? optionsOrDefault.limit ?? 10;
    maxLimit = optionsOrDefault.maxLimit ?? 100;
  } else if (typeof optionsOrDefault === 'number' && !isNaN(optionsOrDefault)) {
    defaultLimit = optionsOrDefault;
    maxLimit = typeof maxLimitParam === 'number' && !isNaN(maxLimitParam) ? maxLimitParam : 100;
  }

  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const parsedLimit = parseInt(query?.limit, 10);
  const rawLimit = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : defaultLimit;
  const limit = Math.max(1, Math.min(maxLimit, rawLimit));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Builds standardized pagination metadata object.
 * Supports:
 *   buildPaginationMeta(total, page, limit)
 *   buildPaginationMeta({ total, page, limit })
 * @param {number|Object} totalOrParams
 * @param {number} [pageParam=1]
 * @param {number} [limitParam=10]
 * @returns {Object}
 */
export function buildPaginationMeta(totalOrParams, pageParam = 1, limitParam = 10) {
  let total = 0;
  let page = 1;
  let limit = 10;

  if (typeof totalOrParams === 'object' && totalOrParams !== null) {
    total = totalOrParams.total ?? 0;
    page = totalOrParams.page ?? 1;
    limit = totalOrParams.limit ?? 10;
  } else {
    total = totalOrParams ?? 0;
    page = pageParam ?? 1;
    limit = limitParam ?? 10;
  }

  const totalItems = Math.max(0, parseInt(total, 10) || 0);
  const safeLimit = Math.max(1, parseInt(limit, 10) || 10);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const totalPages = Math.ceil(totalItems / safeLimit) || 1;
  const hasNextPage = safePage < totalPages;
  const hasPrevPage = safePage > 1;

  return {
    page: safePage,
    limit: safeLimit,
    total: totalItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}
