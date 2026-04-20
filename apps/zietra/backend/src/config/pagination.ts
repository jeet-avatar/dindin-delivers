/**
 * Pagination Configuration
 * Centralized pagination defaults for all list endpoints
 */

export const PAGINATION_CONFIG = {
  // Default page size for contacts, companies
  defaultPageSize: Number.parseInt(process.env.DEFAULT_PAGE_SIZE || '10'),

  // Default page size for activities
  defaultActivityLimit: Number.parseInt(process.env.DEFAULT_ACTIVITY_LIMIT || '20'),

  // Default page size for deals
  defaultDealsLimit: Number.parseInt(process.env.DEFAULT_DEALS_LIMIT || '50'),

  // Maximum page size (to prevent abuse)
  maxPageSize: Number.parseInt(process.env.MAX_PAGE_SIZE || '100'),

  // Default page number
  defaultPage: 1,
};

/**
 * Get pagination values from query params
 */
export function getPaginationParams(query: any, type: 'default' | 'activity' | 'deals' = 'default') {
  let defaultLimit = PAGINATION_CONFIG.defaultPageSize;

  if (type === 'activity') {
    defaultLimit = PAGINATION_CONFIG.defaultActivityLimit;
  } else if (type === 'deals') {
    defaultLimit = PAGINATION_CONFIG.defaultDealsLimit;
  }

  const page = Number.parseInt(query.page || String(PAGINATION_CONFIG.defaultPage));
  const limit = Math.min(
    Number.parseInt(query.limit || String(defaultLimit)),
    PAGINATION_CONFIG.maxPageSize
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}
