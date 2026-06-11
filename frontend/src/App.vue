<template>
  <router-view />
</template>

<script setup>
</script>

<style>
:root {
  /* 粉色主题色系 */
  --pink-primary: var(--accent);
  --pink-light: var(--accent);
  --pink-lighter: var(--border-color);
  --pink-bg: var(--bg-primary);
  --pink-gradient: linear-gradient(135deg, var(--accent) 0%, var(--accent) 50%, var(--border-color) 100%);
  --text-primary: #1E293B;
  --text-secondary: #94A3B8;
  --border-color: #EDE9FE;
  --shadow-sm: 0 2px 12px rgba(167,139,250, 0.08);
  --shadow-md: 0 4px 20px rgba(167,139,250, 0.12);
  --shadow-lg: 0 8px 32px rgba(167,139,250, 0.15);

  /* Element Plus 覆盖 */
  --el-color-primary: var(--accent);
  --el-color-primary-light-3: var(--accent);
  --el-color-primary-light-5: var(--border-color);
  --el-color-primary-light-7: var(--border-color);
  --el-color-primary-light-9: var(--bg-primary);
  --el-color-primary-dark-2: #7C3AED;
  --el-color-success: #7ECFC0;
  --el-color-warning: #FFD166;
  --el-color-danger: var(--accent);
  --el-border-radius-base: 10px;
  --el-border-radius-small: 8px;
  --el-border-radius-round: 20px;
  --el-box-shadow-light: 0 2px 12px rgba(167,139,250, 0.08);
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
  --el-button-active-bg-color: #7C3AED;
  --el-button-active-border-color: #7C3AED;
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
  background: var(--card-bg) !important;
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
