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
      <div :class="$style.sidebar">
        <div :class="$style.sidebarHeader">{{ $t('local_music_playlists') }}</div>
        <ul :class="$style.playlistList">
          <li
            :class="[
              $style.playlistItem,
              { [$style.active]: !localMusicState.currentPlaylist },
            ]"
            @click="showAllFiles"
          >
            <span :class="$style.playlistName">
              {{ $t('local_music_all_files') }}
              <span v-if="isQueueAllFilesActive" :class="$style.queueTag"></span>
            </span>
            <span :class="$style.playlistCount">{{ localMusicState.allMusicFiles.length }}</span>
          </li>
          <li
            v-for="(playlist, index) in localMusicState.playlistFiles"
            :key="index"
            :class="[
              $style.playlistItem,
              { [$style.active]: localMusicState.currentPlaylist === playlist },
              { [$style.clicked]: rightClickPlaylistPath === playlist },
            ]"
            @click="selectPlaylist(playlist)"
            @contextmenu.prevent="handlePlaylistContextMenu($event, playlist)"
          >
            <span :class="$style.playlistName">
              {{ getPlaylistName(playlist) }}
              <span v-if="isQueuePlaylistActive(playlist)" :class="$style.queueTag"></span>
            </span>
            <span :class="$style.playlistCount">
              {{ localMusicState.playlistCounts[playlist] ?? 0 }}
              <span
                v-if="(localMusicState.playlistInvalidCounts[playlist] ?? 0) > 0"
                :class="$style.playlistInvalidCount"
              >
                *{{ localMusicState.playlistInvalidCounts[playlist] ?? 0 }}
              </span>
            </span>
          </li>
          <li :class="$style.playlistCreateItem">
            <button
              type="button"
              :class="$style.playlistAddBtn"
              title="新增播放列表"
              @click="handleStartCreatePlaylist"
            >
              +
            </button>
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
          <div v-else :class="[$style.list, 'list']">
            <div class="thead">
              <table>
                <thead>
                  <tr>
                    <th class="num" style="width: 5%;">#</th>
                    <th class="nobreak">{{ $t('music_name') }}</th>
                    <th class="nobreak" style="width: 25%;">{{ $t('music_singer') }}</th>
                    <th class="nobreak" style="width: 28%;">{{ $t('music_album') }}</th>
                    <th class="nobreak" style="width: 10%;">{{ $t('music_time') }}</th>
                    <th class="nobreak" style="width: 6%;">
                      <input
                        ref="selectAllCheckboxRef"
                        type="checkbox"
                        :disabled="!isMultiSelectEnabled"
                        :checked="isAllVisibleMusicSelected"
                        @change="handleToggleSelectAll"
                      />
                    </th>
                  </tr>
                </thead>
              </table>
            </div>
            <div :class="$style.content">
              <div
                v-for="(item, index) in filteredMusicFiles"
                :key="`${item.id}_${Number(index)}`"
                :class="[
                  $style.listItem,
                  'list-item',
                  { [$style.active]: currentPlayingMusicId === item.id },
                  { [$style.clicked]: rightClickMusicId === item.id },
                  { [$style.selected]: isMusicSelected(item) },
                ]"
                @click="handleToggleMusicSelection(item)"
                @dblclick="handlePlayMusic(item)"
                @contextmenu.prevent="handleMusicContextMenu($event, item)"
              >
                <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
                  <transition name="play-active">
                    <div v-if="currentPlayingMusicId === item.id" :class="$style.playIcon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                        <use xlink:href="#icon-play-outline" />
                      </svg>
                    </div>
                    <div v-else class="num">{{ Number(index) + 1 }}</div>
                  </transition>
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
                <div class="list-item-cell" :class="$style.checkboxCell" style="flex: 0 0 6%;">
                  <input
                    type="checkbox"
                    :disabled="!isMultiSelectEnabled"
                    :checked="isMusicSelected(item)"
                    @click.stop="handleToggleMusicSelection(item)"
                    @change="noop"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <base-menu v-model="isShowPlaylistMenu" :menus="playlistMenus" :xy="playlistMenuLocation" item-name="name" @menu-click="handlePlaylistMenuClick" />
    <base-menu v-model="isShowMusicMenu" :menus="musicMenus" :xy="musicMenuLocation" item-name="name" @menu-click="handleMusicMenuClick" />
    <material-modal :show="isPlaylistEditorVisible" width="420px" max-width="420px" @close="handleClosePlaylistEditor">
      <div :class="$style.playlistEditor">
        <div :class="$style.playlistEditorTitle">{{ playlistEditorTitle }}</div>
        <input
          ref="playlistEditorInputRef"
          v-model="playlistEditorName"
          :class="$style.playlistEditorInput"
          type="text"
          :placeholder="playlistEditorPlaceholder"
          @keydown.enter.stop="handleConfirmPlaylistEditor"
          @keydown.esc="handleClosePlaylistEditor"
        />
        <div :class="$style.playlistEditorActions">
          <button type="button" :class="$style.playlistEditorBtn" @click="handleClosePlaylistEditor">取消</button>
          <button type="button" :class="[$style.playlistEditorBtn, $style.playlistEditorPrimaryBtn]" @click="handleConfirmPlaylistEditor">确认</button>
        </div>
      </div>
    </material-modal>
    <material-modal :show="isPlaylistSourceEditorVisible" width="720px" max-width="86%" height="78%" @close="handleClosePlaylistSourceEditor">
      <main :class="$style.playlistSourceEditor">
        <div :class="$style.playlistSourceHeader">
          <div :class="$style.playlistSourceTitle">编辑播放列表</div>
          <div :class="$style.playlistSourcePath">{{ playlistSourcePath }}</div>
        </div>
        <div v-if="isPlaylistSourceLoading" :class="$style.playlistSourceLoading">
          {{ $t('loading') }}...
        </div>
        <div v-else :class="$style.playlistSourceContent">
          <div v-if="playlistSourceInvalidFiles.length" :class="$style.playlistSourceInvalid">
            <div :class="$style.playlistSourceInvalidTitle">失效歌曲（{{ playlistSourceInvalidFiles.length }}）</div>
            <div class="scroll" :class="$style.playlistSourceInvalidList">
              <div v-for="(filePath, index) in playlistSourceInvalidFiles" :key="index" :class="$style.playlistSourceInvalidItem">
                {{ filePath }}
              </div>
            </div>
          </div>
          <textarea
            v-model="playlistSourceText"
            class="scroll"
            :class="$style.playlistSourceTextarea"
            spellcheck="false"
          />
          <div v-if="playlistSourceError" :class="$style.playlistSourceError">{{ playlistSourceError }}</div>
        </div>
        <div :class="$style.playlistSourceActions">
          <button
            type="button"
            :class="$style.playlistEditorBtn"
            :disabled="isPlaylistSourceSaving"
            @click="handleReloadPlaylistSource"
          >
            重载
          </button>
          <button
            type="button"
            :class="[$style.playlistEditorBtn, $style.playlistEditorPrimaryBtn]"
            :disabled="isPlaylistSourceLoading || isPlaylistSourceSaving"
            @click="handleSavePlaylistSource"
          >
            {{ isPlaylistSourceSaving ? '保存中...' : '保存' }}
          </button>
        </div>
      </main>
    </material-modal>
    <material-modal :show="isMusicAddVisible" max-width="70%" min-width="200px" @close="handleCloseMusicAddModal">
      <main :class="$style.musicAddModal">
        <h2>{{ musicAddTitle }}</h2>
        <div v-if="localMusicState.playlistFiles.length" class="scroll" :class="$style.musicAddBtnContent">
          <button
            v-for="playlist in localMusicState.playlistFiles"
            :key="playlist"
            type="button"
            :class="$style.musicAddBtn"
            @click="handleAddMusicToPlaylist(playlist)"
          >
            {{ getPlaylistName(playlist) }}
          </button>
        </div>
        <div v-else :class="$style.musicAddEmpty">
          {{ $t('no_item') }}
        </div>
      </main>
    </material-modal>
    <material-modal :show="isMusicDetailVisible" width="900px" max-width="86%" max-height="82%" @close="handleCloseMusicDetailModal">
      <main :class="$style.musicDetailModal">
        <h2 :class="$style.musicDetailTitle">{{ musicDetailTitle }}</h2>
        <div v-if="isMusicDetailLoading" :class="$style.musicDetailLoading">
          {{ $t('loading') }}...
        </div>
        <div v-else-if="musicDetailError" :class="$style.musicDetailEmpty">
          {{ musicDetailError }}
        </div>
        <div v-else-if="musicDetailInfo" :class="$style.musicDetailBody">
          <div class="scroll" :class="$style.musicDetailLeft">
            <section :class="$style.musicDetailSection">
              <div :class="$style.musicDetailSectionTitle">文件信息</div>
              <div :class="$style.musicDetailRows">
                <div v-for="(detail, index) in musicDetailInfo.fileInfo" :key="index" :class="$style.musicDetailRow">
                  <div :class="$style.musicDetailRowLabel">{{ detail.label }}</div>
                  <div :class="$style.musicDetailRowValue">{{ detail.value }}</div>
                </div>
              </div>
            </section>

            <section :class="$style.musicDetailSection">
              <div :class="$style.musicDetailSectionTitle">元信息</div>
              <div :class="$style.musicDetailRows">
                <div v-for="(detail, index) in musicDetailInfo.metaInfo" :key="index" :class="$style.musicDetailRow">
                  <div :class="$style.musicDetailRowLabel">{{ detail.label }}</div>
                  <div :class="$style.musicDetailRowValue">{{ detail.value }}</div>
                </div>
              </div>
            </section>

            <section :class="$style.musicDetailSection">
              <div :class="$style.musicDetailSectionTitle">音乐信息</div>
              <div :class="$style.musicDetailRows">
                <div v-for="(detail, index) in musicDetailInfo.audioInfo" :key="index" :class="$style.musicDetailRow">
                  <div :class="$style.musicDetailRowLabel">{{ detail.label }}</div>
                  <div :class="$style.musicDetailRowValue">{{ detail.value }}</div>
                </div>
              </div>
            </section>

            <section v-if="musicDetailInfo.customFields.length" :class="$style.musicDetailSection">
              <div :class="$style.musicDetailSectionTitle">其他自定义字段</div>
              <div :class="$style.musicDetailRows">
                <div v-for="(detail, index) in musicDetailInfo.customFields" :key="index" :class="$style.musicDetailRow">
                  <div :class="$style.musicDetailRowLabel">{{ detail.label }}</div>
                  <div :class="$style.musicDetailRowValue">{{ detail.value }}</div>
                </div>
              </div>
            </section>
          </div>

          <aside :class="$style.musicDetailRight">
            <div :class="$style.musicDetailCoverWrap">
              <img v-if="musicDetailInfo.coverUrl" :src="musicDetailInfo.coverUrl" :class="$style.musicDetailCover" alt="专辑封面" />
              <div v-else :class="$style.musicDetailCoverEmpty">无封面</div>
            </div>
            <div :class="$style.musicDetailLyricBlock">
              <div :class="$style.musicDetailLyricTitle">歌词</div>
              <pre :class="$style.musicDetailLyricPre">{{ musicDetailInfo.lyric || '暂无歌词' }}</pre>
            </div>
          </aside>
        </div>
      </main>
    </material-modal>
  </div>
</template>

<script lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, reactive, nextTick, toRaw } from '@common/utils/vueTools'
import { debounce } from '@common/utils'
import { useI18n } from '@renderer/plugins/i18n'
import { useLocalMusic } from './useLocalMusic'
import { overwriteListMusics, clearListMusics } from '@renderer/store/list/action'
import { playListById, stop } from '@renderer/core/player'
import { setPlayListId, setPlayMusicInfo } from '@renderer/store/player/action'
import { playMusicInfo } from '@renderer/store/player/state'
import { dialog } from '@renderer/plugins/Dialog'
import { getLocalMusicDetailInfo, type LocalMusicDetailInfo } from '@renderer/utils/music'

const LOCAL_MUSIC_QUEUE_ID = 'local_music_queue'

export default {
  name: 'LocalMusic',
  setup() {
    const t = useI18n()
    const localMusic = useLocalMusic()
    const directorySelectorRef = ref<HTMLElement | null>(null)
    const selectAllCheckboxRef = ref<HTMLInputElement | null>(null)
    const isDirectoryPopoverVisible = ref(false)
    const searchInputText = ref(localMusic.state.value.searchText)
    const isMultiSelectEnabled = ref(false)
    const selectedMusicPaths = ref<string[]>([])
    const filteredMusicFiles = localMusic.filteredMusicFiles

    const selectedDirectory = computed(() => localMusic.state.value.currentDirectory)
    const currentDirectoryPath = computed(() => selectedDirectory.value?.path ?? '')
    const currentQueueKey = computed(() => {
      if (playMusicInfo.listId !== LOCAL_MUSIC_QUEUE_ID) return ''
      return activeLocalQueueKey.value
    })
    const currentPlayingMusicId = computed(() => {
      if (playMusicInfo.listId !== LOCAL_MUSIC_QUEUE_ID) return null
      if (currentQueueKey.value !== getLocalQueueKey()) return null
      return playMusicInfo.musicInfo?.id ?? null
    })
    const visibleMusicPaths = computed(() => filteredMusicFiles.value.map((musicInfo: LX.Music.MusicInfoLocal) => musicInfo.meta.filePath))
    const selectedMusicCount = computed(() => selectedMusicPaths.value.length)
    const selectedMusicInfos = computed(() => filteredMusicFiles.value.filter((musicInfo: LX.Music.MusicInfoLocal) => {
      return selectedMusicPaths.value.includes(musicInfo.meta.filePath)
    }))
    const isAllVisibleMusicSelected = computed(() => {
      return visibleMusicPaths.value.length > 0 && visibleMusicPaths.value.every((path: string) => selectedMusicPaths.value.includes(path))
    })
    const isPartVisibleMusicSelected = computed(() => {
      return selectedMusicPaths.value.length > 0 && !isAllVisibleMusicSelected.value
    })
    const canAddSelectedMusics = computed(() => {
      return selectedMusicCount.value > 0 && localMusic.state.value.playlistFiles.length > 0
    })
    const canRemoveSelectedMusics = computed(() => {
      return selectedMusicCount.value > 0 && !!localMusic.state.value.currentPlaylist
    })

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

    const handleToggleMultiSelectMode = () => {
      isMultiSelectEnabled.value = !isMultiSelectEnabled.value
      if (!isMultiSelectEnabled.value) handleClearSelectedMusics()
    }

    const setSelectedMusicPaths = (paths: string[]) => {
      selectedMusicPaths.value = [...new Set(paths)]
    }

    const isMusicSelected = (musicInfo: LX.Music.MusicInfoLocal) => {
      return selectedMusicPaths.value.includes(musicInfo.meta.filePath)
    }

    const handleToggleMusicSelection = (musicInfo: LX.Music.MusicInfoLocal) => {
      if (!isMultiSelectEnabled.value) return
      if (isMusicSelected(musicInfo)) {
        setSelectedMusicPaths(selectedMusicPaths.value.filter(path => path !== musicInfo.meta.filePath))
        return
      }
      setSelectedMusicPaths([...selectedMusicPaths.value, musicInfo.meta.filePath])
    }

    const handleToggleSelectAll = () => {
      if (!isMultiSelectEnabled.value) return
      if (isAllVisibleMusicSelected.value) {
        setSelectedMusicPaths([])
        return
      }
      setSelectedMusicPaths(visibleMusicPaths.value)
    }

    const handleClearSelectedMusics = () => {
      setSelectedMusicPaths([])
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!directorySelectorRef.value?.contains(target)) {
        isDirectoryPopoverVisible.value = false
      }
    }

    const playlistMenuLocation = reactive({ x: 0, y: 0 })
    const isShowPlaylistMenu = ref(false)
    const rightClickPlaylistPath = ref<string>('')
    const musicMenuLocation = reactive({ x: 0, y: 0 })
    const isShowMusicMenu = ref(false)
    const rightClickMusicInfo = ref<LX.Music.MusicInfoLocal | null>(null)
    const rightClickMusicId = computed(() => rightClickMusicInfo.value?.id ?? null)
    const activeLocalQueueKey = ref('')

    const playlistMenus = computed(() => [
      { name: '编辑', action: 'edit' },
      { name: window.i18n.t('lists__rename'), action: 'rename' },
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
    const editingPlaylistPath = ref<string>('')
    const playlistEditorInputRef = ref<HTMLInputElement | null>(null)
    const playlistEditorTitle = computed(() => playlistEditorMode.value === 'create' ? '新建播放列表' : '重命名播放列表')
    const playlistEditorPlaceholder = computed(() => playlistEditorMode.value === 'create' ? '请输入播放列表名称' : '请输入新的播放列表名称')
    const isPlaylistSourceEditorVisible = ref(false)
    const isPlaylistSourceLoading = ref(false)
    const isPlaylistSourceSaving = ref(false)
    const playlistSourcePath = ref('')
    const playlistSourceText = ref('')
    const playlistSourceInvalidFiles = ref<string[]>([])
    const playlistSourceError = ref('')
    const isMusicAddVisible = ref(false)
    const selectedAddMusicInfos = ref<LX.Music.MusicInfoLocal[]>([])
    const musicAddTitle = computed(() => `添加${selectedAddMusicInfos.value.length}首歌曲到`)
    const isMusicDetailVisible = ref(false)
    const isMusicDetailLoading = ref(false)
    const musicDetailInfo = ref<LocalMusicDetailInfo | null>(null)
    const musicDetailError = ref('')
    const musicDetailTargetName = ref('')
    const musicDetailTitle = computed(() => musicDetailTargetName.value ? `歌曲详情 - ${musicDetailTargetName.value}` : '歌曲详情')

    const handlePlaylistContextMenu = (event: MouseEvent, playlistPath: string) => {
      rightClickPlaylistPath.value = playlistPath
      playlistMenuLocation.x = event.pageX
      playlistMenuLocation.y = event.pageY
      isShowPlaylistMenu.value = true
    }

    const clearLocalQueueAndStop = async() => {
      activeLocalQueueKey.value = ''
      await clearListMusics([LOCAL_MUSIC_QUEUE_ID])
      if (playMusicInfo.listId === LOCAL_MUSIC_QUEUE_ID) {
        stop()
        setPlayMusicInfo(null, null)
        setPlayListId(null)
      }
    }

    const syncPlaylistQueueIfNeeded = async(playlistPath: string, musicFiles?: LX.Music.MusicInfoLocal[]) => {
      if (playMusicInfo.listId !== LOCAL_MUSIC_QUEUE_ID) return
      if (activeLocalQueueKey.value !== `playlist:${playlistPath}`) return
      await syncLocalQueue(musicFiles ?? await localMusic.getPlaylistMusicFiles(playlistPath))
    }

    const loadPlaylistSource = async(playlistPath = playlistSourcePath.value) => {
      if (!playlistPath) return
      isPlaylistSourceLoading.value = true
      playlistSourceError.value = ''
      try {
        const [sourceText, detail] = await Promise.all([
          localMusic.readPlaylistText(playlistPath),
          localMusic.getPlaylistDetail(playlistPath),
        ])
        playlistSourceText.value = sourceText
        playlistSourceInvalidFiles.value = detail.invalidFilePaths
      } catch (err) {
        console.error('Failed to read playlist source:', err)
        playlistSourceError.value = `读取播放列表失败：${err instanceof Error ? err.message : '未知错误'}`
      } finally {
        isPlaylistSourceLoading.value = false
      }
    }

    const handleOpenPlaylistSourceEditor = async(playlistPath: string) => {
      playlistSourcePath.value = playlistPath
      playlistSourceText.value = ''
      playlistSourceError.value = ''
      isPlaylistSourceEditorVisible.value = true
      await loadPlaylistSource(playlistPath)
    }

    const handleClosePlaylistSourceEditor = () => {
      isPlaylistSourceEditorVisible.value = false
      isPlaylistSourceLoading.value = false
      isPlaylistSourceSaving.value = false
      playlistSourcePath.value = ''
      playlistSourceText.value = ''
      playlistSourceInvalidFiles.value = []
      playlistSourceError.value = ''
    }

    const handleReloadPlaylistSource = async() => {
      await loadPlaylistSource()
    }

    const handleSavePlaylistSource = async() => {
      if (!playlistSourcePath.value) return
      isPlaylistSourceSaving.value = true
      playlistSourceError.value = ''
      try {
        const musicFiles = await localMusic.writePlaylistText(playlistSourcePath.value, playlistSourceText.value)
        await syncPlaylistQueueIfNeeded(playlistSourcePath.value, musicFiles)
        const [sourceText, detail] = await Promise.all([
          localMusic.readPlaylistText(playlistSourcePath.value),
          localMusic.getPlaylistDetail(playlistSourcePath.value),
        ])
        playlistSourceText.value = sourceText
        playlistSourceInvalidFiles.value = detail.invalidFilePaths
        handleClosePlaylistSourceEditor()
      } catch (err) {
        console.error('Failed to save playlist source:', err)
        playlistSourceError.value = `保存播放列表失败：${err instanceof Error ? err.message : '未知错误'}`
      } finally {
        isPlaylistSourceSaving.value = false
      }
    }

    const handlePlaylistMenuClick = async(item: { name: string, action: string } | null) => {
      const playlistPath = rightClickPlaylistPath.value
      isShowPlaylistMenu.value = false
      if (!item) return
      if (!playlistPath) return
      switch (item.action) {
        case 'edit':
          await handleOpenPlaylistSourceEditor(playlistPath)
          break
        case 'rename':
          playlistEditorMode.value = 'rename'
          isPlaylistEditorVisible.value = true
          editingPlaylistPath.value = playlistPath
          playlistEditorName.value = localMusic.getPlaylistName(playlistPath)
          break
        case 'remove':
          if (!await dialog.confirm('确认删除该播放列表？')) return
          await localMusic.deletePlaylist(playlistPath)
          if (activeLocalQueueKey.value === `playlist:${playlistPath}`) {
            await clearLocalQueueAndStop()
          }
          break
      }
    }

    const getLocalQueueKey = (playlistPath = localMusic.state.value.currentPlaylist) => {
      if (playlistPath) return `playlist:${playlistPath}`
      return `all:${localMusic.state.value.currentDirectory?.id ?? ''}`
    }
    const isQueuePlaylistActive = (playlistPath: string) => currentQueueKey.value === `playlist:${playlistPath}`
    const isQueueAllFilesActive = computed(() => currentQueueKey.value === getLocalQueueKey(null))
    const getCurrentLocalQueue = () => {
      // Search results are only for display; playback always uses the current raw playlist queue.
      return localMusic.state.value.musicFiles
    }

    const normalizeLocalQueue = (musicFiles: LX.Music.MusicInfoLocal[]) => {
      const addedIds = new Set<string>()
      return musicFiles.filter(musicInfo => {
        if (addedIds.has(musicInfo.id)) return false
        addedIds.add(musicInfo.id)
        return true
      })
    }

    const syncLocalQueue = async(musicFiles: LX.Music.MusicInfoLocal[]) => {
      const queueMusicFiles = normalizeLocalQueue(musicFiles)
      await overwriteListMusics({
        listId: LOCAL_MUSIC_QUEUE_ID,
        musicInfos: queueMusicFiles.map(musicInfo => {
          const rawMusicInfo = toRaw(musicInfo)
          return {
            ...rawMusicInfo,
            meta: { ...toRaw(rawMusicInfo.meta) },
          }
        }),
      })
    }

    const playLocalMusic = async(musicInfo: LX.Music.MusicInfoLocal) => {
      const queue = getCurrentLocalQueue()
      if (!queue.length) return
      activeLocalQueueKey.value = getLocalQueueKey()
      await syncLocalQueue(queue)
      playListById(LOCAL_MUSIC_QUEUE_ID, musicInfo.id)
    }

    const handlePlayMusic = (musicInfo: LX.Music.MusicInfoLocal) => {
      void playLocalMusic(musicInfo)
    }

    const handleMusicContextMenu = (event: MouseEvent, musicInfo: LX.Music.MusicInfoLocal) => {
      rightClickMusicInfo.value = musicInfo
      musicMenuLocation.x = event.pageX
      musicMenuLocation.y = event.pageY
      isShowMusicMenu.value = true
    }

    const handleCloseMusicAddModal = () => {
      isMusicAddVisible.value = false
      selectedAddMusicInfos.value = []
    }

    const handleCloseMusicDetailModal = () => {
      isMusicDetailVisible.value = false
      isMusicDetailLoading.value = false
      musicDetailInfo.value = null
      musicDetailError.value = ''
      musicDetailTargetName.value = ''
    }

    const handleShowMusicDetail = async(musicInfo: LX.Music.MusicInfoLocal) => {
      isMusicDetailVisible.value = true
      isMusicDetailLoading.value = true
      musicDetailInfo.value = null
      musicDetailError.value = ''
      musicDetailTargetName.value = musicInfo.name
      try {
        const detailInfo = await getLocalMusicDetailInfo(musicInfo.meta.filePath)
        if (!detailInfo) {
          musicDetailError.value = '暂未读取到歌曲详情'
          return
        }
        musicDetailInfo.value = detailInfo
      } catch (err) {
        console.log(err)
        musicDetailError.value = `读取歌曲详情失败：${err instanceof Error ? err.message : '未知错误'}`
      } finally {
        isMusicDetailLoading.value = false
      }
    }

    const handleAddMusicToPlaylist = async(playlistPath: string) => {
      if (!selectedAddMusicInfos.value.length) return
      const updatedList = await localMusic.addMusicsToPlaylist(playlistPath, selectedAddMusicInfos.value)
      if (!updatedList) return
      if (playMusicInfo.listId === LOCAL_MUSIC_QUEUE_ID && activeLocalQueueKey.value === `playlist:${playlistPath}`) {
        await syncLocalQueue(updatedList)
      }
      handleCloseMusicAddModal()
    }

    const handleMusicMenuClick = async(item: { name: string, action: string } | null) => {
      const musicInfo = rightClickMusicInfo.value
      isShowMusicMenu.value = false
      if (!item || !musicInfo) return
      switch (item.action) {
        case 'play':
          await playLocalMusic(musicInfo)
          break
        case 'addTo':
          selectedAddMusicInfos.value = [musicInfo]
          isMusicAddVisible.value = true
          break
        case 'detail':
          await handleShowMusicDetail(musicInfo)
          break
        case 'remove': {
          const playlistPath = localMusic.state.value.currentPlaylist
          if (!playlistPath) return
          if (!await dialog.confirm(`确认从当前播放列表中移除「${musicInfo.name}」？`)) return
          const updatedList = await localMusic.removeMusicsFromPlaylist(playlistPath, [musicInfo])
          if (updatedList && playMusicInfo.listId === LOCAL_MUSIC_QUEUE_ID && activeLocalQueueKey.value === `playlist:${playlistPath}`) {
            await syncLocalQueue(updatedList)
          }
          break
        }
      }
    }

    const handleShowSelectedMusicAddModal = () => {
      if (!canAddSelectedMusics.value) return
      selectedAddMusicInfos.value = selectedMusicInfos.value
      isMusicAddVisible.value = true
    }

    const handleRemoveSelectedMusics = async() => {
      const playlistPath = localMusic.state.value.currentPlaylist
      if (!playlistPath || !selectedMusicInfos.value.length) return
      if (!await dialog.confirm(`确认从当前播放列表中移除已选的${selectedMusicInfos.value.length}首歌曲？`)) return
      const updatedList = await localMusic.removeMusicsFromPlaylist(playlistPath, selectedMusicInfos.value)
      if (!updatedList) return
      handleClearSelectedMusics()
      if (playMusicInfo.listId === LOCAL_MUSIC_QUEUE_ID && activeLocalQueueKey.value === `playlist:${playlistPath}`) {
        await syncLocalQueue(updatedList)
      }
    }

    const handleStartCreatePlaylist = () => {
      playlistEditorMode.value = 'create'
      playlistEditorName.value = ''
      editingPlaylistPath.value = ''
      isPlaylistEditorVisible.value = true
    }

    const handleClosePlaylistEditor = () => {
      isPlaylistEditorVisible.value = false
      playlistEditorName.value = ''
      editingPlaylistPath.value = ''
    }

    const handleConfirmPlaylistEditor = async() => {
      if (playlistEditorMode.value === 'create') {
        const ok = await localMusic.createPlaylist(playlistEditorName.value)
        if (!ok) return
        handleClosePlaylistEditor()
        return
      }
      const playlistPath = editingPlaylistPath.value
      if (!playlistPath) return
      const newPath = await localMusic.renamePlaylist(playlistPath, playlistEditorName.value)
      if (!newPath) return
      if (activeLocalQueueKey.value === `playlist:${playlistPath}`) {
        activeLocalQueueKey.value = `playlist:${newPath}`
      }
      handleClosePlaylistEditor()
    }

    watch(isShowPlaylistMenu, val => {
      if (!val) rightClickPlaylistPath.value = ''
    })

    watch(() => localMusic.state.value.searchText, (searchText) => {
      if (searchInputText.value !== searchText) searchInputText.value = searchText
    }, { immediate: true })

    watch(visibleMusicPaths, (paths) => {
      setSelectedMusicPaths(selectedMusicPaths.value.filter(path => paths.includes(path)))
    }, { immediate: true })

    watch(isShowMusicMenu, val => {
      if (!val) rightClickMusicInfo.value = null
    })

    watch([isAllVisibleMusicSelected, isPartVisibleMusicSelected], () => {
      if (selectAllCheckboxRef.value) {
        selectAllCheckboxRef.value.indeterminate = isPartVisibleMusicSelected.value
      }
    }, { immediate: true })

    watch(isPlaylistEditorVisible, val => {
      if (!val) return
      void nextTick(() => {
        playlistEditorInputRef.value?.focus()
        playlistEditorInputRef.value?.select()
      })
    })

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
      selectAllCheckboxRef,
      isDirectoryPopoverVisible,
      selectedDirectory,
      currentDirectoryPath,
      currentPlayingMusicId,
      isMultiSelectEnabled,
      selectedMusicCount,
      isAllVisibleMusicSelected,
      canAddSelectedMusics,
      canRemoveSelectedMusics,
      searchInputText,
      handleClearSearch,
      handleToggleMultiSelectMode,
      handleToggleSelectAll,
      handleToggleMusicSelection,
      handleClearSelectedMusics,
      handleShowSelectedMusicAddModal,
      handleRemoveSelectedMusics,
      isMusicSelected,
      noop: () => {},
      handleToggleDirectoryPopover,
      handleSelectDirectory,
      handleRemoveDirectory,
      handleRefreshDirectory,
      handleSearchBlur,
      playlistMenuLocation,
      isShowPlaylistMenu,
      playlistMenus,
      rightClickPlaylistPath,
      handlePlaylistContextMenu,
      handlePlaylistMenuClick,
      isPlaylistSourceEditorVisible,
      isPlaylistSourceLoading,
      isPlaylistSourceSaving,
      playlistSourcePath,
      playlistSourceText,
      playlistSourceInvalidFiles,
      playlistSourceError,
      handleClosePlaylistSourceEditor,
      handleReloadPlaylistSource,
      handleSavePlaylistSource,
      isQueueAllFilesActive,
      isQueuePlaylistActive,
      musicMenuLocation,
      isShowMusicMenu,
      musicMenus,
      rightClickMusicId,
      handleMusicContextMenu,
      handleMusicMenuClick,
      isPlaylistEditorVisible,
      playlistEditorTitle,
      playlistEditorPlaceholder,
      playlistEditorName,
      playlistEditorInputRef,
      editingPlaylistPath,
      handleStartCreatePlaylist,
      handleClosePlaylistEditor,
      handleConfirmPlaylistEditor,
      isMusicAddVisible,
      musicAddTitle,
      handleCloseMusicAddModal,
      handleAddMusicToPlaylist,
      isMusicDetailVisible,
      isMusicDetailLoading,
      musicDetailInfo,
      musicDetailError,
      musicDetailTitle,
      handleCloseMusicDetailModal,
      handlePlayMusic,
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
  min-width: 360px;
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

.sidebar {
  width: 15%;
  min-width: 200px;
  flex: 0 0 15%;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
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

.playlistCreateItem {
  padding: 8px 10px;
}

.playlistAddBtn {
  width: 100%;
  height: 28px;
  border-radius: 4px;
  border: 1px dashed var(--color-primary-background);
  background: transparent;
  color: var(--color-font-label);
  cursor: pointer;
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

  :global(.list-item) {
    height: 40px;
    flex: none;

    &.active {
      color: var(--color-button-font);
    }
  }
}

.content {
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
  box-sizing: border-box;
  font-size: 12px;
  &:hover {
    background: var(--color-primary-background-hover);
  }

  &.active {
    background: var(--color-primary-background);
  }

  &.selected {
    background: var(--color-primary-background-hover);
  }
}

.clicked {
  background: var(--color-primary-background-hover);
}

.num {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.playIcon {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-button-font);
  opacity: .7;
}

.checkboxCell {
  display: flex;
  align-items: center;
  justify-content: start;

  input[type="checkbox"] {
    margin-left: 0px;
  }
}

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
}

.playlistEditorPrimaryBtn {
  background: var(--color-primary-background-hover);
}

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

.musicAddModal {
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  min-height: 0;

  h2 {
    font-size: 13px;
    color: var(--color-font);
    line-height: 1.3;
    text-align: center;
    padding: 15px;
  }
}

.musicAddName {
  color: var(--color-primary);
}

.musicAddBtnContent {
  flex: auto;
  max-height: 100%;
  padding: 0 15px 15px;
  display: flex;
  flex-flow: row wrap;
  justify-content: space-evenly;
}

.musicAddBtn {
  box-sizing: border-box;
  margin-left: 15px;
  margin-bottom: 15px;
  min-width: 160px;
  height: 36px;
  padding: 0 10px;
  border-radius: @form-radius;
  border: 1px solid var(--color-primary-background);
  background: var(--color-background);
  color: var(--color-font);
  cursor: pointer;
  width: calc((100% / 3) - 15px);
  .mixin-ellipsis-1();

  &:hover {
    background: var(--color-primary-background-hover);
  }
}

.musicAddEmpty {
  padding: 0 15px 15px;
  text-align: center;
  color: var(--color-font-label);
}

.musicDetailModal {
  display: flex;
  flex-flow: column nowrap;
  min-height: 0;
  padding: 18px 20px 20px;
}

.musicDetailTitle {
  font-size: 18px;
  line-height: 1.3;
  text-align: center;
}

.musicDetailLoading,
.musicDetailEmpty {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
  font-size: 14px;
}

.musicDetailContent {
  margin-top: 12px;
  min-height: 0;
}

.musicDetailBody {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  min-height: 0;
}

.musicDetailLeft {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
  padding-right: 4px;
}

.musicDetailRight {
  flex: 0 0 280px;
  min-width: 240px;
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
  min-height: 0;
}

.musicDetailSection {
  padding: 10px 12px;
  border: 1px solid var(--color-primary-alpha-900);
  border-radius: 6px;
  background: var(--color-background);
}

.musicDetailSectionTitle {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: bold;
  color: var(--color-font);
}

.musicDetailCoverWrap {
  width: 100%;
}

.musicDetailCover,
.musicDetailCoverEmpty {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  border: 1px solid var(--color-primary-alpha-900);
  background: var(--color-primary-background-hover);
}

.musicDetailCover {
  display: block;
  object-fit: cover;
}

.musicDetailCoverEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
  font-size: 13px;
}

.musicDetailRows {
  min-width: 0;
}

.musicDetailRow {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--color-primary-alpha-900);
}

.musicDetailRow:last-child {
  border-bottom: 0;
}

.musicDetailRowLabel {
  flex: 0 0 76px;
  color: var(--color-font-label);
  font-size: 12px;
  line-height: 1.55;
}

.musicDetailRowValue {
  flex: 1;
  min-width: 0;
  color: var(--color-font);
  font-size: 12px;
  line-height: 1.55;
  text-align: right;
  white-space: pre-wrap;
  word-break: break-all;
}

.musicDetailLyricBlock {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
}

.musicDetailLyricTitle {
  margin-bottom: 6px;
  color: var(--color-font-label);
  font-size: 12px;
}

.musicDetailLyricPre {
  margin: 0;
  padding: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border-radius: 6px;
  background: var(--color-primary-background-hover);
  color: var(--color-font);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}
</style>
