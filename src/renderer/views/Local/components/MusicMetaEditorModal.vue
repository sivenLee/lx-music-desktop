<template>
  <material-modal :show="visible" movable width="920px" max-width="92%" height="78%" max-height="650px" @close="handleClose">
    <main :class="$style.modal">
      <h2 :class="$style.title" data-modal-drag>编辑元信息</h2>
      <div :class="$style.filePath" :title="form.filePath">{{ form.filePath || '-' }}</div>

      <div :class="$style.content">
        <div v-if="isLoading" :class="$style.empty">{{ $t('loading') }}...</div>
        <div v-else-if="error" :class="$style.empty">{{ error }}</div>
        <div v-else :class="$style.body">
          <div class="scroll" :class="$style.left">
            <div :class="$style.fieldRow">
              <label :class="$style.field">
                <span :class="$style.label">标题</span>
                <input v-model="form.title" :class="$style.input" type="text" />
              </label>
              <label :class="$style.field">
                <span :class="$style.label">艺术家</span>
                <input v-model="form.artist" :class="$style.input" type="text" />
              </label>
            </div>
            <div :class="$style.fieldRow">
              <label :class="$style.field">
                <span :class="$style.label">专辑名</span>
                <input v-model="form.album" :class="$style.input" type="text" />
              </label>
              <label :class="$style.field">
                <span :class="$style.label">年代</span>
                <input v-model="form.year" :class="$style.input" type="text" />
              </label>
            </div>
            <div :class="$style.fieldRow">
              <label :class="$style.field">
                <span :class="$style.label">音轨号</span>
                <input v-model="form.track" :class="$style.input" type="text" placeholder="如 1 或 1/12" />
              </label>
              <label :class="$style.field">
                <span :class="$style.label">碟号</span>
                <input v-model="form.disc" :class="$style.input" type="text" placeholder="如 1 或 1/2" />
              </label>
            </div>
            <div :class="$style.fieldRow">
              <label :class="$style.field">
                <span :class="$style.label">流派</span>
                <input v-model="form.genre" :class="$style.input" type="text" />
              </label>
              <label :class="$style.field">
                <span :class="$style.label">语种</span>
                <input v-model="form.language" :class="$style.input" type="text" />
              </label>
            </div>
            <label :class="$style.field">
              <span :class="$style.label">注释</span>
              <input v-model="form.comment" :class="$style.input" type="text" />
            </label>
            <label :class="$style.field">
              <span :class="$style.label">歌词</span>
              <textarea v-model="form.lyrics" :class="[$style.input, $style.lyricArea]" rows="3" />
            </label>
            <label :class="$style.field">
              <span :class="$style.label">自定义标签 (用#分隔)</span>
              <textarea v-model="form.customTags" :class="[$style.input, $style.textarea]" rows="2" />
            </label>
          </div>

          <aside :class="$style.right">
            <div :class="$style.coverWrap">
              <img v-if="form.coverUrl" :src="form.coverUrl" :class="$style.cover" alt="封面" />
              <div v-else :class="$style.coverEmpty">无封面</div>
              <div v-if="form.coverInfo.length" :class="$style.coverInfo">
                <div
                  v-for="(detail, index) in form.coverInfo"
                  :key="index"
                  :class="$style.coverInfoItem"
                >
                  <span :class="$style.coverInfoLabel">{{ detail.label }}</span>
                  <span :class="$style.coverInfoValue">{{ detail.value }}</span>
                </div>
              </div>
            </div>
            <div :class="$style.coverActions">
              <button type="button" :class="$style.btn" @click="handlePickCover">选择封面</button>
              <button type="button" :class="$style.btn" :disabled="!form.coverUrl" @click="handleClearCover">清除封面</button>
            </div>
            <div v-if="form.fileMetaInfo.length" :class="$style.fileMetaInfo">
              <div
                v-for="(detail, index) in form.fileMetaInfo"
                :key="index"
                :class="$style.fileMetaItem"
              >
                <span :class="$style.fileMetaLabel">{{ detail.label }}</span>
                <span :class="$style.fileMetaValue" :title="detail.value">{{ detail.value }}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div :class="$style.footer">
        <div :class="$style.footerLeft">
          <button type="button" :class="$style.btn" :disabled="!canGoPrev || isSaving" @click="handlePrev">上一首</button>
          <button type="button" :class="$style.btn" :disabled="!canGoNext || isSaving" @click="handleNext">下一首</button>
          <button type="button" :class="$style.btn" :disabled="isLoading || isSaving || !form.filePath" @click="isSearchVisible = true">
            综合搜索
          </button>
        </div>
        <div :class="$style.footerRight">
          <button type="button" :class="$style.btn" :disabled="isSaving" @click="handleClose">取消</button>
          <button
            type="button"
            :class="[$style.btn, $style.primaryBtn]"
            :disabled="isLoading || isSaving || !form.filePath"
            @click="handleSave"
          >
            {{ isSaving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </main>

    <MusicMetaSearchModal
      v-model:visible="isSearchVisible"
      :title="form.title"
      :artist="form.artist"
      :album="form.album"
      @select="handleSearchSelect"
    />
  </material-modal>
</template>

<script lang="ts">
import { computed, nextTick, reactive, ref, watch } from '@common/utils/vueTools'
import {
  clearLocalMusicMetadataCache,
  getCoverInfoFromSource,
  getLocalMusicEditInfo,
  isLocalMusicMetaEditable,
  type LocalMusicEditInfo,
} from '@renderer/utils/music'
import { localMusicWriteMusicMeta, showSelectDialog } from '@renderer/utils/ipc'
import { encodePath } from '@common/utils/common'
import { dialog } from '@renderer/plugins/Dialog'
import MusicMetaSearchModal from './MusicMetaSearchModal.vue'
import type { MusicMetaSearchResultPayload } from '../musicMetaEditTypes'

const createEmptyForm = (): LocalMusicEditInfo => ({
  filePath: '',
  ext: '',
  title: '',
  artist: '',
  album: '',
  year: '',
  track: '',
  disc: '',
  genre: '',
  language: '',
  comment: '',
  customTags: '',
  lyrics: '',
  coverUrl: '',
  coverSource: '',
  coverInfo: [],
  fileMetaInfo: [],
})

export default {
  name: 'MusicMetaEditorModal',
  components: {
    MusicMetaSearchModal,
  },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    musicInfo: {
      type: Object as () => LX.Music.MusicInfoLocal | null,
      default: null,
    },
    musicList: {
      type: Array as () => LX.Music.MusicInfoLocal[],
      default: () => [],
    },
    dirPath: {
      type: String,
      default: '',
    },
  },
  emits: ['update:visible', 'change', 'saved'],
  setup(props: {
    visible: boolean
    musicInfo: LX.Music.MusicInfoLocal | null
    musicList: LX.Music.MusicInfoLocal[]
    dirPath: string
  }, { emit }: {
    emit: {
      (event: 'update:visible', value: boolean): void
      (event: 'change', musicInfo: LX.Music.MusicInfoLocal): void
      (event: 'saved', musicInfo: LX.Music.MusicInfoLocal): void
    }
  }) {
    const form = reactive(createEmptyForm())
    const isLoading = ref(false)
    const isSaving = ref(false)
    const error = ref('')
    const isSearchVisible = ref(false)
    const isDirty = ref(false)
    const suppressDirty = ref(false)

    const editableMusicList = computed(() => {
      return props.musicList.filter(item => isLocalMusicMetaEditable(item.meta.filePath))
    })

    const currentIndex = computed(() => {
      if (!props.musicInfo) return -1
      return editableMusicList.value.findIndex(item => item.id === props.musicInfo?.id)
    })

    const canGoPrev = computed(() => currentIndex.value > 0)
    const canGoNext = computed(() => currentIndex.value >= 0 && currentIndex.value < editableMusicList.value.length - 1)

    const applyForm = (info: LocalMusicEditInfo) => {
      suppressDirty.value = true
      Object.assign(form, info)
      isDirty.value = false
      void nextTick(() => {
        suppressDirty.value = false
      })
    }

    const loadForm = async(musicInfo: LX.Music.MusicInfoLocal | null) => {
      if (!musicInfo) {
        applyForm(createEmptyForm())
        error.value = ''
        return
      }
      if (!isLocalMusicMetaEditable(musicInfo.meta.filePath)) {
        applyForm(createEmptyForm())
        error.value = '仅支持编辑 MP3 / FLAC 格式文件'
        return
      }
      isLoading.value = true
      error.value = ''
      try {
        const info = await getLocalMusicEditInfo(musicInfo.meta.filePath)
        if (!info) {
          error.value = '读取元信息失败'
          applyForm(createEmptyForm())
          return
        }
        applyForm(info)
      } catch (err) {
        console.log(err)
        error.value = `读取元信息失败：${err instanceof Error ? err.message : '未知错误'}`
        applyForm(createEmptyForm())
      } finally {
        isLoading.value = false
      }
    }

    const confirmLeaveIfNeeded = async() => {
      if (!isDirty.value) return true
      return dialog.confirm('当前修改尚未保存，确认离开？')
    }

    const handleClose = async() => {
      if (!await confirmLeaveIfNeeded()) return
      emit('update:visible', false)
    }

    const switchTo = async(musicInfo: LX.Music.MusicInfoLocal) => {
      if (!await confirmLeaveIfNeeded()) return
      emit('change', musicInfo)
    }

    const handlePrev = () => {
      if (!canGoPrev.value) return
      void switchTo(editableMusicList.value[currentIndex.value - 1])
    }

    const handleNext = () => {
      if (!canGoNext.value) return
      void switchTo(editableMusicList.value[currentIndex.value + 1])
    }

    const handlePickCover = async() => {
      const result = await showSelectDialog({
        title: '选择封面图片',
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] },
        ],
      })
      if (result.canceled || !result.filePaths[0]) return
      const filePath = result.filePaths[0]
      form.coverSource = filePath
      form.coverUrl = encodePath(filePath)
      form.coverInfo = await getCoverInfoFromSource(filePath)
      isDirty.value = true
    }

    const handleClearCover = () => {
      form.coverUrl = ''
      form.coverSource = ''
      form.coverInfo = []
      isDirty.value = true
    }

    const handleSearchSelect = async(payload: MusicMetaSearchResultPayload) => {
      form.title = payload.title
      form.artist = payload.artist
      form.album = payload.album
      if (payload.year) form.year = payload.year
      if (payload.track) form.track = payload.track
      if (payload.disc) form.disc = payload.disc
      if (payload.genre) form.genre = payload.genre
      if (payload.language) form.language = payload.language
      if (payload.coverUrl) {
        form.coverUrl = payload.coverUrl
        form.coverSource = payload.coverUrl
        form.coverInfo = await getCoverInfoFromSource(payload.coverUrl)
      }
      if (payload.lyrics) form.lyrics = payload.lyrics
      isDirty.value = true
    }

    const handleSave = async() => {
      if (!props.musicInfo || !props.dirPath || !form.filePath) return
      isSaving.value = true
      try {
        const meta: LX.Music.MusicFileMeta = {
          title: form.title.trim(),
          artist: form.artist.trim() || null,
          album: form.album.trim() || null,
          year: form.year.trim() || null,
          track: form.track.trim() || null,
          disc: form.disc.trim() || null,
          genre: form.genre.trim() || null,
          language: form.language.trim() || null,
          comment: form.comment.trim() || null,
          CUSTOM_TAGS: form.customTags.trim() || null,
          lyrics: form.lyrics.trim() || null,
          APIC: form.coverSource.trim() || null,
        }
        const updated = await localMusicWriteMusicMeta({
          dirPath: props.dirPath,
          filePath: form.filePath,
          meta,
        })
        clearLocalMusicMetadataCache(form.filePath)
        isDirty.value = false
        emit('saved', updated)
        await loadForm(updated)
      } catch (err) {
        console.log(err)
        void dialog(`保存失败：${err instanceof Error ? err.message : '未知错误'}`)
      } finally {
        isSaving.value = false
      }
    }

    watch(() => [props.visible, props.musicInfo] as const, ([visible, musicInfo]) => {
      if (!visible) {
        isSearchVisible.value = false
        isDirty.value = false
        error.value = ''
        return
      }
      void loadForm(musicInfo)
    })

    watch(form, () => {
      if (suppressDirty.value || isLoading.value || !form.filePath) return
      isDirty.value = true
    }, { deep: true })

    return {
      form,
      isLoading,
      isSaving,
      error,
      isSearchVisible,
      canGoPrev,
      canGoNext,
      handleClose,
      handlePrev,
      handleNext,
      handlePickCover,
      handleClearCover,
      handleSearchSelect,
      handleSave,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.modal {
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  min-height: 0;
  padding: 16px 18px 18px;
  box-sizing: border-box;
}

.title {
  font-size: 18px;
  text-align: center;
  flex: 0 0 auto;
  cursor: move;
  user-select: none;
}

.filePath {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-font-label);
  text-align: center;
  flex: 0 0 auto;
  .mixin-ellipsis-1();
}

.content {
  margin-top: 12px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.empty {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
}

.body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}

.left {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.right {
  flex: 0 0 240px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: auto;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.fieldRow {
  display: flex;
  gap: 8px;
  > .field {
    flex: 1;
  }
}

.label {
  font-size: 12px;
  color: var(--color-font-label);
}

.input {
  width: 100%;
  min-height: 32px;
  padding: 6px 10px;
  border: 1px solid var(--color-primary-alpha-700);
  border-radius: 4px;
  background: var(--color-primary-light-1000-alpha-200);
  color: var(--color-font);
  outline: none;
  box-sizing: border-box;
}

.textarea,
.lyricArea {
  resize: vertical;
  line-height: 1.5;
}

.coverWrap {
  width: 100%;
}

.cover,
.coverEmpty {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  border: 1px solid var(--color-primary-alpha-900);
  background: var(--color-primary-background-hover);
}

.cover {
  display: block;
  object-fit: cover;
}

.coverEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
  font-size: 13px;
}

.coverInfo {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.coverInfoItem {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
}

.coverInfoLabel {
  flex: 0 0 36px;
  color: var(--color-font-label);
}

.coverInfoValue {
  flex: 1;
  min-width: 0;
  word-break: break-all;
  color: var(--color-font);
}

.coverActions {
  display: flex;
  gap: 8px;
}

.fileMetaInfo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 2px;
}

.fileMetaItem {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
}

.fileMetaLabel {
  flex: 0 0 56px;
  color: var(--color-font-label);
}

.fileMetaValue {
  flex: 1;
  min-width: 0;
  word-break: break-all;
  color: var(--color-font);
}

.footer {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.footerLeft,
.footerRight {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--color-primary-alpha-700);
  border-radius: 4px;
  background: var(--color-button-background);
  color: var(--color-font);
  cursor: pointer;
  outline: none;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  &:hover:not(:disabled) {
    background-color: var(--color-button-background-hover);
    border-color: var(--color-primary-alpha-500);
  }
  &:active:not(:disabled) {
    background-color: var(--color-button-background-active);
  }
  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
}

.primaryBtn {
  background-color: var(--color-primary-alpha-900);
  color: var(--color-primary);
  border-color: var(--color-primary-alpha-600);
  &:hover:not(:disabled) {
    background-color: var(--color-primary-alpha-700);
    border-color: var(--color-primary-alpha-400);
    color: var(--color-primary);
  }
  &:active:not(:disabled) {
    background-color: var(--color-primary-alpha-500);
  }
}
</style>
