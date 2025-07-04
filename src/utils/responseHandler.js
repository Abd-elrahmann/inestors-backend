/**
 * Success response handler
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {object} data - Response data
 * @param {object} meta - Metadata (pagination, etc.)
 */
exports.success = (res, statusCode = 200, message = 'Success', data = {}, meta = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta
  });
};

/**
 * Error response handler
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {object} errors - Error details
 */
exports.error = (res, statusCode = 500, message = 'Server Error', errors = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};

/**
 * Pagination helper
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 */
exports.getPaginationInfo = (page = 1, limit = 10, total = 0) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const totalPages = Math.ceil(total / limit);
  
  const pagination = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    totalPages
  };
  
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }
  
  return {
    startIndex,
    pagination
  };
}; 