const fs = require('fs')
const fsPromises = fs.promises
const path = require('path')
const getImgSize = require('image-size')
const download = require('./downloader')
const removeApeTags = require('./removeApeTags')

const FlacProcessor = require('./flac-metadata/index')

const extReg = /^(\.(?:jpe?g|png)).*$/
const vendor = 'reference libFLAC 1.2.1 20070917'

const buildVorbisMeta = (meta) => {
  const comments = {}
  const set = (key, value) => {
    if (value == null) return
    const text = `${value}`.trim()
    if (!text) return
    comments[key] = text
  }
  set('TITLE', meta.title)
  set('ARTIST', meta.artist)
  set('ALBUM', meta.album)
  set('DATE', meta.year)
  set('TRACKNUMBER', meta.track)
  set('DISCNUMBER', meta.disc)
  set('GENRE', meta.genre)
  set('LANGUAGE', meta.language)
  set('COMMENT', meta.comment)
  set('LYRICS', meta.lyrics)
  set('CUSTOM_TAGS', meta.CUSTOM_TAGS)
  return comments
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
  let picPath = filePath.replace(/\.flac$/i, '') + (ext ? ext.replace(extReg, '$1') : '.jpg')
  let picUrl = apic
  if (picUrl.includes('music.126.net')) picUrl += `${picUrl.includes('?') ? '&' : '?'}param=500y500`
  const success = await download(picUrl, picPath)
  return success ? picPath : null
}

const writeMeta = async(filePath, meta, picPath) => {
  const comments = Object.keys(meta).map(key => `${key.toUpperCase()}=${meta[key] || ''}`)
  const data = {
    vorbis: {
      vendor,
      comments,
    },
  }
  if (picPath) {
    const apicData = await fsPromises.readFile(picPath)
    let imgSize = getImgSize(apicData)
    let mime_type
    let bitsPerPixel
    if (apicData[0] == 0xff && apicData[1] == 0xd8 && apicData[2] == 0xff) {
      mime_type = 'image/jpeg'
      bitsPerPixel = 24
    } else {
      mime_type = 'image/png'
      bitsPerPixel = 32
    }
    data.picture = {
      pictureType: 3,
      mimeType: mime_type,
      description: '',
      width: imgSize.width,
      height: imgSize.height,
      bitsPerPixel,
      colors: 0,
      pictureData: apicData,
    }
  }

  const reader = fs.createReadStream(filePath)
  const tempPath = filePath + '.lxmtemp'
  const writer = fs.createWriteStream(tempPath)
  const flacProcessor = new FlacProcessor()
  flacProcessor.writeMeta(data)

  await new Promise((resolve, reject) => {
    const onError = (err) => {
      reject(err)
    }
    reader.on('error', onError)
    writer.on('error', onError)
    flacProcessor.on('error', onError)
    reader.pipe(flacProcessor).pipe(writer).on('finish', () => {
      fs.unlink(filePath, err => {
        if (err) return reject(err)
        fs.rename(tempPath, filePath, err => {
          if (err) reject(err)
          else resolve()
        })
      })
    })
  })
}

module.exports = async(filePath, meta, proxy) => {
  const payload = { ...meta }
  const apic = payload.APIC
  delete payload.APIC
  const vorbisMeta = buildVorbisMeta(payload)

  if (!apic) {
    await writeMeta(filePath, vorbisMeta)
    await removeApeTags(filePath)
    return
  }

  const picPath = await resolveCoverPath(filePath, apic)
  const isTempCover = picPath && (
    picPath.startsWith(`${filePath}.lxcover`) ||
    /^https?:\/\//i.test(apic)
  )
  try {
    await writeMeta(filePath, vorbisMeta, picPath || undefined)
    await removeApeTags(filePath)
  } finally {
    if (isTempCover && picPath) {
      fs.unlink(picPath, err => {
        if (err) console.log(err.message)
      })
    }
  }
}
