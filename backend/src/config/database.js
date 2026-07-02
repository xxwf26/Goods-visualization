const mysql = require('mysql2/promise')

let pool = null

const createPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'goods_visualization',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    })
    // 每个新连接强制 SET NAMES，确保中文不乱码
    pool.on('connection', (conn) => {
      conn.query('SET NAMES utf8mb4')
    })
  }
  return pool
}

const getConnection = async () => {
  const pool = createPool()
  return await pool.getConnection()
}

const query = async (sql, params = []) => {
  const pool = createPool()
  // 使用 pool.query 而非 pool.execute，避免 LIMIT/OFFSET 的 prepared statement 兼容性问题
  const [results] = await pool.query(sql, params)
  return results
}

const transaction = async (callback) => {
  const connection = await getConnection()
  await connection.beginTransaction()
  
  try {
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

const closePool = async () => {
  if (pool) {
    await pool.end()
    pool = null
  }
}

module.exports = {
  createPool,
  getConnection,
  query,
  transaction,
  closePool
}
