// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Create MySQL connection pool
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'northern_attitude',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection established successfully.');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

/**
 * Execute a database query with parameters
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} - Query result
 */
async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error.message);
    console.error('Query:', sql);
    console.error('Parameters:', params);
    throw error;
  }
}

/**
 * Get a single record from a query
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} - Single record or null
 */
async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Insert a record and return inserted ID
 * @param {string} table - Table name
 * @param {Object} data - Data to insert
 * @returns {Promise<number>} - Inserted ID
 */
async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const result = await query(sql, values);
  
  return result.insertId;
}

/**
 * Update a record
 * @param {string} table - Table name
 * @param {Object} data - Data to update
 * @param {Object} where - Where conditions
 * @returns {Promise<number>} - Number of affected rows
 */
async function update(table, data, where) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map(key => `${key} = ?`).join(', ');
  
  const whereKeys = Object.keys(where);
  const whereValues = Object.values(where);
  const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');
  
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const result = await query(sql, [...values, ...whereValues]);
  
  return result.affectedRows;
}

/**
 * Delete records
 * @param {string} table - Table name
 * @param {Object} where - Where conditions
 * @returns {Promise<number>} - Number of affected rows
 */
async function remove(table, where) {
  const whereKeys = Object.keys(where);
  const whereValues = Object.values(where);
  const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');
  
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  const result = await query(sql, whereValues);
  
  return result.affectedRows;
}

/**
 * Begin a transaction
 * @returns {Promise<mysql.PoolConnection>} - Connection with transaction
 */
async function beginTransaction() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
}

/**
 * Commit a transaction
 * @param {mysql.PoolConnection} connection - Connection with transaction
 */
async function commitTransaction(connection) {
  await connection.commit();
  connection.release();
}

/**
 * Rollback a transaction
 * @param {mysql.PoolConnection} connection - Connection with transaction
 */
async function rollbackTransaction(connection) {
  await connection.rollback();
  connection.release();
}

module.exports = {
  pool,
  testConnection,
  query,
  queryOne,
  insert,
  update,
  remove,
  beginTransaction,
  commitTransaction,
  rollbackTransaction
};