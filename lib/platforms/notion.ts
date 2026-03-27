import { checkResponse, type Poster } from './base'

export class NotionPublisher implements Poster {
  private token = process.env.NOTION_TOKEN ?? ''
  private parentId = process.env.NOTION_PARENT_PAGE_ID ?? ''

  isConfigured() {
    return Boolean(this.token && this.parentId)
  }

  status() {
    return { configured: this.isConfigured(), platform: 'notion' }
  }

  async post(content: string, title = 'Untitled'): Promise<string> {
    const resp = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { page_id: this.parentId },
        properties: {
          title: { title: [{ text: { content: title } }] },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ text: { content: content } }] },
          },
        ],
      }),
    })
    await checkResponse(resp, 'Notion')
    const data = await resp.json()
    return data.id as string
  }

  async delete(postId: string): Promise<void> {
    const resp = await fetch(`https://api.notion.com/v1/blocks/${postId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': '2022-06-28',
      },
    })
    await checkResponse(resp, 'Notion')
  }
}
