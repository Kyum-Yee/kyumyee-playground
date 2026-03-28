export interface Poster {
  post(content: string, title?: string, extra?: Record<string, unknown>): Promise<string>
  delete(postId: string): Promise<void>
  isConfigured(): boolean
  status(): { configured: boolean; platform: string }
}

export async function checkResponse(resp: Response, platform: string): Promise<void> {
  if (!resp.ok) {
    const text = await resp.text()
    console.error(`[${platform}] API error ${resp.status}:`, text)
    throw new Error(`${platform} API error: ${resp.status}`)
  }
}
