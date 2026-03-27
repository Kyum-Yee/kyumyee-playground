import crypto from 'crypto'
import OAuth from 'oauth-1.0a'
import { checkResponse, type Poster } from './base'

export class XPoster implements Poster {
  private apiKey = process.env.X_API_KEY ?? ''
  private apiSecret = process.env.X_API_SECRET ?? ''
  private accessToken = process.env.X_ACCESS_TOKEN ?? ''
  private accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET ?? ''

  isConfigured() {
    return Boolean(this.apiKey && this.apiSecret && this.accessToken && this.accessTokenSecret)
  }

  status() {
    return { configured: this.isConfigured(), platform: 'x' }
  }

  private buildOAuth() {
    return new OAuth({
      consumer: { key: this.apiKey, secret: this.apiSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64')
      },
    })
  }

  async post(content: string): Promise<string> {
    const url = 'https://api.twitter.com/2/tweets'
    const oauth = this.buildOAuth()
    const token = { key: this.accessToken, secret: this.accessTokenSecret }
    const body = JSON.stringify({ text: content.slice(0, 280) })

    const authHeader = oauth.toHeader(oauth.authorize({ url, method: 'POST' }, token))

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
      body,
    })
    await checkResponse(resp, 'X')
    const data = await resp.json()
    return data.data.id as string
  }

  async delete(postId: string): Promise<void> {
    const url = `https://api.twitter.com/2/tweets/${postId}`
    const oauth = this.buildOAuth()
    const token = { key: this.accessToken, secret: this.accessTokenSecret }
    const authHeader = oauth.toHeader(oauth.authorize({ url, method: 'DELETE' }, token))

    const resp = await fetch(url, { method: 'DELETE', headers: { ...authHeader } })
    await checkResponse(resp, 'X')
  }
}
