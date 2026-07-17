<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <div ref="directorySelectorRef" :class="$style.directorySelector">
        <input
          :value="currentDirectoryPath"
          :class="$style.directoryInput"
          type="text"
          :placeholder="$t('no_item')"
          readonly
          @click="handleToggleDirectoryPopover"
        />
        <div
          v-if="isDirectoryPopoverVisible"
          :class="$style.directoryPopover"
        >
          <div
            v-if="!localMusicState.directories.length"
            :class="$style.directoryEmpty"
          >
            {{ $t('no_item') }}
          </div>
          <div
            v-for="dir in localMusicState.directories"
            :key="dir.id"
            :class="[
              $style.directoryOption,
              { [$style.activeDirectoryOption]: selectedDirectory?.id === dir.id },
            ]"
          >
            <button
              type="button"
              :class="$style.directoryOptionButton"
              @click="handleSelectDirectory(dir)"
            >
              <span :class="$style.directoryOptionName">{{ dir.name }}</span>
              <span :class="$style.directoryOptionPath">{{ dir.path }}</span>
            </button>
            <button
              type="button"
              :class="$style.directoryDeleteButton"
              title="移除目录"
              @click.stop="handleRemoveDirectory(dir)"
            >
              ×
            </button>
          </div>
        </div>
        <button :class="$style.button" title="添加目录" @click="addDirectory">
          +
        </button>
        <button
          :class="$style.button"
          :disabled="!selectedDirectory"
          title="刷新目录"
          @click="handleRefreshDirectory"
        >
          刷新
        </button>
      </div>
      <input
        v-model="localMusicState.searchText"
        :class="$style.searchInput"
        type="text"
        :placeholder="$t('search')"
      />
    </div>
    <div :class="$style.main">
      <div :class="$style.sidebar">
        <div :class="$style.sidebarHeader">{{ $t('local_music_playlists') }}</div>
        <ul :class="$style.playlistList">
          <li
            :class="[$style.playlistItem, { [$style.active]: !localMusicState.currentPlaylist }]"
            @click="showAllFiles"
          >
            {{ $t('local_music_all_files') }}
          </li>
          <li
            v-for="(playlist, index) in localMusicState.playlistFiles"
            :key="index"
            :class="[$style.playlistItem, { [$style.active]: localMusicState.currentPlaylist === playlist }]"
            @click="selectPlaylist(playlist)"
          >
            {{ getPlaylistName(playlist) }}
          </li>
        </ul>
      </div>
      <div :class="$style.mainContent">
        <div v-if="localMusicState.isLoading" :class="$style.loading">
          {{ $t('loading') }}...
        </div>
        <div v-else :class="$style.musicList">
          <div v-if="!filteredMusicFiles.length" :class="$style.noItem">
            <p>{{ $t('no_item') }}</p>
          </div>
          <div v-else :class="$style.list">
            <div class="thead">
              <table>
                <thead>
                  <tr>
                    <th class="num" style="width: 5%;">#</th>
                    <th class="nobreak">{{ $t('music_name') }}</th>
                    <th class="nobreak" style="width: 25%;">{{ $t('music_singer') }}</th>
                    <th class="nobreak" style="width: 28%;">{{ $t('music_album') }}</th>
                    <th class="nobreak" style="width: 10%;">{{ $t('music_time') }}</th>
                  </tr>
                </thead>
              </table>
            </div>
            <div :class="$style.listContent">
              <div
                v-for="(item, index) in filteredMusicFiles"
                :key="item.id"
                :class="[$style.listItem, 'list-item']"
                @dblclick="handlePlayMusic(item)"
              >
                <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
                  <div class="num">{{ Number(index) + 1 }}</div>
                </div>
                <div class="list-item-cell auto name">
                  <span class="select name">{{ item.name }}</span>
                </div>
                <div class="list-item-cell" style="flex: 0 0 25%;">
                  <span class="select">{{ item.singer }}</span>
                </div>
                <div class="list-item-cell" style="flex: 0 0 28%;">
                  <span class="select">{{ item.meta.albumName }}</span>
                </div>
                <div class="list-item-cell" style="flex: 0 0 10%;">
                  <span class="no-select">{{ item.interval || '--/--' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { ref, computed, onMounted, onBeforeUnmount } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { useLocalMusic } from './useLocalMusic'
import { setPlayMusicInfo, setPlayListId } from '@renderer/store/player/action'
import { setMusicUrl } from '@renderer/core/player'

export default defineComponent({
  name: 'LocalMusic',
  setup() {
    useI18n() // 用于模板中的 $t
    const localMusic = useLocalMusic()
    const directorySelectorRef = ref<HTMLElement | null>(null)
    const isDirectoryPopoverVisible = ref(false)

    const selectedDirectory = computed(() => localMusic.state.value.currentDirectory)
    const currentDirectoryPath = computed(() => selectedDirectory.value?.path ?? '')

    const handleToggleDirectoryPopover = () => {
      isDirectoryPopoverVisible.value = !isDirectoryPopoverVisible.value
    }

    const handleSelectDirectory = (directory: LX.LocalMusic.LocalMusicDirectory) => {
      isDirectoryPopoverVisible.value = false
      void localMusic.selectDirectory(directory)
    }

    const handleRemoveDirectory = (directory?: LX.LocalMusic.LocalMusicDirectory) => {
      const targetDirectory = directory ?? selectedDirectory.value
      if (!targetDirectory) return
      if (selectedDirectory.value?.id === targetDirectory.id) {
        isDirectoryPopoverVisible.value = false
      }
      void localMusic.removeDirectory(targetDirectory)
    }

    const handleRefreshDirectory = () => {
      void localMusic.refreshDirectory()
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!directorySelectorRef.value?.contains(target)) {
        isDirectoryPopoverVisible.value = false
      }
    }

    const handlePlayMusic = (musicInfo: LX.Music.MusicInfo) => {
      const localListId = 'local_music_temp'
      setPlayListId(localListId)
      setPlayMusicInfo(localListId, musicInfo, false)
      setMusicUrl(musicInfo)
    }

    onMounted(() => {
      document.addEventListener('mousedown', handleClickOutside)
      void localMusic.init()
    })

    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', handleClickOutside)
    })

    return {
      ...localMusic,
      localMusicState: localMusic.state,
      directorySelectorRef,
      isDirectoryPopoverVisible,
      selectedDirectory,
      currentDirectoryPath,
      handleToggleDirectoryPopover,
      handleSelectDirectory,
      handleRemoveDirectory,
      handleRefreshDirectory,
      handlePlayMusic,
    }
  },
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  position: relative;
  z-index: 20;
  display: flex;
  padding: 10px;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--color-primary-alpha-900);
}

.directorySelector {
  position: relative;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 5px;
}

.directoryInput {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid var(--color-primary-background);
  background: var(--color-background);
  color: var(--color-font);
  min-width: 260px;
  cursor: pointer;
  box-sizing: border-box;
  outline: none;

  &:focus,
  &:hover {
    border-color: var(--color-primary-background);
  }
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
  padding: 0px 10px;
  font-size: 12px;
  line-height: 26px;
  border-radius: 4px;
  border: 1px solid var(--color-primary-background);
  background: var(--color-primary-background-hover);
  color: var(--color-font);
  cursor: pointer;

  &:hover {
    background: var(--color-primary-background);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.searchInput {
  flex: 1;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid var(--color-primary-background);
  background: var(--color-background);
  color: var(--color-font);
}

.main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.sidebar {
  width: 200px;
  border-right: 1px solid var(--color-primary-alpha-900);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebarHeader {
  padding: 10px;
  font-weight: bold;
  border-bottom: 1px solid var(--color-primary-alpha-900);
}

.playlistList {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.playlistItem {
  padding: 8px 10px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.2;
  word-break: break-all;

  &:hover {
    background: var(--color-primary-background-hover);
  }

  &.active {
    background: var(--color-primary-background);
    color: var(--color-primary);
  }
}

.mainContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 18px;
}

.noItem {
  position: relative;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  p {
    font-size: 24px;
    color: var(--color-font-label);
  }
}

.musicList {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
}

.list {
  overflow: hidden;
  height: 100%;
  flex: auto;
  display: flex;
  flex-flow: column nowrap;
}

.listContent {
  min-height: 0;
  font-size: 14px;
  display: flex;
  flex-flow: column nowrap;
  flex: auto;
  overflow-y: auto;
}

.listItem {
  display: flex;
  height: 40px;
  align-items: center;
  padding: 0 10px;
  cursor: pointer;
  &:hover {
    background: var(--color-primary-background-hover);
  }
}

.num {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
</style>
