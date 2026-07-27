import { ref, computed, watch, type ComputedRef, type Ref } from '@common/utils/vueTools'
import type { useLocalMusic } from './useLocalMusic'

export interface UseMultiSelectOptions {
  sortedMusicFiles: ComputedRef<LX.Music.MusicInfoLocal[]>
  localMusic: ReturnType<typeof useLocalMusic>
  getSelectAllCheckboxElement: () => HTMLInputElement | null
  isMultiSelectEnabled: Ref<boolean>
}

export function useMultiSelect({
  sortedMusicFiles,
  localMusic,
  getSelectAllCheckboxElement,
  isMultiSelectEnabled,
}: UseMultiSelectOptions) {
  const selectedMusicPaths = ref<string[]>([])

  const visibleMusicPaths = computed(() => sortedMusicFiles.value.map(musicInfo => musicInfo.meta.filePath))
  const selectedMusicCount = computed(() => selectedMusicPaths.value.length)
  const selectedMusicInfos = computed(() => sortedMusicFiles.value.filter(musicInfo => {
    return selectedMusicPaths.value.includes(musicInfo.meta.filePath)
  }))
  const isAllVisibleMusicSelected = computed(() => {
    return visibleMusicPaths.value.length > 0 && visibleMusicPaths.value.every(path => selectedMusicPaths.value.includes(path))
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

  const setSelectedMusicPaths = (paths: string[]) => {
    selectedMusicPaths.value = [...new Set(paths)]
  }

  const isMusicSelected = (musicInfo: LX.Music.MusicInfoLocal) => {
    return selectedMusicPaths.value.includes(musicInfo.meta.filePath)
  }

  const handleClearSelectedMusics = () => {
    setSelectedMusicPaths([])
  }

  const handleToggleMultiSelectMode = () => {
    isMultiSelectEnabled.value = !isMultiSelectEnabled.value
    if (!isMultiSelectEnabled.value) handleClearSelectedMusics()
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

  watch(visibleMusicPaths, (paths) => {
    setSelectedMusicPaths(selectedMusicPaths.value.filter(path => paths.includes(path)))
  }, { immediate: true })

  watch([isAllVisibleMusicSelected, isPartVisibleMusicSelected], () => {
    const checkbox = getSelectAllCheckboxElement()
    if (checkbox) {
      checkbox.indeterminate = isPartVisibleMusicSelected.value
    }
  }, { immediate: true })

  return {
    isMultiSelectEnabled,
    selectedMusicPaths,
    selectedMusicCount,
    selectedMusicInfos,
    isAllVisibleMusicSelected,
    isPartVisibleMusicSelected,
    canAddSelectedMusics,
    canRemoveSelectedMusics,
    isMusicSelected,
    handleToggleMultiSelectMode,
    handleToggleMusicSelection,
    handleToggleSelectAll,
    handleClearSelectedMusics,
  }
}
