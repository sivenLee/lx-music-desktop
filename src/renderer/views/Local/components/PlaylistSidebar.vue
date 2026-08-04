<template>
  <div :class="$style.sidebar">
    <div :class="$style.sidebarHeader">
      <h2 :class="$style.sidebarTitle">{{ $t('local_music_playlists') }}</h2>
      <div :class="$style.sidebarHeaderBtns">
        <button
          type="button"
          :class="$style.playlistHeaderBtn"
          :aria-label="$t('lists__new_list_btn')"
          title="新增播放列表"
          :disabled="isRefreshing"
          @click="$emit('create')"
        >
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="70%" viewBox="0 0 24 24" space="preserve">
            <use xlink:href="#icon-list-add" />
          </svg>
        </button>
        <button
          type="button"
          :class="$style.playlistHeaderBtn"
          title="刷新播放列表"
          :disabled="isRefreshing"
          @click="$emit('refresh')"
        >
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" style="transform: rotate(45deg);" height="70%" viewBox="0 0 24 24" space="preserve">
            <use xlink:href="#icon-refresh" />
          </svg>
        </button>
      </div>
    </div>
    <div class="scroll" :class="$style.playlistList">
      <div
        :class="[
          $style.playlistItem,
          $style.playlistAllFilesItem,
          { [$style.active]: !currentPlaylist },
        ]"
        @click="$emit('selectAllFiles')"
      >
        <span :class="$style.playlistAllFilesMark">*</span>
        <span :class="$style.playlistName">
          {{ $t('local_music_all_files') }}
          <span v-if="isQueueAllFilesActive" :class="$style.queueTag"></span>
        </span>
        <span :class="$style.playlistCount">{{ allMusicCount }}</span>
      </div>
      <ul ref="playlistSortListRef" :class="$style.playlistSortList">
        <li
          v-for="playlist in playlistFiles"
          :key="playlist"
          :data-playlist-path="playlist"
          :class="[
            $style.playlistItem,
            $style.playlistItemSortable,
            { [$style.active]: currentPlaylist === playlist },
            { [$style.clicked]: rightClickPlaylistPath === playlist },
          ]"
          @click="$emit('selectPlaylist', playlist)"
          @contextmenu.prevent="$emit('playlistContextMenu', $event, playlist)"
        >
          <span
            :class="[$style.playlistSortHandle, PLAYLIST_SORT_HANDLE_CLASS]"
            title="拖动排序"
            @click.stop
          >⋮⋮</span>
          <span :class="$style.playlistName">
            {{ getPlaylistName(playlist) }}
            <span v-if="isQueuePlaylistActive(playlist)" :class="$style.queueTag"></span>
          </span>
          <span :class="$style.playlistCount">
            {{ playlistCounts[playlist] ?? 0 }}
            <span
              v-if="(playlistInvalidCounts[playlist] ?? 0) > 0"
              :class="$style.playlistInvalidCount"
            >
              *{{ playlistInvalidCounts[playlist] ?? 0 }}
            </span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, useCssModule } from '@common/utils/vueTools'
import usePlaylistSort, { PLAYLIST_SORT_HANDLE_CLASS } from '../usePlaylistSort'

export default {
  name: 'PlaylistSidebar',
  props: {
    playlistFiles: {
      type: Array as () => string[],
      required: true,
    },
    playlistCounts: {
      type: Object as () => Record<string, number>,
      required: true,
    },
    playlistInvalidCounts: {
      type: Object as () => Record<string, number>,
      required: true,
    },
    currentPlaylist: {
      type: String as () => string | null,
      default: null,
    },
    allMusicCount: {
      type: Number,
      default: 0,
    },
    getPlaylistName: {
      type: Function as unknown as () => (path: string) => string,
      required: true,
    },
    isQueueAllFilesActive: {
      type: Boolean,
      default: false,
    },
    isQueuePlaylistActive: {
      type: Function as unknown as () => (path: string) => boolean,
      required: true,
    },
    rightClickPlaylistPath: {
      type: String,
      default: '',
    },
    currentDirectoryId: {
      type: String,
      default: '',
    },
    onReorder: {
      type: Function as unknown as () => (playlistFiles: string[]) => void,
      required: true,
    },
    isRefreshing: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['create', 'refresh', 'selectAllFiles', 'selectPlaylist', 'playlistContextMenu'],
  setup(props: {
    playlistFiles: string[]
    playlistCounts: Record<string, number>
    playlistInvalidCounts: Record<string, number>
    currentPlaylist: string | null
    allMusicCount: number
    getPlaylistName: (path: string) => string
    isQueueAllFilesActive: boolean
    isQueuePlaylistActive: (path: string) => boolean
    rightClickPlaylistPath: string
    currentDirectoryId: string
    onReorder: (playlistFiles: string[]) => void
    isRefreshing: boolean
  }, { expose }: { expose: (exposed: Record<string, unknown>) => void }) {
    const styles = useCssModule()
    const playlistSortListRef = ref<HTMLElement | null>(null)
    const { refresh: refreshPlaylistSort } = usePlaylistSort({
      dom_list: playlistSortListRef,
      ghostClassName: styles.playlistDragGhost,
      getPlaylistFiles: () => props.playlistFiles,
      onReorder: (playlistFiles: string[]) => { props.onReorder(playlistFiles) },
      getWatchKey: () => props.currentDirectoryId,
    })
    expose({ refreshPlaylistSort })
    return {
      playlistSortListRef,
      refreshPlaylistSort,
      PLAYLIST_SORT_HANDLE_CLASS,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.sidebar {
  width: 18%;
  min-width: 220px;
  flex: 0 0 18%;
  border-right: 1px solid var(--color-primary-alpha-900);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebarHeader {
  position: relative;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  border-bottom: 1px solid var(--color-primary-alpha-900);
}

.sidebarTitle {
  flex: auto;
  margin: 0;
  font-size: 12px;
  font-weight: bold;
  line-height: 38px;
  padding: 0 10px;
}

.sidebarHeaderBtns {
  flex: none;
  display: flex;
}

.playlistHeaderBtn {
  margin-top: 6px;
  background: none;
  height: 30px;
  border: none;
  outline: none;
  border-radius: @radius-border;
  cursor: pointer;
  color: var(--color-font-label);
  transition: color @transition-normal, background-color @transition-normal;

  svg {
    vertical-align: bottom;
  }

  &:hover:not(:disabled) {
    color: var(--color-primary);
    background-color: var(--color-primary-background-hover);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.playlistList {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: scroll !important;
  user-select: none;
}

.playlistSortList {
  list-style: none;
  margin: 0;
  padding: 0;
}

.playlistSortHandle {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  margin-right: 4px;
  color: var(--color-font-label);
  cursor: grab;
  letter-spacing: -2px;
  font-size: 12px;
  line-height: 1;
  opacity: 0.65;

  &:hover {
    opacity: 1;
    color: var(--color-primary);
  }

  &:active {
    cursor: grabbing;
  }
}

.playlistItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.2;

  &:hover {
    background: var(--color-primary-background-hover);
  }

  &.active {
    background: var(--color-primary-background);
    color: var(--color-primary);
  }
}

.playlistAllFilesItem {
  cursor: pointer;
}

.playlistAllFilesMark {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  margin-right: 4px;
  color: var(--color-font-label);
  font-size: 12px;
  line-height: 1;
}

.playlistDragGhost {
  opacity: 0.6;
  background: var(--color-primary-background-hover);
}

.playlistItemSortable {
  cursor: pointer;
}

.playlistName {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.queueTag {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  height: 8px;
  width: 8px;
  border-radius: 4px;
  background: var(--color-primary);
  vertical-align: middle;
}

.playlistCount {
  flex: 0 0 auto;
  color: var(--color-font-label);
  font-size: 12px;
  white-space: nowrap;
}

.playlistInvalidCount {
  color: var(--color-danger, #f56c6c);
}

.playlistItem.clicked {
  background: var(--color-primary-background-hover);
}
</style>
