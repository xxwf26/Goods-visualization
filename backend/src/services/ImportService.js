/**
 * 批量导入服务
 * 支持解析飞书多维表格导出的 Excel 数据
 * 实现字段自动匹配、批量入库、数据去重
 */
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')
const db = require('../config/database')

class ImportService {
  /**
   * 解析 Excel 文件
   * @param {string} filePath - 文件路径
   * @returns {Object} 解析结果
   */
  static async parseExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath)

      const data = {}
      const errors = []

      for (const sheetName of workbook.SheetNames) {
        try {
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

          if (jsonData.length > 0) {
            // 自动识别数据类型
            const recognizedData = this.recognizeSheetData(jsonData, sheetName)
            data[sheetName] = recognizedData
          }
        } catch (sheetError) {
          errors.push(`工作表 "${sheetName}" 解析失败: ${sheetError.message}`)
        }
      }

      // 清理临时文件
      this.cleanTempFile(filePath)

      return { data, errors }
    } catch (error) {
      throw error
    }
  }

  /**
   * 自动识别工作表数据类型
   */
  static recognizeSheetData(jsonData, sheetName) {
    if (jsonData.length === 0) return []

    const headers = Object.keys(jsonData[0])

    // 根据表头识别数据类型
    const dataType = this.identifyDataType(headers)

    return {
      type: dataType,
      headers,
      rows: jsonData,
      count: jsonData.length,
      sheetName
    }
  }

  /**
   * 根据表头识别数据类型
   */
  static identifyDataType(headers) {
    const headerStr = headers.join('').toLowerCase()

    // 项目相关关键词
    const projectKeywords = ['项目名称', '项目编号', '项目名称', '产品名称', '数量', '单价', '总价', '供应商', '负责人', '状态', '品类', '工艺']
    const projectMatch = projectKeywords.filter(k => headerStr.includes(k)).length

    // 供应商相关关键词
    const supplierKeywords = ['供应商', '联系人', '电话', '邮箱', '地址', '合作状态', '评级', '优势', '品类']
    const supplierMatch = supplierKeywords.filter(k => headerStr.includes(k)).length

    // 价格相关关键词
    const priceKeywords = ['单价', '价格', '报价', '数量', '供应商', '日期', '有效期']
    const priceMatch = priceKeywords.filter(k => headerStr.includes(k)).length

    // 根据匹配度判断
    if (projectMatch >= 3) return 'project'
    if (supplierMatch >= 3) return 'supplier'
    if (priceMatch >= 2) return 'price'

    return 'unknown'
  }

  /**
   * 预览字段映射
   */
  static previewMapping(data, type) {
    if (data.length === 0) return { headers: [], mappings: [], preview: [] }

    const headers = Object.keys(data[0])

    // 字段映射规则
    const mappings = this.getFieldMappings(type)

    // 应用映射
    const mappedData = data.map(row => {
      const mapped = {}
      for (const [excelField, dbField] of Object.entries(mappings)) {
        if (row[excelField] !== undefined) {
          mapped[dbField] = row[excelField]
        }
      }
      return mapped
    })

    return {
      originalHeaders: headers,
      fieldMappings: mappings,
      preview: mappedData.slice(0, 10), // 预览前10条
      totalCount: data.length
    }
  }

  /**
   * 获取字段映射规则
   */
  static getFieldMappings(type) {
    const mappings = {
      project: {
        '项目名称': 'project_name',
        '项目编号': 'project_code',
        '产品名称': 'product_name',
        '品类': 'category',
        '工艺': 'craft',
        '数量': 'quantity',
        '单价': 'unit_price',
        '总价': 'total_amount',
        '供应商': 'supplier_name',
        '负责人': 'buyer_name',
        '状态': 'status',
        '期望交付日期': 'expected_delivery_date',
        '描述': 'description',
        '备注': 'remark',
        'IP': 'ip_tag',
        '场景': 'scene_tag',
        '规格': 'product_spec',
        '材质': 'product_material',
        '颜色': 'product_color',
        '尺寸': 'product_size'
      },
      supplier: {
        '供应商名称': 'supplier_name',
        '供应商编号': 'supplier_code',
        '联系人': 'contact_person',
        '联系电话': 'contact_phone',
        '邮箱': 'contact_email',
        '省份': 'province',
        '城市': 'city',
        '地址': 'address',
        '合作状态': 'cooperation_status',
        '评级': 'rating',
        '优势品类': 'advantage_categories',
        '主营产品': 'main_products',
        '备注': 'remark',
        '税点': 'tax_rate',
        '付款天数': 'payment_days',
        '最小订单': 'min_order_amount'
      },
      price: {
        '供应商': 'supplier_name',
        '品类': 'category',
        '工艺': 'craft',
        '数量': 'quantity',
        '单价': 'unit_price',
        '总价': 'total_amount',
        '报价日期': 'quote_date',
        '有效期': 'valid_until',
        '备注': 'remark',
        '尺寸': 'size',
        '材质': 'material'
      }
    }

    return mappings[type] || {}
  }

  /**
   * 批量导入项目数据
   */
  static async importProjects(projects, options = {}) {
    const { userId = 1, duplicateMode = 'skip', updateFields = [] } = options

    const result = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      insertedIds: []
    }

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i]
      const rowNum = i + 2 // Excel行号（从2开始，1是表头）

      try {
        // 数据验证
        if (!project.project_name) {
          result.failed++
          result.errors.push(`第${rowNum}行: 项目名称不能为空`)
          continue
        }

        // 检查重复
        const existingProject = await this.findDuplicateProject(project)
        if (existingProject) {
          if (duplicateMode === 'skip') {
            result.skipped++
            continue
          } else if (duplicateMode === 'update' && updateFields.length > 0) {
            // 更新已有记录
            await this.updateProject(existingProject.id, project, updateFields)
            result.success++
            continue
          }
        }

        // 处理供应商ID
        let supplierId = null
        if (project.supplier_name) {
          supplierId = await this.getOrCreateSupplier(project.supplier_name, userId)
        }

        // 处理标签ID
        const tagIds = await this.processTags(project, userId)

        // 插入数据
        const insertResult = await this.insertProject(project, {
          supplierId,
          ...tagIds,
          userId
        })

        result.success++
        result.insertedIds.push(insertResult.insertId)
      } catch (err) {
        result.failed++
        result.errors.push(`第${rowNum}行: ${err.message}`)
      }
    }

    return result
  }

  /**
   * 批量导入供应商数据
   */
  static async importSuppliers(suppliers, options = {}) {
    const { userId = 1, duplicateMode = 'skip' } = options

    const result = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      insertedIds: []
    }

    for (let i = 0; i < suppliers.length; i++) {
      const supplier = suppliers[i]
      const rowNum = i + 2

      try {
        if (!supplier.supplier_name) {
          result.failed++
          result.errors.push(`第${rowNum}行: 供应商名称不能为空`)
          continue
        }

        // 检查重复
        const existing = await db.query(
          'SELECT id FROM supplier WHERE supplier_name = ? AND is_delete = 0',
          [supplier.supplier_name]
        )

        if (existing.length > 0) {
          if (duplicateMode === 'skip') {
            result.skipped++
            continue
          }
        }

        const insertResult = await this.insertSupplier(supplier, userId)

        result.success++
        result.insertedIds.push(insertResult.insertId)
      } catch (err) {
        result.failed++
        result.errors.push(`第${rowNum}行: ${err.message}`)
      }
    }

    return result
  }

  /**
   * 批量导入价格数据
   */
  static async importPrices(prices, options = {}) {
    const { userId = 1, duplicateMode = 'skip' } = options

    const result = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      insertedIds: []
    }

    for (let i = 0; i < prices.length; i++) {
      const price = prices[i]
      const rowNum = i + 2

      try {
        // 价格数据至少需要供应商和品类
        if (!price.supplier_name && !price.category) {
          result.failed++
          result.errors.push(`第${rowNum}行: 供应商和品类至少需要填写一项`)
          continue
        }

        // 处理供应商ID
        let supplierId = null
        if (price.supplier_name) {
          supplierId = await this.getOrCreateSupplier(price.supplier_name, userId)
        }

        const insertResult = await this.insertPriceRecord(price, {
          supplierId,
          userId
        })

        result.success++
        result.insertedIds.push(insertResult.insertId)
      } catch (err) {
        result.failed++
        result.errors.push(`第${rowNum}行: ${err.message}`)
      }
    }

    return result
  }

  /**
   * 查找重复项目
   */
  static async findDuplicateProject(project) {
    let sql = 'SELECT * FROM project WHERE is_delete = 0 AND '
    const params = []

    // 按项目名称精确匹配
    if (project.project_name) {
      sql += 'project_name = ?'
      params.push(project.project_name)

      // 如果有项目编号，按编号二次确认
      if (project.project_code) {
        sql += ' OR project_code = ?'
        params.push(project.project_code)
      }
    }

    const results = await db.query(sql, params)
    return results.length > 0 ? results[0] : null
  }

  /**
   * 获取或创建供应商
   */
  static async getOrCreateSupplier(supplierName, userId) {
    // 先查找
    const existing = await db.query(
      'SELECT id FROM supplier WHERE supplier_name = ? AND is_delete = 0',
      [supplierName]
    )

    if (existing.length > 0) {
      return existing[0].id
    }

    // 创建新供应商
    const result = await db.query(
      `INSERT INTO supplier (supplier_name, cooperation_status, create_user_id, create_time, update_time, is_delete)
       VALUES (?, 'potential', ?, NOW(), NOW(), 0)`,
      [supplierName, userId]
    )

    return result.insertId
  }

  /**
   * 处理标签（获取或创建）
   */
  static async processTags(project, userId) {
    const result = {
      ip_tag_ids: null,
      category_tag_ids: null,
      craft_tag_ids: null,
      scene_tag_ids: null
    }

    // 处理 IP 标签
    if (project.ip_tag) {
      const ipId = await this.getOrCreateTag(project.ip_tag, 'ip', userId)
      result.ip_tag_ids = ipId.toString()
    }

    // 处理品类标签
    if (project.category) {
      const categoryId = await this.getOrCreateTag(project.category, 'category', userId)
      result.category_tag_ids = categoryId.toString()
    }

    // 处理工艺标签
    if (project.craft) {
      const craftId = await this.getOrCreateTag(project.craft, 'craft', userId)
      result.craft_tag_ids = craftId.toString()
    }

    // 处理场景标签
    if (project.scene_tag) {
      const sceneId = await this.getOrCreateTag(project.scene_tag, 'scene', userId)
      result.scene_tag_ids = sceneId.toString()
    }

    return result
  }

  /**
   * 获取或创建标签
   */
  static async getOrCreateTag(tagName, category, userId) {
    // 先查找（修正：使用 tag_name 和 tag_type 列名）
    const existing = await db.query(
      'SELECT id FROM tag WHERE tag_name = ? AND tag_type = ? AND is_delete = 0',
      [tagName, category]
    )

    if (existing.length > 0) {
      return existing[0].id
    }

    // 创建新标签
    const result = await db.query(
      `INSERT INTO tag (tag_name, tag_type, sort, status, create_time, update_time, is_delete)
       VALUES (?, ?, 0, 1, NOW(), NOW(), 0)`,
      [tagName, category]
    )

    return result.insertId
  }

  /**
   * 插入项目记录
   */
  static async insertProject(project, options) {
    const {
      supplierId,
      ip_tag_ids,
      category_tag_ids,
      craft_tag_ids,
      scene_tag_ids,
      userId
    } = options

    // 计算总价
    let totalAmount = project.total_amount
    if (!totalAmount && project.quantity && project.unit_price) {
      totalAmount = project.quantity * project.unit_price
    }

    const sql = `
      INSERT INTO project (
        project_name, project_code, product_name, product_spec, product_material,
        product_color, product_size, quantity, unit_price, total_amount,
        status, priority, supplier_id, ip_tag_ids, category_tag_ids,
        craft_tag_ids, scene_tag_ids, expected_delivery_date,
        description, remark, create_user_id, create_time, update_time, is_delete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
    `

    return await db.query(sql, [
      project.project_name,
      project.project_code || null,
      project.product_name || null,
      project.product_spec || null,
      project.product_material || null,
      project.product_color || null,
      project.product_size || null,
      this.parseNumber(project.quantity),
      this.parseNumber(project.unit_price),
      this.parseNumber(totalAmount),
      this.mapStatus(project.status),
      this.parseNumber(project.priority) || 2,
      supplierId,
      ip_tag_ids,
      category_tag_ids,
      craft_tag_ids,
      scene_tag_ids,
      this.parseDate(project.expected_delivery_date),
      project.description || null,
      project.remark || null,
      userId
    ])
  }

  /**
   * 更新项目记录
   */
  static async updateProject(id, project, updateFields) {
    const updates = []
    const params = []

    for (const field of updateFields) {
      if (project[field] !== undefined) {
        updates.push(`${field} = ?`)
        params.push(project[field])
      }
    }

    if (updates.length === 0) return

    updates.push('update_time = NOW()')
    params.push(id)

    const sql = `UPDATE project SET ${updates.join(', ')} WHERE id = ?`
    return await db.query(sql, params)
  }

  /**
   * 插入供应商记录
   */
  static async insertSupplier(supplier, userId) {
    const sql = `
      INSERT INTO supplier (
        supplier_name, supplier_code, contact_person, contact_phone, contact_email,
        province, city, address, cooperation_status, rating,
        advantage, main_products, remark, tax_rate, payment_days,
        create_user_id, create_time, update_time, is_delete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
    `

    return await db.query(sql, [
      supplier.supplier_name,
      supplier.supplier_code || null,
      supplier.contact_person || null,
      supplier.contact_phone || null,
      supplier.contact_email || null,
      supplier.province || null,
      supplier.city || null,
      supplier.address || null,
      this.mapCooperationStatus(supplier.cooperation_status),
      this.parseNumber(supplier.rating),
      supplier.advantage || null,
      supplier.main_products || null,
      supplier.remark || null,
      this.parseNumber(supplier.tax_rate),
      this.parseNumber(supplier.payment_days),
      userId
    ])
  }

  /**
   * 插入价格记录
   */
  static async insertPriceRecord(price, options) {
    const { supplierId, userId } = options

    // 价格数据存入 project 表（作为轻量项目记录）
    const sql = `
      INSERT INTO project (
        supplier_id, project_name, category_tag_ids, craft_tag_ids,
        quantity, unit_price, total_amount,
        project_start_date, project_end_date,
        remark, status, create_user_id, create_time, update_time, is_delete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, NOW(), NOW(), 0)
    `

    return await db.query(sql, [
      supplierId,
      price.supplier_name ? `${price.supplier_name}报价记录` : '价格记录',
      price.category || null,
      price.craft || null,
      this.parseNumber(price.quantity),
      this.parseNumber(price.unit_price),
      this.parseNumber(price.total_amount),
      this.parseDate(price.quote_date),
      this.parseDate(price.valid_until),
      price.remark || null,
      userId
    ])
  }

  /**
   * 解析数字
   */
  static parseNumber(value) {
    if (value === null || value === undefined || value === '') {
      return null
    }
    const num = parseFloat(value)
    return isNaN(num) ? null : num
  }

  /**
   * 解析日期
   */
  static parseDate(value) {
    if (!value) return null

    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) return null
      return date.toISOString().split('T')[0]
    } catch {
      return null
    }
  }

  /**
   * 映射状态值
   */
  static mapStatus(status) {
    const statusMap = {
      '草稿': 'draft',
      '审核中': 'reviewing',
      '已通过': 'approved',
      '已拒绝': 'rejected',
      '进行中': 'in_progress',
      '已完成': 'completed',
      '已取消': 'cancelled'
    }
    return statusMap[status] || 'draft'
  }

  /**
   * 映射合作状态
   */
  static mapCooperationStatus(status) {
    const statusMap = {
      '潜在': 'potential',
      '合作中': 'active',
      '暂停': 'paused',
      '终止': 'terminated'
    }
    return statusMap[status] || 'potential'
  }

  /**
   * 生成导入模板
   */
  static generateTemplate(type) {
    const templates = {
      project: {
        name: '历史项目导入模板',
        headers: [
          '项目名称', '项目编号', '产品名称', '品类', '工艺', '数量', '单价', '总价',
          '供应商', 'IP', '场景', '规格', '材质', '颜色', '尺寸',
          '状态', '优先级', '期望交付日期', '描述', '备注'
        ],
        sample: [
          {
            '项目名称': '示例项目',
            '项目编号': 'PRJ-001',
            '产品名称': '原神角色立牌',
            '品类': '立牌',
            '工艺': '喷漆',
            '数量': 500,
            '单价': 25.00,
            '总价': 12500.00,
            '供应商': '萌え物语旗舰店',
            'IP': '原神',
            '场景': '新品开发',
            '规格': '10cm',
            '材质': 'PVC',
            '颜色': '彩色',
            '尺寸': '10x15cm',
            '状态': '已完成',
            '优先级': 2,
            '期望交付日期': '2026-06-30',
            '描述': '新品立牌开发项目',
            '备注': ''
          }
        ]
      },
      supplier: {
        name: '供应商导入模板',
        headers: [
          '供应商名称', '供应商编号', '联系人', '联系电话', '邮箱',
          '省份', '城市', '地址', '合作状态', '评级',
          '优势品类', '主营产品', '备注', '税点', '付款天数'
        ],
        sample: [
          {
            '供应商名称': '萌え物语旗舰店',
            '供应商编号': 'SUP-001',
            '联系人': '张经理',
            '联系电话': '13800138000',
            '邮箱': 'contact@example.com',
            '省份': '广东',
            '城市': '深圳',
            '地址': '南山区xxx路xxx号',
            '合作状态': '合作中',
            '评级': 4.5,
            '优势品类': '手办,立牌,挂件',
            '主营产品': '动漫周边产品',
            '备注': '',
            '税点': 6,
            '付款天数': 30
          }
        ]
      },
      price: {
        name: '价格数据导入模板',
        headers: [
          '供应商', '品类', '工艺', '数量', '单价', '总价',
          '报价日期', '有效期', '尺寸', '材质', '备注'
        ],
        sample: [
          {
            '供应商': '萌え物语旗舰店',
            '品类': '立牌',
            '工艺': '喷漆',
            '数量': 500,
            '单价': 25.00,
            '总价': 12500.00,
            '报价日期': '2026-06-01',
            '有效期': '2026-12-31',
            '尺寸': '10x15cm',
            '材质': 'PVC',
            '备注': ''
          }
        ]
      }
    }

    return templates[type] || templates.project
  }

  /**
   * 清理临时文件
   */
  static cleanTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (err) {
      console.error('清理临时文件失败:', err)
    }
  }
}

module.exports = ImportService
