/**
 * 历史项目 Controller
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const { validate } = require('../utils/validator')
const { recalcSupplierStats, recalcSuppliersStats } = require('../utils/supplierStats')
const { syncTags } = require('../utils/tagWrite')
const { getTagsByRecord, tagExistsClause } = require('../utils/tagQuery')
const { humanizeImportError } = require('../utils/importError')

class ProjectController {
  /**
   * 项目列表（多条件筛选、关键词搜索）
   * GET /api/projects
   */
  async list(req, res, next) {
    try {
      const {
        page = 1, pageSize = 10, keyword, ip, project_year, supplier_name,
        requirement_type, sort_field = 'create_time', sort_order = 'DESC'
      } = req.query

      const offset = (page - 1) * pageSize
      let whereClause = 'WHERE p.is_delete = 0'
      const params = []

      // 关键词搜索
      if (keyword) {
        whereClause += ` AND (p.product_name LIKE ? OR p.project_name LIKE ? OR p.purchase_order_no LIKE ? OR p.requester LIKE ? OR p.region LIKE ?)`
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
      }

      // IP标签筛选（走关联表 EXISTS，前端下拉传 tag id）
      if (ip) {
        whereClause += ` AND ${tagExistsClause('project', 'p', 'ip')}`
        params.push(ip)
      }

      if (project_year) {
        whereClause += ' AND p.project_year = ?'
        params.push(project_year)
      }

      if (supplier_name) {
        whereClause += ' AND p.supplier_name LIKE ?'
        params.push(`%${supplier_name}%`)
      }

      if (requirement_type) {
        whereClause += ' AND p.requirement_type LIKE ?'
        params.push(`%${requirement_type}%`)
      }

      // 排序
      const validSortFields = ['create_time', 'update_time', 'expected_delivery_date', 'total_amount', 'priority']
      const sortField = validSortFields.includes(sort_field) ? sort_field : 'create_time'
      const sortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

      // 查询总数
      const countSql = `SELECT COUNT(DISTINCT p.id) as total FROM project p ${whereClause}`
      const [countResult] = await db.query(countSql, params)
      const total = countResult.total

      // 查询列表
      const listSql = `
        SELECT p.*,
               su.username as buyer_username,
               su.nickname as buyer_nickname,
               GROUP_CONCAT(DISTINCT t_ip.tag_name) as ip_tag_names,
               GROUP_CONCAT(DISTINCT t_cat.tag_name) as category_tag_names,
               GROUP_CONCAT(DISTINCT t_craft.tag_name) as craft_tag_names,
               GROUP_CONCAT(DISTINCT t_scene.tag_name) as scene_tag_names
        FROM project p
        LEFT JOIN sys_user su ON p.buyer_id = su.id
        LEFT JOIN project_tag r_ip ON r_ip.project_id = p.id AND r_ip.tag_type = 'ip'
        LEFT JOIN tag t_ip ON t_ip.id = r_ip.tag_id AND t_ip.is_delete = 0
        LEFT JOIN project_tag r_cat ON r_cat.project_id = p.id AND r_cat.tag_type = 'category'
        LEFT JOIN tag t_cat ON t_cat.id = r_cat.tag_id AND t_cat.is_delete = 0
        LEFT JOIN project_tag r_craft ON r_craft.project_id = p.id AND r_craft.tag_type = 'craft'
        LEFT JOIN tag t_craft ON t_craft.id = r_craft.tag_id AND t_craft.is_delete = 0
        LEFT JOIN project_tag r_scene ON r_scene.project_id = p.id AND r_scene.tag_type = 'scene'
        LEFT JOIN tag t_scene ON t_scene.id = r_scene.tag_id AND t_scene.is_delete = 0
        ${whereClause}
        GROUP BY p.id
        ORDER BY p.${sortField} ${sortOrder}
        LIMIT ? OFFSET ?
      `
      const list = await db.query(listSql, [...params, parseInt(pageSize), parseInt(offset)])

      res.json(Response.success({
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 项目详情
   * GET /api/projects/:id
   */
  async detail(req, res, next) {
    try {
      const { id } = req.params

      const sql = `
        SELECT p.*,
               su.username as buyer_username,
               su.nickname as buyer_nickname,
               s.supplier_name,
               s.contact_person as supplier_contact,
               s.contact_phone as supplier_phone
        FROM project p
        LEFT JOIN sys_user su ON p.buyer_id = su.id
        LEFT JOIN supplier s ON p.supplier_id = s.id
        WHERE p.id = ? AND p.is_delete = 0
      `
      const [project] = await db.query(sql, [id])

      if (!project) {
        return res.status(404).json(Response.notFound('项目不存在'))
      }

      // 获取标签详情（走关联表，修复旧代码用名称当 id 查不到的 bug）
      const tagMap = await getTagsByRecord('project', id)
      const fetchDetails = async (ids) => {
        if (!ids.length) return []
        const ph = ids.map(() => '?').join(',')
        return await db.query(`SELECT * FROM tag WHERE id IN (${ph}) AND is_delete = 0`, ids)
      }
      project.ipTagDetails = await fetchDetails(tagMap.ip)
      project.categoryTagDetails = await fetchDetails(tagMap.category)
      project.craftTagDetails = await fetchDetails(tagMap.craft)
      project.sceneTagDetails = await fetchDetails(tagMap.scene)
      // 表单 IP 下拉用 id 回填（关联表查出），替代旧的 ip_tag_ids 名称
      project.ip_tag_id = tagMap.ip[0] || null

      res.json(Response.success(project))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 新增项目
   * POST /api/projects
   */
  async create(req, res, next) {
    try {
      const v = validate(req.body)
        .required(['project_name'])
        .maxLength('project_name', 200)
        .maxLength('project_code', 50)
        .isIn('status', ['draft', 'reviewing', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'])
        .isIn('priority', [1, 2, 3, 4])

      if (!v.validate()) {
        return res.status(400).json(Response.badRequest(v.getFirstError()))
      }

      const {
        project_name,
        project_code,
        project_type,
        status = 'draft',
        priority = 2,
        budget,
        actual_cost,
        region,
        ip_tag_ids,
        category_tag_ids,
        craft_tag_ids,
        scene_tag_ids,
        supplier_id,
        buyer_id,
        product_name,
        total_amount,
        project_year,
        person_days,
        quotation_file,
        requirement_type,
        purchase_order_no,
        project_start_date,
        project_end_date,
        requester,
        project_leader,
        remark,
        file_storage,
        parent_record
      } = req.body

      const sql = `
        INSERT INTO project (
          project_name, project_code, project_type, status, priority,
          ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
          supplier_id, buyer_id, product_name, total_amount,
          project_year, person_days, quotation_file, requirement_type,
          purchase_order_no, project_start_date, project_end_date,
          requester, project_leader, remark, file_storage, parent_record,
          region,
          create_user_id, create_time, update_time, is_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
      `

      const result = await db.query(sql, [
        project_name, project_code, project_type, status, priority,
        ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
        supplier_id || null, buyer_id || null, product_name, total_amount,
        project_year, person_days, quotation_file, requirement_type,
        purchase_order_no, project_start_date, project_end_date,
        requester, project_leader, remark, file_storage, parent_record,
        region,
        req.user?.id
      ])

      // 触发供应商统计重算（合作项目数/总金额）
      try { await recalcSupplierStats(supplier_id) } catch {}
      // 写标签关联表（前端 IP 下拉传 tag id；旧逗号字段由 INSERT 已写入 id）
      try {
        const ipIds = String(ip_tag_ids || '').split(',').map(Number).filter(n => !isNaN(n))
        if (ipIds.length) await syncTags('project', result.insertId, { ip: ipIds })
      } catch {}

      res.json(Response.success({ id: result.insertId }, '创建成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 编辑项目
   * PUT /api/projects/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params
      const {
        project_name, project_code, project_type, status, priority,
        region, ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
        supplier_name, product_name, total_amount,
        project_year, person_days, quotation_file, requirement_type,
        purchase_order_no, project_start_date, project_end_date,
        requester, project_leader, remark, file_storage, parent_record
      } = req.body

      const sql = `
        UPDATE project SET
          project_name = COALESCE(?, project_name),
          project_type = COALESCE(?, project_type),
          status = COALESCE(?, status),
          region = COALESCE(?, region),
          ip_tag_ids = COALESCE(?, ip_tag_ids),
          category_tag_ids = COALESCE(?, category_tag_ids),
          craft_tag_ids = COALESCE(?, craft_tag_ids),
          scene_tag_ids = COALESCE(?, scene_tag_ids),
          supplier_id = COALESCE(?, supplier_id),
          product_name = COALESCE(?, product_name),
          total_amount = COALESCE(?, total_amount),
          project_year = COALESCE(?, project_year),
          person_days = COALESCE(?, person_days),
          quotation_file = COALESCE(?, quotation_file),
          requirement_type = COALESCE(?, requirement_type),
          purchase_order_no = COALESCE(?, purchase_order_no),
          project_start_date = COALESCE(?, project_start_date),
          project_end_date = COALESCE(?, project_end_date),
          requester = COALESCE(?, requester),
          project_leader = COALESCE(?, project_leader),
          remark = COALESCE(?, remark),
          file_storage = COALESCE(?, file_storage),
          parent_record = COALESCE(?, parent_record),
          update_time = NOW()
        WHERE id = ? AND is_delete = 0
      `

      // 取旧 supplier_id，用于换供应商时新旧两边都重算
      const [oldRow] = await db.query('SELECT supplier_id FROM project WHERE id = ? AND is_delete = 0', [id])

      const result = await db.query(sql, [
        project_name, project_type, status,
        region, ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
        supplier_name, product_name, total_amount,
        project_year, person_days, quotation_file, requirement_type,
        purchase_order_no, project_start_date, project_end_date,
        requester, project_leader, remark, file_storage, parent_record,
        id
      ])

      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('项目不存在'))
      }

      // 重算：旧 supplier_id + 当前 supplier_id（可能换供应商，两边都要更新）
      try {
        const [newRow] = await db.query('SELECT supplier_id FROM project WHERE id = ?', [id])
        await recalcSuppliersStats([oldRow?.supplier_id, newRow?.supplier_id])
      } catch {}

      // 若传了 ip_tag_ids，同步关联表（前端传 tag id；双写旧字段已由 UPDATE 处理）
      if (ip_tag_ids !== undefined) {
        try {
          const ipIds = String(ip_tag_ids || '').split(',').map(Number).filter(n => !isNaN(n))
          await syncTags('project', id, { ip: ipIds })
        } catch {}
      }

      res.json(Response.success(null, '更新成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 删除项目（管理员专属）
   * DELETE /api/projects/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params

      // 权限检查：仅管理员可删除
      if (!req.user?.role_codes?.includes('super_admin') && !req.user?.role_codes?.includes('admin')) {
        return res.status(403).json(Response.forbidden('仅管理员可删除'))
      }

      const [oldRow] = await db.query('SELECT supplier_id FROM project WHERE id = ? AND is_delete = 0', [id])

      const result = await db.query(
        'UPDATE project SET is_delete = 1, update_time = NOW() WHERE id = ? AND is_delete = 0',
        [id]
      )

      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('项目不存在'))
      }

      // 软删后该项目不再计入供应商统计，重算
      try { await recalcSupplierStats(oldRow?.supplier_id) } catch {}

      res.json(Response.success(null, '删除成功'))
    } catch (error) {
      next(error)
    }
  }

  /** 回收站列表 GET /api/projects/trash */
  async listTrash(req, res, next) {
    try {
      const { page = 1, pageSize = 20 } = req.query
      const offset = (page - 1) * pageSize
      const [c] = await db.query('SELECT COUNT(*) as total FROM project WHERE is_delete = 1')
      const list = await db.query(
        `SELECT id, project_name, project_code, status, region, update_time
         FROM project WHERE is_delete = 1 ORDER BY update_time DESC LIMIT ? OFFSET ?`,
        [parseInt(pageSize), parseInt(offset)]
      )
      res.json(Response.success({ list, pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total: c.total, totalPages: Math.ceil(c.total / pageSize) } }))
    } catch (error) { next(error) }
  }

  /** 恢复 PUT /api/projects/:id/restore */
  async restore(req, res, next) {
    try {
      const [row] = await db.query('SELECT supplier_id FROM project WHERE id = ? AND is_delete = 1', [req.params.id])
      const r = await db.query('UPDATE project SET is_delete = 0, update_time = NOW() WHERE id = ? AND is_delete = 1', [req.params.id])
      if (r.affectedRows === 0) return res.status(404).json(Response.notFound('回收站中无此记录'))
      // 恢复后该项目重新计入供应商统计
      try { await recalcSupplierStats(row?.supplier_id) } catch {}
      res.json(Response.success(null, '已恢复'))
    } catch (error) { next(error) }
  }

  /** 彻底删除 DELETE /api/projects/:id/purge */
  async purge(req, res, next) {
    try {
      const [row] = await db.query('SELECT supplier_id FROM project WHERE id = ? AND is_delete = 1', [req.params.id])
      const r = await db.query('DELETE FROM project WHERE id = ? AND is_delete = 1', [req.params.id])
      if (r.affectedRows === 0) return res.status(404).json(Response.notFound('回收站中无此记录，无法彻底删除'))
      // 物理删除后重算供应商统计
      try { await recalcSupplierStats(row?.supplier_id) } catch {}
      res.json(Response.success(null, '已彻底删除'))
    } catch (error) { next(error) }
  }

  /**
   * 批量导入项目
   * POST /api/projects/import
   */
  async import(req, res, next) {
    try {
      const { projects } = req.body

      if (!Array.isArray(projects) || projects.length === 0) {
        return res.status(400).json(Response.badRequest('请提供有效的项目数据'))
      }

      const results = {
        success: 0,
        failed: 0,
        errors: []
      }
      const touchedSuppliers = new Set()

      for (let i = 0; i < projects.length; i++) {
        const project = projects[i]

        if (!project.project_name) {
          results.failed++
          results.errors.push(`第${i + 1}行: 项目名称必填`)
          continue
        }

        try {
          const sql = `
            INSERT INTO project (
              project_name, project_code, project_type, status, priority,
              budget, actual_cost, ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
              supplier_id, product_name, product_spec, product_material, product_color,
              product_size, quantity, unit_price, total_amount,
              cover_image, expected_delivery_date,
              description, requirement, remark, create_user_id, create_time, update_time, is_delete
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
          `

          await db.query(sql, [
            project.project_name,
            project.project_code || null,
            project.project_type || null,
            project.status || 'draft',
            project.priority || 2,
            project.budget || null,
            project.actual_cost || null,
            project.ip_tag_ids || null,
            project.category_tag_ids || null,
            project.craft_tag_ids || null,
            project.scene_tag_ids || null,
            project.supplier_id || null,
            project.product_name || null,
            project.product_spec || null,
            project.product_material || null,
            project.product_color || null,
            project.product_size || null,
            project.quantity || null,
            project.unit_price || null,
            project.total_amount || (project.quantity && project.unit_price ? project.quantity * project.unit_price : null),
            project.cover_image || null,
            project.expected_delivery_date || null,
            project.description || null,
            project.requirement || null,
            project.remark || null,
            req.user?.id
          ])
          if (project.supplier_id) touchedSuppliers.add(project.supplier_id)
          // 写标签关联表（import 的 ip_tag_ids 已是 tag id）
          try {
            const ipIds = String(project.ip_tag_ids || '').split(',').map(Number).filter(n => !isNaN(n))
            const catIds = String(project.category_tag_ids || '').split(',').map(Number).filter(n => !isNaN(n))
            const craftIds = String(project.craft_tag_ids || '').split(',').map(Number).filter(n => !isNaN(n))
            const sceneIds = String(project.scene_tag_ids || '').split(',').map(Number).filter(n => !isNaN(n))
            if (ipIds.length || catIds.length || craftIds.length || sceneIds.length) {
              await syncTags('project', result.insertId, { ip: ipIds, category: catIds, craft: craftIds, scene: sceneIds })
            }
          } catch {}
          results.success++
        } catch (err) {
          results.failed++
          results.errors.push(`第${i + 1}行: ${humanizeImportError(err)}`)
        }
      }

      // 导入涉及的供应商统计重算
      try { await recalcSuppliersStats([...touchedSuppliers]) } catch {}

      res.json(Response.success(results, '批量导入完成'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 批量导出项目
   * GET /api/projects/export
   */
  async export(req, res, next) {
    try {
      const { ids, keyword, status, start_date, end_date } = req.query

      let whereClause = 'WHERE p.is_delete = 0'
      const params = []

      if (ids) {
        whereClause += ` AND p.id IN (${ids.split(',').map(() => '?').join(',')})`
        params.push(...ids.split(','))
      }

      if (keyword) {
        whereClause += ` AND (p.project_name LIKE ? OR p.project_code LIKE ? OR p.product_name LIKE ?)`
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
      }

      if (status) {
        whereClause += ' AND p.status = ?'
        params.push(status)
      }

      if (start_date) {
        whereClause += ' AND p.create_time >= ?'
        params.push(start_date)
      }

      if (end_date) {
        whereClause += ' AND p.create_time <= ?'
        params.push(end_date)
      }

      const sql = `
        SELECT p.*, s.supplier_name, su.nickname as buyer_name
        FROM project p
        LEFT JOIN supplier s ON p.supplier_id = s.id
        LEFT JOIN sys_user su ON p.buyer_id = su.id
        ${whereClause}
        ORDER BY p.create_time DESC
      `

      const list = await db.query(sql, params)

      res.json(Response.success(list))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 项目筛选选项（去重，供前端下拉使用，避免拉取整表）
   * GET /api/projects/options
   */
  async options(req, res, next) {
    try {
      const ALLOWED_COLS = ['ip_tag_ids', 'project_year', 'requirement_type']
      const pick = async (col) => {
        if (!ALLOWED_COLS.includes(col)) throw new Error('非法列名')
        const rows = await db.query(
          `SELECT DISTINCT \`${col}\` as v FROM project WHERE is_delete = 0 AND \`${col}\` IS NOT NULL AND \`${col}\` <> '' ORDER BY v`
        )
        return rows.map(r => r.v)
      }
      // supplier_name 通过 JOIN supplier 表获取
      const supplierRows = await db.query(
        `SELECT DISTINCT s.supplier_name as v FROM project p
         JOIN supplier s ON p.supplier_id = s.id
         WHERE p.is_delete = 0 AND s.supplier_name IS NOT NULL
         ORDER BY v`
      )
      // IP 下拉用 tag 表的 ip 类标签（id+name），替代旧的 DISTINCT ip_tag_ids 名称
      const ipTagRows = await db.query("SELECT id, tag_name FROM tag WHERE tag_type='ip' AND is_delete=0 AND status=1 ORDER BY sort, tag_name")
      const [years, reqTypes] = await Promise.all([
        pick('project_year'), pick('requirement_type')
      ])
      res.json(Response.success({
        ipTagIds: ipTagRows,
        years,
        suppliers: supplierRows.map(r => r.v),
        reqTypes
      }))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new ProjectController()
