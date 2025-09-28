const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, checkResourceOwnership } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all categories for the current user (with hierarchy)
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const result = await query(`
    SELECT 
      c.id,
      c.name,
      c.description,
      c.parent_id,
      c.color,
      c.icon,
      c.is_active,
      c.created_at,
      c.updated_at,
      parent.name as parent_name,
      COUNT(e.id) as expense_count,
      COALESCE(SUM(e.amount), 0) as total_spent
    FROM categories c
    LEFT JOIN categories parent ON c.parent_id = parent.id
    LEFT JOIN expenses e ON c.id = e.category_id
    WHERE c.user_id = $1 AND c.is_active = true
    GROUP BY c.id, c.name, c.description, c.parent_id, c.color, c.icon, c.is_active, c.created_at, c.updated_at, parent.name
    ORDER BY c.parent_id NULLS FIRST, c.name
  `, [userId]);
  
  res.json({
    categories: result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      parentId: row.parent_id,
      parentName: row.parent_name,
      color: row.color,
      icon: row.icon,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expenseCount: parseInt(row.expense_count),
      totalSpent: parseFloat(row.total_spent)
    }))
  });
}));

// Get category hierarchy view
router.get('/hierarchy', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const result = await query(`
    SELECT * FROM category_hierarchy 
    WHERE user_id = $1 
    ORDER BY level, path
  `, [userId]);
  
  res.json({
    hierarchy: result.rows.map(row => ({
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      level: row.level,
      path: row.path,
      rootName: row.root_name
    }))
  });
}));

// Get single category by ID
router.get('/:id', authenticateToken, checkResourceOwnership('category'), asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  
  const result = await query(`
    SELECT 
      c.id,
      c.name,
      c.description,
      c.parent_id,
      c.color,
      c.icon,
      c.is_active,
      c.created_at,
      c.updated_at,
      parent.name as parent_name,
      COUNT(child.id) as child_count,
      COUNT(e.id) as expense_count,
      COALESCE(SUM(e.amount), 0) as total_spent
    FROM categories c
    LEFT JOIN categories parent ON c.parent_id = parent.id
    LEFT JOIN categories child ON c.id = child.parent_id AND child.is_active = true
    LEFT JOIN expenses e ON c.id = e.category_id
    WHERE c.id = $1
    GROUP BY c.id, c.name, c.description, c.parent_id, c.color, c.icon, c.is_active, c.created_at, c.updated_at, parent.name
  `, [categoryId]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }
  
  const category = result.rows[0];
  
  res.json({
    category: {
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parent_id,
      parentName: category.parent_name,
      color: category.color,
      icon: category.icon,
      isActive: category.is_active,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
      childCount: parseInt(category.child_count),
      expenseCount: parseInt(category.expense_count),
      totalSpent: parseFloat(category.total_spent)
    }
  });
}));

// Create new category
router.post('/', authenticateToken, validateRequest(schemas.category), asyncHandler(async (req, res) => {
  const { name, description, parentId, color, icon } = req.body;
  const userId = req.user.id;
  
  // Validate parent category belongs to user if provided
  if (parentId) {
    const parentResult = await query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2 AND is_active = true',
      [parentId, userId]
    );
    
    if (parentResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid parent category' });
    }
  }
  
  const result = await query(`
    INSERT INTO categories (user_id, name, description, parent_id, color, icon)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, description, parent_id, color, icon, is_active, created_at, updated_at
  `, [userId, name, description, parentId, color, icon]);
  
  const category = result.rows[0];
  
  res.status(201).json({
    message: 'Category created successfully',
    category: {
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parent_id,
      color: category.color,
      icon: category.icon,
      isActive: category.is_active,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    }
  });
}));

// Update category
router.put('/:id', 
  authenticateToken, 
  checkResourceOwnership('category'),
  validateRequest(schemas.category), 
  asyncHandler(async (req, res) => {
    const { name, description, parentId, color, icon } = req.body;
    const categoryId = req.params.id;
    const userId = req.user.id;
    
    // Prevent setting self as parent
    if (parentId === categoryId) {
      return res.status(400).json({ error: 'Category cannot be its own parent' });
    }
    
    // Validate parent category belongs to user if provided
    if (parentId) {
      const parentResult = await query(
        'SELECT id FROM categories WHERE id = $1 AND user_id = $2 AND is_active = true',
        [parentId, userId]
      );
      
      if (parentResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid parent category' });
      }
      
      // Check for circular reference
      const circularCheck = await query(`
        WITH RECURSIVE category_tree AS (
          SELECT id, parent_id, 1 as level
          FROM categories 
          WHERE id = $1 AND user_id = $2
          
          UNION ALL
          
          SELECT c.id, c.parent_id, ct.level + 1
          FROM categories c
          JOIN category_tree ct ON c.id = ct.parent_id
          WHERE ct.level < 10 -- Prevent infinite recursion
        )
        SELECT id FROM category_tree WHERE id = $3
      `, [parentId, userId, categoryId]);
      
      if (circularCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Circular reference detected' });
      }
    }
    
    const result = await query(`
      UPDATE categories 
      SET name = $1, description = $2, parent_id = $3, color = $4, icon = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND user_id = $7
      RETURNING id, name, description, parent_id, color, icon, is_active, created_at, updated_at
    `, [name, description, parentId, color, icon, categoryId, userId]);
    
    const category = result.rows[0];
    
    res.json({
      message: 'Category updated successfully',
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        parentId: category.parent_id,
        color: category.color,
        icon: category.icon,
        isActive: category.is_active,
        createdAt: category.created_at,
        updatedAt: category.updated_at
      }
    });
  })
);

// Soft delete category (mark as inactive)
router.delete('/:id', 
  authenticateToken, 
  checkResourceOwnership('category'), 
  asyncHandler(async (req, res) => {
    const categoryId = req.params.id;
    const userId = req.user.id;
    
    // Check if category has expenses
    const expenseCheck = await query(
      'SELECT COUNT(*) as count FROM expenses WHERE category_id = $1',
      [categoryId]
    );
    
    if (parseInt(expenseCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing expenses. Move expenses to another category first.' 
      });
    }
    
    // Check if category has child categories
    const childCheck = await query(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = $1 AND is_active = true',
      [categoryId]
    );
    
    if (parseInt(childCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with child categories. Delete or move child categories first.' 
      });
    }
    
    // Soft delete
    await query(
      'UPDATE categories SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [categoryId, userId]
    );
    
    res.json({ message: 'Category deleted successfully' });
  })
);

module.exports = router;