/**
 * 批量导入 Controller
 */
const { Response } = require('../utils/response')
const ImportService = require('../services/ImportService')

class ImportController {
  /**
   * 解析飞书导出的 Excel 文件
   * POST /api/import/parse
   */
  async parseExcel(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json(Response.badRequest('请上传 Excel 文件'))
      }

      const { data, errors } = await ImportService.parseExcel(req.file.path)

      res.json(Response.success({
        sheets: Object.keys(data),
        preview: data,
        errors
      }, 'Excel 解析完成'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 批量导入项目数据
   * POST /api/import/projects
   */
  async importProjects(req, res, next) {
    try {
      const { projects, options = {} } = req.body

      if (!Array.isArray(projects) || projects.length === 0) {
        return res.status(400).json(Response.badRequest('请提供有效的项目数据'))
      }

      // 执行导入
      const result = await ImportService.importProjects(projects, {
        userId: req.user?.id,
        duplicateMode: options.duplicateMode || 'skip', // skip | update | ignore
        updateFields: options.updateFields
      })

      res.json(Response.success(result, `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条，跳过 ${result.skipped} 条`))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 批量导入供应商数据
   * POST /api/import/suppliers
   */
  async importSuppliers(req, res, next) {
    try {
      const { suppliers, options = {} } = req.body

      if (!Array.isArray(suppliers) || suppliers.length === 0) {
        return res.status(400).json(Response.badRequest('请提供有效的供应商数据'))
      }

      const result = await ImportService.importSuppliers(suppliers, {
        userId: req.user?.id,
        duplicateMode: options.duplicateMode || 'skip',
        updateFields: options.updateFields
      })

      res.json(Response.success(result, `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条，跳过 ${result.skipped} 条`))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 批量导入价格数据
   * POST /api/import/prices
   */
  async importPrices(req, res, next) {
    try {
      const { prices, options = {} } = req.body

      if (!Array.isArray(prices) || prices.length === 0) {
        return res.status(400).json(Response.badRequest('请提供有效的价格数据'))
      }

      const result = await ImportService.importPrices(prices, {
        userId: req.user?.id,
        duplicateMode: options.duplicateMode || 'skip',
        updateFields: options.updateFields
      })

      res.json(Response.success(result, `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条，跳过 ${result.skipped} 条`))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 下载导入模板
   * GET /api/import/template/:type
   */
  async downloadTemplate(req, res, next) {
    try {
      const { type } = req.params

      const templateData = ImportService.generateTemplate(type)

      res.json(Response.success(templateData))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 预览导入数据（字段映射）
   * POST /api/import/preview
   */
  async previewImport(req, res, next) {
    try {
      const { data, type } = req.body

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json(Response.badRequest('请提供有效的导入数据'))
      }

      const result = ImportService.previewMapping(data, type)

      res.json(Response.success(result))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new ImportController()
