<template>
  <div class="not-found">
    <div class="nf-code">404</div>
    <div class="nf-text">页面走丢了</div>
    <div class="nf-sub">你访问的页面不存在，或已被移除</div>
    <el-button type="primary" @click="$router.push('/home')">返回首页</el-button>
  </div>
</template>

<script setup>
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(180deg, #FDFBFF 0%, #F5F3FF 100%);
}
.nf-code {
  font-size: 96px;
  font-weight: 800;
  color: #A78BFA;
  letter-spacing: -2px;
  line-height: 1;
}
.nf-text { font-size: 22px; font-weight: 700; color: #1E293B; }
.nf-sub { font-size: 14px; color: #94A3B8; margin-bottom: 16px; }
</style>
