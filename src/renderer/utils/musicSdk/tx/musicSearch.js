import { httpFetch } from '../../request'
import { formatPlayTime, sizeFormate } from '../../index'
import { formatGenre, formatSingerName } from '../utils'
import { signRequest } from './utils'

const fetchSongExtraMeta = async(songmid) => {
  if (!songmid) return { genre: '', language: '' }
  const requestObj = httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    method: 'post',
    headers: {
      Referer: 'https://y.qq.com',
      'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
    },
    body: {
      comm: {
        ct: '19',
        cv: '1859',
        uin: '0',
      },
      req: {
        module: 'music.pf_song_detail_svr',
        method: 'get_song_detail_yqq',
        param: {
          song_type: 0,
          song_mid: songmid,
        },
      },
    },
  })
  const { body } = await requestObj.promise
  if (body?.code != 0 || body?.req?.code != 0) return { genre: '', language: '' }
  const info = body.req?.data?.info
  return {
    genre: formatGenre(info?.genre?.content, body.req?.data?.track_info?.label),
    language: formatGenre(info?.lan?.content),
  }
}

export default {
  limit: 50,
  total: 0,
  page: 0,
  allPage: 1,
  successCode: 0,
  musicSearch(str, page, limit, retryNum = 0) {
    if (retryNum > 5) return Promise.reject(new Error('搜索失败'))
    const searchRequest = signRequest({
      comm: {
        ct: '11',
        cv: '14090508',
        v: '14090508',
        tmeAppID: 'qqmusic',
        phonetype: 'EBG-AN10',
        deviceScore: '553.47',
        devicelevel: '50',
        newdevicelevel: '20',
        rom: 'HuaWei/EMOTION/EmotionUI_14.2.0',
        os_ver: '12',
        OpenUDID: '0',
        OpenUDID2: '0',
        QIMEI36: '0',
        udid: '0',
        chid: '0',
        aid: '0',
        oaid: '0',
        taid: '0',
        tid: '0',
        wid: '0',
        uid: '0',
        sid: '0',
        modeSwitch: '6',
        teenMode: '0',
        ui_mode: '2',
        nettype: '1020',
        v4ip: '',
      },
      req: {
        module: 'music.search.SearchCgiService',
        method: 'DoSearchForQQMusicMobile',
        param: {
          search_type: 0,
          searchid: Math.random().toString().slice(2),
          query: str,
          page_num: page,
          num_per_page: limit,
          highlight: 0,
          nqc_flag: 0,
          multi_zhida: 0,
          cat: 2,
          grp: 1,
          sin: 0,
          sem: 0,
        },
      },
    })
    return searchRequest.then(({ body }) => {
      // console.log(body)
      if (!body || !body.req || body.code != this.successCode || body.req.code != this.successCode) {
        return this.musicSearch(str, page, limit, ++retryNum)
      }
      return body.req.data
    })
  },
  // randomInt(min, max) {
  //   return Math.floor(Math.random() * (max - min + 1)) + min
  // },
  // getSearchId() {
  //   const e = BigInt(this.randomInt(1, 20))
  //   const t = e * 18014398509481984n
  //   const n = BigInt(this.randomInt(0, 4194304)) * 4294967296n
  //   const a = BigInt(Date.now())
  //   const r = (a * 1000n) % (24n * 60n * 60n * 1000n)
  //   return String(t + n + r)
  // },
  handleResult(rawList) {
    // console.log(rawList)
    if (!rawList || !Array.isArray(rawList)) return []
    const list = []
    rawList.forEach(item => {
      if (!item.file?.media_mid) return

      let types = []
      let _types = {}
      const file = item.file
      if (file.size_128mp3 != 0) {
        let size = sizeFormate(file.size_128mp3)
        types.push({ type: '128k', size })
        _types['128k'] = {
          size,
        }
      }
      if (file.size_320mp3 !== 0) {
        let size = sizeFormate(file.size_320mp3)
        types.push({ type: '320k', size })
        _types['320k'] = {
          size,
        }
      }
      if (file.size_flac !== 0) {
        let size = sizeFormate(file.size_flac)
        types.push({ type: 'flac', size })
        _types.flac = {
          size,
        }
      }
      if (file.size_hires !== 0) {
        let size = sizeFormate(file.size_hires)
        types.push({ type: 'flac24bit', size })
        _types.flac24bit = {
          size,
        }
      }
      // types.reverse()
      let albumId = ''
      let albumName = ''
      if (item.album) {
        albumName = item.album.name
        albumId = item.album.mid
      }
      list.push({
        singer: formatSingerName(item.singer, 'name'),
        // name: item.name + (item.title_extra ?? ''),
        name: item.title,
        albumName,
        albumId,
        source: 'tx',
        interval: formatPlayTime(item.interval),
        songId: item.id,
        albumMid: item.album?.mid ?? '',
        strMediaMid: item.file.media_mid,
        songmid: item.mid,
        img: (albumId === '' || albumId === '空')
          ? item.singer?.length ? `https://y.gtimg.cn/music/photo_new/T001R500x500M000${item.singer[0].mid}.jpg` : ''
          : `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumId}.jpg`,
        year: `${item.time_public || item.album?.time_public || ''}`.slice(0, 4),
        track: item.index_album > 0 ? `${item.index_album}` : '',
        // QQ 的 index_cd 从 0 起，展示为碟号时 +1
        disc: item.index_cd == null || item.index_cd === '' ? '' : `${Number(item.index_cd) + 1}`,
        genre: formatGenre(item.genre, item.label, item.album?.genre),
        language: formatGenre(item.lan, item.language, item.album?.lan),
        types,
        _types,
        typeUrl: {},
      })
    })
    // console.log(list)
    return list
  },
  async attachExtraMeta(list) {
    if (!Array.isArray(list) || !list.length) return list
    await Promise.all(list.map(async(item) => {
      if (item.genre && item.language) return
      try {
        const { genre, language } = await fetchSongExtraMeta(item.songmid)
        if (!item.genre && genre) item.genre = genre
        if (!item.language && language) item.language = language
      } catch (err) {
        console.log(err)
      }
    }))
    return list
  },
  async search(str, page = 1, limit) {
    if (limit == null) limit = this.limit
    const { body, meta } = await this.musicSearch(str, page, limit)
    const list = await this.attachExtraMeta(this.handleResult(body.item_song))

    this.total = meta.estimate_sum
    this.page = page
    this.allPage = Math.ceil(this.total / limit)

    return {
      list,
      allPage: this.allPage,
      limit,
      total: this.total,
      source: 'tx',
    }
  },
}
