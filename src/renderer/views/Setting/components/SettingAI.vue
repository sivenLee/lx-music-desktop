<template lang="pug">
dt#ai {{ $t('setting__ai') }}
dd
  h3#ai_title {{ $t('setting__ai_title') }}
  div
    .p.small {{ $t('setting__ai_tip') }}
    .p
      .p.small {{ $t('setting__ai_base_url') }}
      div
        base-input(:class="$style.fullWidth" :model-value="appSetting['ai.baseUrl']" :placeholder="$t('setting__ai_base_url_tip')" @update:model-value="setBaseUrl")
    .p
      .p.small {{ $t('setting__ai_api_key') }}
      div
        base-input(:class="$style.fullWidth" :model-value="appSetting['ai.apiKey']" type="password" :placeholder="$t('setting__ai_api_key_tip')" @update:model-value="setApiKey")
    .p
      .p.small {{ $t('setting__ai_model') }}
      div
        base-input(:class="$style.fullWidth" :model-value="appSetting['ai.model']" :placeholder="$t('setting__ai_model_tip')" @update:model-value="setModel")
    .p
      .p.small {{ $t('setting__ai_tag_max_count') }}
      div
        base-input(:class="$style.fullWidth" :model-value="String(appSetting['ai.tag.maxCount'])" type="number" @update:model-value="setMaxCount")
    .p
      .p.small {{ $t('setting__ai_tag_merge_mode') }}
      div
        base-selection(
          :class="$style.fullWidth"
          :list="mergeModeList"
          :model-value="appSetting['ai.tag.mergeMode']"
          item-key="id"
          item-name="name"
          @update:model-value="setMergeMode"
        )
    .p
      .p.small {{ $t('setting__ai_system_prompt') }}
      textarea.scroll(
        :class="$style.promptInput"
        :value="appSetting['ai.systemPrompt']"
        :placeholder="$t('setting__ai_system_prompt_tip')"
        @input="setSystemPrompt($event.target.value)"
      )
</template>

<script>
import { computed } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { debounce } from '@common/utils'
import { appSetting, updateSetting } from '@renderer/store/setting'

export default {
  name: 'SettingAI',
  setup() {
    const t = useI18n()

    const mergeModeList = computed(() => [
      { id: 'replace', name: t('setting__ai_tag_merge_mode_replace') },
      { id: 'append', name: t('setting__ai_tag_merge_mode_append') },
    ])

    const setBaseUrl = debounce(value => {
      updateSetting({ 'ai.baseUrl': value.trim() })
    }, 500)

    const setApiKey = debounce(value => {
      updateSetting({ 'ai.apiKey': value.trim() })
    }, 500)

    const setModel = debounce(value => {
      updateSetting({ 'ai.model': value.trim() })
    }, 500)

    const setMaxCount = debounce(value => {
      const num = Math.min(100, Math.max(1, parseInt(value, 10) || 10))
      updateSetting({ 'ai.tag.maxCount': num })
    }, 500)

    const setMergeMode = (mode) => {
      updateSetting({ 'ai.tag.mergeMode': mode })
    }

    const setSystemPrompt = debounce(value => {
      updateSetting({ 'ai.systemPrompt': value })
    }, 500)

    return {
      appSetting,
      mergeModeList,
      setBaseUrl,
      setApiKey,
      setModel,
      setMaxCount,
      setMergeMode,
      setSystemPrompt,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.fullWidth {
  width: 100% !important;
  max-width: 100%;
  box-sizing: border-box;
}
.promptInput {
  display: block;
  width: 100%;
  min-height: 260px;
  margin-top: 4px;
  border: none;
  outline: none;
  border-radius: @form-radius;
  padding: 8px;
  color: var(--color-button-font);
  background-color: var(--color-primary-light-200-alpha-900);
  box-sizing: border-box;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}
</style>
