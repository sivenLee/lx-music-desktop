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
  }
}

