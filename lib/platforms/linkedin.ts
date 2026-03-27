import { checkResponse, type Poster } from './base'

export class LinkedInPoster implements Poster {
  private token = process.env.LINKEDIN_ACCESS_TOKEN ?? ''
  private authorUrn = process.env.LINKEDIN_AUTHOR_URN ?? ''

  isConfigured() {
    return Boolean(this.token && this.authorUrn)
  }

  status() {
    return { configured: this.isConfigured(), platform: 'linkedin' }
  }

  async post(content: string): Promise<string> {
    const resp = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: this.authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    })
    await checkResponse(resp, 'LinkedIn')
    const id = resp.headers.get('x-restli-id') ?? ''
    return id
  }

  async delete(postId: string): Promise<void> {
    const encodedId = encodeURIComponent(postId)
    const resp = await fetch(`https://api.linkedin.com/v2/ugcPosts/${encodedId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })
    await checkResponse(resp, 'LinkedIn')
  }
}
