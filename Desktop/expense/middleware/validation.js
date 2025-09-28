const Joi = require('joi');

// Validation schemas
const schemas = {
  // User registration
  registerUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required()
  }),

  // User login
  loginUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Category creation/update
  category: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).allow(''),
    parentId: Joi.string().uuid().allow(null),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
    icon: Joi.string().max(50).default('folder')
  }),

  // Expense creation/update
  expense: Joi.object({
    categoryId: Joi.string().uuid().required(),
    amount: Joi.number().positive().precision(2).required(),
    description: Joi.string().min(1).max(500).required(),
    expenseDate: Joi.date().max('now').required(),
    paymentMethod: Joi.string().valid('cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'other').default('cash'),
    receiptUrl: Joi.string().uri().allow(''),
    tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
    notes: Joi.string().max(1000).allow('')
  }),

  // Budget creation/update
  budget: Joi.object({
    categoryId: Joi.string().uuid().allow(null),
    amount: Joi.number().positive().precision(2).required(),
    periodType: Joi.string().valid('weekly', 'monthly', 'yearly').required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required()
  }),

  // User profile update
  updateProfile: Joi.object({
    firstName: Joi.string().min(1).max(100),
    lastName: Joi.string().min(1).max(100),
    currentPassword: Joi.string().when('newPassword', {
      is: Joi.exist(),
      then: Joi.required()
    }),
    newPassword: Joi.string().min(6).max(128)
  }),

  // Query parameters for filtering
  expenseQuery: Joi.object({
    categoryId: Joi.string().uuid(),
    startDate: Joi.date(),
    endDate: Joi.date().min(Joi.ref('startDate')),
    minAmount: Joi.number().min(0),
    maxAmount: Joi.number().min(Joi.ref('minAmount')),
    paymentMethod: Joi.string().valid('cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'other'),
    tags: Joi.array().items(Joi.string()),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  // Analytics query parameters
  analyticsQuery: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required(),
    groupBy: Joi.string().valid('day', 'week', 'month', 'year', 'category').default('month'),
    categoryId: Joi.string().uuid()
  })
};

// Validation middleware factory
const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req.body;
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation error',
        details: errors
      });
    }

    // Replace the original data with validated and sanitized data
    if (source === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
};

module.exports = {
  schemas,
  validateRequest
};
