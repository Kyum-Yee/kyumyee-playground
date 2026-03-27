import { checkResponse, type Poster } from './base'

export class ThreadsPoster implements Poster {
  private token = process.env.THREADS_ACCESS_TOKEN ?? ''
  private userId = process.env.THREADS_USER_ID ?? ''

  isConfigured() {
    return Boolean(this.token && this.userId)
  }

  status() {
    return { configured: this.isConfigured(), platform: 'threads' }
  }

  async post(content: string): Promise<string> {
    // Step 1: create container
    const createUrl = new URL(`https://graph.threads.net/v1.0/${this.userId}/threads`)
    createUrl.searchParams.set('media_type', 'TEXT')
    createUrl.searchParams.set('text', content)
    createUrl.searchParams.set('access_token', this.token)

    const createResp = await fetch(createUrl.toString(), { method: 'POST' })
    await checkResponse(createResp, 'Threads')
    const { id: containerId } = await createResp.json()

    // Step 2: publish
    const publishUrl = new URL(`https://graph.threads.net/v1.0/${this.userId}/threads_publish`)
    publishUrl.searchParams.set('creation_id', containerId)
    publishUrl.searchParams.set('access_token', this.token)

    const publishResp = await fetch(publishUrl.toString(), { method: 'POST' })
    await checkResponse(publishResp, 'Threads')
    const { id } = await publishResp.json()
    return id as string
  }

  async delete(postId: string): Promise<void> {
    const url = new URL(`https://graph.threads.net/v1.0/${postId}`)
    url.searchParams.set('access_token', this.token)
    const resp = await fetch(url.toString(), { method: 'DELETE' })
    await checkResponse(resp, 'Threads')
  }
}
