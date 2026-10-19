<template>
  <material-modal
    :show="visible"
    teleport="#view"
    width="95%"
    height="800px"
    max-width="95%"
    max-height="800px"
    :movable="false"
    @close="handleClose"
  >
    <main :class="$style.modal">
      <h2 :class="$style.title">批量导入</h2>
      <div :class="$style.toolbar">
        <div :class="$style.toolbarLeft">
          <input
            :class="$style.fileInput"
            type="text"
            readonly
            :value="jsonFileName"
            placeholder="请选择导入的 JSON 文件"
          >
          <button
            type="button"
            :class="$style.btn"
            :disabled="isTaskRunning"
            @click="handlePickJsonFile"
          >
            导入文件
          </button>
          <button
            type="button"
            :class="$style.btn"
            :disabled="isTaskRunning || !jsonFilePath"
            @click="handleReloadJsonFile"
          >
            重新载入
          </button>
        </div>
        <div :class="$style.toolbarRight">
          <template v-if="isTaskRunning">
            <div :class="$style.progressText" :title="progressText">{{ progressText }}</div>
            <button type="button" :class="[$style.btn, $style.dangerBtn]" @click="handleStopTask">
              停止任务
            </button>
          </template>
          <div v-else ref="saveBtnWrapRef" :class="$style.splitBtn">
            <button
              type="button"
              :class="[$style.btn, $style.splitBtnMain]"
              :disabled="!rows.length || !selectedRows.length || !selectedSaveFields.length"
              title="批量保存"
              @click="handleBatchSave"
            >
              批量保存
            </button>
            <button
              type="button"
              :class="[$style.btn, $style.splitBtnArrow]"
              :disabled="!rows.length"
              title="选择写入字段"
              :aria-expanded="isSaveFieldMenuVisible"
              @click.stop="handleToggleSaveFieldMenu"
            >
              <span :class="[$style.splitBtnCaret, { [$style.splitBtnCaretOpen]: isSaveFieldMenuVisible }]" aria-hidden="true" />
            </button>
            <div v-if="isSaveFieldMenuVisible" :class="$style.fieldMenu">
              <label
                v-for="field in saveFieldOptions"
                :key="field.key"
                :class="$style.fieldMenuItem"
              >
                <input
                  type="checkbox"
                  :checked="selectedSaveFields.includes(field.key)"
                  @change="handleToggleSaveField(field.key)"
                >
                <span>{{ field.label }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loadError" :class="$style.empty">{{ loadError }}</div>
      <div v-else-if="!rows.length" :class="$style.empty">请先导入 JSON 文件</div>
      <div v-else :class="$style.tableWrap">
        <div ref="tableScrollRef" class="scroll" :class="$style.tableScroll">
          <div :class="$style.table" :style="tableStyle">
            <div :class="$style.tableHeaderRow" @contextmenu.prevent="handleHeaderContextMenu">
              <div
                v-for="column in visibleColumns"
                :key="column.key"
                :class="[
                  $style.tableHeaderCell,
                  { [$style.stickyLeft]: column.fixed === 'left' },
                  { [$style.stickyRight]: column.fixed === 'right' },
                  { [$style.alignCenter]: column.align === 'center' },
                  { [$style.sortableHeader]: column.sortable },
                ]"
                :style="getColumnStyle(column)"
                @click="handleToggleColumnSort(column)"
              >
                <template v-if="column.key === 'select'">
                  <input
                    type="checkbox"
                    :disabled="isTaskRunning"
                    :checked="isAllSelected"
                    :indeterminate.prop="isPartialSelected"
                    @click.stop
                    @change="handleToggleSelectAll"
                  >
                </template>
                <template v-else>
                  <span>{{ column.label }}</span>
                  <span v-if="column.sortable" :class="$style.sortIcon">{{ getColumnSortMark(column.key) }}</span>
                </template>
              </div>
            </div>
            <div :class="$style.tableBody">
              <div
                v-for="(row, index) in sortedRows"
                :key="row.id"
                :class="[$style.tableRow, { [$style.selected]: row.selected }]"
              >
                <div
                  v-for="column in visibleColumns"
                  :key="column.key"
                  :class="[
                    $style.tableCell,
                    { [$style.stickyLeft]: column.fixed === 'left' },
                    { [$style.stickyRight]: column.fixed === 'right' },
                    { [$style.alignCenter]: column.align === 'center' },
                  ]"
                  :style="getColumnStyle(column)"
                >
                  <template v-if="column.key === 'index'">
                    {{ index + 1 }}
                  </template>
                  <template v-else-if="column.key === 'filePath'">
                    <span :class="$style.cellText" :title="row.filePath">{{ row.filePath }}</span>
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <span
                      :class="[
                        $style.statusText,
                        {
                          [$style.statusPending]: row.status === 0,
                          [$style.statusSuccess]: row.status === 1,
                          [$style.statusError]: row.status === 2,
                        },
                      ]"
                      :title="getBatchImportStatusText(row.status, row.error)"
                    >{{ getBatchImportStatusText(row.status, row.error) }}</span>
                  </template>
                  <template v-else-if="column.key === 'select'">
                    <input
                      type="checkbox"
                      :disabled="isTaskRunning"
                      :checked="row.selected"
                      @change="handleToggleRowSelect(row)"
                    >
                  </template>
                  <template v-else-if="column.editable">
                    <input
                      :class="$style.cellInput"
                      type="text"
                      :disabled="isTaskRunning"
                      :value="getRowFieldValue(row, column.key)"
                      @input="handleRowFieldInput(row, column.key, $event)"
                    >
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="isColumnMenuVisible"
        ref="columnMenuRef"
        :class="$style.columnMenu"
        :style="columnMenuStyle"
      >
        <div :class="$style.columnMenuTitle">显示列</div>
        <label
          v-for="column in selectableColumns"
          :key="column.key"
          :class="$style.columnMenuItem"
        >
          <input
            type="checkbox"
            :checked="selectedColumnKeys.includes(column.key)"
            @change="handleToggleColumn(column.key)"
          >
          <span>{{ column.label }}</span>
        </label>
      </div>
    </main>
  </material-modal>
</template>

<script lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from '@common/utils/vueTools'
import { basename, dirname } from '@common/utils/nodejs'
import { dialog } from '@renderer/plugins/Dialog'
import {
  getLocalMusicEditInfo,
  isLocalMusicMetaEditable,
} from '@renderer/utils/music'
import { notifyLocalMusicCoverChanged } from '@renderer/utils/localMusicCoverRefresh'
import {
  localMusicReadJsonFile,
  localMusicWriteMusicMeta,
  showSelectDialog,
} from '@renderer/utils/ipc'
import {
  BATCH_IMPORT_COLUMNS,
  BATCH_IMPORT_SAVE_FIELDS,
  BATCH_IMPORT_SELECTABLE_COLUMNS,
  DEFAULT_BATCH_IMPORT_SAVE_FIELDS,
  DEFAULT_BATCH_IMPORT_VISIBLE_COLUMNS,
  createBatchImportRow,
  getBatchImportStatusText,
  getBatchImportColumnSortMark,
  parseBatchImportSongsFile,
  sortBatchImportRows,
  type BatchImportColumnDefinition,
  type BatchImportColumnKey,
  type BatchImportRow,
  type BatchImportSaveFieldKey,
  type BatchImportSongsFile,
  type BatchImportSortOrder,
} from '../batchImportTypes'

export default {
  name: 'MusicBatchImportModal',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:visible', 'saved'],
  setup(props: { visible: boolean }, { emit }: {
    emit: {
      (event: 'update:visible', value: boolean): void
      (event: 'saved', musicInfos: LX.Music.MusicInfoLocal[]): void
    }
  }) {
    const saveBtnWrapRef = ref<HTMLElement | null>(null)
    const tableScrollRef = ref<HTMLElement | null>(null)
    const columnMenuRef = ref<HTMLElement | null>(null)

    const jsonFilePath = ref('')
    const jsonFileName = ref('')
    const loadError = ref('')
    const fileData = ref<BatchImportSongsFile | null>(null)
    const rows = ref<BatchImportRow[]>([])
    const sortState = ref<{
      key: BatchImportColumnKey | null
      order: BatchImportSortOrder
    }>({
      key: null,
      order: 'asc',
    })
    const selectedColumnKeys = ref<BatchImportColumnKey[]>([...DEFAULT_BATCH_IMPORT_VISIBLE_COLUMNS])
    const selectedSaveFields = ref<BatchImportSaveFieldKey[]>([...DEFAULT_BATCH_IMPORT_SAVE_FIELDS])
    const isSaveFieldMenuVisible = ref(false)
    const isColumnMenuVisible = ref(false)
    const columnMenuLocation = reactive({ x: 0, y: 0 })

    const isTaskRunning = ref(false)
    const stopRequested = ref(false)
    const currentTaskFilePath = ref('')
    const processedCount = ref(0)
    const taskTotal = ref(0)

    const saveFieldOptions = BATCH_IMPORT_SAVE_FIELDS
    const selectableColumns = BATCH_IMPORT_SELECTABLE_COLUMNS

    const selectedRows = computed(() => rows.value.filter(row => row.selected))
    const sortedRows = computed(() => sortBatchImportRows(rows.value, sortState.value))
    const isAllSelected = computed(() => rows.value.length > 0 && rows.value.every(row => row.selected))
    const isPartialSelected = computed(() => selectedRows.value.length > 0 && !isAllSelected.value)

    const visibleColumns = computed(() => {
      return BATCH_IMPORT_COLUMNS.filter(column => {
        if (column.fixed) return true
        return selectedColumnKeys.value.includes(column.key)
      })
    })

    const totalColumnWidth = computed(() => visibleColumns.value.reduce((total, column) => total + column.width, 0))
    const tableStyle = computed(() => ({
      width: `${totalColumnWidth.value}px`,
      minWidth: '100%',
    }))

    const columnMenuStyle = computed(() => ({
      left: `${columnMenuLocation.x}px`,
      top: `${columnMenuLocation.y}px`,
    }))

    const progressText = computed(() => {
      const pathText = currentTaskFilePath.value || '-'
      return `${pathText} | ${processedCount.value}/${taskTotal.value}`
    })

    const getColumnStyle = (column: BatchImportColumnDefinition) => {
      const style: Record<string, string> = {
        width: `${column.width}px`,
        minWidth: `${column.width}px`,
        maxWidth: `${column.width}px`,
      }
      if (column.fixed === 'left') {
        const currentIndex = visibleColumns.value.findIndex(item => item.key === column.key)
        const leftOffset = visibleColumns.value
          .slice(0, currentIndex)
          .filter(item => item.fixed === 'left')
          .reduce((total, item) => total + item.width, 0)
        style.left = `${leftOffset}px`
      }
      if (column.fixed === 'right') {
        const currentIndex = visibleColumns.value.findIndex(item => item.key === column.key)
        const rightOffset = visibleColumns.value
          .slice(currentIndex + 1)
          .filter(item => item.fixed === 'right')
          .reduce((total, item) => total + item.width, 0)
        style.right = `${rightOffset}px`
      }
      return style
    }

    const getColumnSortMark = (key: BatchImportColumnKey) => {
      return getBatchImportColumnSortMark(key, sortState.value)
    }

    const handleToggleColumnSort = (column: BatchImportColumnDefinition) => {
      if (!column.sortable) return
      if (sortState.value.key === column.key) {
        if (sortState.value.order === 'desc') {
          sortState.value = {
            key: column.key,
            order: 'asc',
          }
          return
        }
        sortState.value = {
          key: null,
          order: 'asc',
        }
        return
      }
      sortState.value = {
        key: column.key,
        order: 'desc',
      }
    }

    const getRowFieldValue = (row: BatchImportRow, key: BatchImportColumnKey) => {
      switch (key) {
        case 'title': return row.title
        case 'artist': return row.artist
        case 'album': return row.album
        case 'year': return row.year
        case 'track': return row.track
        case 'disc': return row.disc
        case 'genre': return row.genre
        case 'language': return row.language
        case 'comment': return row.comment
        case 'customTags': return row.customTags
        case 'lyrics': return row.lyrics
        default: return ''
      }
    }

    const handleRowFieldInput = (row: BatchImportRow, key: BatchImportColumnKey, event: Event) => {
      const value = (event.target as HTMLInputElement).value
      switch (key) {
        case 'title': row.title = value; break
        case 'artist': row.artist = value; break
        case 'album': row.album = value; break
        case 'year': row.year = value; break
        case 'track': row.track = value; break
        case 'disc': row.disc = value; break
        case 'genre': row.genre = value; break
        case 'language': row.language = value; break
        case 'comment': row.comment = value; break
        case 'customTags': row.customTags = value; break
        case 'lyrics': row.lyrics = value; break
      }
    }

    const applySongsFile = (data: BatchImportSongsFile) => {
      fileData.value = data
      rows.value = data.musicFiles.map((item, index) => createBatchImportRow(item, index))
      loadError.value = rows.value.length ? '' : 'JSON 文件中没有歌曲数据'
    }

    const loadJsonFile = async(filePath: string) => {
      loadError.value = ''
      const data = await localMusicReadJsonFile(filePath)
      const parsed = parseBatchImportSongsFile(data)
      jsonFilePath.value = filePath
      jsonFileName.value = basename(filePath)
      applySongsFile(parsed)
    }

    const handlePickJsonFile = async() => {
      if (isTaskRunning.value) return
      const { canceled, filePaths } = await showSelectDialog({
        title: '选择导入的 JSON 文件',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (canceled || !filePaths[0]) return
      try {
        await loadJsonFile(filePaths[0])
      } catch (err) {
        console.error(err)
        loadError.value = err instanceof Error ? err.message : '读取 JSON 失败'
        rows.value = []
        fileData.value = null
      }
    }

    const handleReloadJsonFile = async() => {
      if (isTaskRunning.value || !jsonFilePath.value) return
      try {
        await loadJsonFile(jsonFilePath.value)
      } catch (err) {
        console.error(err)
        loadError.value = err instanceof Error ? err.message : '重新载入失败'
      }
    }

    const handleToggleSaveFieldMenu = () => {
      if (!rows.value.length) return
      isSaveFieldMenuVisible.value = !isSaveFieldMenuVisible.value
    }

    const handleToggleSaveField = (key: BatchImportSaveFieldKey) => {
      if (selectedSaveFields.value.includes(key)) {
        selectedSaveFields.value = selectedSaveFields.value.filter(item => item !== key)
        return
      }
      selectedSaveFields.value = [...selectedSaveFields.value, key]
    }

    const handleToggleSelectAll = () => {
      if (isTaskRunning.value) return
      const next = !isAllSelected.value
      rows.value.forEach(row => {
        row.selected = next
      })
    }

    const handleToggleRowSelect = (row: BatchImportRow) => {
      if (isTaskRunning.value) return
      row.selected = !row.selected
    }

    const handleHeaderContextMenu = (event: MouseEvent) => {
      columnMenuLocation.x = event.clientX
      columnMenuLocation.y = event.clientY
      isColumnMenuVisible.value = true
    }

    const handleToggleColumn = (key: BatchImportColumnKey) => {
      if (selectedColumnKeys.value.includes(key)) {
        if (selectedColumnKeys.value.length <= 1) return
        selectedColumnKeys.value = selectedColumnKeys.value.filter(item => item !== key)
        return
      }
      selectedColumnKeys.value = BATCH_IMPORT_COLUMNS
        .filter(column => !column.fixed && (selectedColumnKeys.value.includes(column.key) || column.key === key))
        .map(column => column.key)
    }

    const buildWriteMeta = async(row: BatchImportRow) => {
      if (!isLocalMusicMetaEditable(row.filePath)) throw new Error('仅支持写入 MP3 / FLAC 格式文件')
      // 跳过封面读取；未勾选字段用文件现有文本元信息填充，避免被清空
      const editInfo = await getLocalMusicEditInfo(row.filePath, { skipCover: true })
      if (!editInfo) throw new Error('本地文件不存在或无法读取')

      const meta: LX.Music.MusicFileMeta = {
        title: editInfo.title,
        artist: editInfo.artist || null,
        album: editInfo.album || null,
        year: editInfo.year || null,
        track: editInfo.track || null,
        disc: editInfo.disc || null,
        genre: editInfo.genre || null,
        language: editInfo.language || null,
        comment: editInfo.comment || null,
        CUSTOM_TAGS: editInfo.customTags || null,
        lyrics: editInfo.lyrics || null,
        // 批量导入不读、不写、不覆盖封面
        APIC: null,
      }

      const fieldSet = new Set(selectedSaveFields.value)
      if (fieldSet.has('title')) meta.title = row.title.trim()
      if (fieldSet.has('artist')) meta.artist = row.artist.trim() || null
      if (fieldSet.has('album')) meta.album = row.album.trim() || null
      if (fieldSet.has('year')) meta.year = row.year.trim() || null
      if (fieldSet.has('track')) meta.track = row.track.trim() || null
      if (fieldSet.has('disc')) meta.disc = row.disc.trim() || null
      if (fieldSet.has('genre')) meta.genre = row.genre.trim() || null
      if (fieldSet.has('language')) meta.language = row.language.trim() || null
      if (fieldSet.has('comment')) meta.comment = row.comment.trim() || null
      if (fieldSet.has('customTags')) meta.CUSTOM_TAGS = row.customTags.trim() || null
      if (fieldSet.has('lyrics')) meta.lyrics = row.lyrics.trim() || null
      return meta
    }

    const handleBatchSave = async() => {
      if (isTaskRunning.value) return
      const targets = selectedRows.value
      if (!targets.length) {
        await dialog('请先勾选要写入的歌曲')
        return
      }
      if (!selectedSaveFields.value.length) {
        await dialog('请至少勾选一个写入字段')
        return
      }
      const fieldLabels = BATCH_IMPORT_SAVE_FIELDS
        .filter(item => selectedSaveFields.value.includes(item.key))
        .map(item => item.label)
        .join('、')
      if (!await dialog.confirm(`确认对已选的 ${targets.length}/${rows.value.length} 首歌曲写入字段：${fieldLabels}？`)) return

      isSaveFieldMenuVisible.value = false
      isColumnMenuVisible.value = false
      isTaskRunning.value = true
      stopRequested.value = false
      processedCount.value = 0
      taskTotal.value = targets.length
      currentTaskFilePath.value = ''
      const savedMusicInfos: LX.Music.MusicInfoLocal[] = []
      const CONCURRENCY = 3

      const writeOne = async(row: BatchImportRow) => {
        currentTaskFilePath.value = row.filePath
        row.status = 0
        row.error = ''
        try {
          const meta = await buildWriteMeta(row)
          const dirPath = fileData.value?.dirPath ?? dirname(row.filePath)
          const updated = await localMusicWriteMusicMeta({
            dirPath,
            filePath: row.filePath,
            meta,
            skipSongsCache: true,
          })
          await notifyLocalMusicCoverChanged(row.filePath)
          row.status = 1
          row.error = ''
          savedMusicInfos.push(updated)
        } catch (err) {
          console.error(err)
          row.status = 2
          row.error = err instanceof Error ? err.message : '写入失败'
        } finally {
          processedCount.value += 1
        }
      }

      try {
        let nextIndex = 0
        const workerCount = Math.min(CONCURRENCY, targets.length)
        const workers = Array.from({ length: workerCount }, async() => {
          while (nextIndex < targets.length) {
            if (stopRequested.value) break
            const current = nextIndex
            nextIndex += 1
            await writeOne(targets[current])
          }
        })
        await Promise.all(workers)
      } finally {
        isTaskRunning.value = false
        currentTaskFilePath.value = ''
        if (savedMusicInfos.length) emit('saved', savedMusicInfos)
        if (stopRequested.value) {
          await dialog(`任务已停止，已处理 ${processedCount.value}/${taskTotal.value} 首`)
        } else {
          const successCount = targets.filter(row => row.status === 1).length
          const failCount = targets.filter(row => row.status === 2).length
          await dialog(`批量写入完成：成功 ${successCount} 首，失败 ${failCount} 首`)
        }
      }
    }

    const handleStopTask = () => {
      stopRequested.value = true
    }

    const handleClose = () => {
      if (isTaskRunning.value) {
        void dialog('请先停止当前写入任务')
        return
      }
      emit('update:visible', false)
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (saveBtnWrapRef.value && !saveBtnWrapRef.value.contains(target)) {
        isSaveFieldMenuVisible.value = false
      }
      if (columnMenuRef.value && !columnMenuRef.value.contains(target)) {
        isColumnMenuVisible.value = false
      }
    }

    watch(() => props.visible, (visible) => {
      if (visible) {
        document.addEventListener('mousedown', handleClickOutside)
        return
      }
      document.removeEventListener('mousedown', handleClickOutside)
      isSaveFieldMenuVisible.value = false
      isColumnMenuVisible.value = false
    })

    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', handleClickOutside)
      stopRequested.value = true
    })

    return {
      saveBtnWrapRef,
      tableScrollRef,
      columnMenuRef,
      jsonFileName,
      jsonFilePath,
      loadError,
      rows,
      sortedRows,
      selectedRows,
      selectedColumnKeys,
      selectedSaveFields,
      saveFieldOptions,
      selectableColumns,
      visibleColumns,
      tableStyle,
      columnMenuStyle,
      isSaveFieldMenuVisible,
      isColumnMenuVisible,
      isTaskRunning,
      progressText,
      isAllSelected,
      isPartialSelected,
      getColumnStyle,
      getColumnSortMark,
      handleToggleColumnSort,
      getRowFieldValue,
      handleRowFieldInput,
      getBatchImportStatusText,
      handlePickJsonFile,
      handleReloadJsonFile,
      handleToggleSaveFieldMenu,
      handleToggleSaveField,
      handleToggleSelectAll,
      handleToggleRowSelect,
      handleHeaderContextMenu,
      handleToggleColumn,
      handleBatchSave,
      handleStopTask,
      handleClose,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.modal {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  padding: 16px 18px 18px;
  box-sizing: border-box;
}

.title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: bold;
  color: var(--color-font);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex: none;
}

.toolbarLeft,
.toolbarRight {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.toolbarRight {
  flex: none;
}

.fileInput {
  width: 300px;
  height: 30px;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid var(--color-primary-alpha-700);
  border-radius: 4px;
  background: var(--color-primary-light-1000);
  color: var(--color-font);
  outline: none;
}

.btn {
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--color-primary-alpha-700);
  border-radius: 4px;
  background: var(--color-button-background);
  color: var(--color-font);
  cursor: pointer;
  line-height: 28px;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: var(--color-button-background-hover);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.dangerBtn {
  border-color: var(--color-primary);
}

.progressText {
  max-width: 420px;
  font-size: 12px;
  color: var(--color-font-label);
  .mixin-ellipsis-1();
}

.splitBtn {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--color-primary-alpha-700);
  border-radius: 4px;
  overflow: visible;
  background: var(--color-button-background);
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--color-primary-alpha-500);

    .splitBtnArrow {
      border-left-color: var(--color-primary-alpha-500) !important;
    }
  }

  .splitBtnMain,
  .splitBtnArrow {
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    height: 30px !important;
    margin: 0;
    line-height: 30px;

    &:hover:not(:disabled) {
      background: var(--color-button-background-hover) !important;
    }

    &:disabled {
      opacity: 1;
      cursor: not-allowed;
    }
  }

  .splitBtnMain {
    padding: 0 12px 0 14px !important;
  }

  .splitBtnArrow {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 28px !important;
    min-width: 28px !important;
    padding: 0 !important;
    color: var(--color-font);
    border-left: 1px solid var(--color-primary-alpha-700) !important;
    transition: border-left-color 0.2s ease;
  }
}

.splitBtnCaret {
  display: block;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
  transition: transform 0.2s ease;
}

.splitBtnCaretOpen {
  transform: rotate(180deg);
}

.fieldMenu,
.columnMenu {
  position: absolute;
  z-index: 20;
  min-width: 160px;
  max-height: 320px;
  overflow: auto;
  padding: 8px 0;
  border: 1px solid var(--color-primary-alpha-700);
  border-radius: 4px;
  background: var(--color-primary-light-1000);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.fieldMenu {
  right: 0;
  top: calc(100% + 4px);
}

.columnMenu {
  position: fixed;
}

.fieldMenuItem,
.columnMenuItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--color-font);
  cursor: pointer;

  &:hover {
    background: var(--color-primary-background-hover);
  }
}

.columnMenuTitle {
  padding: 4px 12px 8px;
  font-size: 12px;
  color: var(--color-font-label);
}

.empty {
  flex: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
  font-size: 14px;
}

.tableWrap {
  flex: auto;
  min-height: 0;
  border: 1px solid var(--color-primary-alpha-900);
  border-radius: 4px;
  overflow: hidden;
  --local-table-bg: var(--color-content-background);
  --local-table-hover-bg: color-mix(in srgb, var(--color-primary-light-300) 20%, var(--local-table-bg) 80%);
}

.tableScroll {
  position: relative;
  height: 100%;
  overflow: auto;
  background: var(--local-table-bg);
}

.table {
  position: relative;
  min-width: 100%;
  overflow: visible;
}

.tableHeaderRow {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  width: 100%;
  min-width: 100%;
}

.tableRow {
  display: flex;
  width: 100%;
  height: 40px;

  &:hover .tableCell {
    background: var(--local-table-hover-bg);
  }

  &.selected .tableCell {
    background: var(--local-table-hover-bg);
  }
}

.tableHeaderCell,
.tableCell {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  box-sizing: border-box;
  padding: 0 8px;
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

.tableCell {
  height: 40px;
  overflow: hidden;
}

.stickyLeft,
.stickyRight {
  position: sticky;
  z-index: 4;
}

.tableHeaderCell.stickyLeft,
.tableHeaderCell.stickyRight {
  z-index: 6;
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

.alignCenter {
  justify-content: center;
  text-align: center;
}

.cellText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.cellInput {
  width: 100%;
  height: 28px;
  box-sizing: border-box;
  padding: 0 6px;
  border: 1px solid var(--color-primary-alpha-800);
  border-radius: 3px;
  background: transparent;
  color: var(--color-font);
  outline: none;

  &:focus {
    border-color: var(--color-primary);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.statusText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.statusPending {
  color: var(--color-primary);
}

.statusSuccess {
  color: #2e7d32;
}

.statusError {
  color: #c62828;
}
</style>
