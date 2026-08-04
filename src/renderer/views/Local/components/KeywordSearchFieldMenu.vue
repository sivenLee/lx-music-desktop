<template>
  <div ref="rootRef" :class="$style.root">
    <button
      type="button"
      :class="$style.button"
      title="搜索设置"
      @click="$emit('toggle')"
    >
      搜索设置
    </button>
    <div
      v-if="visible"
      :class="$style.menu"
    >
      <div :class="$style.title">快捷搜索字段</div>
      <label
        v-for="field in fields"
        :key="field.key"
        :class="$style.item"
      >
        <input
          type="checkbox"
          :checked="selectedKeys.includes(field.key)"
          @change="$emit('change', field.key)"
        >
        <span>{{ field.label }}</span>
      </label>
      <div :class="$style.tip">仅影响快捷搜索，高级搜索不受影响</div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref } from '@common/utils/vueTools'
import type { KeywordSearchFieldKey, KeywordSearchFieldOption } from '../localMusicSearch'

export default {
  name: 'KeywordSearchFieldMenu',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    fields: {
      type: Array as () => KeywordSearchFieldOption[],
      required: true,
    },
    selectedKeys: {
      type: Array as () => KeywordSearchFieldKey[],
      required: true,
    },
  },
  emits: ['toggle', 'change'],
  setup(_props: Record<string, unknown>, { expose }: { expose: (exposed: Record<string, unknown>) => void }) {
    const rootRef = ref<HTMLElement | null>(null)
    expose({
      get rootRef() {
        return rootRef.value
      },
    })
    return { rootRef }
  },
}
</script>

<style lang="less" module>
.root {
  position: relative;
  flex-shrink: 0;
  z-index: 20;
}

.button {
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  font-size: 12px;
  line-height: 26px;
  border-radius: 4px;
  border: 1px solid var(--color-primary-background);
  background: var(--color-primary-background-hover);
  color: var(--color-font);
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: var(--color-primary-background);
  }
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 1001;
  min-width: 180px;
  max-height: 420px;
  overflow-y: auto;
  padding: 10px 0;
  border-radius: 8px;
  border: 1px solid var(--color-primary-alpha-900);
  background: var(--color-content-background);
  box-shadow: 0 8px 24px rgb(0 0 0 / 16%);
}

.title {
  padding: 0 12px 8px;
  font-size: 12px;
  font-weight: bold;
  color: var(--color-font-label);
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--color-font);
  cursor: pointer;
  user-select: none;

  &:hover {
    background: var(--color-primary-background);
  }

  input {
    margin: 0;
    cursor: pointer;
  }
}

.tip {
  margin-top: 4px;
  padding: 8px 12px 0;
  border-top: 1px solid var(--color-primary-alpha-900);
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-font-label);
}
</style>
