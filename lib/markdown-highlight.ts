// server/client 양쪽에서 import 해서 쓴다. fs 등 server 전용 API 없음.
import hljs from 'highlight.js/lib/core'
import markdown from 'highlight.js/lib/languages/markdown'

let registered = false
function ensureRegistered() {
  if (registered) return
  hljs.registerLanguage('markdown', markdown)
  registered = true
}

/** raw markdown 문자열을 standard hljs-* 토큰 클래스로 감싸 HTML 반환. 빈 입력은 빈 문자열. */
export function highlightMarkdown(body: string): string {
  if (!body) return ''
  ensureRegistered()
  return hljs.highlight(body, { language: 'markdown' }).value
}
