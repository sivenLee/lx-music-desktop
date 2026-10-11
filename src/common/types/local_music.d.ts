// 本地音乐管理类型定义

declare namespace LX {
  namespace LocalMusic {
    // 本地目录信息
    interface LocalMusicDirectory {
      id: string
      path: string
      name: string
    }

    // 本地音乐文件信息
    interface LocalMusicFile {
      id: string
      name: string
      path: string
      ext: string
      artist?: string
      album?: string
      duration?: number
    }

    // 本地播放列表
    interface LocalPlaylist {
      id: string
      name: string
      path: string
      musicFiles: LocalMusicFile[]
    }

    interface LocalMusicViewState {
      currentDirectoryId: string | null
      currentPlaylistPath: string | null
    }

    interface LocalMusicDirectoryConfig {
      currentPlaylistPath: string | null
      selectedColumnKeys: string[]
      sortState: {
        key: string | null
        order: 'asc' | 'desc'
      }
      /** 本地快捷搜索参与字段（仅影响关键词搜索，按目录持久化） */
      keywordSearchFields?: string[]
    }

    interface SaveAsSourceInfo {
      sampleRate: number
      bitsPerSample: number | null
      bitrateKbps: number | null
      codec: string
      container: string
      channels: number | null
      lossless: boolean | null
    }

    interface SaveAsEncodeOptions {
      sampleRate: number
      flacBitDepth: 0 | 16 | 24
      flacCompressionLevel: number
      mp3BitrateKbps: number
      preserveMetadata: boolean
      preserveLyrics: boolean
    }
  }
}
