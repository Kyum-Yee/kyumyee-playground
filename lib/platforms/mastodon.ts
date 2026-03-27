import { checkResponse, type Poster } from './base'

export class MastodonPoster implements Poster {
  private token = process.env.MASTODON_ACCESS_TOKEN ?? ''
  private instance = process.env.MASTODON_INSTANCE ?? 'mastodon.social'

  isConfigured() {
    return Boolean(this.token)
  }

  status() {
    return { configured: this.isConfigured(), platform: 'mastodon' }
  }

  async post(content: string): Promise<string> {
    const resp = await fetch(`https://${this.instance}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: content }),
    })
    await checkResponse(resp, 'Mastodon')
    const data = await resp.json()
    return data.id as string
  }

  async delete(postId: string): Promise<void> {
    const resp = await fetch(`https://${this.instance}/api/v1/statuses/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` },
    })
    await checkResponse(resp, 'Mastodon')
  }
}
