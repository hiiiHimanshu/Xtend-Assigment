const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, checkResourceOwnership } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all expenses for the current user with filtering and pagination
router.get('/', 
  authenticateToken, 
  validateRequest(schemas.expenseQuery, 'query'), 
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { categoryId, startDate, endDate, minAmount, maxAmount, paymentMethod, tags, page, limit } = req.query;
    
    // Build dynamic WHERE clause
    let whereConditions = ['e.user_id = $1'];
    let queryParams = [userId];
    let paramCount = 2;
    
    if (categoryId) {
      whereConditions.push(`e.category_id = $${paramCount++}`);
      queryParams.push(categoryId);
    }
    
    if (startDate) {
      whereConditions.push(`e.expense_date >= $${paramCount++}`);
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push(`e.expense_date <= $${paramCount++}`);
      queryParams.push(endDate);
    }
    
    if (minAmount) {
      whereConditions.push(`e.amount >= $${paramCount++}`);
      queryParams.push(minAmount);
    }
    
    if (maxAmount) {
      whereConditions.push(`e.amount <= $${paramCount++}`);
      queryParams.push(maxAmount);
    }
    
    if (paymentMethod) {
      whereConditions.push(`e.payment_method = $${paramCount++}`);
      queryParams.push(paymentMethod);
    }
    
    if (tags && tags.length > 0) {
      whereConditions.push(`e.tags && $${paramCount++}`);
      queryParams.push(tags);
    }
    
    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM expenses e 
      WHERE ${whereClause}
    `, queryParams);
    
    const totalExpenses = parseInt(countResult.rows[0].total);
    
    // Get expenses with category information
    const result = await query(`
      SELECT 
        e.id,
        e.amount,
        e.description,
        e.expense_date,
        e.payment_method,
        e.receipt_url,
        e.tags,
        e.notes,
        e.created_at,
        e.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE ${whereClause}
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `, [...queryParams, limit, offset]);
    
    res.json({
      expenses: result.rows.map(row => ({
        id: row.id,
        amount: parseFloat(row.amount),
        description: row.description,
        expenseDate: row.expense_date,
        paymentMethod: row.payment_method,
        receiptUrl: row.receipt_url,
        tags: row.tags,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        category: {
          id: row.category_id,
          name: row.category_name,
          color: row.category_color,
          icon: row.category_icon
        }
      })),
      pagination: {
        current: page,
        limit,
        total: totalExpenses,
        pages: Math.ceil(totalExpenses / limit)
      }
    });
  })
);

// Get single expense by ID
router.get('/:id', authenticateToken, checkResourceOwnership('expense'), asyncHandler(async (req, res) => {
  const expenseId = req.params.id;
  
  const result = await query(`
    SELECT 
      e.id,
      e.amount,
      e.description,
      e.expense_date,
      e.payment_method,
      e.receipt_url,
      e.tags,
      e.notes,
      e.created_at,
      e.updated_at,
      c.id as category_id,
      c.name as category_name,
      c.color as category_color,
      c.icon as category_icon
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    WHERE e.id = $1
  `, [expenseId]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  
  const expense = result.rows[0];
  
  res.json({
    expense: {
      id: expense.id,
      amount: parseFloat(expense.amount),
      description: expense.description,
      expenseDate: expense.expense_date,
      paymentMethod: expense.payment_method,
      receiptUrl: expense.receipt_url,
      tags: expense.tags,
      notes: expense.notes,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
      category: {
        id: expense.category_id,
        name: expense.category_name,
        color: expense.category_color,
        icon: expense.category_icon
      }
    }
  });
}));

// Create new expense
router.post('/', authenticateToken, validateRequest(schemas.expense), asyncHandler(async (req, res) => {
  const { categoryId, amount, description, expenseDate, paymentMethod, receiptUrl, tags, notes } = req.body;
  const userId = req.user.id;
  
  // Validate category belongs to user
  const categoryResult = await query(
    'SELECT id FROM categories WHERE id = $1 AND user_id = $2 AND is_active = true',
    [categoryId, userId]
  );
  
  if (categoryResult.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  
  const result = await query(`
    INSERT INTO expenses (user_id, category_id, amount, description, expense_date, payment_method, receipt_url, tags, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, amount, description, expense_date, payment_method, receipt_url, tags, notes, created_at, updated_at
  `, [userId, categoryId, amount, description, expenseDate, paymentMethod, receiptUrl, tags, notes]);
  
  const expense = result.rows[0];
  
  // Get category information
  const categoryInfo = await query(
    'SELECT name, color, icon FROM categories WHERE id = $1',
    [categoryId]
  );
  
  const category = categoryInfo.rows[0];
  
  res.status(201).json({
    message: 'Expense created successfully',
    expense: {
      id: expense.id,
      amount: parseFloat(expense.amount),
      description: expense.description,
      expenseDate: expense.expense_date,
      paymentMethod: expense.payment_method,
      receiptUrl: expense.receipt_url,
      tags: expense.tags,
      notes: expense.notes,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
      category: {
        id: categoryId,
        name: category.name,
        color: category.color,
        icon: category.icon
      }
    }
  });
}));

// Update expense
router.put('/:id', 
  authenticateToken, 
  checkResourceOwnership('expense'),
  validateRequest(schemas.expense), 
  asyncHandler(async (req, res) => {
    const { categoryId, amount, description, expenseDate, paymentMethod, receiptUrl, tags, notes } = req.body;
    const expenseId = req.params.id;
    const userId = req.user.id;
    
    // Validate category belongs to user
    const categoryResult = await query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2 AND is_active = true',
      [categoryId, userId]
    );
    
    if (categoryResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    const result = await query(`
      UPDATE expenses 
      SET category_id = $1, amount = $2, description = $3, expense_date = $4, 
          payment_method = $5, receipt_url = $6, tags = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND user_id = $10
      RETURNING id, amount, description, expense_date, payment_method, receipt_url, tags, notes, created_at, updated_at
    `, [categoryId, amount, description, expenseDate, paymentMethod, receiptUrl, tags, notes, expenseId, userId]);
    
    const expense = result.rows[0];
    
    // Get category information
    const categoryInfo = await query(
      'SELECT name, color, icon FROM categories WHERE id = $1',
      [categoryId]
    );
    
    const category = categoryInfo.rows[0];
    
    res.json({
      message: 'Expense updated successfully',
      expense: {
        id: expense.id,
        amount: parseFloat(expense.amount),
        description: expense.description,
        expenseDate: expense.expense_date,
        paymentMethod: expense.payment_method,
        receiptUrl: expense.receipt_url,
        tags: expense.tags,
        notes: expense.notes,
        createdAt: expense.created_at,
        updatedAt: expense.updated_at,
        category: {
          id: categoryId,
          name: category.name,
          color: category.color,
          icon: category.icon
        }
      }
    });
  })
);

// Delete expense
router.delete('/:id', 
  authenticateToken, 
  checkResourceOwnership('expense'), 
  asyncHandler(async (req, res) => {
    const expenseId = req.params.id;
    const userId = req.user.id;
    
    await query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [expenseId, userId]);
    
    res.json({ message: 'Expense deleted successfully' });
  })
);

// Get expense summary statistics
router.get('/stats/summary', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Get basic stats
  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_expenses,
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(AVG(amount), 0) as avg_amount,
      MIN(expense_date) as first_expense_date,
      MAX(expense_date) as last_expense_date
    FROM expenses 
    WHERE user_id = $1
  `, [userId]);
  
  // Get current month stats
  const monthStatsResult = await query(`
    SELECT 
      COUNT(*) as monthly_expenses,
      COALESCE(SUM(amount), 0) as monthly_amount
    FROM expenses 
    WHERE user_id = $1 
    AND expense_date >= date_trunc('month', CURRENT_DATE)
    AND expense_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
  `, [userId]);
  
  // Get top categories
  const topCategoriesResult = await query(`
    SELECT 
      c.name,
      COUNT(e.id) as expense_count,
      SUM(e.amount) as total_amount
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    WHERE e.user_id = $1
    GROUP BY c.id, c.name
    ORDER BY total_amount DESC
    LIMIT 5
  `, [userId]);
  
  const stats = statsResult.rows[0];
  const monthStats = monthStatsResult.rows[0];
  
  res.json({
    summary: {
      totalExpenses: parseInt(stats.total_expenses),
      totalAmount: parseFloat(stats.total_amount),
      averageAmount: parseFloat(stats.avg_amount),
      firstExpenseDate: stats.first_expense_date,
      lastExpenseDate: stats.last_expense_date,
      monthlyExpenses: parseInt(monthStats.monthly_expenses),
      monthlyAmount: parseFloat(monthStats.monthly_amount),
      topCategories: topCategoriesResult.rows.map(row => ({
        name: row.name,
        expenseCount: parseInt(row.expense_count),
        totalAmount: parseFloat(row.total_amount)
      }))
    }
  });
}));

module.exports = router;