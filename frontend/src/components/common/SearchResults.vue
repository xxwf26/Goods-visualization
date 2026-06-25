<template>
  <div class="gs-results">
    <!-- 品类速览卡 -->
    <div
      v-if="data && data.categoryOverview"
      class="gs-overview"
      :class="{ active: activeIndex === 0 }"
      @click="$emit('select', { groupType: 'overview', id: data.categoryOverview.tagId, route: null })"
      @mouseenter="$emit('hover', 0)"
    >
      <div class="gs-overview-head">
        <span class="gs-overview-name">{{ data.categoryOverview.tagName }}</span>
        <el-tag size="small" effect="plain" type="primary">品类速览</el-tag>
      </div>
      <div class="gs-overview-stats">
        <span>均价 <b>¥{{ data.categoryOverview.avgPrice }}</b></span>
        <span>最低 ¥{{ data.categoryOverview.minPrice }}</span>
        <span>最高 ¥{{ data.categoryOverview.maxPrice }}</span>
        <span>{{ data.categoryOverview.projectCount }} 条价格记录</span>
      </div>
    </div>

    <!-- 分组结果 -->
    <div v-for="group in visibleGroups" :key="group.type" class="gs-group">
      <div class="gs-group-head">
        <span class="gs-group-label">{{ group.label }} <em>{{ group.total }}</em></span>
        <span
          v-if="group.route && group.total > group.items.length"
          class="gs-view-all"
          @click="$emit('select-group', group)"
        >查看全部 {{ group.total }} 条 →</span>
      </div>
      <div
        v-for="item in group.items"
        :key="group.type + '-' + item.id"
        class="gs-item"
        :class="{ active: activeIndex === flatIndexOf(group.type, item.id) }"
        @click="$emit('select', { groupType: group.type, route: group.route, id: item.id })"
        @mouseenter="$emit('hover', flatIndexOf(group.type, item.id))"
      >
        <div class="gs-item-title">{{ item.title }}</div>
        <div v-if="item.subtitle" class="gs-item-subtitle">{{ item.subtitle }}</div>
      </div>
    </div>

    <!-- 空态 / 提示 -->
    <div v-if="showEmpty" class="gs-empty">未找到与「{{ keyword }}」相关的内容</div>
  </div>
</template>

<script setup>
defineProps({
  data: { type: Object, default: null },
  visibleGroups: { type: Array, default: () => [] },
  activeIndex: { type: Number, default: -1 },
  keyword: { type: String, default: '' },
  showEmpty: { type: Boolean, default: false },
  flatIndexOf: { type: Function, required: true }
})
defineEmits(['select', 'select-group', 'hover'])
</script>

<style scoped>
.gs-overview {
  border: 1px solid var(--accent, #A78BFA);
  background: var(--card-bg, #F8F5FF);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.gs-overview.active,
.gs-overview:hover {
  box-shadow: 0 4px 14px rgba(167, 139, 250, 0.22);
}
.gs-overview-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.gs-overview-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary, #1E293B);
}
.gs-overview-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  font-size: 13px;
  color: var(--text-secondary, #94A3B8);
}
.gs-overview-stats b {
  color: var(--accent-dark, #7C3AED);
  font-size: 16px;
}

.gs-group {
  margin-bottom: 12px;
}
.gs-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
}
.gs-group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #94A3B8);
}
.gs-group-label em {
  font-style: normal;
  opacity: 0.7;
}
.gs-view-all {
  font-size: 12px;
  color: var(--accent, #A78BFA);
  cursor: pointer;
}
.gs-view-all:hover {
  text-decoration: underline;
}

.gs-item {
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.gs-item.active,
.gs-item:hover {
  background: var(--card-bg, #F8F5FF);
}
.gs-item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #1E293B);
}
.gs-item-subtitle {
  font-size: 12px;
  color: var(--text-secondary, #94A3B8);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gs-empty {
  text-align: center;
  color: var(--text-secondary, #94A3B8);
  font-size: 13px;
  padding: 28px 12px;
}
</style>
