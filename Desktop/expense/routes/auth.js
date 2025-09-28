const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const { validateRequest, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', validateRequest(schemas.registerUser), asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  
  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  // Insert user
  const result = await query(
    `INSERT INTO users (username, email, password_hash, first_name, last_name) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING id, username, email, first_name, last_name, created_at`,
    [username, email, passwordHash, firstName, lastName]
  );
  
  const user = result.rows[0];
  
  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: user.created_at
    }
  });
}));

// Login user
router.post('/login', validateRequest(schemas.loginUser), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const userResult = await query(
    'SELECT id, username, email, password_hash, first_name, last_name, is_active FROM users WHERE email = $1',
    [email]
  );
  
  if (userResult.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  const user = userResult.rows[0];
  
  if (!user.is_active) {
    return res.status(401).json({ error: 'Account is disabled' });
  }
  
  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Store session with hashed token for security
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address) 
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, tokenHash, expiresAt, req.headers['user-agent'], req.ip]
  );
  
  res.json({
    message: 'Login successful',
    token,
    expiresAt,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    }
  });
}));

// Logout user
router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    // Remove session from database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await query('DELETE FROM user_sessions WHERE token_hash = $1', [tokenHash]);
  }
  
  res.json({ message: 'Logout successful' });
}));

// Get current user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = req.user;
  
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    }
  });
}));

// Update user profile
router.put('/profile', 
  authenticateToken,
  validateRequest(schemas.updateProfile),
  asyncHandler(async (req, res) => {
    const { firstName, lastName, currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    let updateFields = [];
    let updateValues = [];
    let paramCount = 1;
    
    // Handle name updates
    if (firstName) {
      updateFields.push(`first_name = $${paramCount++}`);
      updateValues.push(firstName);
    }
    
    if (lastName) {
      updateFields.push(`last_name = $${paramCount++}`);
      updateValues.push(lastName);
    }
    
    // Handle password update
    if (newPassword) {
      // Verify current password
      const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      
      const passwordHash = await bcrypt.hash(newPassword, 12);
      updateFields.push(`password_hash = $${paramCount++}`);
      updateValues.push(passwordHash);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Add user ID to the end
    updateValues.push(userId);
    
    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} 
       RETURNING id, username, email, first_name, last_name, updated_at`,
      updateValues
    );
    
    const user = result.rows[0];
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        updatedAt: user.updated_at
      }
    });
  })
);

module.exports = router;
