const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Check if session exists and is valid
    const sessionResult = await query(
      `SELECT 
         u.id, u.username, u.email, u.first_name, u.last_name, u.is_active
       FROM users u 
       JOIN user_sessions s ON u.id = s.user_id 
       WHERE s.token_hash = $1 
         AND s.expires_at > NOW() 
         AND u.is_active = true`,
      [tokenHash]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const sessionUser = sessionResult.rows[0];

    if (decoded.userId !== sessionUser.id) {
      return res.status(401).json({ error: 'Session mismatch' });
    }

    req.user = sessionUser;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user owns the resource
const checkResourceOwnership = (resourceType) => {
  return async (req, res, next) => {
    const resourceId = req.params.id;
    const userId = req.user.id;
    
    let queryText = '';
    
    switch (resourceType) {
      case 'expense':
        queryText = 'SELECT user_id FROM expenses WHERE id = $1';
        break;
      case 'category':
        queryText = 'SELECT user_id FROM categories WHERE id = $1';
        break;
      case 'budget':
        queryText = 'SELECT user_id FROM budgets WHERE id = $1';
        break;
      default:
        return res.status(400).json({ error: 'Invalid resource type' });
    }
    
    try {
      const result = await query(queryText, [resourceId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `${resourceType} not found` });
      }
      
      if (result.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

module.exports = {
  authenticateToken,
  checkResourceOwnership
};
