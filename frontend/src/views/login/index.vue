<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>周边可视化系统</h1>
        <p>请登录您的账号</p>
      </div>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>
      <div class="role-tip">
        <el-collapse>
          <el-collapse-item title="权限说明">
            <div class="role-info">
              <h4>普通用户</h4>
              <ul>
                <li>查看历史周边记录</li>
                <li>查看价格查询库</li>
                <li>查看外部灵感链接</li>
                <li>搜索和筛选</li>
              </ul>
              <h4>编辑用户</h4>
              <ul>
                <li>包含普通用户全部权限</li>
                <li>新增外部灵感链接</li>
                <li>编辑标签</li>
                <li>上传截图</li>
                <li>补充参考说明</li>
              </ul>
              <h4>管理员</h4>
              <ul>
                <li>包含编辑用户全部权限</li>
                <li>删除数据</li>
                <li>修改供应商信息</li>
                <li>修改价格记录</li>
                <li>批量导入数据</li>
                <li>管理标签体系</li>
              </ul>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { login as loginApi } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  // 表单校验
  try {
    await loginFormRef.value.validate()
  } catch {
    // 校验失败，el-form 会自动显示错误提示
    return
  }

  loading.value = true
  try {
    const res = await loginApi({
      username: loginForm.username,
      password: loginForm.password
    })

    if (res.code === 200) {
      const data = res.data
      // 使用后端返回的真实角色，取最高权限
      const roles = data.userInfo?.roleCodes || []
      const role = roles.includes('admin') ? 'admin'
        : roles.includes('super_admin') ? 'super_admin'
        : roles.includes('editor') ? 'editor'
        : 'viewer'

      userStore.login(data.token, {
        ...data.userInfo,
        role
      })

      ElMessage.success('登录成功')
      // redirect 可能是数组（重复 query），统一转成字符串
      const redirect = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect
      router.push(redirect || '/home')
    } else {
      // 非 200 的响应（理论上不会到这里，interceptor 已 reject）
      ElMessage.error(res.message || '登录失败')
    }
  } catch (error) {
    // 网络错误或请求失败，interceptor 已显示具体错误信息
    // 这里只处理网络断开等 interceptor 未覆盖的情况
    if (!error.response) {
      ElMessage.error('网络连接失败，请检查后端服务是否启动')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, var(--border-color) 0%, var(--accent) 25%, var(--accent) 50%, var(--accent) 75%, var(--border-color) 100%);
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
  position: relative;
  overflow: hidden;
}

/* 可爱的装饰圆点 */
.login-container::before,
.login-container::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  animation: float 6s ease-in-out infinite;
}
.login-container::before {
  width: 300px; height: 300px;
  top: -80px; left: -60px;
}
.login-container::after {
  width: 200px; height: 200px;
  bottom: -40px; right: -40px;
  animation-delay: 3s;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

.login-box {
  width: 420px;
  padding: 44px 40px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 16px 48px rgba(167,139,250, 0.2), 0 4px 12px rgba(167,139,250, 0.1);
  position: relative;
  z-index: 10;
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.login-header h1 {
  font-size: 26px;
  color: var(--text-primary);
  margin-bottom: 10px;
  font-weight: 700;
  letter-spacing: 2px;
}

.login-header p {
  font-size: 14px;
  color: #A8A29E;
}

.login-form {
  margin-top: 24px;
}

.login-btn {
  width: 100%;
  height: 44px;
  border-radius: 22px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  letter-spacing: 2px;
  background: linear-gradient(135deg, var(--accent), var(--accent)) !important;
  border: none !important;
}

.login-btn:hover {
  background: linear-gradient(135deg, var(--accent), var(--accent)) !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(167,139,250, 0.3);
}

.role-tip {
  margin-top: 20px;
}

.role-info {
  padding: 8px 0;
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
}

.role-info h4 {
  margin: 12px 0 8px;
  color: var(--text-primary);
  font-size: 14px;
}

.role-info h4:first-child {
  margin-top: 0;
}

.role-info ul {
  margin: 0;
  padding-left: 20px;
}

.role-info li {
  margin: 4px 0;
}

:deep(.el-select-dropdown__item) {
  height: auto;
  padding: 8px 12px;
  line-height: 1.4;
}

:deep(.el-select-dropdown__item span:first-child) {
  display: block;
  font-weight: 500;
  color: #303133;
}

.role-desc {
  display: block !important;
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* 登录框 input 美化 */
:deep(.el-input__wrapper) {
  border-radius: 12px !important;
  box-shadow: 0 0 0 1px var(--border-color) inset !important;
}
:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--accent) inset !important;
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(167,139,250, 0.3) inset !important;
}
</style>
