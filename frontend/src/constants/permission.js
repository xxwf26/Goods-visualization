/**
 * 权限常量定义 - 严格匹配需求文档第十节「权限需求」
 *
 * 需求文档定义的三级权限体系：
 * 1. 普通查看权限 (viewer): 查看历史项目、价格库、外部灵感、搜索筛选
 * 2. 编辑权限 (editor): 新增外部链接、编辑标签、上传截图、补充参考说明
 * 3. 管理员权限 (admin): 删除数据、修改供应商信息、修改价格记录、批量导入、管理标签体系
 */

// 权限角色 - 匹配需求文档
export const PERMISSION_ROLES = {
  VIEWER: 'viewer',       // 普通查看权限
  EDITOR: 'editor',       // 编辑权限
  ADMIN: 'admin'          // 管理员权限
}

// 权限角色名称映射
export const PERMISSION_ROLE_NAMES = {
  [PERMISSION_ROLES.VIEWER]: '普通用户',
  [PERMISSION_ROLES.EDITOR]: '编辑用户',
  [PERMISSION_ROLES.ADMIN]: '管理员'
}

// 资源类型 - 对应需求文档功能模块
export const PERMISSION_RESOURCES = {
  PROJECT: 'project',           // 历史周边记录库
  PRICE: 'price',               // 价格查询库
  INSPIRATION: 'inspiration',  // 外部灵感链接库
  SUPPLIER: 'supplier',        // 供应商库
  TAG: 'tag',                   // 标签管理
  SYSTEM: 'system'              // 系统管理
}

// 操作类型
export const PERMISSION_ACTIONS = {
  VIEW: 'view',             // 查看
  LIST: 'list',             // 列表/搜索
  CREATE: 'create',         // 新增
  EDIT: 'edit',             // 编辑
  DELETE: 'delete',         // 删除
  IMPORT: 'import',         // 批量导入
  EXPORT: 'export',         // 导出
  MANAGE: 'manage'          // 管理
}

/**
 * 根据角色获取权限码列表
 * 严格匹配需求文档第十节权限需求
 */
export function getPermissionsByRole(role) {
  const permissions = new Set()

  // ========== 普通查看权限 (viewer) ==========
  // 需求文档：查看历史项目、查看价格库、查看外部灵感、搜索筛选
  if (role === PERMISSION_ROLES.VIEWER || role === PERMISSION_ROLES.EDITOR || role === PERMISSION_ROLES.ADMIN) {
    // 基础查看权限 - 所有角色都有
    permissions.add('project:view')
    permissions.add('project:list')
    permissions.add('project:search')
    permissions.add('price:view')
    permissions.add('price:list')
    permissions.add('price:search')
    permissions.add('inspiration:view')
    permissions.add('inspiration:list')
    permissions.add('inspiration:search')
    permissions.add('supplier:view')
    permissions.add('supplier:list')
    permissions.add('supplier:search')
  }

  // ========== 编辑权限 (editor) ==========
  // 需求文档：新增外部链接、编辑标签、上传截图、补充参考说明
  if (role === PERMISSION_ROLES.EDITOR || role === PERMISSION_ROLES.ADMIN) {
    // 灵感库编辑
    permissions.add('inspiration:create')
    permissions.add('inspiration:edit')
    permissions.add('inspiration:upload')      // 上传截图
    permissions.add('inspiration:attach')      // 关联项目

    // 项目库编辑
    permissions.add('project:create')
    permissions.add('project:edit')

    // 标签编辑（仅编辑标签，不能删除）
    permissions.add('tag:create')
    permissions.add('tag:edit')

    // 供应商查看详情（不能修改）
    permissions.add('supplier:detail')
  }

  // ========== 管理员权限 (admin) ==========
  // 需求文档：删除数据、修改供应商信息、修改价格记录、批量导入、管理标签体系
  if (role === PERMISSION_ROLES.ADMIN) {
    // 删除权限
    permissions.add('project:delete')
    permissions.add('inspiration:delete')
    permissions.add('supplier:delete')

    // 供应商管理
    permissions.add('supplier:create')
    permissions.add('supplier:edit')
    permissions.add('supplier:manage')

    // 价格记录管理
    permissions.add('price:create')
    permissions.add('price:edit')
    permissions.add('price:delete')

    // 批量导入导出
    permissions.add('project:import')
    permissions.add('project:export')
    permissions.add('inspiration:import')
    permissions.add('supplier:import')
    permissions.add('supplier:export')

    // 标签体系管理
    permissions.add('tag:delete')
    permissions.add('tag:manage')

    // 系统管理
    permissions.add('system:manage')
    permissions.add('system:user')
  }

  return Array.from(permissions)
}

/**
 * 获取角色对应的菜单权限
 * 严格匹配需求文档第六节「页面结构建议」
 */
export function getMenusByRole(role) {
  // 所有角色可见的基础菜单
  const baseMenus = [
    { path: '/home', name: '首页', icon: 'HomeFilled', permission: 'home' }
  ]

  if (role === PERMISSION_ROLES.VIEWER) {
    // 普通查看权限 - 所有菜单都可见（仅查看）
    return [
      ...baseMenus,
      { path: '/projects', name: '历史项目库', icon: 'Box', permission: 'project' },
      { path: '/price-query', name: '价格查询', icon: 'Money', permission: 'price' },
      { path: '/inspiration', name: '灵感链接库', icon: 'Link', permission: 'inspiration' },
      { path: '/suppliers', name: '供应商库', icon: 'OfficeBuilding', permission: 'supplier' }
    ]
  } else if (role === PERMISSION_ROLES.EDITOR) {
    // 编辑权限 - 全部菜单 + 新增入口
    return [
      ...baseMenus,
      { path: '/projects', name: '历史项目库', icon: 'Box', permission: 'project' },
      { path: '/price-query', name: '价格查询', icon: 'Money', permission: 'price' },
      { path: '/inspiration', name: '灵感链接库', icon: 'Link', permission: 'inspiration' },
      { path: '/suppliers', name: '供应商库', icon: 'OfficeBuilding', permission: 'supplier' },
      { path: '/add-inspiration', name: '新增灵感', icon: 'Plus', permission: 'inspiration:create', hidden: true }
    ]
  } else {
    // 管理员 - 全部菜单 + 管理功能
    return [
      ...baseMenus,
      { path: '/projects', name: '历史项目库', icon: 'Box', permission: 'project' },
      { path: '/price-query', name: '价格查询', icon: 'Money', permission: 'price' },
      { path: '/inspiration', name: '灵感链接库', icon: 'Link', permission: 'inspiration' },
      { path: '/suppliers', name: '供应商库', icon: 'OfficeBuilding', permission: 'supplier' },
      { path: '/import', name: '批量导入', icon: 'Upload', permission: 'project:import' },
      { path: '/system', name: '系统管理', icon: 'Setting', permission: 'system', children: [
        { path: '/system/tags', name: '标签管理', icon: 'PriceTag', permission: 'tag:manage' }
      ]}
    ]
  }
}

/**
 * 权限检查函数
 */
export function hasPermission(userPermissions, permission) {
  if (!userPermissions || !Array.isArray(userPermissions)) return false
  return userPermissions.includes(permission)
}

export function hasAllPermissions(userPermissions, permissions) {
  if (!userPermissions || !Array.isArray(userPermissions)) return false
  return permissions.every(p => userPermissions.includes(p))
}

export function hasAnyPermission(userPermissions, permissions) {
  if (!userPermissions || !Array.isArray(userPermissions)) return false
  return permissions.some(p => userPermissions.includes(p))
}
