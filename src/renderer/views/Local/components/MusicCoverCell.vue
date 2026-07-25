<template>
  <div ref="coverRef" :class="$style.coverWrap">
    <img
      v-if="coverUrl"
      :src="coverUrl"
      :alt="alt"
      :class="$style.coverImg"
      loading="lazy"
      decoding="async"
    />
    <div v-else :class="$style.coverEmpty">-</div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from '@common/utils/vueTools'
import { getLocalMusicCoverUrl } from '@renderer/utils/music'

const coverUrlCache = new Map<string, string>()
const coverPromiseCache = new Map<string, Promise<string>>()

const loadCoverUrl = async(filePath: string) => {
  if (coverUrlCache.has(filePath)) return coverUrlCache.get(filePath) ?? ''
  if (coverPromiseCache.has(filePath)) return coverPromiseCache.get(filePath) ?? ''
  const promise = getLocalMusicCoverUrl(filePath).then(url => {
    coverUrlCache.set(filePath, url)
    coverPromiseCache.delete(filePath)
    return url
  }).catch(err => {
    console.log(err)
    coverPromiseCache.delete(filePath)
    return ''
  })
  coverPromiseCache.set(filePath, promise)
  return promise
}

export default {
  name: 'MusicCoverCell',
  props: {
    filePath: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      default: '封面',
    },
  },
  setup(props: {
    filePath: string
    alt: string
  }) {
    const coverRef = ref<HTMLElement | null>(null)
    const coverUrl = ref('')
    let observer: IntersectionObserver | null = null

    const syncCoverUrl = async() => {
      const targetPath = props.filePath
      const url = await loadCoverUrl(targetPath)
      if (props.filePath === targetPath) coverUrl.value = url
    }

    const startObserve = () => {
      if (!coverRef.value) return
      if (coverUrlCache.has(props.filePath)) {
        coverUrl.value = coverUrlCache.get(props.filePath) ?? ''
        return
      }
      observer?.disconnect()
      observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        observer?.disconnect()
        void syncCoverUrl()
      }, {
        rootMargin: '120px',
      })
      observer.observe(coverRef.value)
    }

    watch(() => props.filePath, () => {
      coverUrl.value = coverUrlCache.get(props.filePath) ?? ''
      startObserve()
    })

    onMounted(() => {
      startObserve()
    })

    onBeforeUnmount(() => {
      observer?.disconnect()
    })

    return {
      coverRef,
      coverUrl,
    }
  },
}
</script>

<style lang="less" module>
.coverWrap {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.coverImg,
.coverEmpty {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  background: var(--color-primary-background-hover);
}

.coverImg {
  display: block;
  object-fit: cover;
}

.coverEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
  font-size: 12px;
  border: 1px solid var(--color-primary-alpha-900);
  box-sizing: border-box;
}
</style>
