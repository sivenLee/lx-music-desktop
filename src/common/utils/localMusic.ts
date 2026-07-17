import fs from 'node:fs'
import path from 'node:path'
import { toMD5, checkPath, getFileStats } from './nodejs'

// 支持的音乐文件格式
export const MUSIC_EXTENSIONS = new Set([
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.ape', '.dsf', '.dff',
])

// 支持的播放列表格式
export const PLAYLIST_EXTENSIONS = new Set([
  '.m3u', '.m3u8',
])

// 生成唯一 ID
export const generateId = (pathStr: string): string => {
  return toMD5(pathStr)
}

// 判断是否是音乐文件
export const isMusicFile = (filePath: string): boolean => {
  const ext = path.extname(filePath).toLowerCase()
  return MUSIC_EXTENSIONS.has(ext)
}

// 判断是否是播放列表文件
export const isPlaylistFile = (filePath: string): boolean => {
  const ext = path.extname(filePath).toLowerCase()
  return PLAYLIST_EXTENSIONS.has(ext)
}

// 遍历目录（最多两层）
export const scanDirectory = async(
  dirPath: string,
  maxDepth: number = 2,
): Promise<{
  musicFiles: string[]
  playlistFiles: string[]
}> => {
  const musicFiles: string[] = []
  const playlistFiles: string[] = []

  const scan = async(currentPath: string, depth: number = 0): Promise<void> => {
    if (depth > maxDepth) return

    try {
      const files = await fs.promises.readdir(currentPath)
      for (const file of files) {
        const fullPath = path.join(currentPath, file)
        const stats = await getFileStats(fullPath)
        if (!stats) continue

        if (stats.isDirectory()) {
          await scan(fullPath, depth + 1)
        } else if (stats.isFile()) {
          if (isMusicFile(fullPath)) {
            musicFiles.push(fullPath)
          } else if (isPlaylistFile(fullPath)) {
            playlistFiles.push(fullPath)
          }
        }
      }
    } catch (err) {
      console.error(`扫描目录失败 ${currentPath}:`, err)
    }
  }

  await scan(dirPath, 0)

  return { musicFiles, playlistFiles }
}

// 解析 .m3u/.m3u8 播放列表文件
export const parseM3UPlaylist = async(
  playlistPath: string,
): Promise<string[]> => {
  const content = await fs.promises.readFile(playlistPath, 'utf8')
  const lines = content.split(/\r?\n/).map(line => line.trim())
  const musicFilePaths: string[] = []

  const dirPath = path.dirname(playlistPath)
  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      const filePath = path.isAbsolute(line) ? line : path.join(dirPath, line)
      if (await checkPath(filePath) && isMusicFile(filePath)) {
        musicFilePaths.push(filePath)
      }
    }
  }

  return musicFilePaths
}

