<template>
  <div ref="rootRef" :class="$style.directorySelector">
    <div :class="$style.directoryInputWrap">
      <input
        :value="currentDirectoryPath"
        :class="[$style.directoryInput, { [$style.directoryInputDisabled]: disabled }]"
        type="text"
        :placeholder="$t('no_item')"
        readonly
        :disabled="disabled"
        @click="handleToggle"
      />
      <span :class="[$style.directoryInputIcon, { [$style.directoryInputIconOpen]: visible && !disabled }]" aria-hidden="true">
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 451.847 451.847" space="preserve">
          <use xlink:href="#icon-down" />
        </svg>
      </span>
    </div>
    <div
      v-if="visible && !disabled"
      :class="$style.directoryPopover"
    >
      <div
        v-if="!directories.length"
        :class="$style.directoryEmpty"
      >
        {{ $t('no_item') }}
      </div>
      <div
        v-for="dir in directories"
        :key="dir.id"
        :class="[
          $style.directoryOption,
          { [$style.activeDirectoryOption]: selectedDirectory?.id === dir.id },
        ]"
      >
        <button
          type="button"
          :class="$style.directoryOptionButton"
          @click="$emit('select', dir)"
        >
          <span :class="$style.directoryOptionName">{{ dir.name }}</span>
          <span :class="$style.directoryOptionPath">{{ dir.path }}</span>
        </button>
        <button
          type="button"
          :class="$style.directoryDeleteButton"
          title="移除目录"
          @click.stop="$emit('remove', dir)"
        >
          ×
        </button>
      </div>
    </div>
    <button :class="$style.button" title="添加目录" @click="$emit('add')">
      添加目录
    </button>
    <button
      :class="$style.button"
      :disabled="!selectedDirectory || refreshing"
      title="刷新目录"
      @click="$emit('refresh')"
    >
      {{ refreshing ? '刷新中...' : '刷新目录' }}
    </button>
  </div>
</template>

<script lang="ts">
import { ref } from '@common/utils/vueTools'

export default {
  name: 'DirectorySelector',
  props: {
    directories: {
      type: Array as () => LX.LocalMusic.LocalMusicDirectory[],
      required: true,
    },
    selectedDirectory: {
      type: Object as () => LX.LocalMusic.LocalMusicDirectory | null,
      default: null,
    },
    currentDirectoryPath: {
      type: String,
      default: '',
    },
    visible: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    refreshing: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['toggle', 'select', 'remove', 'add', 'refresh'],
  setup(props: {
    disabled: boolean
  }, { emit, expose }: {
    emit: (event: 'toggle') => void
    expose: (exposed: Record<string, unknown>) => void
  }) {
    const rootRef = ref<HTMLElement | null>(null)
    const handleToggle = () => {
      if (props.disabled) return
      emit('toggle')
    }
    expose({
      get rootRef() {
        return rootRef.value
      },
    })
    return { rootRef, handleToggle }
  },
}
</script>

<style lang="less" module>
.directorySelector {
  position: relative;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 5px;
}

.directoryInputWrap {
  position: relative;
  flex: none;
}

.directoryInput {
  padding: 5px 28px 5px 10px;
  border-radius: 4px;
  border: 1px solid var(--color-primary-background);
  background: var(--color-background);
  color: var(--color-font);
  min-width: 360px;
  cursor: pointer;
  box-sizing: border-box;
  outline: none;

  &:focus,
  &:hover {
    border-color: var(--color-primary) !important;
  }
}

.directoryInputIcon {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  color: var(--color-font-label);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform .2s ease;

  svg {
    width: 100%;
    height: 100%;
  }
}

.directoryInputIconOpen {
  transform: translateY(-50%) rotate(180deg);
}

.directoryInputDisabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.directoryPopover {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 360px;
  max-height: 320px;
  overflow-y: auto;
  border-radius: 6px;
  border: 1px solid var(--color-primary-background);
  background: var(--color-000);
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
  z-index: 999;
}

.directoryEmpty {
  padding: 12px;
  color: var(--color-font-label);
}

.directoryOption {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--color-primary-alpha-900);

  &:last-child {
    border-bottom: 0;
  }
}

.activeDirectoryOption {
  background: var(--color-primary-background-hover);
}

.directoryOptionButton {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--color-primary-background-hover);
  }
}

.directoryOptionName {
  display: block;
  font-size: 14px;
}

.directoryOptionPath {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-font-label);
  word-break: break-all;
}

.directoryDeleteButton {
  flex: 0 0 auto;
  width: 36px;
  border: 0;
  border-left: 1px solid var(--color-primary-alpha-900);
  background: transparent;
  color: var(--color-font-label);
  cursor: pointer;

  &:hover {
    background: var(--color-primary-background-hover);
    color: var(--color-danger, #f56c6c);
  }
}

.button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0px 10px;
  font-size: 12px;
  line-height: 26px;
  border-radius: 4px;
  border: 1px solid var(--color-primary-background);
  background: var(--color-primary-background-hover);
  color: var(--color-font);
  cursor: pointer;
  transition: background-color .2s ease;

  &:hover:not(:disabled) {
    background: var(--color-primary-background);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}
</style>
