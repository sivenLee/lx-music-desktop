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
import { loadCachedLocalMusicCoverUrl } from '@renderer/utils/music'

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

    const syncCoverUrl = async(refresh = false) => {
      const targetPath = props.filePath
      const url = await loadCachedLocalMusicCoverUrl(targetPath, { refresh })
      if (props.filePath === targetPath) coverUrl.value = url
    }

    const startObserve = () => {
      if (!coverRef.value) return
      observer?.disconnect()
      observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        observer?.disconnect()
        syncCoverUrl().catch(err => {
          console.log(err)
        })
      }, {
        rootMargin: '120px',
      })
      observer.observe(coverRef.value)
    }

    const handleLocalMusicCoverUpdated = (filePath: string) => {
      if (filePath !== props.filePath) return
      syncCoverUrl(true).catch(err => {
        console.log(err)
      })
    }

    watch(() => props.filePath, () => {
      coverUrl.value = ''
      startObserve()
    })

    onMounted(() => {
      startObserve()
      window.app_event.on('localMusicCoverUpdated', handleLocalMusicCoverUpdated)
    })

    onBeforeUnmount(() => {
      observer?.disconnect()
      window.app_event.off('localMusicCoverUpdated', handleLocalMusicCoverUpdated)
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
