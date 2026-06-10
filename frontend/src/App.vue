<template>
  <router-view />
</template>

<script setup>
</script>

<style>
:root {
  /* 粉色主题色系 */
  --pink-primary: #FF6B9D;
  --pink-light: #FF8DB5;
  --pink-lighter: #FFB8D0;
  --pink-bg: #FFF0F3;
  --pink-gradient: linear-gradient(135deg, #FF6B9D 0%, #FF8DB5 50%, #FFB8D0 100%);
  --text-primary: #4A3340;
  --text-secondary: #A0808C;
  --border-color: #FFD4E0;
  --shadow-sm: 0 2px 12px rgba(255, 107, 157, 0.08);
  --shadow-md: 0 4px 20px rgba(255, 107, 157, 0.12);
  --shadow-lg: 0 8px 32px rgba(255, 107, 157, 0.15);

  /* Element Plus 覆盖 */
  --el-color-primary: #FF6B9D;
  --el-color-primary-light-3: #FF8DB5;
  --el-color-primary-light-5: #FFB8D0;
  --el-color-primary-light-7: #FFD4E0;
  --el-color-primary-light-9: #FFF0F3;
  --el-color-primary-dark-2: #E84878;
  --el-color-success: #7ECFC0;
  --el-color-warning: #FFD166;
  --el-color-danger: #EF476F;
  --el-border-radius-base: 10px;
  --el-border-radius-small: 8px;
  --el-border-radius-round: 20px;
  --el-box-shadow-light: 0 2px 12px rgba(255, 107, 157, 0.08);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif;
  background: var(--pink-bg);
  color: var(--text-primary);
}

/* 全局滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: var(--pink-bg);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb {
  background: var(--pink-lighter);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--pink-primary);
}

/* Element Plus 全局覆盖 */
.el-button--primary {
  --el-button-bg-color: var(--pink-primary);
  --el-button-border-color: var(--pink-primary);
  --el-button-hover-bg-color: var(--pink-light);
  --el-button-hover-border-color: var(--pink-light);
  --el-button-active-bg-color: #E84878;
  --el-button-active-border-color: #E84878;
  border-radius: 10px !important;
  font-weight: 500;
}

.el-card {
  border-radius: 14px !important;
  border: 1px solid var(--border-color) !important;
  box-shadow: var(--shadow-sm) !important;
}

.el-tag {
  border-radius: 8px !important;
}

.el-input__wrapper {
  border-radius: 10px !important;
}

.el-select .el-input__wrapper {
  border-radius: 10px !important;
}

.el-menu {
  border-right: none !important;
}

.el-pagination {
  --el-pagination-button-bg-color: var(--pink-bg);
}

.el-table {
  border-radius: 10px;
  overflow: hidden;
}

.el-table th.el-table__cell {
  background: #FFF5F8 !important;
  color: var(--text-primary) !important;
  font-weight: 600;
}

.el-dialog {
  border-radius: 16px !important;
}

.el-message {
  border-radius: 12px !important;
}

.el-dropdown-menu {
  border-radius: 12px !important;
}

.el-radio__input.is-checked .el-radio__inner {
  background-color: var(--pink-primary) !important;
  border-color: var(--pink-primary) !important;
}

.el-radio__input.is-checked + .el-radio__label {
  color: var(--pink-primary) !important;
}

/* 全局过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
