import Sortable from '@renderer/utils/sortable'
import { onBeforeUnmount, onMounted, watch, nextTick } from '@common/utils/vueTools'

const PLAYLIST_SORT_HANDLE_CLASS = 'local-playlist-sort-handle'

const isSamePlaylistOrder = (left, right) => {
  return left.length === right.length && left.every((path, index) => path === right[index])
}

const reorderByIndex = (playlistFiles, oldIndex, newIndex) => {
  if (oldIndex == null || newIndex == null || oldIndex === newIndex) return null
  const current = [...playlistFiles]
  if (
    oldIndex < 0 ||
    newIndex < 0 ||
    oldIndex >= current.length ||
    newIndex >= current.length
  ) {
    return null
  }
  const [moved] = current.splice(oldIndex, 1)
  if (!moved) return null
  current.splice(newIndex, 0, moved)
  return current
}

export default ({
  dom_list,
  ghostClassName,
  getPlaylistFiles,
  onReorder,
  getWatchKey = () => '',
}) => {
  let sortable
  let didPersist = false

  const persistPlaylistOrder = (oldIndex, newIndex) => {
    const current = getPlaylistFiles()
    const reordered = reorderByIndex(current, oldIndex, newIndex)
    if (!reordered || isSamePlaylistOrder(reordered, current)) return
    didPersist = true
    onReorder(reordered)
  }

  const init = () => {
    if (!dom_list.value) return
    sortable?.destroy()
    sortable = Sortable.create(dom_list.value, {
      animation: 150,
      handle: `.${PLAYLIST_SORT_HANDLE_CLASS}`,
      forceFallback: true,
      fallbackTolerance: 5,
      fallbackOnBody: true,
      ghostClass: ghostClassName,
      dragClass: ghostClassName,
      onStart() {
        didPersist = false
        window.app_event.dragStart()
      },
      onUpdate(event) {
        persistPlaylistOrder(event.oldIndex, event.newIndex)
      },
      onEnd(event) {
        window.app_event.dragEnd()
        if (!didPersist) {
          persistPlaylistOrder(event.oldIndex, event.newIndex)
        }
      },
    })
  }

  onMounted(() => {
    nextTick(() => {
      init()
    })
  })

  onBeforeUnmount(() => {
    sortable?.destroy()
    sortable = null
  })

  watch(
    () => [getPlaylistFiles().length, getWatchKey()],
    () => {
      nextTick(() => {
        init()
      })
    },
  )

  return {
    refresh: init,
  }
}

export {
  PLAYLIST_SORT_HANDLE_CLASS,
}
