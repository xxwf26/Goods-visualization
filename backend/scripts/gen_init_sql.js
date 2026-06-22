const fs = require('fs')
const path = require('path')
const mysql = require('../node_modules/mysql2/promise')

const SEED_TABLES = ['sys_role', 'sys_permission', 'sys_role_permission', 'sys_user', 'sys_user_role', 'tag']
// 表创建顺序：被引用的基础表在前
const TABLE_ORDER = [
  'sys_user', 'sys_role', 'sys_user_role', 'sys_permission', 'sys_role_permission',
  'tag', 'supplier', 'supplier_evaluation', 'project', 'price_record',
  'inspiration', 'inspiration_folder', 'category', 'design_note', 'log'
]

;(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'dipin808', database: 'goods_visualization' })

  const [tblRows] = await c.query('SHOW TABLES')
  const allTables = tblRows.map(r => Object.values(r)[0])
  // 按既定顺序排列，未列出的补在后面
  const tables = [...TABLE_ORDER.filter(t => allTables.includes(t)), ...allTables.filter(t => !TABLE_ORDER.includes(t))]

  let out = ''
  out += '-- =============================================================\n'
  out += '-- 周边可视化系统 数据库初始化脚本\n'
  out += '-- 由权威库结构导出，已包含全部迁移结果（含 price_record / supplier.risk_level / design_note / category 等共 ' + tables.length + ' 张表）\n'
  out += '-- 种子数据：系统用户/角色/权限/标签\n'
  out += '-- =============================================================\n\n'
  out += 'CREATE DATABASE IF NOT EXISTS `goods_visualization` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;\n'
  out += 'USE `goods_visualization`;\n\n'
  out += 'SET FOREIGN_KEY_CHECKS = 0;\n\n'

  // 1. 表结构
  for (const t of tables) {
    const [[row]] = [await c.query('SHOW CREATE TABLE `' + t + '`')]
    const ddl = row[0]['Create Table']
    out += '-- ----------- 表结构: ' + t + ' -----------\n'
    out += 'DROP TABLE IF EXISTS `' + t + '`;\n'
    out += ddl + ';\n\n'
  }

  // 2. 种子数据
  out += '-- =============================================================\n'
  out += '-- 种子数据\n'
  out += '-- =============================================================\n\n'
  for (const t of SEED_TABLES) {
    const rows = await c.query('SELECT * FROM `' + t + '`')
    const data = rows[0]
    if (!data.length) continue
    const cols = Object.keys(data[0])
    out += '-- ' + t + ' (' + data.length + ' 行)\n'
    const values = data.map(r => '(' + cols.map(col => {
      const v = r[col]
      if (v === null) return 'NULL'
      if (v instanceof Date) return c.escape(v.toISOString().slice(0, 19).replace('T', ' '))
      return c.escape(v)
    }).join(', ') + ')')
    out += 'INSERT INTO `' + t + '` (' + cols.map(x => '`' + x + '`').join(', ') + ') VALUES\n'
    out += values.join(',\n') + ';\n\n'
  }

  out += 'SET FOREIGN_KEY_CHECKS = 1;\n'

  const target = path.resolve(__dirname, '../../database/init.sql')
  fs.writeFileSync(target, out, 'utf8')
  console.log('已写入', target, '大小', out.length, '字节，表', tables.length, '张')
  await c.end()
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
