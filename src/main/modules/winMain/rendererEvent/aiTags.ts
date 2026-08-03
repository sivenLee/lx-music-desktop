import { mainHandle } from '@common/mainIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import defaultSetting from '@common/defaultSetting'
import { httpFetch } from '@main/utils/request'

export interface GenerateMusicTagsParams {
  title: string
  artist: string
  album?: string
  genre?: string
  year?: string
  comment?: string
  lyrics?: string
}

interface ChatCompletionResponse {
  choices?: Array<{
    finish_reason?: string
    message?: {
      content?: string | Array<{ type?: string, text?: string }>
      reasoning_content?: string
      reasoning?: string
    }
    text?: string
    delta?: {
      content?: string
    }
  }>
  /** 部分兼容端点（如阿里云 MaaS）直接返回 text */
  text?: string
  output?: {
    text?: string
  }
  error?: {
    message?: string
  }
}

const stringifyMessageContent = (content: unknown): string => {
  if (typeof content == 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((item: { text?: string }) => (typeof item?.text == 'string' ? item.text : ''))
    .filter(Boolean)
    .join('\n')
}

const extractResponseContent = (body: ChatCompletionResponse | undefined): string => {
  if (!body) return ''
  const choice = body.choices?.[0]
  const message = choice?.message
  const fromMessage = stringifyMessageContent(message?.content)
  if (fromMessage.trim()) return fromMessage

  const fromChoices = choice?.text ?? choice?.delta?.content
  if (typeof fromChoices == 'string' && fromChoices.trim()) return fromChoices
  if (typeof body.text == 'string' && body.text.trim()) return body.text
  if (typeof body.output?.text == 'string' && body.output.text.trim()) return body.output.text

  // 思考模型在 max_tokens 不足时可能只有 reasoning，尝试从中兜底抽 JSON
  const reasoning = message?.reasoning_content ?? message?.reasoning
  if (typeof reasoning == 'string' && reasoning.trim()) return reasoning
  return ''
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '')

const buildUserPrompt = (params: GenerateMusicTagsParams) => {
  const lines = [
    `歌名：${params.title || '未知'}`,
    `歌手：${params.artist || '未知'}`,
  ]
  if (params.album) lines.push(`专辑：${params.album}`)
  if (params.genre) lines.push(`流派：${params.genre}`)
  if (params.year) lines.push(`年代：${params.year}`)
  if (params.comment) lines.push(`注释：${params.comment}`)
  if (params.lyrics) lines.push(`歌词：${params.lyrics}`)
  lines.push('请按要求输出 JSON。')
  return lines.join('\n')
}

const cleanTag = (tag: string) => tag.trim().replace(/^#+/, '').replace(/#+$/, '').trim()

const uniqueTags = (tags: string[], maxCount: number) => {
  const result: string[] = []
  const seen = new Set<string>()
  for (const raw of tags) {
    const tag = cleanTag(raw)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    result.push(tag)
    if (result.length >= maxCount) break
  }
  return result
}

const parseTagsFromContent = (content: string, maxCount: number): string[] => {
  const text = content.trim()
  if (!text) return []

  const tryParseJson = (raw: string): string[] | null => {
    try {
      const data = JSON.parse(raw) as { tags?: unknown }
      if (!Array.isArray(data.tags)) return null
      return uniqueTags(data.tags.map(item => String(item)), maxCount)
    } catch {
      return null
    }
  }

  const direct = tryParseJson(text)
  if (direct?.length) return direct

  const jsonMatch = /\{[\s\S]*"tags"\s*:\s*\[[\s\S]*\][\s\S]*\}/.exec(text)
  if (jsonMatch) {
    const fromBlock = tryParseJson(jsonMatch[0])
    if (fromBlock?.length) return fromBlock
  }

  // 截断或不完整 JSON：从 tags 数组片段里抽引号字符串
  const tagsArrayMatch = /"tags"\s*:\s*\[([\s\S]*)/.exec(text)
  if (tagsArrayMatch) {
    const quoted = [...tagsArrayMatch[1].matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)]
      .map(item => item[1].replace(/\\"/g, '"'))
    if (quoted.length) return uniqueTags(quoted, maxCount)
  }

  const arrayMatch = /\[[\s\S]*?\]/.exec(text)
  if (arrayMatch) {
    try {
      const arr = JSON.parse(arrayMatch[0]) as unknown
      if (Array.isArray(arr)) return uniqueTags(arr.map(item => String(item)), maxCount)
    } catch {}
  }

  const splitTags = text
    .split(/[\n,，、#;；|/]+/)
    .map(cleanTag)
    .filter(Boolean)
  return uniqueTags(splitTags, maxCount)
}

const optionalText = (value?: string) => {
  const text = value?.trim()
  if (!text) return undefined
  return text
}

export const generateMusicTags = async(params: GenerateMusicTagsParams): Promise<{ tags: string[] }> => {
  const title = params.title?.trim() ?? ''
  const artist = params.artist?.trim() ?? ''
  if (!title && !artist) throw new Error('请至少提供标题或艺术家')

  const setting = global.lx.appSetting
  const baseUrl = normalizeBaseUrl(setting['ai.baseUrl'] || 'http://127.0.0.1:11434/v1')
  if (!baseUrl) throw new Error('请先在设置中配置 AI 接口地址')

  const model = (setting['ai.model'] || 'qwen2.5:3b').trim()
  if (!model) throw new Error('请先在设置中配置 AI 模型名称')

  const maxCount = Math.min(100, Math.max(1, setting['ai.tag.maxCount'] || 10))
  const apiKey = (setting['ai.apiKey'] || '').trim()
  const systemPrompt = (setting['ai.systemPrompt'] || '').trim() || defaultSetting['ai.systemPrompt']
  const url = `${baseUrl}/chat/completions`

  const headers: Record<string, string> = {}
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const requestBody: Record<string, unknown> = {
    model,
    temperature: 0.4,
    // 思考模型会先消耗 reasoning tokens；过小会导致 content 为空
    max_tokens: Math.max(4096, maxCount * 24),
    // DeepSeek V4 等默认开启思考；标签生成无需长推理
    thinking: { type: 'disabled' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: buildUserPrompt({
          title,
          artist,
          album: optionalText(params.album),
          genre: optionalText(params.genre),
          year: optionalText(params.year),
          comment: optionalText(params.comment),
          lyrics: optionalText(params.lyrics),
        }),
      },
    ],
  }

  console.log('[AI Tags] request', {
    url,
    hasApiKey: Boolean(apiKey),
    body: requestBody,
  })

  const response = await httpFetch<ChatCompletionResponse>(url, {
    method: 'POST',
    headers,
    timeout: 180000,
    retryNum: 0,
    maxRedirect: 0,
    json: requestBody,
  })

  console.log('[AI Tags] response', {
    statusCode: response.statusCode,
    statusMessage: response.statusMessage,
    finishReason: response.body?.choices?.[0]?.finish_reason,
    message: response.body?.choices?.[0]?.message,
    text: response.body?.text,
    usage: (response.body as { usage?: unknown } | undefined)?.usage,
  })

  if (response.statusCode && response.statusCode >= 400) {
    const message = response.body?.error?.message || response.statusMessage || `HTTP ${response.statusCode}`
    throw new Error(message)
  }

  const content = extractResponseContent(response.body)
  if (!content.trim()) {
    const finishReason = response.body?.choices?.[0]?.finish_reason
    if (finishReason === 'length') {
      throw new Error('模型输出被截断（思考占用了 token），请重试或换用不带长思考的模型')
    }
    throw new Error('模型未返回内容，请检查模型是否已启动')
  }

  const tags = parseTagsFromContent(content, maxCount)
  console.log('[AI Tags] parsed tags', tags)
  if (!tags.length) throw new Error('未能解析出标签，请重试')
  return { tags }
}

export default () => {
  mainHandle<GenerateMusicTagsParams, { tags: string[] }>(
    WIN_MAIN_RENDERER_EVENT_NAME.ai_generate_music_tags,
    async({ params }) => generateMusicTags(params),
  )
}
