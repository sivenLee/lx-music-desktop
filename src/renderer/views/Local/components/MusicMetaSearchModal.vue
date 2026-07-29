<template>
  <material-modal :show="visible" movable width="960px" max-width="94%" height="78%" max-height="650px" @close="handleClose">
    <main :class="$style.modal">
      <h2 :class="$style.title" data-modal-drag>综合搜索</h2>
      <div :class="$style.searchBar">
        <input v-model="searchTitle" :class="$style.input" type="text" placeholder="标题" @keydown.enter="handleSearch" />
        <input v-model="searchArtist" :class="$style.input" type="text" placeholder="艺术家" @keydown.enter="handleSearch" />
        <input v-model="searchAlbum" :class="$style.input" type="text" placeholder="专辑" @keydown.enter="handleSearch" />
        <select v-model="searchSource" :class="[$style.input, $style.sourceSelect]">
          <option v-for="item in searchSources" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <button type="button" :class="[$style.btn, $style.primaryBtn]" :disabled="isSearching" @click="handleSearch">
          {{ isSearching ? '搜索中…' : '搜索' }}
        </button>
      </div>
      <div :class="$style.content">
        <div v-if="error" :class="$style.empty">{{ error }}</div>
        <div v-else-if="isSearching && !results.length" :class="$style.empty">正在搜索…</div>
        <div v-else-if="!results.length" :class="$style.empty">暂无搜索结果</div>
        <div v-else :class="[$style.tableWrap, 'scroll']">
          <div :class="$style.tableHeader">
            <div :class="$style.colCover">封面</div>
            <div :class="$style.colSource">源</div>
            <div :class="$style.colTitle">标题</div>
            <div :class="$style.colArtist">艺术家</div>
            <div :class="$style.colAlbum">专辑</div>
            <div :class="$style.colComment">注释</div>
          </div>
          <div :class="$style.tableBody">
            <button
              v-for="(item, index) in results"
              :key="`${item.source}_${item.songmid || item.hash || index}`"
              type="button"
              :class="$style.tableRow"
              :disabled="isApplying"
              @click="handleSelect(item)"
            >
              <div :class="$style.colCover">
                <img
                  v-if="item.img"
                  :src="item.img"
                  :class="$style.cover"
                  alt=""
                  @load="handleCoverLoad($event, item)"
                >
                <div v-else :class="$style.coverEmpty">无封面</div>
              </div>
              <div :class="$style.colSource">
                <div :class="$style.sourceName">{{ sourceNameMap[item.source] || item.source }}</div>
                <div v-if="coverSizeMap[getResultKey(item, index)]" :class="$style.sourceMeta">
                  {{ coverSizeMap[getResultKey(item, index)] }}
                </div>
                <div v-if="item.track || item.disc" :class="$style.sourceMeta">
                  {{ getTrackDiscText(item) }}
                </div>
                <div v-if="item.genre" :class="$style.sourceMeta" :title="item.genre">{{ item.genre }}</div>
                <div v-if="item.language" :class="$style.sourceMeta" :title="item.language">{{ item.language }}</div>
                <span v-if="item.lrc" :class="$style.lyricBadge" title="含歌词">词</span>
              </div>
              <div :class="$style.colTitle">
                <div :class="$style.cellText" :title="item.name">{{ item.name || '-' }}</div>
                <div :class="$style.titleMeta">
                  <span v-if="item.year" :class="$style.yearText">{{ item.year }}</span>
                  <span v-if="item.interval">{{ item.interval }}</span>
                  <span v-if="getQualityText(item)">{{ getQualityText(item) }}</span>
                </div>
              </div>
              <div :class="[$style.colArtist, $style.cellText]" :title="item.singer">{{ item.singer || '-' }}</div>
              <div :class="[$style.colAlbum, $style.cellText]" :title="item.albumName">{{ item.albumName || '-' }}</div>
              <div :class="[$style.colComment, $style.cellText]" :title="getCommentText(item)">{{ getCommentText(item) }}</div>
            </button>
          </div>
        </div>
      </div>
    </main>
  </material-modal>
</template>

<script lang="ts">
import { ref, watch } from '@common/utils/vueTools'
import musicSdk from '@renderer/utils/musicSdk'
import { toNewMusicInfo } from '@common/utils/tools'
import { getPicPath, getLyricInfo } from '@renderer/core/music'
import type { MusicMetaSearchResultPayload } from '../musicMetaEditTypes'

interface SearchResultItem {
  name: string
  singer: string
  albumName: string
  interval?: string
  source: LX.OnlineSource
  songmid?: string | number
  hash?: string
  img?: string
  lrc?: string | null
  year?: string
  track?: string
  disc?: string
  genre?: string
  language?: string
  types?: Array<{ type: string, size?: string }>
  [key: string]: any
}

export default {
  name: 'MusicMetaSearchModal',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    artist: {
      type: String,
      default: '',
    },
    album: {
      type: String,
      default: '',
    },
  },
  emits: ['update:visible', 'select'],
  setup(props: {
    visible: boolean
    title: string
    artist: string
    album: string
  }, { emit }: {
    emit: {
      (event: 'update:visible', value: boolean): void
      (event: 'select', payload: MusicMetaSearchResultPayload): void
    }
  }) {
    const searchTitle = ref('')
    const searchArtist = ref('')
    const searchAlbum = ref('')
    const searchSource = ref<LX.OnlineSource>('tx')
    const results = ref<SearchResultItem[]>([])
    const isSearching = ref(false)
    const isApplying = ref(false)
    const error = ref('')
    const hasAutoSearched = ref(false)
    const coverSizeMap = ref<Record<string, string>>({})

    const searchSources = (musicSdk.sources as Array<{ id: string, name: string }>)
      .filter(item => item.id !== 'xm' && musicSdk[item.id as LX.OnlineSource]?.musicSearch)
      .map(item => ({
        id: item.id as LX.OnlineSource,
        name: item.name,
      }))

    const sourceNameMap = Object.fromEntries(
      searchSources.map(item => [item.id, item.name]),
    ) as Record<string, string>

    const getResultKey = (item: SearchResultItem, index: number) => {
      return `${item.source}_${item.songmid ?? item.hash ?? index}`
    }

    const getQualityText = (item: SearchResultItem) => {
      if (!Array.isArray(item.types) || !item.types.length) return ''
      return item.types.map(type => type.type).filter(Boolean).slice(0, 3).join(' / ')
    }

    const getTrackDiscText = (item: SearchResultItem) => {
      const track = `${item.track ?? ''}`.trim()
      const disc = `${item.disc ?? ''}`.trim()
      if (track && disc) return `Track ${track} / Disc ${disc}`
      if (track) return `Track ${track}`
      if (disc) return `Disc ${disc}`
      return ''
    }

    const getCommentText = (item: SearchResultItem) => {
      if (typeof item.remark == 'string' && item.remark.trim()) return item.remark.trim()
      if (typeof item.comment == 'string' && item.comment.trim()) return item.comment.trim()
      return '-'
    }

    const handleCoverLoad = (event: Event, item: SearchResultItem) => {
      const target = event.target
      if (!(target instanceof HTMLImageElement)) return
      const index = results.value.indexOf(item)
      const key = getResultKey(item, index < 0 ? 0 : index)
      if (target.naturalWidth > 0 && target.naturalHeight > 0) {
        coverSizeMap.value = {
          ...coverSizeMap.value,
          [key]: `${target.naturalWidth}x${target.naturalHeight}`,
        }
      }
    }

    const handleClose = () => {
      emit('update:visible', false)
    }

    const handleSearch = async() => {
      const name = searchTitle.value.trim()
      const singer = searchArtist.value.trim()
      if (!name && !singer && !searchAlbum.value.trim()) {
        error.value = '请至少填写标题或艺术家'
        return
      }
      const source = searchSource.value
      const api = musicSdk[source]?.musicSearch
      if (!api?.search) {
        error.value = '当前搜索源不可用'
        return
      }
      isSearching.value = true
      error.value = ''
      results.value = []
      coverSizeMap.value = {}
      try {
        const keyword = `${name || searchAlbum.value.trim()} ${singer}`.trim()
        const data = await api.search(keyword, 1, 10) as { list?: SearchResultItem[] } | null
        const albumKeyword = searchAlbum.value.trim().toLowerCase()
        const merged = (data?.list ?? []).filter(item => item?.name)
        results.value = albumKeyword
          ? [
              ...merged.filter(item => `${item.albumName ?? ''}`.toLowerCase().includes(albumKeyword)),
              ...merged.filter(item => !`${item.albumName ?? ''}`.toLowerCase().includes(albumKeyword)),
            ]
          : merged
        console.log('[MusicMetaSearch] results', {
          source,
          keyword,
          total: results.value.length,
          list: results.value,
        })
        if (!results.value.length) error.value = '暂无搜索结果'
      } catch (err) {
        console.log(err)
        error.value = `搜索失败：${err instanceof Error ? err.message : '未知错误'}`
      } finally {
        isSearching.value = false
      }
    }

    const handleSelect = async(item: SearchResultItem) => {
      if (isApplying.value) return
      isApplying.value = true
      try {
        const musicInfo = toNewMusicInfo(item) as LX.Music.MusicInfoOnline
        let coverUrl = item.img ?? ''
        let lyrics = ''
        try {
          const picUrl = await getPicPath({ musicInfo, isRefresh: true })
          if (picUrl) coverUrl = picUrl
        } catch (err) {
          console.log(err)
        }
        try {
          const lyricInfo = await getLyricInfo({ musicInfo, isRefresh: true })
          lyrics = lyricInfo.lyric ?? ''
        } catch (err) {
          console.log(err)
        }
        emit('select', {
          title: item.name ?? '',
          artist: item.singer ?? '',
          album: item.albumName ?? '',
          year: item.year ?? '',
          track: item.track ?? '',
          disc: item.disc ?? '',
          genre: item.genre ?? '',
          language: item.language ?? '',
          coverUrl,
          lyrics,
        })
        handleClose()
      } finally {
        isApplying.value = false
      }
    }

    watch(() => props.visible, (visible) => {
      if (!visible) {
        hasAutoSearched.value = false
        results.value = []
        error.value = ''
        isSearching.value = false
        isApplying.value = false
        coverSizeMap.value = {}
        return
      }
      searchTitle.value = props.title
      searchArtist.value = props.artist
      searchAlbum.value = props.album
      if (!searchSources.some(item => item.id === searchSource.value)) {
        searchSource.value = searchSources.some(item => item.id === 'tx') ? 'tx' : (searchSources[0]?.id ?? 'tx')
      }
      if (!hasAutoSearched.value) {
        hasAutoSearched.value = true
        void handleSearch()
      }
    })

    return {
      searchTitle,
      searchArtist,
      searchAlbum,
      searchSource,
      searchSources,
      results,
      isSearching,
      isApplying,
      error,
      sourceNameMap,
      coverSizeMap,
      getResultKey,
      getQualityText,
      getTrackDiscText,
      getCommentText,
      handleCoverLoad,
      handleClose,
      handleSearch,
      handleSelect,
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
  line-height: 1.3;
  flex: 0 0 auto;
  cursor: move;
  user-select: none;
}

.searchBar {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.input {
  flex: 1;
  min-width: 120px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--color-primary-alpha-700);
  border-radius: 4px;
  background: var(--color-primary-light-1000-alpha-200);
  color: var(--color-font);
  outline: none;
}

.sourceSelect {
  flex: 0 0 120px;
  min-width: 110px;
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

.empty {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
}

.content {
  margin-top: 12px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tableWrap {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--color-primary-alpha-900);
  border-radius: 6px;
  overflow: auto;
  background: var(--color-content-background);
}

.tableHeader,
.tableRow {
  display: grid;
  grid-template-columns: 120px 108px minmax(120px, 1.2fr) minmax(90px, 0.9fr) minmax(110px, 1fr) minmax(90px, 0.8fr);
  gap: 0;
  align-items: stretch;
  width: 100%;
  box-sizing: border-box;
}

.tableHeader {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: var(--color-content-background);
  background-image: linear-gradient(var(--color-primary-background-hover), var(--color-primary-background-hover));
  border-bottom: 1px solid var(--color-primary-alpha-900);
  color: var(--color-font-label);
  font-size: 12px;
  font-weight: 600;
}

.tableBody {
  min-height: 0;
}

.tableRow {
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--color-primary-alpha-900);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  &:last-child {
    border-bottom: 0;
  }
  &:hover {
    background: var(--color-primary-background-hover);
  }
  &:disabled {
    opacity: 0.7;
    cursor: default;
  }
}

.tableHeader > div,
.tableRow > div {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px 10px;
  border-right: 1px solid var(--color-primary-alpha-900);
  min-width: 0;
  box-sizing: border-box;
  text-align: left;
  &:last-child {
    border-right: 0;
  }
}

.colCover {
  align-items: flex-start;
  justify-content: flex-start;
}

.cover,
.coverEmpty {
  width: 100px;
  border-radius: 3px;
  background: var(--color-primary-background-hover);
}

.cover {
  display: block;
  height: auto;
  object-fit: contain;
}

.coverEmpty {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--color-font-label);
}

.tableHeader > .colSource,
.tableRow > .colSource,
.tableHeader > .colTitle,
.tableRow > .colTitle {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 2px;
}

.colSource {
  font-size: 12px;
  line-height: 1.35;
}

.sourceName {
  color: var(--color-font);
}

.sourceMeta {
  color: var(--color-font-label);
  font-size: 11px;
}

.lyricBadge {
  margin-top: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary-alpha-700);
  color: var(--color-primary);
  font-size: 11px;
  line-height: 1;
}

.colTitle {
  gap: 4px;
}

.titleMeta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  color: var(--color-font-label);
  font-size: 11px;
  line-height: 1.35;
}

.yearText {
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
}

.cellText {
  font-size: 13px;
  color: var(--color-font);
  word-break: break-all;
  .mixin-ellipsis-2();
}
</style>

