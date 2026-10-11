import { ref, computed, watch, reactive, nextTick, type Ref, type ComputedRef } from '@common/utils/vueTools'
import { debounce } from '@common/utils'
import { scrollTo } from '@common/utils/renderer'
import type { useLocalMusic } from './useLocalMusic'
import {
  LOCAL_MUSIC_COLUMNS,
  DEFAULT_VISIBLE_COLUMN_KEYS,
  LOCAL_MUSIC_HEADER_HEIGHT,
  LOCAL_MUSIC_ROW_HEIGHT,
  LOCAL_MUSIC_OVERSCAN,
  SELECTABLE_COLUMNS,
  normalizeSelectedColumnKeys,
  normalizeSortState,
  getMusicSortValue,
  getColumnStyle as getColumnStyleHelper,
  getColumnSortMark as getColumnSortMarkHelper,
  type LocalMusicColumnKey,
  type LocalMusicColumnDefinition,
  type SortOrder,
} from './localMusicColumns'
import { isLocalMusicDirectoryConfigEqual } from '@common/utils/localMusic'

export interface UseMusicTableOptions {
  filteredMusicFiles: ComputedRef<LX.Music.MusicInfoLocal[]>
  localMusic: ReturnType<typeof useLocalMusic>
  isMultiSelectEnabled: Ref<boolean>
  getMusicTableElement: () => HTMLElement | null
}

export function useMusicTable({
  filteredMusicFiles,
  localMusic,
  isMultiSelectEnabled,
  getMusicTableElement,
}: UseMusicTableOptions) {
  const isApplyingDirectoryConfig = ref(false)
  const selectedMusicColumnKeys = ref<LocalMusicColumnKey[]>([...DEFAULT_VISIBLE_COLUMN_KEYS])
  const isMusicColumnMenuVisible = ref(false)
  const musicColumnMenuLocation = reactive({ x: 0, y: 0 })
  const sortState = ref<{
    key: LocalMusicColumnKey | null
    order: SortOrder
  }>({
    key: null,
    order: 'asc',
  })
  const musicTableScrollTop = ref(0)
  const musicTableViewportHeight = ref(0)

  const selectedDirectory = computed(() => localMusic.state.value.currentDirectory)

  const selectableColumns = computed(() => SELECTABLE_COLUMNS)

  const visibleColumns = computed(() => {
    return LOCAL_MUSIC_COLUMNS.filter(column => {
      if (column.key === 'select') return isMultiSelectEnabled.value
      return column.fixed != null || selectedMusicColumnKeys.value.includes(column.key)
    })
  })

  const totalColumnWidth = computed(() => visibleColumns.value.reduce((total, column) => total + column.width, 0))

  const sortMusicFiles = (musicFiles: LX.Music.MusicInfoLocal[]) => {
    const list = [...musicFiles]
    const { key, order } = sortState.value
    if (!key) return list
    return list.sort((left, right) => {
      const leftValue = getMusicSortValue(left, key)
      const rightValue = getMusicSortValue(right, key)
      if (typeof leftValue == 'number' && typeof rightValue == 'number') {
        return order === 'asc' ? leftValue - rightValue : rightValue - leftValue
      }
      const result = `${leftValue}`.localeCompare(`${rightValue}`, 'zh-Hans-CN', {
        numeric: true,
        sensitivity: 'base',
      })
      return order === 'asc' ? result : -result
    })
  }

  const sortedMusicFiles = computed(() => sortMusicFiles(filteredMusicFiles.value))

  const getEffectiveBodyViewportHeight = (rawViewportHeight: number) => {
    const bodyHeight = Math.max(rawViewportHeight - LOCAL_MUSIC_HEADER_HEIGHT, 0)
    if (bodyHeight > 0) return bodyHeight
    // 表格未挂载或布局尚未完成时 clientHeight 可能为 0，避免虚拟列表只渲染 overscan 行
    return Math.max(window.innerHeight * 0.55, LOCAL_MUSIC_ROW_HEIGHT * 24)
  }

  const visibleRange = computed(() => {
    const total = sortedMusicFiles.value.length
    if (!total) return { start: 0, end: 0 }
    const bodyScrollTop = Math.max(musicTableScrollTop.value - LOCAL_MUSIC_HEADER_HEIGHT, 0)
    const viewportHeight = getEffectiveBodyViewportHeight(musicTableViewportHeight.value)
    const maxStart = Math.max(total - 1, 0)
    const start = Math.min(
      Math.max(Math.floor(bodyScrollTop / LOCAL_MUSIC_ROW_HEIGHT) - LOCAL_MUSIC_OVERSCAN, 0),
      maxStart,
    )
    const end = Math.min(
      total,
      Math.max(
        start + 1,
        Math.ceil((bodyScrollTop + viewportHeight) / LOCAL_MUSIC_ROW_HEIGHT) + LOCAL_MUSIC_OVERSCAN,
      ),
    )
    return { start, end }
  })

  const virtualRows = computed(() => {
    const { start, end } = visibleRange.value
    return sortedMusicFiles.value.slice(start, end).map((item, offset) => {
      const index = start + offset
      return {
        item,
        index,
        top: index * LOCAL_MUSIC_ROW_HEIGHT,
      }
    })
  })

  const virtualBodyHeight = computed(() => `${sortedMusicFiles.value.length * LOCAL_MUSIC_ROW_HEIGHT}px`)

  const musicTableStyle = computed(() => ({
    width: `${totalColumnWidth.value}px`,
    minWidth: '100%',
  }))

  const musicColumnMenuStyle = computed(() => ({
    left: `${musicColumnMenuLocation.x}px`,
    top: `${musicColumnMenuLocation.y}px`,
  }))

  const isMusicColumnVisible = (key: LocalMusicColumnKey) => {
    return selectedMusicColumnKeys.value.includes(key)
  }

  const handleToggleMusicColumn = (key: LocalMusicColumnKey) => {
    if (!isMusicColumnVisible(key)) {
      selectedMusicColumnKeys.value = LOCAL_MUSIC_COLUMNS
        .filter(column => !column.fixed && (selectedMusicColumnKeys.value.includes(column.key) || column.key === key))
        .map(column => column.key)
      return
    }
    selectedMusicColumnKeys.value = selectedMusicColumnKeys.value.filter(columnKey => columnKey !== key)
    if (sortState.value.key === key) {
      sortState.value = {
        key: null,
        order: 'asc',
      }
    }
  }

  const handleMusicHeaderContextMenu = (event: MouseEvent) => {
    musicColumnMenuLocation.x = event.clientX
    musicColumnMenuLocation.y = event.clientY
    isMusicColumnMenuVisible.value = true
  }

  const handleToggleColumnSort = (column: LocalMusicColumnDefinition) => {
    if (!column.sortable) return
    if (sortState.value.key === column.key) {
      if (sortState.value.order === 'desc') {
        sortState.value.order = 'asc'
        return
      }
      sortState.value = {
        key: null,
        order: 'asc',
      }
      return
    }
    sortState.value = {
      key: column.key,
      order: 'desc',
    }
  }

  const getColumnStyle = (column: LocalMusicColumnDefinition) => {
    return getColumnStyleHelper(column, visibleColumns.value)
  }

  const getColumnSortMark = (key: LocalMusicColumnKey) => {
    return getColumnSortMarkHelper(key, sortState.value)
  }

  const updateMusicTableViewport = () => {
    musicTableViewportHeight.value = getMusicTableElement()?.clientHeight ?? 0
  }

  let musicTableResizeObserver: ResizeObserver | null = null
  let observedMusicTableElement: HTMLElement | null = null

  const disconnectMusicTableResizeObserver = () => {
    musicTableResizeObserver?.disconnect()
    musicTableResizeObserver = null
    observedMusicTableElement = null
  }

  const ensureMusicTableResizeObserver = () => {
    const tableElement = getMusicTableElement()
    if (!tableElement) {
      disconnectMusicTableResizeObserver()
      return
    }
    if (observedMusicTableElement === tableElement && musicTableResizeObserver) return
    disconnectMusicTableResizeObserver()
    observedMusicTableElement = tableElement
    musicTableResizeObserver = new ResizeObserver(() => {
      updateMusicTableViewport()
    })
    musicTableResizeObserver.observe(tableElement)
    updateMusicTableViewport()
  }

  // KeepAlive 重新挂载后 scrollTop 常被浏览器置 0，需用缓存值恢复，避免虚拟区间与视口错位导致空白
  const syncMusicTableScroll = () => {
    const tableElement = getMusicTableElement()
    if (!tableElement) {
      updateMusicTableViewport()
      return false
    }
    tableElement.scrollTop = musicTableScrollTop.value
    const height = tableElement.clientHeight
    if (height > 0) {
      musicTableViewportHeight.value = height
      return true
    }
    musicTableViewportHeight.value = 0
    return false
  }

  const refreshMusicTableLayout = () => {
    nextTick(() => {
      ensureMusicTableResizeObserver()
      if (syncMusicTableScroll()) return
      requestAnimationFrame(() => {
        ensureMusicTableResizeObserver()
        if (syncMusicTableScroll()) return
        nextTick(() => {
          ensureMusicTableResizeObserver()
          syncMusicTableScroll()
        }).catch(() => {})
      })
    }).catch(() => {})
  }

  const resetMusicTableScroll = () => {
    musicTableScrollTop.value = 0
    const tableElement = getMusicTableElement()
    if (tableElement) tableElement.scrollTop = 0
    refreshMusicTableLayout()
  }

  const handleMusicTableScroll = (event: Event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    musicTableScrollTop.value = target.scrollTop
    updateMusicTableViewport()
  }

  const scrollToMusicIndex = (index: number, animate = true) => {
    const tableElement = getMusicTableElement()
    if (!tableElement || index < 0) return
    updateMusicTableViewport()
    const viewportBody = Math.max(musicTableViewportHeight.value - LOCAL_MUSIC_HEADER_HEIGHT, 0)
    const rowTop = LOCAL_MUSIC_HEADER_HEIGHT + index * LOCAL_MUSIC_ROW_HEIGHT
    const targetScroll = Math.max(0, rowTop - viewportBody * 0.38)
    const applyScrollTop = (scrollTop: number) => {
      musicTableScrollTop.value = scrollTop
      updateMusicTableViewport()
    }
    if (!animate) {
      tableElement.scrollTop = targetScroll
      applyScrollTop(targetScroll)
      return
    }
    scrollTo(tableElement, targetScroll, 300, () => {
      applyScrollTop(tableElement.scrollTop)
    })
  }

  const buildPersistDirectoryConfig = (): LX.LocalMusic.LocalMusicDirectoryConfig => ({
    ...localMusic.state.value.directoryConfig,
    currentPlaylistPath: localMusic.state.value.currentPlaylist,
    selectedColumnKeys: [...selectedMusicColumnKeys.value],
    sortState: {
      key: sortState.value.key,
      order: sortState.value.order,
    },
  })

  const persistDirectoryConfig = debounce(() => {
    if (isApplyingDirectoryConfig.value || !selectedDirectory.value) return
    const nextConfig = buildPersistDirectoryConfig()
    if (isLocalMusicDirectoryConfigEqual(nextConfig, localMusic.state.value.directoryConfig)) return
    void localMusic.saveDirectoryConfig(nextConfig)
  }, 120)

  watch(() => localMusic.state.value.directoryConfig, (config) => {
    isApplyingDirectoryConfig.value = true
    selectedMusicColumnKeys.value = normalizeSelectedColumnKeys(config.selectedColumnKeys)
    sortState.value = normalizeSortState(config.sortState)
    nextTick(() => {
      refreshMusicTableLayout()
      isApplyingDirectoryConfig.value = false
    }).catch(() => {})
  }, { immediate: true, deep: true })

  watch([selectedMusicColumnKeys, sortState], () => {
    persistDirectoryConfig()
  }, { deep: true })

  watch([sortedMusicFiles, visibleColumns], () => {
    refreshMusicTableLayout()
  }, { deep: true })

  watch(() => localMusic.state.value.currentPlaylist, () => {
    resetMusicTableScroll()
  })

  watch(() => localMusic.state.value.currentDirectory?.id, () => {
    resetMusicTableScroll()
  })

  watch(() => localMusic.state.value.searchText, () => {
    resetMusicTableScroll()
  })

  const setupViewportListeners = () => {
    refreshMusicTableLayout()
    window.addEventListener('resize', updateMusicTableViewport)
  }

  const teardownViewportListeners = () => {
    window.removeEventListener('resize', updateMusicTableViewport)
    disconnectMusicTableResizeObserver()
  }

  return {
    selectedMusicColumnKeys,
    sortState,
    isMusicColumnMenuVisible,
    musicColumnMenuStyle,
    selectableColumns,
    visibleColumns,
    sortedMusicFiles,
    sortMusicFiles,
    virtualRows,
    virtualBodyHeight,
    musicTableStyle,
    isMusicColumnVisible,
    handleToggleMusicColumn,
    handleMusicHeaderContextMenu,
    handleToggleColumnSort,
    getColumnStyle,
    getColumnSortMark,
    handleMusicTableScroll,
    scrollToMusicIndex,
    resetMusicTableScroll,
    refreshMusicTableLayout,
    updateMusicTableViewport,
    setupViewportListeners,
    teardownViewportListeners,
  }
}
