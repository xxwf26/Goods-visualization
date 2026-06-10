<template>
  <el-image-viewer
    v-if="modelValue"
    :url-list="images"
    :initial-index="initialIndex"
    :hide-on-click-modal="true"
    @close="handleClose"
  />
</template>

<script setup>
const props = defineProps({
  modelValue: Boolean,
  images: {
    type: Array,
    default: () => []
  },
  initialIndex: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue'])

function handleClose() {
  emit('update:modelValue', false)
}
</script>
