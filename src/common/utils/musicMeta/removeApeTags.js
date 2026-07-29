const fs = require('fs')
const fsPromises = fs.promises

/**
 * 移除音频文件中的 APEv2 标签。
 * music-metadata 对 common 字段优先采用 APEv2，会盖住 ID3v2 / Vorbis 中新写入的值。
 */
module.exports = async(filePath) => {
  const buf = await fsPromises.readFile(filePath)
  const size = buf.length
  if (size < 32) return

  let searchEnd = size
  const hasId3v1 = size >= 128 && buf.toString('ascii', size - 128, size - 125) === 'TAG'
  if (hasId3v1) searchEnd = size - 128

  // 从后往前找 APE footer（bit29 表示 header，footer 该位为 0）
  let footerPos = -1
  for (let i = searchEnd - 32; i >= 0; i--) {
    if (buf.toString('ascii', i, i + 8) !== 'APETAGEX') continue
    const flags = buf.readUInt32LE(i + 20)
    const isHeader = (flags & 0x20000000) !== 0
    if (isHeader) continue
    footerPos = i
    break
  }
  if (footerPos < 0) return

  const tagSize = buf.readUInt32LE(footerPos + 12)
  const flags = buf.readUInt32LE(footerPos + 20)
  const hasHeader = (flags & 0x80000000) !== 0
  const totalApeSize = tagSize + (hasHeader ? 32 : 0)
  const apeEnd = footerPos + 32
  const apeStart = apeEnd - totalApeSize
  if (apeStart < 0 || apeEnd > searchEnd || totalApeSize <= 0) return

  const next = Buffer.concat([
    buf.subarray(0, apeStart),
    buf.subarray(apeEnd, size),
  ])
  await fsPromises.writeFile(filePath, next)
}
