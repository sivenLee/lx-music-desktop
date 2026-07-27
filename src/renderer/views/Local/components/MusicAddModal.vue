<template>
  <material-modal :show="visible" max-width="70%" min-width="200px" @close="handleClose">
    <main :class="$style.musicAddModal">
      <h2>{{ title }}</h2>
      <div v-if="playlistFiles.length" class="scroll" :class="$style.musicAddBtnContent">
        <button
          v-for="playlist in playlistFiles"
          :key="playlist"
          type="button"
          :class="$style.musicAddBtn"
          @click="handleSelect(playlist)"
        >
          {{ getPlaylistName(playlist) }}
        </button>
      </div>
      <div v-else :class="$style.musicAddEmpty">
        {{ $t('no_item') }}
      </div>
    </main>
  </material-modal>
</template>

<script lang="ts">
import { computed } from '@common/utils/vueTools'
import { useLocalMusic } from '../useLocalMusic'

export default {
  name: 'MusicAddModal',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    musicInfos: {
      type: Array as () => LX.Music.MusicInfoLocal[],
      default: () => [],
    },
    playlistFiles: {
      type: Array as () => string[],
      default: () => [],
    },
  },
  emits: ['update:visible', 'select'],
  setup(props: {
    visible: boolean
    musicInfos: LX.Music.MusicInfoLocal[]
    playlistFiles: string[]
  }, { emit }: {
    emit: {
      (event: 'update:visible', value: boolean): void
      (event: 'select', playlistPath: string): void
    }
  }) {
    const { getPlaylistName } = useLocalMusic()
    const title = computed(() => `添加${props.musicInfos.length}首歌曲到`)

    const handleClose = () => {
      emit('update:visible', false)
    }

    const handleSelect = (playlistPath: string) => {
      emit('select', playlistPath)
    }

    return {
      title,
      getPlaylistName,
      handleClose,
      handleSelect,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.musicAddModal {
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  min-height: 0;

  h2 {
    font-size: 13px;
    color: var(--color-font);
    line-height: 1.3;
    text-align: center;
    padding: 15px;
  }
}

.musicAddBtnContent {
  flex: auto;
  max-height: 100%;
  padding: 0 15px 15px;
  display: flex;
  flex-flow: row wrap;
  justify-content: space-evenly;
}

.musicAddBtn {
  box-sizing: border-box;
  margin-left: 15px;
  margin-bottom: 15px;
  min-width: 160px;
  height: 36px;
  padding: 0 10px;
  border-radius: @form-radius;
  border: 1px solid var(--color-primary-background);
  background: var(--color-background);
  color: var(--color-font);
  cursor: pointer;
  width: calc((100% / 3) - 15px);
  .mixin-ellipsis-1();

  &:hover {
    background: var(--color-primary-background-hover);
  }
}

.musicAddEmpty {
  padding: 0 15px 15px;
  text-align: center;
  color: var(--color-font-label);
}
</style>
