<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <div :class="$style.directorySelector">
        <select
          v-model="selectedDirectoryId"
          :class="$style.select"
          @change="handleDirectoryChange"
        >
          <option
            v-for="dir in localMusicState.directories"
            :key="dir.id"
            :value="dir.id"
          >
            {{ dir.name }}
          </option>
        </select>
        <button :class="$style.button" title="添加目录" @click="addDirectory">
          +
        </button>
        <button
          v-if="selectedDirectory"
          :class="$style.button"
          title="移除目录"
          @click="handleRemoveDirectory"
        >
          -
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
                  <div class="num">{{ index + 1 }}</div>
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
import { ref, computed, onMounted } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { useLocalMusic } from './useLocalMusic'
import { setPlayMusicInfo, setPlayListId } from '@renderer/store/player/action'
import { setMusicUrl } from '@renderer/core/player'

export default defineComponent({
  name: 'LocalMusic',
  setup() {
    useI18n() // 用于模板中的 $t
    const localMusic = useLocalMusic()

    const selectedDirectoryId = ref<string>('')

    const selectedDirectory = computed(() =>
      localMusic.state.value.directories.find(
        (d) => d.id === selectedDirectoryId.value,
      ),
    )

    const handleDirectoryChange = () => {
      const dir = selectedDirectory.value
      if (dir) {
        void localMusic.selectDirectory(dir)
      }
    }

    const handleRemoveDirectory = () => {
      const dir = selectedDirectory.value
      if (dir) {
        void localMusic.removeDirectory(dir)
      }
    }

    const handlePlayMusic = (musicInfo: LX.Music.MusicInfo) => {
      const localListId = 'local_music_temp'
      setPlayListId(localListId)
      setPlayMusicInfo(localListId, musicInfo, false)
      setMusicUrl(musicInfo)
    }

    onMounted(() => {
      void localMusic.init()
    })

    return {
      ...localMusic,
      localMusicState: localMusic.state,
      selectedDirectoryId,
      selectedDirectory,
      handleDirectoryChange,
      handleRemoveDirectory,
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
  display: flex;
  padding: 10px;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--color-divider);
}

.directorySelector {
  display: flex;
  align-items: center;
  gap: 5px;
}

.select {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-font);
  min-width: 200px;
}

.button {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-primary-background-hover);
  color: var(--color-font);
  cursor: pointer;

  &:hover {
    background: var(--color-primary-background);
  }
}

.searchInput {
  flex: 1;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
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
  border-right: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebarHeader {
  padding: 10px;
  font-weight: bold;
  border-bottom: 1px solid var(--color-divider);
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
