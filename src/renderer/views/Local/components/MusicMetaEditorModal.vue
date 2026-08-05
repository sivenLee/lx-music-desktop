<template>
  <material-modal :show="visible" movable teleport="#view" width="920px" max-width="92%" height="78%" max-height="680px" @close="handleClose">
    <main :class="$style.modal">
      <h2 :class="$style.title" data-modal-drag>编辑元信息</h2>
      <div :class="$style.filePath" :title="form.filePath">{{ form.filePath || '-' }}</div>

      <div :class="$style.content">
        <div v-if="isLoading" :class="$style.empty">{{ $t('loading') }}...</div>
        <div v-else-if="error" :class="$style.empty">{{ error }}</div>
        <div v-else :class="$style.body">
          <div class="scroll" :class="$style.left">
            <div :class="$style.fieldRow">
              <div :class="$style.field">
                <label :class="$style.label">
                  <input v-model="overrides.title" type="checkbox" />
                  <span>标题</span>
                </label>
                <input v-model="form.title" :class="$style.input" type="text" />
              </div>
              <div :class="$style.field">
                <label :class="$style.label">
                  <input v-model="overrides.artist" type="checkbox" />
                  <span>艺术家</span>
                </label>
                <input v-model="form.artist" :class="$style.input" type="text" />
              </div>
            </div>
            <div :class="$style.fieldRow">
              <div :class="$style.field">
                <label :class="$style.label">
                  <input v-model="overrides.album" type="checkbox" />
                  <span>专辑</span>
                </label>
                <input v-model="form.album" :class="$style.input" type="text" />
              </div>
              <div :class="$style.field">
                <label :class="$style.label">
                  <input v-model="overrides.year" type="checkbox" />
                  <span>年代</span>
                </label>
                <input v-model="form.year" :class="$style.input" type="text" />
              </div>
            </div>
            <div :class="$style.fieldRow">
              <div :class="$style.field">
                <label :class="$style.label">
                  <input v-model="overrides.track" type="checkbox" />
                  <span>音轨号</span>
                </label>
                <input v-model="form.track" :class="$style.input" type="text" placeholder="如 1 或 1/12" />
              </div>
              <div :class="$style.field">
                <label :class="$style.label">
                  <input v-model="overrides.disc" type="checkbox" />
                  <span>碟号</span>
                </label>
                <input v-model="form.disc" :class="$style.input" type="text" placeholder="如 1 或 1/2" />
              </div>
            </div>
            <div :class="$style.fieldRow">
              <div :class="$style.field">
                <label :class="$style.label">
                  <input v-model="overrides.genre" type="checkbox" />
                  <span>流派</span>
                </label>
                <input v-model="form.genre" :class="$style.input" type="text" />
              </div>
              <div :class="$style.field">
                <label :class="$style.label">
                  <input v-model="overrides.language" type="checkbox" />
                  <span>语种</span>
                </label>
                <input v-model="form.language" :class="$style.input" type="text" />
              </div>
            </div>
            <div :class="$style.field">
              <label :class="$style.label">
                <input v-model="overrides.comment" type="checkbox" />
                <span>注释</span>
              </label>
              <input v-model="form.comment" :class="$style.input" type="text" />
            </div>
            <div :class="$style.field">
              <label :class="$style.label">
                <input v-model="overrides.lyrics" type="checkbox" />
                <span>歌词</span>
              </label>
              <textarea v-model="form.lyrics" :class="[$style.input, $style.lyricArea]" rows="3" />
            </div>
            <div :class="$style.field">
              <div :class="$style.labelRow">
                <span :class="$style.labelPlain">标签 (用#分隔)</span>
                <div :class="$style.aiActions">
                  <span :class="$style.aiModel" :title="appSetting['ai.model']">
                    {{ appSetting['ai.model'] || '未配置模型' }}
                  </span>
                  <button
                    type="button"
                    :class="$style.btn"
                    :disabled="isLoading || isSaving || isGeneratingTags || !form.filePath"
                    @click="handleGenerateTags"
                  >
                    {{ isGeneratingTags ? '生成中…' : 'AI 生成' }}
                  </button>
                </div>
              </div>
              <textarea v-model="form.customTags" :class="[$style.input, $style.textarea]" rows="3" />
            </div>
          </div>

          <aside :class="$style.right">
            <div :class="$style.coverWrap">
              <label :class="$style.label">
                <input v-model="overrides.cover" type="checkbox" />
                <span>封面</span>
              </label>
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
          <button
            type="button"
            :class="$style.btn"
            :disabled="!musicInfo || isLoading || isSaving"
            title="播放"
            @click="handlePlay"
          >
            播放
          </button>
          <button type="button" :class="$style.btn" :disabled="!canGoNext || isSaving" @click="handleNext">下一首</button>
          <button type="button" :class="$style.btn" :disabled="isLoading || isSaving || !form.filePath" @click="handleReload">
            重新加载
          </button>
          <button
            type="button"
            :class="[$style.btn, $style.overrideBtn]"
            :disabled="isLoading || isSaving"
            @click="handleToggleAllOverrides"
          >
            <input
              ref="overrideAllCheckboxRef"
              type="checkbox"
              tabindex="-1"
              :checked="isAllOverridesChecked"
              @click.prevent
            >
            <span>{{ overrideSummaryText }}</span>
          </button>
          <button type="button" :class="$style.btn" :disabled="isLoading || isSaving || !form.filePath" @click="isSearchVisible = true">
            综合搜索
          </button>
          <div ref="directSearchWrapRef" :class="$style.splitBtn">
            <button
              type="button"
              :class="[$style.btn, $style.splitBtnMain]"
              :disabled="isLoading || isSaving || isDirectSearching || !form.filePath"
              title="使用 QQ 音源一键补齐"
              @click="handleDirectSearch()"
            >
              {{ isDirectSearching ? '搜索中…' : '一键补齐' }}
            </button>
            <button
              type="button"
              :class="[$style.btn, $style.splitBtnArrow]"
              :disabled="isLoading || isSaving || isDirectSearching || !form.filePath"
              title="选择音源"
              :aria-expanded="isSourceMenuVisible"
              @click.stop="handleToggleSourceMenu"
            >
              <span :class="[$style.splitBtnCaret, { [$style.splitBtnCaretOpen]: isSourceMenuVisible }]" aria-hidden="true" />
            </button>
            <div
              v-if="isSourceMenuVisible"
              :class="$style.sourceMenu"
            >
              <button
                v-for="source in searchSources"
                :key="source.id"
                type="button"
                :class="$style.sourceMenuItem"
                @click="handleDirectSearch(source.id)"
              >
                {{ source.name }}
              </button>
            </div>
          </div>
        </div>
        <div :class="$style.footerRight">
          <button type="button" :class="$style.btn" :disabled="isSaving" @click="handleClose">取消</button>
          <button
            type="button"
            :class="[$style.btn, $style.primaryBtn]"
            :disabled="isLoading || isSaving || isGeneratingTags || !form.filePath"
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
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from '@common/utils/vueTools'
import {
  clearLocalMusicMetadataCache,
  getCoverInfoFromSource,
  getLocalMusicEditInfo,
  isLocalMusicMetaEditable,
  type LocalMusicEditInfo,
} from '@renderer/utils/music'
import { localMusicWriteMusicMeta, showSelectDialog, generateMusicTags } from '@renderer/utils/ipc'
import { encodePath } from '@common/utils/common'
import { dialog } from '@renderer/plugins/Dialog'
import { appSetting } from '@renderer/store/setting'
import MusicMetaSearchModal from './MusicMetaSearchModal.vue'
import type { MusicMetaSearchResultPayload } from '../musicMetaEditTypes'
import { buildMusicMetaSearchPayload, getMusicMetaSearchSources, searchMusicMetaResults } from '../musicMetaSearch'

const OVERRIDE_KEYS = [
  'title',
  'artist',
  'album',
  'year',
  'track',
  'disc',
  'genre',
  'language',
  'comment',
  'lyrics',
  'cover',
] as const

type OverrideKey = typeof OVERRIDE_KEYS[number]
type OverrideState = Record<OverrideKey, boolean>

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

const createDefaultOverrides = (): OverrideState => {
  const result: OverrideState = {
    title: true,
    artist: true,
    album: true,
    year: true,
    track: true,
    disc: true,
    genre: true,
    language: true,
    comment: true,
    lyrics: true,
    cover: true,
  }
  return result
}

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
  emits: ['update:visible', 'change', 'saved', 'play'],
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
      (event: 'play', musicInfo: LX.Music.MusicInfoLocal): void
    }
  }) {
    const form = reactive(createEmptyForm())
    const overrides = reactive(createDefaultOverrides())
    const isLoading = ref(false)
    const isSaving = ref(false)
    const isGeneratingTags = ref(false)
    const error = ref('')
    const isSearchVisible = ref(false)
    const isDirectSearching = ref(false)
    const isSourceMenuVisible = ref(false)
    const directSearchWrapRef = ref<HTMLElement | null>(null)
    const searchSources = getMusicMetaSearchSources()
    const isDirty = ref(false)
    const suppressDirty = ref(false)
    const overrideAllCheckboxRef = ref<HTMLInputElement | null>(null)

    const editableMusicList = computed(() => {
      return props.musicList.filter(item => isLocalMusicMetaEditable(item.meta.filePath))
    })

    const currentIndex = computed(() => {
      if (!props.musicInfo) return -1
      return editableMusicList.value.findIndex(item => item.id === props.musicInfo?.id)
    })

    const canGoPrev = computed(() => currentIndex.value > 0)
    const canGoNext = computed(() => currentIndex.value >= 0 && currentIndex.value < editableMusicList.value.length - 1)

    const checkedOverrideCount = computed(() => OVERRIDE_KEYS.filter(key => overrides[key]).length)
    const isAllOverridesChecked = computed(() => checkedOverrideCount.value === OVERRIDE_KEYS.length)
    const isNoneOverridesChecked = computed(() => checkedOverrideCount.value === 0)
    const overrideSummaryText = computed(() => {
      if (isNoneOverridesChecked.value) return '未选中'
      if (isAllOverridesChecked.value) return '全部覆盖'
      return '部分覆盖'
    })

    const resetOverrides = () => {
      Object.assign(overrides, createDefaultOverrides())
    }

    const syncOverrideAllCheckbox = () => {
      const checkbox = overrideAllCheckboxRef.value
      if (!checkbox) return
      checkbox.indeterminate = !isAllOverridesChecked.value && !isNoneOverridesChecked.value
    }

    const applyForm = (info: LocalMusicEditInfo) => {
      suppressDirty.value = true
      Object.assign(form, info)
      isDirty.value = false
      void nextTick(() => {
        suppressDirty.value = false
      })
    }

    const loadForm = async(musicInfo: LX.Music.MusicInfoLocal | null) => {
      resetOverrides()
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

    const handlePlay = () => {
      if (!props.musicInfo) return
      emit('play', props.musicInfo)
    }

    const handleToggleAllOverrides = () => {
      const nextChecked = !isAllOverridesChecked.value
      for (const key of OVERRIDE_KEYS) overrides[key] = nextChecked
    }

    const handleReload = async() => {
      if (!props.musicInfo) return
      if (!await confirmLeaveIfNeeded()) return
      await loadForm(props.musicInfo)
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

    const mergeGeneratedTags = (tags: string[]) => {
      const mergeMode = appSetting['ai.tag.mergeMode']
      if (mergeMode === 'append' && form.customTags.trim()) {
        const existing = form.customTags.split('#').map(item => item.trim()).filter(Boolean)
        const merged = [...existing]
        for (const tag of tags) {
          if (!merged.includes(tag)) merged.push(tag)
        }
        form.customTags = merged.join('#')
        return
      }
      form.customTags = tags.join('#')
    }

    const handleGenerateTags = async() => {
      if (!form.title.trim() && !form.artist.trim()) {
        await dialog('请至少填写标题或艺术家')
        return
      }
      const mergeMode = appSetting['ai.tag.mergeMode']
      if (form.customTags.trim() && mergeMode === 'replace') {
        if (!await dialog.confirm('将覆盖当前标签，是否继续？')) return
      }

      isGeneratingTags.value = true
      try {
        const { tags } = await generateMusicTags({
          title: form.title.trim(),
          artist: form.artist.trim(),
          album: form.album.trim() || undefined,
          genre: form.genre.trim() || undefined,
          year: form.year.trim() || undefined,
          comment: form.comment.trim() || undefined,
          lyrics: form.lyrics.trim() || undefined,
        })
        mergeGeneratedTags(tags)
        isDirty.value = true
      } catch (err) {
        console.log(err)
        await dialog(`AI 生成失败：${err instanceof Error ? err.message : '未知错误'}`)
      } finally {
        isGeneratingTags.value = false
      }
    }

    const applySearchValue = (enabled: boolean, value: string | undefined, apply: (text: string) => void) => {
      if (!enabled) return
      const text = `${value ?? ''}`.trim()
      if (!text) return
      apply(text)
    }

    const handleSearchSelect = async(payload: MusicMetaSearchResultPayload) => {
      applySearchValue(overrides.title, payload.title, (text) => { form.title = text })
      applySearchValue(overrides.artist, payload.artist, (text) => { form.artist = text })
      applySearchValue(overrides.album, payload.album, (text) => { form.album = text })
      applySearchValue(overrides.year, payload.year, (text) => { form.year = text })
      applySearchValue(overrides.track, payload.track, (text) => { form.track = text })
      applySearchValue(overrides.disc, payload.disc, (text) => { form.disc = text })
      applySearchValue(overrides.genre, payload.genre, (text) => { form.genre = text })
      applySearchValue(overrides.language, payload.language, (text) => { form.language = text })
      applySearchValue(overrides.lyrics, payload.lyrics, (text) => { form.lyrics = text })
      if (overrides.cover) {
        const coverUrl = `${payload.coverUrl ?? ''}`.trim()
        if (coverUrl) {
          form.coverUrl = coverUrl
          form.coverSource = coverUrl
          form.coverInfo = await getCoverInfoFromSource(coverUrl)
        }
      }
      isDirty.value = true
    }

    const handleDirectSearch = async(source?: LX.OnlineSource) => {
      if (isDirectSearching.value || isLoading.value || isSaving.value) return
      if (!form.title.trim() && !form.artist.trim() && !form.album.trim()) {
        await dialog('请至少填写标题或艺术家')
        return
      }
      const targetSource = source ?? (
        searchSources.some(item => item.id === 'tx')
          ? 'tx'
          : searchSources[0]?.id
      )
      if (!targetSource) {
        await dialog('暂无可用搜索源')
        return
      }
      isSourceMenuVisible.value = false
      isDirectSearching.value = true
      try {
        const results = await searchMusicMetaResults({
          title: form.title,
          artist: form.artist,
          album: form.album,
          source: targetSource,
          limit: 5,
        })
        const first = results[0]
        if (!first) {
          await dialog('暂无搜索结果')
          return
        }
        await handleSearchSelect(await buildMusicMetaSearchPayload(first))
      } catch (err) {
        console.log(err)
        await dialog(err instanceof Error ? err.message : '搜索失败')
      } finally {
        isDirectSearching.value = false
      }
    }

    const handleSourceMenuClickOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!directSearchWrapRef.value?.contains(target)) {
        isSourceMenuVisible.value = false
      }
    }

    const handleToggleSourceMenu = () => {
      if (isLoading.value || isSaving.value || isDirectSearching.value || !form.filePath) return
      isSourceMenuVisible.value = !isSourceMenuVisible.value
    }

    watch(() => props.visible, (visible) => {
      if (!visible) isSourceMenuVisible.value = false
    })

    watch(isSourceMenuVisible, (visible) => {
      if (visible) {
        document.addEventListener('mousedown', handleSourceMenuClickOutside)
        return
      }
      document.removeEventListener('mousedown', handleSourceMenuClickOutside)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', handleSourceMenuClickOutside)
    })

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
        resetOverrides()
        return
      }
      void loadForm(musicInfo)
    })

    watch(form, () => {
      if (suppressDirty.value || isLoading.value || !form.filePath) return
      isDirty.value = true
    }, { deep: true })

    watch([checkedOverrideCount, isLoading], () => {
      void nextTick(() => {
        syncOverrideAllCheckbox()
      })
    })

    return {
      form,
      overrides,
      appSetting,
      isLoading,
      isSaving,
      isGeneratingTags,
      error,
      isSearchVisible,
      isDirectSearching,
      isSourceMenuVisible,
      directSearchWrapRef,
      searchSources,
      canGoPrev,
      canGoNext,
      overrideAllCheckboxRef,
      isAllOverridesChecked,
      overrideSummaryText,
      handleClose,
      handlePrev,
      handleNext,
      handlePlay,
      handleToggleAllOverrides,
      handleReload,
      handlePickCover,
      handleClearCover,
      handleGenerateTags,
      handleSearchSelect,
      handleDirectSearch,
      handleToggleSourceMenu,
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
  padding: 18px 20px 20px;
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

.label,
.labelPlain {
  font-size: 12px;
  color: var(--color-font-label);
}

.labelRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.aiActions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.aiModel {
  max-width: 160px;
  font-size: 12px;
  color: var(--color-font-label);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    margin: 0;
    flex: none;
    cursor: pointer;
  }
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
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  margin-top: 2px;
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

.splitBtn {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--color-primary-alpha-700);
  border-radius: 4px;
  overflow: visible;
  background: var(--color-button-background);
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--color-primary-alpha-500);

    .splitBtnArrow {
      border-left-color: var(--color-primary-alpha-500) !important;
    }
  }

  .splitBtnMain,
  .splitBtnArrow {
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    height: 30px !important;
    margin: 0;
    line-height: 30px;

    &:hover:not(:disabled) {
      background: var(--color-button-background-hover) !important;
    }

    &:active:not(:disabled) {
      background: var(--color-button-background-active) !important;
    }

    &:disabled {
      opacity: 1;
      cursor: not-allowed;
    }
  }

  .splitBtnMain {
    padding: 0 12px 0 14px !important;
  }

  .splitBtnArrow {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 28px !important;
    min-width: 28px !important;
    padding: 0 !important;
    color: var(--color-font);
    border-left: 1px solid var(--color-primary-alpha-700) !important;
    transition: border-left-color 0.2s ease;
  }
}

.splitBtnCaret {
  display: block;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
  transition: transform 0.2s ease;
}

.splitBtnCaretOpen {
  transform: rotate(180deg);
}

.sourceMenu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 4px);
  z-index: 20;
  min-width: 100%;
  padding: 4px 0;
  border-radius: 4px;
  border: 1px solid var(--color-primary-alpha-700);
  background: var(--color-content-background);
  box-shadow: 0 6px 16px rgb(0 0 0 / 14%);
}

.sourceMenuItem {
  display: block;
  width: 100%;
  padding: 7px 14px;
  border: none;
  background: transparent;
  color: var(--color-font);
  text-align: left;
  font-size: 13px;
  line-height: 1.3;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: var(--color-primary-background-hover);
  }
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
    cursor: not-allowed;
  }
}

.overrideBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-left: 10px;
  padding-right: 12px;

  input[type='checkbox'] {
    margin: 0;
    pointer-events: none;
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
