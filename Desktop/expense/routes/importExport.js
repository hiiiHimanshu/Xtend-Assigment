const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const { pool, query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const ALLOWED_PAYMENT_METHODS = new Set([
  'cash',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'paypal',
  'other'
]);

const normalizePaymentMethod = (value) => {
  if (!value) {
    return 'cash';
  }

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  return ALLOWED_PAYMENT_METHODS.has(normalized) ? normalized : 'other';
};

const sanitize = (value) => (value ? String(value).trim() : '');

const parseCsvBuffer = (buffer) => new Promise((resolve, reject) => {
  const records = [];

  Readable.from(buffer.toString('utf8'))
    .pipe(csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
    .on('data', (row) => records.push(row))
    .on('end', () => resolve(records))
    .on('error', (error) => reject(error));
});

const csvEscape = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString().slice(0, 10);
  }

  return String(value);
};

router.post('/import', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  const records = await parseCsvBuffer(req.file.buffer);

  if (records.length === 0) {
    return res.status(400).json({ error: 'No records found in CSV file' });
  }

  const client = await pool.connect();
  const categoryCache = new Map();
  const errors = [];
  let insertedCount = 0;

  const getCategoryId = async (rawName = 'Uncategorized') => {
    const name = sanitize(rawName) || 'Uncategorized';
    const key = name.toLowerCase();

    if (categoryCache.has(key)) {
      return categoryCache.get(key);
    }

    const existing = await client.query(
      'SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
      [req.user.id, name]
    );

    if (existing.rows.length > 0) {
      categoryCache.set(key, existing.rows[0].id);
      return existing.rows[0].id;
    }

    const { rows } = await client.query(
      `INSERT INTO categories (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [req.user.id, name, 'Imported from CSV']
    );

    categoryCache.set(key, rows[0].id);
    return rows[0].id;
  };

  try {
    await client.query('BEGIN');

    for (let index = 0; index < records.length; index++) {
      const row = records[index];

      try {
        const amount = parseFloat(row.amount);
        const description = sanitize(row.description);
        const dateValue = row.date ? new Date(row.date) : null;

        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Invalid amount');
        }

        if (!description) {
          throw new Error('Description is required');
        }

        if (!dateValue || Number.isNaN(dateValue.valueOf())) {
          throw new Error('Invalid date');
        }

        const expenseDate = dateValue.toISOString().slice(0, 10);
        const categoryId = await getCategoryId(row.category);
        const paymentMethod = normalizePaymentMethod(row.payment_method);
        const receiptUrl = sanitize(row.receipt_url);
        const notes = sanitize(row.notes);

        const tags = sanitize(row.tags)
          .split(/[;,|]/)
          .map((tag) => tag.trim())
          .filter(Boolean);

        const tagsArray = tags.length > 0 ? tags : null;

        await client.query(
          `INSERT INTO expenses (user_id, category_id, amount, description, expense_date, payment_method, receipt_url, tags, notes)
           VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), $8, NULLIF($9, ''))`,
          [
            req.user.id,
            categoryId,
            amount,
            description,
            expenseDate,
            paymentMethod,
            receiptUrl,
            tagsArray,
            notes
          ]
        );

        insertedCount += 1;
      } catch (error) {
        errors.push({ row: index + 1, error: error.message });
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  res.json({
    message: 'Import completed',
    processed: records.length,
    inserted: insertedCount,
    failed: errors.length,
    errors: errors.slice(0, 20) // limit response size
  });
}));

router.get('/export', authenticateToken, asyncHandler(async (req, res) => {
  const { range = 'all', startDate, endDate } = req.query;

  let fromDate = null;
  let toDate = null;

  const now = new Date();

  switch (range) {
    case 'month': {
      const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      fromDate = firstDay.toISOString().slice(0, 10);
      const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
      toDate = nextMonth.toISOString().slice(0, 10);
      break;
    }
    case 'year': {
      const firstDay = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const lastDay = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
      fromDate = firstDay.toISOString().slice(0, 10);
      toDate = lastDay.toISOString().slice(0, 10);
      break;
    }
    case 'custom': {
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required for custom range' });
      }
      fromDate = new Date(startDate);
      toDate = new Date(endDate);
      if (Number.isNaN(fromDate.valueOf()) || Number.isNaN(toDate.valueOf())) {
        return res.status(400).json({ error: 'Invalid custom date range' });
      }
      fromDate = fromDate.toISOString().slice(0, 10);
      toDate = toDate.toISOString().slice(0, 10);
      break;
    }
    default:
      break;
  }

  const params = [req.user.id];
  let whereClause = 'WHERE e.user_id = $1';

  if (fromDate) {
    params.push(fromDate);
    whereClause += ` AND e.expense_date >= $${params.length}`;
  }

  if (toDate) {
    params.push(toDate);
    whereClause += ` AND e.expense_date <= $${params.length}`;
  }

  const result = await query(
    `SELECT 
       e.amount,
       e.description,
       TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date,
       c.name AS category_name,
       e.payment_method,
       e.tags,
       e.notes
     FROM expenses e
     LEFT JOIN categories c ON e.category_id = c.id
     ${whereClause}
     ORDER BY e.expense_date DESC, e.created_at DESC`,
    params
  );

  const header = 'amount,description,date,category,payment_method,tags,notes';
  const rows = result.rows.map((row) => {
    const tags = Array.isArray(row.tags) ? row.tags.join(';') : '';
    return [
      Number(row.amount).toFixed(2),
      row.description || '',
      formatDate(row.expense_date),
      row.category_name || '',
      row.payment_method || '',
      tags,
      row.notes || ''
    ].map(csvEscape).join(',');
  });

  const csvContent = [header, ...rows].join('\n');
  const suffix = range === 'custom'
    ? `${fromDate || 'start'}_${toDate || 'end'}`
    : range;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="expenses_${suffix || 'all'}.csv"`);
  res.send(csvContent);
}));

module.exports = router;
