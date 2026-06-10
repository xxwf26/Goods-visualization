<template>
  <div class="skeleton-loader">
    <!-- 统计卡片骨架 -->
    <el-row :gutter="16" class="skeleton-stats">
      <el-col :span="6" v-for="i in 4" :key="i">
        <el-skeleton :rows="0" animated>
          <template #template>
            <div class="skeleton-card">
              <el-skeleton-item variant="circle" style="width: 48px; height: 48px" />
              <div class="skeleton-text">
                <el-skeleton-item variant="text" style="width: 60px; height: 28px" />
                <el-skeleton-item variant="text" style="width: 40px; height: 14px" />
              </div>
            </div>
          </template>
        </el-skeleton>
      </el-col>
    </el-row>

    <!-- 图表骨架 -->
    <el-row :gutter="16" class="skeleton-charts">
      <el-col :span="12">
        <div class="skeleton-box">
          <el-skeleton :rows="3" animated />
        </div>
      </el-col>
      <el-col :span="12">
        <div class="skeleton-box">
          <el-skeleton :rows="3" animated />
        </div>
      </el-col>
    </el-row>

    <!-- 榜单骨架 -->
    <el-row :gutter="16" class="skeleton-ranking">
      <el-col :span="12">
        <div class="skeleton-box">
          <el-skeleton :rows="5" animated />
        </div>
      </el-col>
      <el-col :span="12">
        <div class="skeleton-box">
          <el-skeleton :rows="5" animated />
        </div>
      </el-col>
    </el-row>

    <!-- 动态更新骨架 -->
    <el-row :gutter="16" class="skeleton-recent">
      <el-col :span="12">
        <div class="skeleton-box">
          <el-skeleton :rows="5" animated />
        </div>
      </el-col>
      <el-col :span="12">
        <div class="skeleton-box">
          <el-skeleton :rows="5" animated />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
</script>

<style scoped>
.skeleton-loader {
  padding: 0;
}

.skeleton-stats {
  margin-bottom: 20px;
}

.skeleton-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  gap: 16px;
}

.skeleton-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-box {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  min-height: 200px;
}

.skeleton-charts,
.skeleton-ranking,
.skeleton-recent {
  margin-bottom: 20px;
}
</style>
