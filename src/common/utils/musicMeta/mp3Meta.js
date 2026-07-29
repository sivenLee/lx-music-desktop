const NodeID3 = require('node-id3')
const path = require('path')
const fs = require('fs')
const fsPromises = fs.promises
const download = require('./downloader')
const removeApeTags = require('./removeApeTags')
const extReg = /^(\.(?:jpe?g|png)).*$/

const buildId3Meta = (meta) => {
  const id3 = {
    title: meta.title ?? '',
    artist: meta.artist ?? '',
    album: meta.album ?? '',
  }
  if (meta.year != null && `${meta.year}`.trim() !== '') id3.year = `${meta.year}`.trim()
  if (meta.track != null && `${meta.track}`.trim() !== '') id3.trackNumber = `${meta.track}`.trim()
  if (meta.disc != null && `${meta.disc}`.trim() !== '') id3.partOfSet = `${meta.disc}`.trim()
  if (meta.genre != null && `${meta.genre}`.trim() !== '') id3.genre = `${meta.genre}`.trim()
  if (meta.language != null && `${meta.language}`.trim() !== '') id3.language = `${meta.language}`.trim()
  if (meta.comment != null && `${meta.comment}`.trim() !== '') {
    id3.comment = {
      language: 'zho',
      text: `${meta.comment}`,
    }
  }
  if (meta.lyrics != null && `${meta.lyrics}`.trim() !== '') {
    id3.unsynchronisedLyrics = {
      language: 'zho',
      text: `${meta.lyrics}`,
    }
  }
  if (meta.CUSTOM_TAGS != null && `${meta.CUSTOM_TAGS}`.trim() !== '') {
    id3.userDefinedText = [{
      description: 'CUSTOM_TAGS',
      value: `${meta.CUSTOM_TAGS}`,
    }]
  }
  return id3
}

const writeDataUrlToTemp = async(filePath, dataUrl) => {
  const matched = /^data:(image\/(?:jpeg|jpg|png));base64,(.+)$/i.exec(dataUrl)
  if (!matched) return null
  const mime = matched[1].toLowerCase()
  const ext = mime.includes('png') ? '.png' : '.jpg'
  const picPath = `${filePath}.lxcover${ext}`
  await fsPromises.writeFile(picPath, Buffer.from(matched[2], 'base64'))
  return picPath
}

const resolveCoverPath = async(filePath, apic) => {
  if (!apic) return null
  if (/^data:image\//i.test(apic)) return writeDataUrlToTemp(filePath, apic)
  if (!/^https?:\/\//i.test(apic)) {
    try {
      await fsPromises.access(apic)
      return apic
    } catch {
      return null
    }
  }
  let ext = path.extname(apic.split('?')[0] || '')
  let picPath = filePath.replace(/\.mp3$/i, '') + (ext ? ext.replace(extReg, '$1') : '.jpg')
  let picUrl = apic
  if (picUrl.includes('music.126.net')) picUrl += `${picUrl.includes('?') ? '&' : '?'}param=500y500`
  const success = await download(picUrl, picPath)
  return success ? picPath : null
}

const handleWriteMeta = (meta, filePath) => {
  const id3 = buildId3Meta(meta)
  if (meta.APIC) id3.APIC = meta.APIC
  NodeID3.write(id3, filePath)
}

module.exports = async(filePath, meta, proxy) => {
  const payload = { ...meta }
  const apic = payload.APIC
  delete payload.APIC

  if (!apic) {
    handleWriteMeta(payload, filePath)
    await removeApeTags(filePath)
    return
  }

  const picPath = await resolveCoverPath(filePath, apic)
  const isTempCover = picPath && (
    picPath.startsWith(`${filePath}.lxcover`) ||
    /^https?:\/\//i.test(apic)
  )
  try {
    if (picPath) {
      handleWriteMeta({ ...payload, APIC: picPath }, filePath)
    } else {
      handleWriteMeta(payload, filePath)
    }
    await removeApeTags(filePath)
  } finally {
    if (isTempCover && picPath) {
      fs.unlink(picPath, err => {
        if (err) console.log(err.message)
      })
    }
  }
}
