<template>
  <material-modal :show="visible" teleport="#view" max-width="70%" min-width="200px" @close="handleClose">
    <main :class="$style.musicAddModal">
      <h2>{{ title }}</h2>
      <div class="scroll" :class="$style.musicAddBtnContent">
        <button
          type="button"
          :class="[$style.musicAddBtn, $style.newList]"
          :aria-label="$t('lists__new_list_btn')"
          title="新建播放列表"
          @click="handleCreate"
        >
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 42 42" space="preserve">
            <use xlink:href="#icon-addTo" />
          </svg>
        </button>
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
  emits: ['update:visible', 'select', 'create'],
  setup(props: {
    visible: boolean
    musicInfos: LX.Music.MusicInfoLocal[]
    playlistFiles: string[]
  }, { emit }: {
    emit: {
      (event: 'update:visible', value: boolean): void
      (event: 'select', playlistPath: string): void
      (event: 'create'): void
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

    const handleCreate = () => {
      emit('create')
    }

    return {
      title,
      getPlaylistName,
      handleClose,
      handleSelect,
      handleCreate,
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
  position: relative;
  box-sizing: border-box;
  margin-left: 15px;
  margin-bottom: 15px;
  min-width: 160px;
  height: 36px;
  line-height: 36px;
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

.newList {
  border: 1px dashed var(--color-primary-font-hover);
  color: var(--color-primary-font-hover);
  opacity: .7;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    height: 18px;
    width: 18px;
  }

  &:hover {
    opacity: 1;
    background: var(--color-primary-background-hover);
  }
}
</style>
