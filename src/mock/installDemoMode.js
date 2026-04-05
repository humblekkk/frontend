import { getHomeAssistantReply } from '@/mock/demoApi'

const buildJsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    return payload
  },
})

export const installDemoMode = () => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return
  }

  if (window.__SMART_CLASS_DEMO_FETCH_INSTALLED__) {
    return
  }

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input, init) => {
    const requestUrl = typeof input === 'string' ? input : input?.url || ''

    if (requestUrl === 'https://api.anthropic.com/v1/messages') {
      try {
        const requestBody = init?.body ? JSON.parse(init.body) : {}
        const latestMessage = Array.isArray(requestBody.messages)
          ? [...requestBody.messages].reverse().find((item) => item?.role === 'user')
          : null
        const question = latestMessage?.content || ''
        const reply = await getHomeAssistantReply(question)

        return buildJsonResponse({
          content: [{ type: 'text', text: reply }],
        })
      } catch {
        return buildJsonResponse({
          content: [{ type: 'text', text: '演示数据加载失败，请稍后重试。' }],
        }, 500)
      }
    }

    return originalFetch(input, init)
  }

  window.__SMART_CLASS_DEMO_FETCH_INSTALLED__ = true
}
