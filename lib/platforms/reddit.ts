import { checkResponse, type Poster } from './base'

export class RedditPoster implements Poster {
  private clientId = process.env.REDDIT_CLIENT_ID ?? ''
  private clientSecret = process.env.REDDIT_CLIENT_SECRET ?? ''
  private username = process.env.REDDIT_USERNAME ?? ''
  private password = process.env.REDDIT_PASSWORD ?? ''

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret && this.username && this.password)
  }

  status() {
    return { configured: this.isConfigured(), platform: 'reddit' }
  }

  private async getToken(): Promise<string> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    const body = new URLSearchParams({
      grant_type: 'password',
      username: this.username,
      password: this.password,
    })
    const resp = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'kyumyee-playground/1.0',
      },
      body: body.toString(),
    })
    await checkResponse(resp, 'Reddit')
    const data = await resp.json()
    return data.access_token as string
  }

  async post(content: string, title = 'Post', extra?: Record<string, unknown>): Promise<string> {
    const token = await this.getToken()
    const subreddit = (extra?.subreddit as string) ?? 'test'

    const body = new URLSearchParams({
      sr: subreddit,
      kind: 'self',
      title,
      text: content,
      api_type: 'json',
    })

    const resp = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'kyumyee-playground/1.0',
      },
      body: body.toString(),
    })
    await checkResponse(resp, 'Reddit')
    const data = await resp.json()
    return data.json.data.id as string
  }

  async delete(postId: string): Promise<void> {
    const token = await this.getToken()
    const body = new URLSearchParams({ id: `t3_${postId}` })

    const resp = await fetch('https://oauth.reddit.com/api/del', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'kyumyee-playground/1.0',
      },
      body: body.toString(),
    })
    await checkResponse(resp, 'Reddit')
  }
}
