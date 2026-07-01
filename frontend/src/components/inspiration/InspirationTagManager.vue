<template>
  <el-dialog :model-value="modelValue" title="标签管理" width="720px" destroy-on-close @update:model-value="$emit('update:modelValue', $event)">
    <el-tabs v-model="activeType">
      <el-tab-pane v-for="cat in tagCategories" :key="cat.key" :label="cat.name" :name="cat.key" />
    </el-tabs>

    <div class="tag-manager-body">
      <div class="tag-toolbar">
        <span class="tag-count">共 {{ currentTags.length }} 个标签</span>
        <el-button v-if="canEdit" type="primary" size="small" :icon="Plus" @click="handleAdd">新增标签</el-button>
      </div>
      <div class="tag-list">
        <el-tag
          v-for="tag in currentTags"
          :key="tag.id"
          :type="tagColor"
          closable
          :disable-transitions="false"
          effect="plain"
          class="tag-chip"
          @close="handleDelete(tag)"
        >
          <span class="tag-name" @click.stop="handleEdit(tag)">{{ tag.tag_name }}</span>
        </el-tag>
        <el-empty v-if="!currentTags.length" description="暂无标签" :image-size="60" />
      </div>
    </div>

    <TagEditDialog v-model="dialogVisible" :mode="dialogMode" :tag-data="currentTag" :categories="tagCategories" @success="handleSuccess" />
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTagsByType, createTag, updateTag, deleteTag } from '@/api/tags'
import { useUserStore } from '@/stores/user'
import TagEditDialog from '@/components/tag/TagEditDialog.vue'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'refresh'])

const userStore = useUserStore()
const canEdit = computed(() => userStore.hasPermission('tag:create') || userStore.hasPermission('tag:edit'))

const tagCategories = [
  { key: 'ip', name: 'IP', color: '#409eff' },
  { key: 'category', name: '品类', color: '#67c23a' },
  { key: 'craft', name: '工艺', color: '#e6a23c' },
  { key: 'scene', name: '场景', color: '#f56c7c' }
]
const activeType = ref('category')
const tags = reactive({ ip: [], category: [], craft: [], scene: [] })

const currentTags = computed(() => tags[activeType.value] || [])
const tagColor = computed(() => {
  const m = { ip: 'primary', category: 'success', craft: 'warning', scene: 'danger' }
  return m[activeType.value] || ''
})

const dialogVisible = ref(false)
const dialogMode = ref('add')
const currentTag = ref(null)

async function loadTags() {
  try {
    const results = await Promise.all(tagCategories.map(c => getTagsByType(c.key)))
    tagCategories.forEach((c, i) => {
      tags[c.key] = results[i].data?.list || results[i].data || []
    })
  } catch (e) { console.error('加载标签失败', e) }
}

function handleAdd() {
  dialogMode.value = 'add'
  currentTag.value = { tag_type: activeType.value }
  dialogVisible.value = true
}
function handleEdit(tag) {
  if (!canEdit.value) return
  dialogMode.value = 'edit'
  currentTag.value = { ...tag }
  dialogVisible.value = true
}
async function handleDelete(tag) {
  try {
    await ElMessageBox.confirm(`确定删除标签「${tag.tag_name}」吗？`, '删除确认', { type: 'warning' })
    await deleteTag(tag.id)
    ElMessage.success('删除成功')
    loadTags()
    emit('refresh')
  } catch (e) { if (e !== 'cancel') ElMessage.error('删除失败') }
}
function handleSuccess() {
  loadTags()
  emit('refresh')
}

watch(() => props.modelValue, (v) => { if (v) loadTags() })
</script>

<style scoped>
.tag-manager-body { min-height: 200px; }
.tag-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.tag-count { font-size: 13px; color: #94A3B8; }
.tag-list { display: flex; flex-wrap: wrap; gap: 10px; }
.tag-chip { padding: 0; }
.tag-name { padding: 4px 8px; cursor: pointer; }
.tag-name:hover { text-decoration: underline; }
</style>
