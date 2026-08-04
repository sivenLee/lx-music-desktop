<template>
  <material-modal :show="visible" width="720px" max-width="86%" height="78%" @close="handleClose">
    <main :class="$style.playlistSourceEditor">
      <div :class="$style.playlistSourceHeader">
        <div :class="$style.playlistSourceTitle">编辑播放列表</div>
        <div :class="$style.playlistSourcePath">{{ playlistPath }}</div>
      </div>
      <div v-if="isLoading" :class="$style.playlistSourceLoading">
        {{ $t('loading') }}...
      </div>
      <div v-else :class="$style.playlistSourceContent">
        <div v-if="invalidFiles.length" :class="$style.playlistSourceInvalid">
          <div :class="$style.playlistSourceInvalidTitle">失效歌曲（{{ invalidFiles.length }}）</div>
          <div class="scroll" :class="$style.playlistSourceInvalidList">
            <div v-for="(filePath, index) in invalidFiles" :key="index" :class="$style.playlistSourceInvalidItem">
              {{ filePath }}
            </div>
          </div>
        </div>
        <textarea
          v-model="sourceText"
          class="scroll"
          :class="$style.playlistSourceTextarea"
          spellcheck="false"
        />
        <div v-if="error" :class="$style.playlistSourceError">{{ error }}</div>
      </div>
      <div :class="$style.playlistSourceActions">
        <button
          type="button"
          :class="$style.playlistEditorBtn"
          :disabled="isSaving"
          @click="handleReload"
        >
          重载
        </button>
        <button
          type="button"
          :class="[$style.playlistEditorBtn, $style.playlistEditorPrimaryBtn]"
          :disabled="isLoading || isSaving"
          @click="handleSave"
        >
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
      </div>
    </main>
  </material-modal>
</template>

<script lang="ts">
import { ref, watch } from '@common/utils/vueTools'
import { useLocalMusic } from '../useLocalMusic'

export default {
  name: 'PlaylistSourceEditor',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    playlistPath: {
      type: String,
      default: '',
    },
  },
  emits: ['update:visible', 'saved'],
  setup(props: {
    visible: boolean
    playlistPath: string
  }, { emit }: {
    emit: {
      (event: 'update:visible', value: boolean): void
      (event: 'saved', payload: { playlistPath: string, musicFiles: LX.Music.MusicInfoLocal[] }): void
    }
  }) {
    const localMusic = useLocalMusic()
    const isLoading = ref(false)
    const isSaving = ref(false)
    const sourceText = ref('')
    const invalidFiles = ref<string[]>([])
    const error = ref('')

    const resetState = () => {
      isLoading.value = false
      isSaving.value = false
      sourceText.value = ''
      invalidFiles.value = []
      error.value = ''
    }

    const loadSource = async(playlistPath = props.playlistPath) => {
      if (!playlistPath) return
      isLoading.value = true
      error.value = ''
      try {
        const [text, detail] = await Promise.all([
          localMusic.readPlaylistText(playlistPath),
          localMusic.getPlaylistDetail(playlistPath),
        ])
        sourceText.value = text
        invalidFiles.value = detail.invalidFilePaths
      } catch (err) {
        console.error('Failed to read playlist source:', err)
        error.value = `读取播放列表失败：${err instanceof Error ? err.message : '未知错误'}`
      } finally {
        isLoading.value = false
      }
    }

    const handleClose = () => {
      emit('update:visible', false)
      resetState()
    }

    const handleReload = async() => {
      await loadSource()
    }

    const handleSave = async() => {
      if (!props.playlistPath) return
      isSaving.value = true
      error.value = ''
      try {
        const musicFiles = await localMusic.writePlaylistText(props.playlistPath, sourceText.value)
        emit('saved', {
          playlistPath: props.playlistPath,
          musicFiles: musicFiles ?? [],
        })
        handleClose()
      } catch (err) {
        console.error('Failed to save playlist source:', err)
        error.value = `保存播放列表失败：${err instanceof Error ? err.message : '未知错误'}`
      } finally {
        isSaving.value = false
      }
    }

    watch(() => [props.visible, props.playlistPath] as const, ([visible, playlistPath]) => {
      if (!visible) {
        resetState()
        return
      }
      if (playlistPath) {
        sourceText.value = ''
        error.value = ''
        void loadSource(playlistPath)
      }
    })

    return {
      isLoading,
      isSaving,
      sourceText,
      invalidFiles,
      error,
      handleClose,
      handleReload,
      handleSave,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.playlistSourceEditor {
  display: flex;
  flex-flow: column nowrap;
  min-height: 0;
  height: 100%;
  padding: 18px 20px 20px;
}

.playlistSourceHeader {
  margin-bottom: 12px;
}

.playlistSourceTitle {
  font-size: 18px;
  line-height: 1.3;
  text-align: center;
}

.playlistSourcePath {
  margin-top: 6px;
  color: var(--color-font-label);
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  word-break: break-all;
}

.playlistSourceLoading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
  font-size: 14px;
}

.playlistSourceContent {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
}

.playlistSourceInvalid {
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-danger, #f56c6c);
  border-radius: 6px;
  background: var(--color-primary-background-hover);
}

.playlistSourceInvalidTitle {
  margin-bottom: 8px;
  color: var(--color-danger, #f56c6c);
  font-size: 12px;
  line-height: 1.4;
}

.playlistSourceInvalidList {
  max-height: 120px;
  overflow-y: auto;
}

.playlistSourceInvalidItem {
  padding: 3px 0;
  color: var(--color-font);
  font-size: 12px;
  line-height: 1.45;
  word-break: break-all;
}

.playlistSourceTextarea {
  width: 100%;
  height: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-primary-alpha-900);
  border-radius: 6px;
  background: var(--color-primary-background-hover);
  color: var(--color-font);
  box-sizing: border-box;
  outline: none;
  resize: none;
  font-size: 12px;
  line-height: 1.6;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
}

.playlistSourceError {
  margin-top: 8px;
  color: var(--color-danger, #f56c6c);
  font-size: 12px;
  line-height: 1.5;
}

.playlistSourceActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
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
  transition: background-color .2s ease;

  &:hover:not(:disabled) {
    background: var(--color-primary-background-hover);
  }

  &:active:not(:disabled) {
    background: var(--color-primary-background);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.playlistEditorPrimaryBtn {
  background: var(--color-primary-background-hover);

  &:hover:not(:disabled) {
    background: var(--color-primary-background);
  }
}
</style>
