<template>
  <div
    v-if="visible"
    ref="rootRef"
    :class="$style.columnMenu"
    :style="style"
  >
    <div :class="$style.columnMenuTitle">显示列</div>
    <label
      v-for="column in columns"
      :key="column.key"
      :class="$style.columnMenuItem"
    >
      <input
        type="checkbox"
        :checked="selectedKeys.includes(column.key)"
        @change="$emit('toggle', column.key)"
      />
      <span>{{ column.label }}</span>
    </label>
  </div>
</template>

<script lang="ts">
import { ref } from '@common/utils/vueTools'
import type { LocalMusicColumnDefinition, LocalMusicColumnKey } from '../localMusicColumns'

export default {
  name: 'ColumnMenu',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    style: {
      type: Object as () => Record<string, string>,
      default: () => ({}),
    },
    columns: {
      type: Array as () => LocalMusicColumnDefinition[],
      required: true,
    },
    selectedKeys: {
      type: Array as () => LocalMusicColumnKey[],
      required: true,
    },
  },
  emits: ['toggle'],
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
.columnMenu {
  position: fixed;
  z-index: 1001;
  min-width: 180px;
  max-height: 360px;
  overflow-y: auto;
  padding: 10px 0;
  border-radius: 8px;
  border: 1px solid var(--color-primary-alpha-900);
  background: var(--color-content-background);
  box-shadow: 0 8px 24px rgb(0 0 0 / 16%);
}

.columnMenuTitle {
  padding: 0 12px 8px;
  font-size: 12px;
  font-weight: bold;
  color: var(--color-font-label);
}

.columnMenuItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--color-font);
  cursor: pointer;

  &:hover {
    background: var(--color-primary-background-hover);
  }

  input {
    margin: 0;
  }
}
</style>
