<template>
  <material-modal :show="visible" movable width="900px" max-width="86%" max-height="82%" @close="handleClose">
    <main :class="$style.musicDetailModal">
      <h2 :class="$style.musicDetailTitle">{{ musicDetailTitle }}</h2>
      <div v-if="isLoading" :class="$style.musicDetailLoading">
        {{ $t('loading') }}...
      </div>
      <div v-else-if="error" :class="$style.musicDetailEmpty">
        {{ error }}
      </div>
      <div v-else-if="detailInfo" :class="$style.musicDetailBody">
        <div class="scroll" :class="$style.musicDetailLeft">
          <section :class="$style.musicDetailSection">
            <div :class="$style.musicDetailSectionTitle">文件信息</div>
            <div :class="$style.musicDetailRows">
              <div v-for="(detail, index) in detailInfo.fileInfo" :key="index" :class="$style.musicDetailRow">
                <div :class="$style.musicDetailRowLabel">{{ detail.label }}</div>
                <div :class="$style.musicDetailRowValue">{{ detail.value }}</div>
              </div>
            </div>
          </section>

          <section :class="$style.musicDetailSection">
            <div :class="$style.musicDetailSectionTitle">元信息</div>
            <div :class="$style.musicDetailRows">
              <div v-for="(detail, index) in detailInfo.metaInfo" :key="index" :class="$style.musicDetailRow">
                <div :class="$style.musicDetailRowLabel">{{ detail.label }}</div>
                <div :class="$style.musicDetailRowValue">{{ detail.value }}</div>
              </div>
            </div>
          </section>

          <section :class="$style.musicDetailSection">
            <div :class="$style.musicDetailSectionTitle">音乐信息</div>
            <div :class="$style.musicDetailRows">
              <div v-for="(detail, index) in detailInfo.audioInfo" :key="index" :class="$style.musicDetailRow">
                <div :class="$style.musicDetailRowLabel">{{ detail.label }}</div>
                <div :class="$style.musicDetailRowValue">{{ detail.value }}</div>
              </div>
            </div>
          </section>

          <section v-if="detailInfo.customFields.length" :class="$style.musicDetailSection">
            <div :class="$style.musicDetailSectionTitle">其他自定义字段</div>
            <div :class="$style.musicDetailRows">
              <div v-for="(detail, index) in detailInfo.customFields" :key="index" :class="$style.musicDetailRow">
                <div :class="$style.musicDetailRowLabel">{{ detail.label }}</div>
                <div :class="$style.musicDetailRowValue">{{ detail.value }}</div>
              </div>
            </div>
          </section>
        </div>

        <aside :class="$style.musicDetailRight">
          <div :class="$style.musicDetailCoverWrap">
            <img v-if="detailInfo.coverUrl" :src="detailInfo.coverUrl" :class="$style.musicDetailCover" alt="专辑封面" />
            <div v-else :class="$style.musicDetailCoverEmpty">无封面</div>
            <div v-if="detailInfo.coverInfo.length" :class="$style.musicDetailCoverInfo">
              <div
                v-for="(detail, index) in detailInfo.coverInfo"
                :key="index"
                :class="$style.musicDetailCoverInfoItem"
              >
                <span :class="$style.musicDetailCoverInfoLabel">{{ detail.label }}</span>
                <span :class="$style.musicDetailCoverInfoValue">{{ detail.value }}</span>
              </div>
            </div>
          </div>
          <div :class="$style.musicDetailLyricBlock">
            <div :class="$style.musicDetailLyricTitle">歌词</div>
            <pre :class="$style.musicDetailLyricPre">{{ detailInfo.lyric || '暂无歌词' }}</pre>
          </div>
        </aside>
      </div>
    </main>
  </material-modal>
</template>

<script lang="ts">
import { computed, ref, watch } from '@common/utils/vueTools'
import { getLocalMusicDetailInfo, type LocalMusicDetailInfo } from '@renderer/utils/music'

export default {
  name: 'MusicDetailModal',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    musicInfo: {
      type: Object as () => LX.Music.MusicInfoLocal | null,
      default: null,
    },
  },
  emits: ['update:visible'],
  setup(props: {
    visible: boolean
    musicInfo: LX.Music.MusicInfoLocal | null
  }, { emit }: { emit: (event: 'update:visible', value: boolean) => void }) {
    const isLoading = ref(false)
    const detailInfo = ref<LocalMusicDetailInfo | null>(null)
    const error = ref('')
    const targetName = ref('')
    const musicDetailTitle = computed(() => targetName.value ? `歌曲详情 - ${targetName.value}` : '歌曲详情')

    const resetState = () => {
      isLoading.value = false
      detailInfo.value = null
      error.value = ''
      targetName.value = ''
    }

    const handleClose = () => {
      emit('update:visible', false)
      resetState()
    }

    const loadDetail = async(musicInfo: LX.Music.MusicInfoLocal) => {
      isLoading.value = true
      detailInfo.value = null
      error.value = ''
      targetName.value = musicInfo.name
      try {
        const info = await getLocalMusicDetailInfo(musicInfo.meta.filePath)
        if (!info) {
          error.value = '暂未读取到歌曲详情'
          return
        }
        detailInfo.value = info
      } catch (err) {
        console.log(err)
        error.value = `读取歌曲详情失败：${err instanceof Error ? err.message : '未知错误'}`
      } finally {
        isLoading.value = false
      }
    }

    watch(() => [props.visible, props.musicInfo] as const, ([visible, musicInfo]) => {
      if (!visible) {
        resetState()
        return
      }
      if (musicInfo) void loadDetail(musicInfo)
    })

    return {
      isLoading,
      detailInfo,
      error,
      musicDetailTitle,
      handleClose,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.musicDetailModal {
  display: flex;
  flex-flow: column nowrap;
  min-height: 0;
  padding: 18px 20px 20px;
  user-select: text;
}

.musicDetailTitle {
  font-size: 18px;
  line-height: 1.3;
  text-align: center;
}

.musicDetailLoading,
.musicDetailEmpty {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
  font-size: 14px;
}

.musicDetailBody {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  min-height: 0;
}

.musicDetailLeft {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
  padding-right: 4px;
}

.musicDetailRight {
  flex: 0 0 280px;
  min-width: 240px;
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
  min-height: 0;
}

.musicDetailSection {
  padding: 10px 12px;
  border: 1px solid var(--color-primary-alpha-900);
  border-radius: 6px;
  background: var(--color-background);
}

.musicDetailSectionTitle {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: bold;
  color: var(--color-font);
}

.musicDetailCoverWrap {
  width: 100%;
}

.musicDetailCover,
.musicDetailCoverEmpty {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  border: 1px solid var(--color-primary-alpha-900);
  background: var(--color-primary-background-hover);
}

.musicDetailCover {
  display: block;
  object-fit: cover;
}

.musicDetailCoverEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
  font-size: 13px;
}

.musicDetailCoverInfo {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.musicDetailCoverInfoItem {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
}

.musicDetailCoverInfoLabel {
  flex: 0 0 36px;
  color: var(--color-font-label);
}

.musicDetailCoverInfoValue {
  flex: 1;
  min-width: 0;
  word-break: break-all;
  color: var(--color-font);
}

.musicDetailRows {
  min-width: 0;
}

.musicDetailRow {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--color-primary-alpha-900);
}

.musicDetailRow:last-child {
  border-bottom: 0;
}

.musicDetailRowLabel {
  flex: 0 0 76px;
  color: var(--color-font-label);
  font-size: 12px;
  line-height: 1.55;
}

.musicDetailRowValue {
  flex: 1;
  min-width: 0;
  color: var(--color-font);
  font-size: 12px;
  line-height: 1.55;
  text-align: right;
  white-space: pre-wrap;
  word-break: break-all;
}

.musicDetailLyricBlock {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
}

.musicDetailLyricTitle {
  margin-bottom: 6px;
  color: var(--color-font-label);
  font-size: 12px;
}

.musicDetailLyricPre {
  margin: 0;
  padding: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border-radius: 6px;
  background: var(--color-primary-background-hover);
  color: var(--color-font);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}
</style>
