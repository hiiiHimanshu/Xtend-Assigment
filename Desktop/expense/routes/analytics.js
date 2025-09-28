const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Monthly spending by category
router.get('/monthly-spending', 
  authenticateToken,
  validateRequest(schemas.analyticsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate, categoryId } = req.query;
    
    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramCount = 2;
    
    if (categoryId) {
      whereConditions.push(`category_id = $${paramCount++}`);
      queryParams.push(categoryId);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const result = await query(`
      SELECT * FROM monthly_spending_by_category 
      WHERE ${whereClause}
      AND month >= $${paramCount++} 
      AND month <= $${paramCount++}
      ORDER BY month DESC, total_amount DESC
    `, [...queryParams, startDate, endDate]);
    
    res.json({
      monthlySpending: result.rows.map(row => ({
        categoryId: row.category_id,
        categoryName: row.category_name,
        month: row.month,
        totalAmount: parseFloat(row.total_amount),
        expenseCount: parseInt(row.expense_count),
        averageAmount: parseFloat(row.avg_amount)
      }))
    });
  })
);

// Category breakdown (pie chart data)
router.get('/category-breakdown',
  authenticateToken,
  validateRequest(schemas.analyticsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const result = await query(`
      SELECT 
        c.id,
        c.name,
        c.color,
        c.icon,
        COUNT(e.id) as expense_count,
        SUM(e.amount) as total_amount,
        AVG(e.amount) as avg_amount,
        ROUND((SUM(e.amount) * 100.0 / (
          SELECT SUM(amount) FROM expenses 
          WHERE user_id = $1 
          AND expense_date >= $2 
          AND expense_date <= $3
        )), 2) as percentage
      FROM categories c
      JOIN expenses e ON c.id = e.category_id
      WHERE e.user_id = $1
      AND e.expense_date >= $2 
      AND e.expense_date <= $3
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY total_amount DESC
    `, [userId, startDate, endDate]);
    
    res.json({
      categoryBreakdown: result.rows.map(row => ({
        categoryId: row.id,
        categoryName: row.name,
        color: row.color,
        icon: row.icon,
        expenseCount: parseInt(row.expense_count),
        totalAmount: parseFloat(row.total_amount),
        averageAmount: parseFloat(row.avg_amount),
        percentage: parseFloat(row.percentage)
      }))
    });
  })
);

// Daily spending trend (line chart data)
router.get('/daily-trend',
  authenticateToken,
  validateRequest(schemas.analyticsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const result = await query(`
      SELECT * FROM daily_spending_summary 
      WHERE user_id = $1
      AND expense_date >= $2 
      AND expense_date <= $3
      ORDER BY expense_date
    `, [userId, startDate, endDate]);
    
    res.json({
      dailyTrend: result.rows.map(row => ({
        date: row.expense_date,
        totalAmount: parseFloat(row.total_amount),
        expenseCount: parseInt(row.expense_count),
        categoriesUsed: parseInt(row.categories_used)
      }))
    });
  })
);

// Payment method breakdown
router.get('/payment-methods',
  authenticateToken,
  validateRequest(schemas.analyticsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const result = await query(`
      SELECT 
        payment_method,
        COUNT(*) as expense_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        ROUND((SUM(amount) * 100.0 / (
          SELECT SUM(amount) FROM expenses 
          WHERE user_id = $1 
          AND expense_date >= $2 
          AND expense_date <= $3
        )), 2) as percentage
      FROM expenses
      WHERE user_id = $1
      AND expense_date >= $2 
      AND expense_date <= $3
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `, [userId, startDate, endDate]);
    
    res.json({
      paymentMethods: result.rows.map(row => ({
        paymentMethod: row.payment_method,
        expenseCount: parseInt(row.expense_count),
        totalAmount: parseFloat(row.total_amount),
        averageAmount: parseFloat(row.avg_amount),
        percentage: parseFloat(row.percentage)
      }))
    });
  })
);

// Top expenses by amount
router.get('/top-expenses',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 10, period = 'month' } = req.query;
    
    let dateCondition = '';
    switch (period) {
      case 'week':
        dateCondition = "AND expense_date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateCondition = "AND expense_date >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'year':
        dateCondition = "AND expense_date >= CURRENT_DATE - INTERVAL '365 days'";
        break;
      default:
        dateCondition = "AND expense_date >= CURRENT_DATE - INTERVAL '30 days'";
    }
    
    const result = await query(`
      SELECT 
        e.id,
        e.amount,
        e.description,
        e.expense_date,
        e.payment_method,
        c.name as category_name,
        c.color as category_color
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1 ${dateCondition}
      ORDER BY e.amount DESC
      LIMIT $2
    `, [userId, limit]);
    
    res.json({
      topExpenses: result.rows.map(row => ({
        id: row.id,
        amount: parseFloat(row.amount),
        description: row.description,
        expenseDate: row.expense_date,
        paymentMethod: row.payment_method,
        categoryName: row.category_name,
        categoryColor: row.category_color
      }))
    });
  })
);

// Monthly comparison (current vs previous month)
router.get('/monthly-comparison', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const result = await query(`
    SELECT 
      DATE_TRUNC('month', expense_date) as month,
      COUNT(*) as expense_count,
      SUM(amount) as total_amount,
      AVG(amount) as avg_amount
    FROM expenses
    WHERE user_id = $1
    AND expense_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
    GROUP BY DATE_TRUNC('month', expense_date)
    ORDER BY month DESC
    LIMIT 2
  `, [userId]);
  
  const currentMonth = result.rows.find(row => 
    new Date(row.month).getMonth() === new Date().getMonth()
  ) || { expense_count: 0, total_amount: 0, avg_amount: 0 };
  
  const previousMonth = result.rows.find(row => 
    new Date(row.month).getMonth() === new Date().getMonth() - 1
  ) || { expense_count: 0, total_amount: 0, avg_amount: 0 };
  
  const totalChange = previousMonth.total_amount > 0 
    ? ((currentMonth.total_amount - previousMonth.total_amount) / previousMonth.total_amount * 100)
    : 0;
    
  const countChange = previousMonth.expense_count > 0 
    ? ((currentMonth.expense_count - previousMonth.expense_count) / previousMonth.expense_count * 100)
    : 0;
  
  res.json({
    comparison: {
      currentMonth: {
        expenseCount: parseInt(currentMonth.expense_count),
        totalAmount: parseFloat(currentMonth.total_amount),
        averageAmount: parseFloat(currentMonth.avg_amount)
      },
      previousMonth: {
        expenseCount: parseInt(previousMonth.expense_count),
        totalAmount: parseFloat(previousMonth.total_amount),
        averageAmount: parseFloat(previousMonth.avg_amount)
      },
      changes: {
        totalAmountChange: parseFloat(totalChange.toFixed(2)),
        expenseCountChange: parseFloat(countChange.toFixed(2))
      }
    }
  });
}));

// Budget vs actual spending
router.get('/budget-performance', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { month = new Date().toISOString().slice(0, 7) } = req.query; // Format: YYYY-MM
  
  const result = await query(`
    SELECT 
      b.id as budget_id,
      b.amount as budget_amount,
      b.period_type,
      c.id as category_id,
      c.name as category_name,
      c.color as category_color,
      COALESCE(actual.spent_amount, 0) as spent_amount,
      COALESCE(actual.expense_count, 0) as expense_count
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN (
      SELECT 
        category_id,
        SUM(amount) as spent_amount,
        COUNT(*) as expense_count
      FROM expenses
      WHERE user_id = $1
      AND DATE_TRUNC('month', expense_date) = $2::date
      GROUP BY category_id
    ) actual ON c.id = actual.category_id
    WHERE b.user_id = $1
    AND b.is_active = true
    AND $2::date >= b.start_date
    AND $2::date <= b.end_date
    ORDER BY c.name NULLS LAST
  `, [userId, month + '-01']);
  
  res.json({
    budgetPerformance: result.rows.map(row => ({
      budgetId: row.budget_id,
      budgetAmount: parseFloat(row.budget_amount),
      spentAmount: parseFloat(row.spent_amount),
      remainingAmount: parseFloat(row.budget_amount) - parseFloat(row.spent_amount),
      utilizationPercentage: parseFloat(row.budget_amount) > 0 
        ? parseFloat((parseFloat(row.spent_amount) / parseFloat(row.budget_amount) * 100).toFixed(2))
        : 0,
      periodType: row.period_type,
      expenseCount: parseInt(row.expense_count),
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        color: row.category_color
      } : null
    }))
  });
}));

// Tag analysis
router.get('/tag-analysis',
  authenticateToken,
  validateRequest(schemas.analyticsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const result = await query(`
      SELECT 
        tag,
        COUNT(*) as expense_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM expenses,
      unnest(tags) as tag
      WHERE user_id = $1
      AND expense_date >= $2 
      AND expense_date <= $3
      GROUP BY tag
      ORDER BY total_amount DESC
      LIMIT 20
    `, [userId, startDate, endDate]);
    
    res.json({
      tagAnalysis: result.rows.map(row => ({
        tag: row.tag,
        expenseCount: parseInt(row.expense_count),
        totalAmount: parseFloat(row.total_amount),
        averageAmount: parseFloat(row.avg_amount)
      }))
    });
  })
);

// Generate comprehensive report
router.get('/comprehensive-report',
  authenticateToken,
  validateRequest(schemas.analyticsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    // Run multiple queries in parallel
    const [
      summaryResult,
      categoryResult,
      monthlyResult,
      paymentResult,
      topExpensesResult
    ] = await Promise.all([
      // Summary statistics
      query(`
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount,
          MIN(expense_date) as first_expense,
          MAX(expense_date) as last_expense
        FROM expenses 
        WHERE user_id = $1 
        AND expense_date >= $2 
        AND expense_date <= $3
      `, [userId, startDate, endDate]),
      
      // Category breakdown
      query(`
        SELECT 
          c.name,
          c.color,
          SUM(e.amount) as total_amount,
          COUNT(e.id) as expense_count
        FROM categories c
        JOIN expenses e ON c.id = e.category_id
        WHERE e.user_id = $1
        AND e.expense_date >= $2 
        AND e.expense_date <= $3
        GROUP BY c.id, c.name, c.color
        ORDER BY total_amount DESC
      `, [userId, startDate, endDate]),
      
      // Monthly trend
      query(`
        SELECT 
          DATE_TRUNC('month', expense_date) as month,
          SUM(amount) as total_amount,
          COUNT(*) as expense_count
        FROM expenses
        WHERE user_id = $1
        AND expense_date >= $2 
        AND expense_date <= $3
        GROUP BY DATE_TRUNC('month', expense_date)
        ORDER BY month
      `, [userId, startDate, endDate]),
      
      // Payment methods
      query(`
        SELECT 
          payment_method,
          SUM(amount) as total_amount,
          COUNT(*) as expense_count
        FROM expenses
        WHERE user_id = $1
        AND expense_date >= $2 
        AND expense_date <= $3
        GROUP BY payment_method
        ORDER BY total_amount DESC
      `, [userId, startDate, endDate]),
      
      // Top expenses
      query(`
        SELECT 
          e.amount,
          e.description,
          e.expense_date,
          c.name as category_name
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = $1
        AND e.expense_date >= $2 
        AND e.expense_date <= $3
        ORDER BY e.amount DESC
        LIMIT 10
      `, [userId, startDate, endDate])
    ]);
    
    const summary = summaryResult.rows[0];
    
    res.json({
      report: {
        period: {
          startDate,
          endDate
        },
        summary: {
          totalExpenses: parseInt(summary.total_expenses),
          totalAmount: parseFloat(summary.total_amount),
          averageAmount: parseFloat(summary.avg_amount),
          firstExpense: summary.first_expense,
          lastExpense: summary.last_expense
        },
        categoryBreakdown: categoryResult.rows.map(row => ({
          name: row.name,
          color: row.color,
          totalAmount: parseFloat(row.total_amount),
          expenseCount: parseInt(row.expense_count)
        })),
        monthlyTrend: monthlyResult.rows.map(row => ({
          month: row.month,
          totalAmount: parseFloat(row.total_amount),
          expenseCount: parseInt(row.expense_count)
        })),
        paymentMethods: paymentResult.rows.map(row => ({
          method: row.payment_method,
          totalAmount: parseFloat(row.total_amount),
          expenseCount: parseInt(row.expense_count)
        })),
        topExpenses: topExpensesResult.rows.map(row => ({
          amount: parseFloat(row.amount),
          description: row.description,
          date: row.expense_date,
          category: row.category_name
        }))
      }
    });
  })
);

module.exports = router;