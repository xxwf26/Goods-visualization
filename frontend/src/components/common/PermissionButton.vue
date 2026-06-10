<template>
  <el-button
    v-if="visible"
    :type="type"
    :size="size"
    :disabled="disabled"
    :loading="loading"
    :icon="icon"
    :plain="plain"
    :round="round"
    :circle="circle"
    :class="btnClass"
    v-bind="$attrs"
    @click="handleClick"
  >
    <slot>{{ text }}</slot>
  </el-button>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

defineOptions({
  name: 'PermissionButton',
  inheritAttrs: false
})

const props = defineProps({
  permission: {
    type: [String, Array],
    default: null
  },
  requireAll: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'primary'
  },
  size: {
    type: String,
    default: 'default'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  icon: {
    type: [String, Object],
    default: ''
  },
  plain: {
    type: Boolean,
    default: false
  },
  round: {
    type: Boolean,
    default: false
  },
  circle: {
    type: Boolean,
    default: false
  },
  btnClass: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])

const userStore = useUserStore()

const visible = computed(() => {
  // 未登录，不显示
  if (!userStore.isLoggedIn) {
    return false
  }

  // 管理员角色，始终可见
  if (userStore.role === 'admin') {
    return true
  }

  // 没有配置权限要求，默认显示
  if (!props.permission) {
    return true
  }

  // 转换权限为数组
  const permissions = Array.isArray(props.permission)
    ? props.permission
    : [props.permission]

  // 检查权限
  if (props.requireAll) {
    return userStore.hasAllPermissions(permissions)
  } else {
    return userStore.hasAnyPermission(permissions)
  }
})

const handleClick = (event) => {
  if (!visible.value) {
    return
  }

  if (props.disabled || props.loading) {
    return
  }

  emit('click', event)
}
</script>

<style scoped>
</style>
