// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // PostgreSQL specific errors
  if (err.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      error: 'Resource already exists',
      message: 'A record with this information already exists'
    });
  }

  if (err.code === '23503') { // Foreign key constraint violation
    return res.status(400).json({
      error: 'Invalid reference',
      message: 'Referenced resource does not exist'
    });
  }

  if (err.code === '23514') { // Check constraint violation
    return res.status(400).json({
      error: 'Invalid data',
      message: 'Data does not meet the required constraints'
    });
  }

  if (err.code === '42P01') { // Table does not exist
    return res.status(500).json({
      error: 'Database error',
      message: 'Database schema issue - please contact support'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'The provided token has expired'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message
    });
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      message: 'Uploaded file exceeds the maximum size limit'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.name || 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};