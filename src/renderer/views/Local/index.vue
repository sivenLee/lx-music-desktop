<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <DirectorySelector
        ref="directorySelectorComponentRef"
        :directories="localMusicState.directories"
        :selected-directory="selectedDirectory"
        :current-directory-path="currentDirectoryPath"
        :visible="isDirectoryPopoverVisible"
        @toggle="handleToggleDirectoryPopover"
        @select="handleSelectDirectory"
        @remove="handleRemoveDirectory"
        @add="addDirectory"
        @refresh="handleRefreshDirectory"
      />
      <div :class="$style.buttonGroup">
        <button
          :class="$style.button"
          title="多选开关"
          @click="handleToggleMultiSelectMode"
        >
          <input
            type="checkbox"
            :class="$style.buttonCheckbox"
            :checked="isMultiSelectEnabled"
            tabindex="-1"
          />
          已选{{ selectedMusicCount }}个
        </button>
        <button
          :class="$style.button"
          :disabled="!canAddSelectedMusics"
          title="添加到…"
          @click="handleShowSelectedMusicAddModal"
        >
          添加到…
        </button>
        <button
          :class="$style.button"
          :disabled="!canRemoveSelectedMusics"
          title="移出列表"
          @click="handleRemoveSelectedMusics"
        >
          移出列表
        </button>
      </div>
    </div>
    <div :class="$style.header">
      <div :class="$style.searchInputWrap">
        <input
          v-model="searchInputText"
          :class="$style.searchInput"
          type="text"
          :placeholder="$t('local_music_search_expression_placeholder')"
          @blur="handleSearchBlur"
        />
        <button
          v-if="searchInputText"
          type="button"
          :class="$style.searchClearBtn"
          title="清空"
          @click="handleClearSearch"
        >
          ×
        </button>
      </div>
    </div>
    <div :class="$style.main">
      <PlaylistSidebar
        ref="playlistSidebarComponentRef"
        :playlist-files="localMusicState.playlistFiles"
        :playlist-counts="localMusicState.playlistCounts"
        :playlist-invalid-counts="localMusicState.playlistInvalidCounts"
        :current-playlist="localMusicState.currentPlaylist"
        :all-music-count="localMusicState.allMusicFiles.length"
        :get-playlist-name="getPlaylistName"
        :is-queue-all-files-active="isQueueAllFilesActive"
        :is-queue-playlist-active="isQueuePlaylistActive"
        :right-click-playlist-path="rightClickPlaylistPath"
        :current-directory-id="localMusicState.currentDirectory?.id ?? ''"
        :on-reorder="handleReorderPlaylists"
        @create="handleStartCreatePlaylist"
        @refresh="handleRefreshDirectory"
        @select-all-files="showAllFiles"
        @select-playlist="selectPlaylist"
        @playlist-context-menu="handlePlaylistContextMenu"
      />
      <div :class="$style.mainContent">
        <div v-if="localMusicState.isLoading" :class="$style.loading">
          {{ $t('loading') }}...
        </div>
        <div v-else :class="$style.musicList">
          <div v-if="!filteredMusicFiles.length" :class="$style.noItem">
            <p>{{ $t('no_item') }}</p>
          </div>
          <MusicTable
            v-else
            ref="musicTableComponentRef"
            :visible-columns="visibleColumns"
            :virtual-rows="virtualRows"
            :virtual-body-height="virtualBodyHeight"
            :music-table-style="musicTableStyle"
            :current-playing-music-id="currentPlayingMusicId"
            :right-click-music-id="rightClickMusicId"
            :is-multi-select-enabled="isMultiSelectEnabled"
            :is-all-visible-music-selected="isAllVisibleMusicSelected"
            :is-music-selected="isMusicSelected"
            :get-column-style="getColumnStyle"
            :get-column-sort-mark="getColumnSortMark"
            @scroll="handleMusicTableScroll"
            @header-context-menu="handleMusicHeaderContextMenu"
            @toggle-column-sort="handleToggleColumnSort"
            @toggle-select-all="handleToggleSelectAll"
            @toggle-music-selection="handleToggleMusicSelection"
            @play-music="handlePlayMusic"
            @music-context-menu="handleMusicContextMenu"
          />
        </div>
      </div>
    </div>
    <base-menu v-model="isShowPlaylistMenu" :menus="playlistMenus" :xy="playlistMenuLocation" item-name="name" @menu-click="handlePlaylistMenuClick" />
    <base-menu v-model="isShowMusicMenu" :menus="musicMenus" :xy="musicMenuLocation" item-name="name" @menu-click="handleMusicMenuClick" />
    <ColumnMenu
      ref="columnMenuComponentRef"
      :visible="isMusicColumnMenuVisible"
      :style="musicColumnMenuStyle"
      :columns="selectableColumns"
      :selected-keys="selectedMusicColumnKeys"
      @toggle="handleToggleMusicColumn"
    />
    <PlaylistNameEditor
      v-model:visible="isPlaylistEditorVisible"
      :mode="playlistEditorMode"
      :playlist-path="editingPlaylistPath"
      :initial-name="playlistEditorName"
      @renamed="handlePlaylistRenamed"
    />
    <PlaylistSourceEditor
      v-model:visible="isPlaylistSourceEditorVisible"
      :playlist-path="playlistSourcePath"
      @saved="handlePlaylistSourceSaved"
    />
    <MusicAddModal
      v-model:visible="isMusicAddVisible"
      :music-infos="selectedAddMusicInfos"
      :playlist-files="localMusicState.playlistFiles"
      @select="handleAddMusicToPlaylist"
      @update:visible="handleMusicAddVisibleChange"
    />
    <MusicDetailModal
      v-model:visible="isMusicDetailVisible"
      :music-info="musicDetailTarget"
    />
  </div>
</template>

<script lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, reactive, nextTick } from '@common/utils/vueTools'
import { debounce } from '@common/utils'
import { useI18n } from '@renderer/plugins/i18n'
import { useLocalMusic } from './useLocalMusic'
import { useMusicTable } from './useMusicTable'
import { useMultiSelect } from './useMultiSelect'
import { useLocalQueue, LOCAL_MUSIC_QUEUE_ID } from './useLocalQueue'
import { dialog } from '@renderer/plugins/Dialog'
import DirectorySelector from './components/DirectorySelector.vue'
import ColumnMenu from './components/ColumnMenu.vue'
import PlaylistSidebar from './components/PlaylistSidebar.vue'
import MusicTable from './components/MusicTable.vue'
import MusicDetailModal from './components/MusicDetailModal.vue'
import PlaylistNameEditor from './components/PlaylistNameEditor.vue'
import PlaylistSourceEditor from './components/PlaylistSourceEditor.vue'
import MusicAddModal from './components/MusicAddModal.vue'
import { playMusicInfo } from '@renderer/store/player/state'

export default {
  name: 'LocalMusic',
  components: {
    DirectorySelector,
    ColumnMenu,
    PlaylistSidebar,
    MusicTable,
    MusicDetailModal,
    PlaylistNameEditor,
    PlaylistSourceEditor,
    MusicAddModal,
  },
  setup() {
    const t = useI18n()
    const localMusic = useLocalMusic()
    const directorySelectorComponentRef = ref<{ rootRef: HTMLElement | null } | null>(null)
    const columnMenuComponentRef = ref<{ rootRef: HTMLElement | null } | null>(null)
    const musicTableComponentRef = ref<{
      musicTableRef: HTMLElement | null
      selectAllCheckboxRef: HTMLInputElement | null
    } | null>(null)
    const playlistSidebarComponentRef = ref<{ refreshPlaylistSort: () => void } | null>(null)

    const isDirectoryPopoverVisible = ref(false)
    const searchInputText = ref(localMusic.state.value.searchText)
    const isMultiSelectEnabled = ref(false)

    const filteredMusicFiles = localMusic.filteredMusicFiles

    const musicTable = useMusicTable({
      filteredMusicFiles,
      localMusic,
      isMultiSelectEnabled,
      getMusicTableElement: () => musicTableComponentRef.value?.musicTableRef ?? null,
    })

    const multiSelect = useMultiSelect({
      sortedMusicFiles: musicTable.sortedMusicFiles,
      localMusic,
      isMultiSelectEnabled,
      getSelectAllCheckboxElement: () => musicTableComponentRef.value?.selectAllCheckboxRef ?? null,
    })

    const localQueue = useLocalQueue({
      localMusic,
      sortMusicFiles: musicTable.sortMusicFiles,
      sortState: musicTable.sortState,
    })

    const selectedDirectory = computed(() => localMusic.state.value.currentDirectory)
    const currentDirectoryPath = computed(() => selectedDirectory.value?.path ?? '')

    const playlistMenuLocation = reactive({ x: 0, y: 0 })
    const isShowPlaylistMenu = ref(false)
    const rightClickPlaylistPath = ref<string>('')
    const musicMenuLocation = reactive({ x: 0, y: 0 })
    const isShowMusicMenu = ref(false)
    const rightClickMusicInfo = ref<LX.Music.MusicInfoLocal | null>(null)
    const rightClickMusicId = computed(() => rightClickMusicInfo.value?.id ?? null)

    const playlistMenus = computed(() => [
      { name: '编辑', action: 'edit' },
      { name: window.i18n.t('lists__rename'), action: 'rename' },
      { name: '清空列表', action: 'clearList' },
      { name: window.i18n.t('lists__remove'), action: 'remove' },
    ])
    const musicMenus = computed(() => [
      { name: t('list__play'), action: 'play' },
      {
        name: t('list__add_to'),
        action: 'addTo',
        disabled: !localMusic.state.value.playlistFiles.length,
      },
      {
        name: '歌曲详情',
        action: 'detail',
      },
      {
        name: t('list__remove'),
        action: 'remove',
        disabled: !localMusic.state.value.currentPlaylist,
      },
    ])

    const isPlaylistEditorVisible = ref(false)
    const playlistEditorMode = ref<'create' | 'rename'>('create')
    const playlistEditorName = ref('')
    const editingPlaylistPath = ref('')
    const isPlaylistSourceEditorVisible = ref(false)
    const playlistSourcePath = ref('')
    const isMusicAddVisible = ref(false)
    const selectedAddMusicInfos = ref<LX.Music.MusicInfoLocal[]>([])
    const isMusicDetailVisible = ref(false)
    const musicDetailTarget = ref<LX.Music.MusicInfoLocal | null>(null)

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

    const syncSearchText = () => {
      localMusic.state.value.searchText = searchInputText.value.trim()
    }

    const applySearchText = debounce(syncSearchText, 500)

    const handleSearchBlur = () => {
      applySearchText()
    }

    const handleClearSearch = () => {
      searchInputText.value = ''
      syncSearchText()
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!directorySelectorComponentRef.value?.rootRef?.contains(target)) {
        isDirectoryPopoverVisible.value = false
      }
      if (!columnMenuComponentRef.value?.rootRef?.contains(target)) {
        musicTable.isMusicColumnMenuVisible.value = false
      }
    }

    const handleReorderPlaylists = (playlistFiles: string[]) => {
      void localMusic.reorderPlaylists(playlistFiles)
    }

    const handlePlaylistContextMenu = (event: MouseEvent, playlistPath: string) => {
      rightClickPlaylistPath.value = playlistPath
      playlistMenuLocation.x = event.pageX
      playlistMenuLocation.y = event.pageY
      isShowPlaylistMenu.value = true
    }

    const handleOpenPlaylistSourceEditor = (playlistPath: string) => {
      playlistSourcePath.value = playlistPath
      isPlaylistSourceEditorVisible.value = true
    }

    const handlePlaylistSourceSaved = async({ playlistPath, musicFiles }: {
      playlistPath: string
      musicFiles: LX.Music.MusicInfoLocal[]
    }) => {
      await localQueue.syncPlaylistQueueIfNeeded(playlistPath, musicFiles)
    }

    const handlePlaylistMenuClick = async(item: { name: string, action: string } | null) => {
      const playlistPath = rightClickPlaylistPath.value
      isShowPlaylistMenu.value = false
      if (!item) return
      if (!playlistPath) return
      switch (item.action) {
        case 'edit':
          handleOpenPlaylistSourceEditor(playlistPath)
          break
        case 'rename':
          playlistEditorMode.value = 'rename'
          editingPlaylistPath.value = playlistPath
          playlistEditorName.value = localMusic.getPlaylistName(playlistPath)
          isPlaylistEditorVisible.value = true
          break
        case 'clearList': {
          const playlistName = localMusic.getPlaylistName(playlistPath)
          if (!await dialog.confirm(`确认清空播放列表「${playlistName}」？此操作会移除列表内全部歌曲。`)) return
          const musicFiles = await localMusic.writePlaylistText(playlistPath, '#EXTM3U\n')
          await localQueue.syncPlaylistQueueIfNeeded(playlistPath, musicFiles ?? [])
          break
        }
        case 'remove':
          if (!await dialog.confirm('确认删除该播放列表？')) return
          await localMusic.deletePlaylist(playlistPath)
          await localQueue.handlePlaylistDeleted(playlistPath)
          break
      }
    }

    const handlePlayMusic = (musicInfo: LX.Music.MusicInfoLocal) => {
      void localQueue.playLocalMusic(musicInfo)
    }

    const handleMusicContextMenu = (event: MouseEvent, musicInfo: LX.Music.MusicInfoLocal) => {
      rightClickMusicInfo.value = musicInfo
      musicMenuLocation.x = event.pageX
      musicMenuLocation.y = event.pageY
      isShowMusicMenu.value = true
    }

    const handleMusicAddVisibleChange = (visible: boolean) => {
      isMusicAddVisible.value = visible
      if (!visible) selectedAddMusicInfos.value = []
    }

    const handleShowMusicDetail = (musicInfo: LX.Music.MusicInfoLocal) => {
      musicDetailTarget.value = musicInfo
      isMusicDetailVisible.value = true
    }

    const handleAddMusicToPlaylist = async(playlistPath: string) => {
      if (!selectedAddMusicInfos.value.length) return
      const updatedList = await localMusic.addMusicsToPlaylist(playlistPath, selectedAddMusicInfos.value)
      if (!updatedList) return
      if (playMusicInfo.listId === LOCAL_MUSIC_QUEUE_ID && localQueue.activeLocalQueueKey.value === `playlist:${playlistPath}`) {
        await localQueue.syncLocalQueue(updatedList)
      }
      handleMusicAddVisibleChange(false)
    }

    const handleMusicMenuClick = async(item: { name: string, action: string } | null) => {
      const musicInfo = rightClickMusicInfo.value
      isShowMusicMenu.value = false
      if (!item || !musicInfo) return
      switch (item.action) {
        case 'play':
          await localQueue.playLocalMusic(musicInfo)
          break
        case 'addTo':
          selectedAddMusicInfos.value = [musicInfo]
          isMusicAddVisible.value = true
          break
        case 'detail':
          handleShowMusicDetail(musicInfo)
          break
        case 'remove': {
          const playlistPath = localMusic.state.value.currentPlaylist
          if (!playlistPath) return
          if (!await dialog.confirm(`确认从当前播放列表中移除「${musicInfo.name}」？`)) return
          const updatedList = await localMusic.removeMusicsFromPlaylist(playlistPath, [musicInfo])
          if (updatedList && playMusicInfo.listId === LOCAL_MUSIC_QUEUE_ID && localQueue.activeLocalQueueKey.value === `playlist:${playlistPath}`) {
            await localQueue.syncLocalQueue(updatedList)
          }
          break
        }
      }
    }

    const handleShowSelectedMusicAddModal = () => {
      if (!multiSelect.canAddSelectedMusics.value) return
      selectedAddMusicInfos.value = multiSelect.selectedMusicInfos.value
      isMusicAddVisible.value = true
    }

    const handleRemoveSelectedMusics = async() => {
      const playlistPath = localMusic.state.value.currentPlaylist
      if (!playlistPath || !multiSelect.selectedMusicInfos.value.length) return
      if (!await dialog.confirm(`确认从当前播放列表中移除已选的${multiSelect.selectedMusicInfos.value.length}首歌曲？`)) return
      const updatedList = await localMusic.removeMusicsFromPlaylist(playlistPath, multiSelect.selectedMusicInfos.value)
      if (!updatedList) return
      multiSelect.handleClearSelectedMusics()
      if (playMusicInfo.listId === LOCAL_MUSIC_QUEUE_ID && localQueue.activeLocalQueueKey.value === `playlist:${playlistPath}`) {
        await localQueue.syncLocalQueue(updatedList)
      }
    }

    const handleStartCreatePlaylist = () => {
      playlistEditorMode.value = 'create'
      playlistEditorName.value = ''
      editingPlaylistPath.value = ''
      isPlaylistEditorVisible.value = true
    }

    const handlePlaylistRenamed = ({ oldPath, newPath }: { oldPath: string, newPath: string }) => {
      localQueue.handlePlaylistRenamed({ oldPath, newPath })
    }

    watch(isShowPlaylistMenu, val => {
      if (!val) rightClickPlaylistPath.value = ''
    })

    watch(() => localMusic.state.value.searchText, (searchText) => {
      if (searchInputText.value !== searchText) searchInputText.value = searchText
    }, { immediate: true })

    watch(isShowMusicMenu, val => {
      if (!val) rightClickMusicInfo.value = null
    })

    onMounted(() => {
      document.addEventListener('mousedown', handleClickOutside)
      void localMusic.init().finally(() => {
        void nextTick(() => {
          playlistSidebarComponentRef.value?.refreshPlaylistSort()
        })
      })
      musicTable.setupViewportListeners()
    })

    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', handleClickOutside)
      musicTable.teardownViewportListeners()
    })

    return {
      ...localMusic,
      localMusicState: localMusic.state,
      filteredMusicFiles,
      directorySelectorComponentRef,
      columnMenuComponentRef,
      musicTableComponentRef,
      playlistSidebarComponentRef,
      isDirectoryPopoverVisible,
      selectedDirectory,
      currentDirectoryPath,
      searchInputText,
      ...musicTable,
      ...multiSelect,
      ...localQueue,
      playlistMenuLocation,
      isShowPlaylistMenu,
      playlistMenus,
      rightClickPlaylistPath,
      handleReorderPlaylists,
      handleToggleDirectoryPopover,
      handleSelectDirectory,
      handleRemoveDirectory,
      handleRefreshDirectory,
      handleSearchBlur,
      handleClearSearch,
      handlePlaylistContextMenu,
      handlePlaylistMenuClick,
      isPlaylistSourceEditorVisible,
      playlistSourcePath,
      handlePlaylistSourceSaved,
      musicMenuLocation,
      isShowMusicMenu,
      musicMenus,
      rightClickMusicId,
      handleMusicContextMenu,
      handleMusicMenuClick,
      isPlaylistEditorVisible,
      playlistEditorMode,
      playlistEditorName,
      editingPlaylistPath,
      handleStartCreatePlaylist,
      handlePlaylistRenamed,
      isMusicAddVisible,
      selectedAddMusicInfos,
      handleMusicAddVisibleChange,
      handleAddMusicToPlaylist,
      isMusicDetailVisible,
      musicDetailTarget,
      handlePlayMusic,
      handleShowSelectedMusicAddModal,
      handleRemoveSelectedMusics,
    }
  },
}
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
  display: flex;
  padding: 10px;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--color-primary-alpha-900);
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

  &:hover {
    background: var(--color-primary-background);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.buttonGroup {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-left: auto;
}

.buttonCheckbox {
  pointer-events: none;
  margin: 0;
}

.searchInput {
  width: 100%;
  padding: 5px 10px;
  padding-right: 28px;
  border-radius: 4px;
  border: 1px solid var(--color-primary-background);
  background: var(--color-background);
  color: var(--color-font);
  outline: none;
  box-sizing: border-box;

  &:focus,
  &:hover {
    border-color: var(--color-primary) !important;
  }
}

.searchInputWrap {
  position: relative;
  flex: 1;
}

.searchClearBtn {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-font-label);
  font-size: 14px;
  line-height: 16px;
  cursor: pointer;

  &:hover {
    color: var(--color-font);
  }
}

.main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.mainContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
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
  --local-table-bg: var(--color-content-background);
  --local-table-hover-bg: color-mix(in srgb, var(--color-primary-light-300) 20%, var(--local-table-bg) 80%);
  --local-table-active-bg: color-mix(in srgb, var(--color-primary-light-300) 20%, var(--local-table-bg) 80%);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
}
</style>
