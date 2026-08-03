import path from 'node:path'
import os from 'node:os'

const isMac = process.platform == 'darwin'
const isWin = process.platform == 'win32'

const defaultSetting: LX.AppSetting = {
  version: '2.1.0',

  'common.windowSizeId': 3,
  'common.fontSize': 16,
  'common.startInFullscreen': false,
  'common.langId': null,
  'common.apiSource': 'temp',
  'common.sourceNameType': 'alias',
  'common.font': '',
  'common.isShowAnimation': true,
  'common.randomAnimate': true,
  'common.isAgreePact': false,
  'common.controlBtnPosition': isMac ? 'left' : 'right',
  'common.playBarProgressStyle': 'mini',
  'common.transparentWindow': !isMac,
  'common.tryAutoUpdate': true,
  'common.showChangeLog': true,

  'player.startupAutoPlay': false,
  'player.togglePlayMethod': 'listLoop',
  'player.playQuality': '128k',
  'player.isShowTaskProgess': true,
  'player.isShowStatusBarLyric': false,
  'player.volume': 1,
  'player.powerSaveBlocker': true,
  'player.isMute': false,
  'player.playbackRate': 1,
  'player.preservesPitch': true,
  'player.isMaxOutputChannelCount': false,
  'player.mediaDeviceId': 'default',
  'player.isMediaDeviceRemovedStopPlay': false,
  'player.isShowLyricTranslation': false,
  'player.isShowLyricRoma': false,
  'player.isSwapLyricTranslationAndRoma': false,
  'player.isS2t': false,
  'player.isPlayLxlrc': !isMac,
  'player.isSavePlayTime': false,
  'player.audioVisualization': false,
  'player.waitPlayEndStop': true,
  'player.waitPlayEndStopTime': '',
  'player.autoSkipOnError': true,
  'player.isAutoCleanPlayedList': false,
  'player.soundEffect.convolution.fileName': '',
  'player.soundEffect.convolution.mainGain': 10,
  'player.soundEffect.convolution.sendGain': 0,
  'player.soundEffect.biquadFilter.hz31': 0,
  'player.soundEffect.biquadFilter.hz62': 0,
  'player.soundEffect.biquadFilter.hz125': 0,
  'player.soundEffect.biquadFilter.hz250': 0,
  'player.soundEffect.biquadFilter.hz500': 0,
  'player.soundEffect.biquadFilter.hz1000': 0,
  'player.soundEffect.biquadFilter.hz2000': 0,
  'player.soundEffect.biquadFilter.hz4000': 0,
  'player.soundEffect.biquadFilter.hz8000': 0,
  'player.soundEffect.biquadFilter.hz16000': 0,
  'player.soundEffect.panner.enable': false,
  'player.soundEffect.panner.soundR': 5,
  'player.soundEffect.panner.speed': 25,
  'player.soundEffect.pitchShifter.playbackRate': 1,

  'playDetail.isZoomActiveLrc': false,
  'playDetail.isShowLyricProgressSetting': false,
  'playDetail.style.fontSize': 140,
  'playDetail.style.align': 'center',
  'playDetail.isDelayScroll': true,

  'desktopLyric.enable': false,
  'desktopLyric.isLock': false,
  'desktopLyric.isAlwaysOnTop': false,
  'desktopLyric.isAlwaysOnTopLoop': false,
  'desktopLyric.isShowTaskbar': false,
  'desktopLyric.audioVisualization': false,
  'desktopLyric.fullscreenHide': true,
  'desktopLyric.pauseHide': true,
  'desktopLyric.width': 450,
  'desktopLyric.height': 300,
  'desktopLyric.x': null,
  'desktopLyric.y': null,
  'desktopLyric.isLockScreen': isWin,
  'desktopLyric.isDelayScroll': true,
  'desktopLyric.scrollAlign': 'center',
  'desktopLyric.isHoverHide': false,
  'desktopLyric.direction': 'horizontal',
  'desktopLyric.style.align': 'center',
  'desktopLyric.style.font': '',
  'desktopLyric.style.fontSize': 20,
  'desktopLyric.style.lineGap': 15,
  'desktopLyric.style.lyricUnplayColor': 'rgba(255, 255, 255, 1)',
  'desktopLyric.style.lyricPlayedColor': 'rgba(7, 197, 86, 1)',
  'desktopLyric.style.lyricShadowColor': 'rgba(0, 0, 0, 0.18)',
  // 'desktopLyric.style.fontWeight': false,
  'desktopLyric.style.opacity': 95,
  'desktopLyric.style.ellipsis': false,
  'desktopLyric.style.isZoomActiveLrc': false,
  'desktopLyric.style.isFontWeightFont': true,
  'desktopLyric.style.isFontWeightLine': true,
  'desktopLyric.style.isFontWeightExtended': true,

  'list.isClickPlayList': false,
  'list.isShowSource': true,
  'list.isSaveScrollLocation': true,
  'list.addMusicLocationType': 'top',
  'list.actionButtonsVisible': false,

  'download.enable': false,
  'download.isSavePathGroupByListName': false,
  'download.savePath': path.join(os.homedir(), 'Desktop'),
  'download.fileName': '歌手 - 歌名',
  'download.maxDownloadNum': 3,
  'download.skipExistFile': true,
  'download.isDownloadLrc': false,
  'download.isDownloadLxLrc': true,
  'download.isDownloadTLrc': false,
  'download.isDownloadRLrc': false,
  'download.lrcFormat': 'utf8',
  'download.isEmbedPic': true,
  'download.isEmbedLyric': false,
  'download.isEmbedLyricLx': true,
  'download.isEmbedLyricT': false,
  'download.isEmbedLyricR': false,
  'download.isUseOtherSource': false,

  'search.isShowHotSearch': false,
  'search.isShowHistorySearch': false,
  'search.isFocusSearchBox': false,

  'network.proxy.enable': false,
  'network.proxy.host': '',
  'network.proxy.port': '',

  'tray.enable': false,
  // 'tray.isToTray': false,
  'tray.themeId': 0,

  'sync.mode': 'server',
  'sync.enable': false,
  'sync.server.port': '23332',
  'sync.server.maxSsnapshotNum': 5,
  'sync.client.host': '',

  'openAPI.enable': false,
  'openAPI.port': '23330',
  'openAPI.bindLan': false,

  'ai.baseUrl': 'http://127.0.0.1:11434/v1',
  'ai.apiKey': '',
  'ai.model': 'qwen2.5:3b',
  'ai.systemPrompt': `你是一个专业的音乐数据分析专家。请根据提供的歌曲元信息和歌词，提取并生成多个精准的标签，要求如下：
·尽量用中文，除非一些使用率比较高的英文或字母组合，比如Live、KTV、K歌；
·如果是人唱的歌曲，用地域+类型组合定义歌手的属性，比如港台男歌手、欧美女歌手、大陆乐队组合、日本男歌手、韩国乐队组合；
·如果是人唱的歌曲，分析歌曲的语种，比如国语、粤语、闽南语、英语、日语、韩语；
·如果是纯音乐，分析音乐的主要乐器名称（比如钢琴、洞箫、笛子、二胡）和音乐的演奏者（比如钢琴独奏、吉他指弹、交响乐团、大提琴协奏）；
·如果这首歌曲是翻唱的要加入标签"翻唱"，乐器演绎的纯音乐不在此分析范围；
·分析歌手的声音特点，不是做单纯分类，需要公认的特点才加入该标签，比如女高音、男低音、男中音、女中音、烟熏嗓、低音炮、沙哑、磁性、低沉、破音、粗狂、反串；
·分析歌曲的流派、曲风或类型，可以多个，比如流行、民谣、民乐、摇滚、慢摇、古风、中国风、布鲁斯、爵士、说唱、弹唱、电音（与流行互斥）、纯音乐、儿歌、男女合唱、校园民谣、怀旧经典（与纯音乐互斥，2000年以前的歌曲）、粤语经典（与纯音乐互斥）、新歌速递（限2025年以后）、热门排行（限2025年以后）、红色经典；
·查询歌曲的来源或出处类型，比如电影配乐、游戏配乐、电视配乐、奥斯卡金曲、抖音热门、演唱会、Live、Remix、综艺、动漫、网络歌曲；
·分析歌名和歌词表达的主题，比如初恋、失恋、爱情、友情、亲情、兄弟情深、友谊万岁、和平、草原、高原、武侠、禅意；
·分析歌曲旋律表达的情绪和意境，比如阳光、明亮、平静、安静、悲伤、搞笑、喜悦、欢快、活泼、忧伤、激昂、舒缓、忧郁、轻快、沉重、空灵、神秘、温暖、冰冷、梦幻、慵懒、振奋、宁静、压抑、奔放、浪漫、沧桑、苍凉、治愈、热血、煽情、史诗、宏大、大气；
·分析歌曲适合播放的场景、时间，比如早晨、清晨、夜晚、深夜、独处、酒馆、咖啡厅、广场、旅行、车载、茶室、健身、跳舞、瑜伽、蹦迪；
·查询歌曲关联的影视剧名、游戏名称、演唱会名称等信息的关键词；
·不要加入歌名和歌手信息；
·请按以上顺序分析和排序，返回标签数量最多30个；
·只输出 JSON：{"tags":["青春","励志"]}`,
  'ai.tag.maxCount': 30,
  'ai.tag.mergeMode': 'replace',

  // 'theme.id': 'blue_plus',
  'theme.id': 'green',
  'theme.lightId': 'green',
  'theme.darkId': 'black',

  'odc.isAutoClearSearchInput': false,
  'odc.isAutoClearSearchList': false,

}


// 使用新年皮肤
if (new Date().getMonth() < 2) {
  defaultSetting['theme.id'] = 'happy_new_year'
  defaultSetting['desktopLyric.style.lyricPlayedColor'] = 'rgba(255, 57, 71, 1)'
}


export default defaultSetting

