const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let dbType = 'mysql';
let pool = null;
let sqliteDb = null;

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const sqlitePath = path.join(dbDir, 'loan_dashboard.sqlite');

async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'loan_dashboard';
  const port = process.env.DB_PORT || 3306;

  try {
    console.log(`Connecting to MySQL database at ${host}:${port} as ${user}...`);
    const rootConn = await mysql.createConnection({ host, user, password, port });
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await rootConn.end();

    pool = mysql.createPool({
      host, user, password, database, port,
      waitForConnections: true, connectionLimit: 10, queueLimit: 0
    });

    const schemaSql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

    for (let statement of statements) {
      await pool.query(statement);
    }

    // Migration helper for MySQL
    try {
      await pool.query(`ALTER TABLE loans ADD COLUMN current_principal DECIMAL(12,2) DEFAULT 0.00;`);
      await pool.query(`UPDATE loans SET current_principal = loan_amount WHERE current_principal = 0 OR current_principal IS NULL;`);
      await pool.query(`ALTER TABLE loans ADD COLUMN interest_type VARCHAR(50) DEFAULT 'reducing';`);
      await pool.query(`ALTER TABLE loans ADD COLUMN guarantor_name VARCHAR(255) DEFAULT NULL;`);
      await pool.query(`ALTER TABLE installments ADD COLUMN principal_paid DECIMAL(12,2) DEFAULT 0.00;`);
      await pool.query(`ALTER TABLE installments ADD COLUMN interest_paid DECIMAL(12,2) DEFAULT 0.00;`);
    } catch (e) {
      // Ignore columns already exist error
    }

    dbType = 'mysql';
    console.log(`Successfully connected to MySQL database [${database}]`);
    return { dbType: 'mysql', pool };
  } catch (err) {
    const sanitizedMsg = (err.message || '').replace(/(password|secret|token|key)=[^&\s]+/gi, '$1=****').replace(/(mysql|postgres|mongodb):\/\/([^:]+):([^@]+)@/gi, '$1://$2:****@');
    console.warn(`MySQL Connection failed: ${sanitizedMsg}`);
    console.log(`Fallback: Initializing local SQLite database at ${sqlitePath}...`);
    
    dbType = 'sqlite';
    sqliteDb = new sqlite3.Database(sqlitePath);
    
    await runSqliteQuery(`
      CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_taker TEXT NOT NULL,
        guarantor_name TEXT,
        loan_amount REAL NOT NULL,
        current_principal REAL DEFAULT 0.00,
        payment_mode TEXT DEFAULT 'Gpay',
        interest_rate REAL NOT NULL,
        interest_tenure TEXT NOT NULL,
        interest_type TEXT DEFAULT 'reducing',
        date_given TEXT NOT NULL,
        return_date TEXT,
        interest_amount REAL DEFAULT 0.00,
        total_amount REAL DEFAULT 0.00,
        balance_due REAL DEFAULT 0.00,
        status TEXT DEFAULT 'active',
        remark TEXT,
        requires_collateral INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await runSqliteQuery(`
      CREATE TABLE IF NOT EXISTS installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        installment_no INTEGER NOT NULL DEFAULT 1,
        payment_date TEXT NOT NULL,
        amount_paid REAL NOT NULL,
        principal_paid REAL DEFAULT 0.00,
        interest_paid REAL DEFAULT 0.00,
        payment_mode TEXT DEFAULT 'Gpay',
        remaining_balance REAL NOT NULL,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
      );
    `);

    // Migration helper for SQLite
    try { await runSqliteQuery(`ALTER TABLE loans ADD COLUMN current_principal REAL DEFAULT 0.00;`); } catch(e){}
    try { await runSqliteQuery(`UPDATE loans SET current_principal = loan_amount WHERE current_principal = 0 OR current_principal IS NULL;`); } catch(e){}
    try { await runSqliteQuery(`ALTER TABLE loans ADD COLUMN interest_type TEXT DEFAULT 'reducing';`); } catch(e){}
    try { await runSqliteQuery(`ALTER TABLE loans ADD COLUMN guarantor_name TEXT DEFAULT NULL;`); } catch(e){}
    try { await runSqliteQuery(`ALTER TABLE installments ADD COLUMN principal_paid REAL DEFAULT 0.00;`); } catch(e){}
    try { await runSqliteQuery(`ALTER TABLE installments ADD COLUMN interest_paid REAL DEFAULT 0.00;`); } catch(e){}

    await runSqliteQuery(`
      CREATE TABLE IF NOT EXISTS collateral_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        description TEXT,
        estimated_value REAL,
        photo_path TEXT,
        status TEXT DEFAULT 'pledged',
        sale_price REAL DEFAULT 0.00,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
      );
    `);

    await runSqliteQuery(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        document_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        original_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
      );
    `);

    // Performance Indexes for Fast Lookups
    try {
      await runSqliteQuery(`CREATE INDEX IF NOT EXISTS idx_installments_loan_id ON installments(loan_id);`);
      await runSqliteQuery(`CREATE INDEX IF NOT EXISTS idx_collateral_loan_id ON collateral_items(loan_id);`);
      await runSqliteQuery(`CREATE INDEX IF NOT EXISTS idx_documents_loan_id ON documents(loan_id);`);
    } catch (e) {}

    console.log(`Successfully initialized SQLite database.`);
    return { dbType: 'sqlite', sqliteDb };
  }
}

function runSqliteQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (sql.trim().toLowerCase().startsWith('select')) {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve([rows]);
      });
    } else {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
      });
    }
  });
}

async function query(sql, params = []) {
  if (dbType === 'mysql' && pool) {
    return await pool.query(sql, params);
  } else if (dbType === 'sqlite' && sqliteDb) {
    return await runSqliteQuery(sql, params);
  } else {
    throw new Error('Database not initialized');
  }
}

function getDbType() {
  return dbType;
}

module.exports = {
  initDatabase,
  query,
  getDbType
};
