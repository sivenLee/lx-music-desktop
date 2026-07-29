export interface MusicMeta {
  title: string
  artist: string | null
  album: string | null
  APIC: string | null
  lyrics: string | null
  year?: string | null
  track?: string | null
  disc?: string | null
  genre?: string | null
  language?: string | null
  comment?: string | null
  CUSTOM_TAGS?: string | null
}
export function setMeta(filePath: string, meta: MusicMeta, proxy?: { host: string, port: number }): Promise<void>
