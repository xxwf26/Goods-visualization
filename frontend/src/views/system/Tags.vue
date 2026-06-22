<template>
  <div class="tags-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        <h2>标签管理</h2>
        <span class="page-desc">统一管理系统中的IP、品类、工艺、场景标签</span>
      </div>
      <div class="page-actions">
        <PermissionButton
          permission="tag:create"
          type="primary"
          :icon="Plus"
          @click="handleAdd"
        >
          新增标签
        </PermissionButton>
      </div>
    </div>

    <!-- 标签分类卡片 -->
    <el-row :gutter="16">
      <el-col
        v-for="category in tagCategories"
        :key="category.key"
        :xs="24"
        :sm="12"
        :lg="6"
      >
        <el-card class="category-card" shadow="hover">
          <template #header>
            <div class="category-header">
              <div class="category-info">
                <el-icon :size="20" :color="category.color">
                  <component :is="category.icon" />
                </el-icon>
                <span class="category-name">{{ category.name }}</span>
              </div>
              <el-badge :value="getActiveCount(category.key)" type="primary" />
            </div>
          </template>

          <div class="tags-list">
            <TransitionGroup name="tag-list">
              <div
                v-for="tag in getTagsByCategory(category.key)"
                :key="tag.id"
                class="tag-item"
                :class="{ 'is-disabled': !tag.enabled }"
              >
                <el-tag
                  :type="tag.enabled ? 'primary' : 'info'"
                  :disable-transitions="false"
                  :closable="hasPermission('tag:edit')"
                  @close="handleDelete(tag)"
                >
                  {{ tag.name }}
                </el-tag>
                <div class="tag-actions" v-if="hasPermission('tag:edit')">
                  <el-switch
                    v-model="tag.enabled"
                    size="small"
                    @change="handleToggle(tag)"
                  />
                  <el-button
                    link
                    type="primary"
                    size="small"
                    @click="handleEdit(tag)"
                  >
                    编辑
                  </el-button>
                </div>
              </div>
            </TransitionGroup>

            <el-empty
              v-if="!getTagsByCategory(category.key).length"
              description="暂无标签"
              :image-size="60"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 标签编辑弹窗 -->
    <TagEditDialog
      v-model="dialogVisible"
      :mode="dialogMode"
      :tag-data="currentTag"
      :categories="tagCategories"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { hasPermission } from '@/utils/permission'
import { getTagsByType, createTag, updateTag, deleteTag } from '@/api/tags'
import PermissionButton from '@/components/common/PermissionButton.vue'
import TagEditDialog from '@/components/tag/TagEditDialog.vue'

// 标签分类配置
const tagCategories = [
  { key: 'ip', name: 'IP标签', icon: 'Star', color: '#409eff' },
  { key: 'category', name: '品类标签', icon: 'Goods', color: '#67c23a' },
  { key: 'craft', name: '工艺标签', icon: 'Tools', color: '#e6a23c' },
  { key: 'scene', name: '场景标签', icon: 'Location', color: '#f56c6c' }
]

// 标签数据
const tags = reactive({
  ip: [],
  category: [],
  craft: [],
  scene: []
})

// 加载状态
const loading = ref(false)

// 弹窗状态
const dialogVisible = ref(false)
const dialogMode = ref('add')
const currentTag = ref(null)

// 获取分类下的标签
function getTagsByCategory(category) {
  return (tags[category] || []).sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

// 获取分类下启用数量
function getActiveCount(category) {
  return (tags[category] || []).filter(t => t.status !== 0).length
}

// 加载所有标签
async function loadTags() {
  loading.value = true
  try {
    const results = await Promise.allSettled(
      tagCategories.map(cat => getTagsByType(cat.key))
    )

    results.forEach((result, index) => {
      const key = tagCategories[index].key
      if (result.status === 'fulfilled' && result.value?.data) {
        tags[key] = (result.value.data.list || result.value.data || []).map(tag => ({
          id: tag.id,
          name: tag.tag_name,
          enabled: tag.status !== 0,
          order: tag.sort || 0,
          color: tag.color,
          tag_code: tag.tag_code,
          tag_type: tag.tag_type,
          description: tag.description
        }))
      }
    })
  } catch (error) {
    console.error('加载标签失败:', error)
  } finally {
    loading.value = false
  }
}

// 新增
function handleAdd() {
  dialogMode.value = 'add'
  currentTag.value = null
  dialogVisible.value = true
}

// 编辑
function handleEdit(tag) {
  dialogMode.value = 'edit'
  currentTag.value = { ...tag }
  dialogVisible.value = true
}

// 删除
function handleDelete(tag) {
  ElMessageBox.confirm(`确定要删除标签「${tag.name}」吗？`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteTag(tag.id)
      // 从对应分类中移除
      for (const key in tags) {
        const index = tags[key].findIndex(t => t.id === tag.id)
        if (index > -1) {
          tags[key].splice(index, 1)
          break
        }
      }
      ElMessage.success('删除成功')
    } catch (error) {
      console.error('删除标签失败:', error)
    }
  }).catch(() => {})
}

// 切换启用状态
async function handleToggle(tag) {
  try {
    await updateTag(tag.id, { status: tag.enabled ? 1 : 0 })
    ElMessage.success(`已${tag.enabled ? '启用' : '禁用'}「${tag.name}」`)
  } catch (error) {
    // 回滚
    tag.enabled = !tag.enabled
    console.error('切换标签状态失败:', error)
  }
}

// 操作成功
function handleSuccess() {
  ElMessage.success(dialogMode.value === 'add' ? '新增成功' : '修改成功')
  dialogVisible.value = false
  loadTags()
}

onMounted(() => {
  loadTags()
})
</script>

<style scoped>
.tags-container {
  padding: 20px;
  background: var(--bg-primary);
  min-height: calc(100vh - 60px);
}

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title h2 { margin: 0; font-size: 22px; font-weight: 700; color: var(--text-primary); }
.page-desc { display: block; margin-top: 4px; font-size: 13px; color: #A8A29E; }
.page-actions { display: flex; gap: 12px; }
.category-card { margin-bottom: 16px; border-radius: 16px !important; }

.category-header { display: flex; justify-content: space-between; align-items: center; }
.category-info { display: flex; align-items: center; gap: 8px; }
.category-name { font-weight: 700; font-size: 16px; color: var(--text-primary); }

.tags-list { min-height: 200px; max-height: 400px; overflow-y: auto; }
.tag-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 4px; border-bottom: 1px solid var(--bg-primary); transition: all 0.3s; }
.tag-item:last-child { border-bottom: none; }
.tag-item:hover { background: var(--card-bg); }
.tag-item.is-disabled { opacity: 0.5; }
.tag-item .el-tag { margin-right: 8px; border-radius: 8px; }
.tag-actions { display: flex; align-items: center; gap: 8px; opacity: 0; transition: opacity 0.3s; }
.tag-item:hover .tag-actions { opacity: 1; }

.tag-list-move, .tag-list-enter-active, .tag-list-leave-active { transition: all 0.3s ease; }
.tag-list-enter-from, .tag-list-leave-to { opacity: 0; transform: translateX(-20px); }
.tag-list-leave-active { position: absolute; }
</style>
