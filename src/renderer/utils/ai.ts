import { appSetting } from '@renderer/store/setting'

/** AI 标签所需最小配置：接口地址 + 模型名称 */
export const isAiTagConfigValid = (setting: LX.AppSetting = appSetting): boolean => {
  return Boolean(setting['ai.baseUrl']?.trim() && setting['ai.model']?.trim())
}
