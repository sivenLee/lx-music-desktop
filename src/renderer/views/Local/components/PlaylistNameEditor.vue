<template>
  <material-modal :show="visible" width="420px" max-width="420px" @close="handleClose">
    <div :class="$style.playlistEditor">
      <div :class="$style.playlistEditorTitle">{{ title }}</div>
      <input
        ref="inputRef"
        v-model="name"
        :class="$style.playlistEditorInput"
        type="text"
        :placeholder="placeholder"
        @keydown.enter.stop="handleConfirm"
        @keydown.esc="handleClose"
      />
      <div :class="$style.playlistEditorActions">
        <button type="button" :class="$style.playlistEditorBtn" @click="handleClose">取消</button>
        <button type="button" :class="[$style.playlistEditorBtn, $style.playlistEditorPrimaryBtn]" @click="handleConfirm">确认</button>
      </div>
    </div>
  </material-modal>
</template>

<script lang="ts">
import { computed, nextTick, ref, watch } from '@common/utils/vueTools'
import { useLocalMusic } from '../useLocalMusic'

export default {
  name: 'PlaylistNameEditor',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String as () => 'create' | 'rename',
      default: 'create',
    },
    playlistPath: {
      type: String,
      default: '',
    },
    initialName: {
      type: String,
      default: '',
    },
  },
  emits: ['update:visible', 'renamed'],
  setup(props: {
    visible: boolean
    mode: 'create' | 'rename'
    playlistPath: string
    initialName: string
  }, { emit }: {
    emit: {
      (event: 'update:visible', value: boolean): void
      (event: 'renamed', payload: { oldPath: string, newPath: string }): void
    }
  }) {
    const localMusic = useLocalMusic()
    const inputRef = ref<HTMLInputElement | null>(null)
    const name = ref('')
    const title = computed(() => props.mode === 'create' ? '新建播放列表' : '重命名播放列表')
    const placeholder = computed(() => props.mode === 'create' ? '请输入播放列表名称' : '请输入新的播放列表名称')

    const handleClose = () => {
      emit('update:visible', false)
      name.value = ''
    }

    const handleConfirm = async() => {
      if (props.mode === 'create') {
        const ok = await localMusic.createPlaylist(name.value)
        if (!ok) return
        handleClose()
        return
      }
      if (!props.playlistPath) return
      const newPath = await localMusic.renamePlaylist(props.playlistPath, name.value)
      if (!newPath) return
      emit('renamed', { oldPath: props.playlistPath, newPath })
      handleClose()
    }

    watch(() => props.visible, (visible) => {
      if (!visible) return
      name.value = props.initialName
      void nextTick(() => {
        inputRef.value?.focus()
        inputRef.value?.select()
      })
    })

    return {
      inputRef,
      name,
      title,
      placeholder,
      handleClose,
      handleConfirm,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.playlistEditor {
  padding: 22px 24px 20px;
}

.playlistEditorTitle {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 14px;
}

.playlistEditorInput {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border-radius: 4px;
  border: 1px solid var(--color-primary-background);
  background: var(--color-background);
  color: var(--color-font);
  outline: none;
  box-sizing: border-box;
}

.playlistEditorActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.playlistEditorBtn {
  min-width: 72px;
  height: 30px;
  padding: 0 14px;
  border-radius: 4px;
  border: 1px solid var(--color-primary-background);
  background: var(--color-background);
  color: var(--color-font);
  cursor: pointer;
  transition: background-color @transition-normal;

  &:hover {
    background: var(--color-primary-background-hover);
  }

  &:active {
    background: var(--color-primary-background);
  }
}

.playlistEditorPrimaryBtn {
  background: var(--color-primary-background-hover);

  &:hover {
    background: var(--color-primary-background);
  }
}
</style>
