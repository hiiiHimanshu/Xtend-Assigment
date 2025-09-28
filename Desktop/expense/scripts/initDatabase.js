const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Initializing database...');
    
    // Read and execute schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schemaSQL);
    console.log('✅ Database schema created successfully');
    
    // Check if we should load sample data
    if (process.argv.includes('--with-data')) {
      console.log('Loading sample data...');
      const sampleDataPath = path.join(__dirname, '../database/sample_data.sql');
      const sampleDataSQL = fs.readFileSync(sampleDataPath, 'utf8');
      
      await client.query(sampleDataSQL);
      console.log('✅ Sample data loaded successfully');
    }
    
    console.log('✅ Database initialization completed');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };