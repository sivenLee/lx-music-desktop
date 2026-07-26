import type { Ref } from 'vue'

declare function usePlaylistSort(options: {
  dom_list: Ref<HTMLElement | null>
  ghostClassName: string
  getPlaylistFiles: () => string[]
  onReorder: (playlistFiles: string[]) => void | Promise<void>
  getWatchKey?: () => string | null | undefined
}): {
  refresh: () => void
}

export default usePlaylistSort

export const PLAYLIST_SORT_HANDLE_CLASS: string
