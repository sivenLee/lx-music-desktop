<template>
  <div :class="[$style.list, 'list']">
    <div ref="musicTableRef" class="scroll" :class="$style.tableScroll" @scroll="$emit('scroll', $event)">
      <div :class="$style.musicTable" :style="musicTableStyle">
        <div :class="$style.tableHeaderRow" @contextmenu.prevent="$emit('headerContextMenu', $event)">
          <div
            v-for="column in visibleColumns"
            :key="column.key"
            :class="[
              $style.tableHeaderCell,
              { [$style.stickyLeft]: column.fixed === 'left' },
              { [$style.stickyRight]: column.fixed === 'right' },
              { [$style.alignCenter]: column.align === 'center' },
              { [$style.alignRight]: column.align === 'right' },
              { [$style.sortableHeader]: column.sortable },
            ]"
            :style="getColumnStyle(column)"
            @click="$emit('toggleColumnSort', column)"
          >
            <template v-if="column.key === 'select'">
              <input
                :ref="setSelectAllCheckboxRef"
                type="checkbox"
                :disabled="!isMultiSelectEnabled"
                :checked="isAllVisibleMusicSelected"
                @click.stop
                @change="$emit('toggleSelectAll')"
              />
            </template>
            <template v-else>
              <span>{{ column.label }}</span>
              <span v-if="column.sortable" :class="$style.sortIcon">{{ getColumnSortMark(column.key) }}</span>
            </template>
          </div>
        </div>
        <div :class="$style.tableBody" :style="{ height: virtualBodyHeight }">
          <div
            v-for="row in virtualRows"
            :key="`${row.item.id}_${row.index}`"
            :class="[
              $style.tableRow,
              { [$style.active]: currentPlayingMusicId === row.item.id },
              { [$style.clicked]: rightClickMusicId === row.item.id },
              { [$style.selected]: isMusicSelected(row.item) },
            ]"
            :style="{ top: `${row.top}px` }"
            @click="$emit('toggleMusicSelection', row.item)"
            @dblclick="$emit('playMusic', row.item)"
            @contextmenu.prevent="$emit('musicContextMenu', $event, row.item)"
          >
            <div
              v-for="column in visibleColumns"
              :key="column.key"
              :class="[
                $style.tableCell,
                { [$style.stickyLeft]: column.fixed === 'left' },
                { [$style.stickyRight]: column.fixed === 'right' },
                { [$style.alignCenter]: column.align === 'center' },
                { [$style.alignRight]: column.align === 'right' },
              ]"
              :style="getColumnStyle(column)"
            >
              <template v-if="column.key === 'index'">
                <div :class="$style.indexCell">
                  <transition name="play-active">
                    <div v-if="currentPlayingMusicId === row.item.id" :class="$style.playIcon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                        <use xlink:href="#icon-play-outline" />
                      </svg>
                    </div>
                    <div v-else>{{ row.index + 1 }}</div>
                  </transition>
                </div>
              </template>
              <template v-else-if="column.key === 'cover'">
                <music-cover-cell :file-path="row.item.meta.filePath" :alt="row.item.name" />
              </template>
              <template v-else-if="column.key === 'select'">
                <div :class="$style.checkboxCell">
                  <input
                    type="checkbox"
                    :disabled="!isMultiSelectEnabled"
                    :checked="isMusicSelected(row.item)"
                    @click.stop="$emit('toggleMusicSelection', row.item)"
                    @change="noop"
                  />
                </div>
              </template>
              <template v-else>
                <span
                  class="select"
                  :class="$style.cellText"
                  :title="column.key === 'fileName' ? (row.item.meta.fileName || row.item.name) : getMusicColumnText(row.item, column.key)"
                >
                  {{ getMusicColumnText(row.item, column.key) }}
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref } from '@common/utils/vueTools'
import MusicCoverCell from './MusicCoverCell.vue'
import { getMusicColumnText } from '../localMusicColumns'
import type { LocalMusicColumnDefinition, LocalMusicColumnKey } from '../localMusicColumns'

export default {
  name: 'MusicTable',
  components: {
    MusicCoverCell,
  },
  props: {
    visibleColumns: {
      type: Array as () => LocalMusicColumnDefinition[],
      required: true,
    },
    virtualRows: {
      type: Array as () => Array<{
        item: LX.Music.MusicInfoLocal
        index: number
        top: number
      }>,
      required: true,
    },
    virtualBodyHeight: {
      type: String,
      required: true,
    },
    musicTableStyle: {
      type: Object as () => Record<string, string>,
      required: true,
    },
    currentPlayingMusicId: {
      type: String as () => string | null,
      default: null,
    },
    rightClickMusicId: {
      type: String as () => string | null,
      default: null,
    },
    isMultiSelectEnabled: {
      type: Boolean,
      default: false,
    },
    isAllVisibleMusicSelected: {
      type: Boolean,
      default: false,
    },
    isMusicSelected: {
      type: Function as unknown as () => (musicInfo: LX.Music.MusicInfoLocal) => boolean,
      required: true,
    },
    getColumnStyle: {
      type: Function as unknown as () => (column: LocalMusicColumnDefinition) => Record<string, string>,
      required: true,
    },
    getColumnSortMark: {
      type: Function as unknown as () => (key: LocalMusicColumnKey) => string,
      required: true,
    },
  },
  emits: [
    'scroll',
    'headerContextMenu',
    'toggleColumnSort',
    'toggleSelectAll',
    'toggleMusicSelection',
    'playMusic',
    'musicContextMenu',
  ],
  setup(_props: Record<string, unknown>, { expose }: { expose: (exposed: Record<string, unknown>) => void }) {
    const musicTableRef = ref<HTMLElement | null>(null)
    const selectAllCheckboxRef = ref<HTMLInputElement | null>(null)
    const setSelectAllCheckboxRef = (element: unknown) => {
      selectAllCheckboxRef.value = element instanceof HTMLInputElement ? element : null
    }
    expose({
      get musicTableRef() {
        return musicTableRef.value
      },
      get selectAllCheckboxRef() {
        return selectAllCheckboxRef.value
      },
    })
    return {
      musicTableRef,
      selectAllCheckboxRef,
      setSelectAllCheckboxRef,
      getMusicColumnText,
      noop: () => {},
    }
  },
}
</script>

<style lang="less" module>
.list {
  overflow: hidden;
  height: 100%;
  flex: auto;
  min-width: 0;
}

.tableScroll {
  position: relative;
  height: 100%;
  overflow: auto;
  background: var(--local-table-bg);
}

.musicTable {
  position: relative;
  overflow: visible;
}

.tableHeaderRow {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  min-width: 100%;
}

.tableBody {
  position: relative;
  min-width: 100%;
}

.tableHeaderCell,
.tableCell {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  box-sizing: border-box;
  padding: 0 10px;
  border-bottom: 1px solid var(--color-primary-alpha-900);
  background: var(--local-table-bg);
  color: var(--color-font);
  font-size: 12px;
  line-height: 1.4;
}

.tableHeaderCell {
  z-index: 3;
  height: 38px;
  font-weight: bold;
  user-select: none;
  white-space: nowrap;
}

.sortableHeader {
  cursor: pointer;
}

.sortIcon {
  margin-left: 4px;
  color: var(--color-font-label);
  font-size: 11px;
}

.tableRow {
  position: absolute;
  left: 0;
  display: flex;
  width: 100%;
  height: 40px;
  cursor: default;

  &:hover .tableCell {
    background: var(--local-table-hover-bg);
  }

  &.active .tableCell {
    background: var(--local-table-active-bg);
  }

  &.selected .tableCell {
    background: var(--local-table-hover-bg);
  }
}

.tableCell {
  height: 40px;
  overflow: hidden;
}

.stickyLeft,
.stickyRight {
  position: sticky;
  z-index: 4;
}

.stickyLeft {
  inset-inline-start: 0;
  left: 0;
  box-shadow: 1px 0 0 0 var(--color-primary-alpha-900);
}

.stickyRight {
  inset-inline-end: 0;
  right: 0;
  box-shadow: -1px 0 0 0 var(--color-primary-alpha-900);
}

.tableHeaderCell.stickyLeft,
.tableHeaderCell.stickyRight {
  z-index: 6;
}

.alignCenter {
  justify-content: center;
  text-align: center;
}

.alignRight {
  justify-content: flex-end;
  text-align: right;
}

.cellText {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tableRow.active .cellText,
.tableRow.active .sortIcon {
  color: var(--color-button-font);
}

.clicked {
  .tableCell {
    background: var(--local-table-hover-bg);
  }
}

.indexCell {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: var(--color-font-label);
}

.playIcon {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-button-font);
  opacity: .7;

  svg {
    flex: none;
  }
}

.checkboxCell {
  display: flex;
  align-items: center;
  justify-content: center;

  input[type="checkbox"] {
    margin: 0;
  }
}
</style>
