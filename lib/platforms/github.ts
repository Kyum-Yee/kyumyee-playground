import { checkResponse, type Poster } from './base'

export class GitHubPusher implements Poster {
  private token = process.env.GITHUB_TOKEN ?? ''
  private owner = process.env.GITHUB_OWNER ?? ''
  private repo = process.env.GITHUB_REPO ?? ''

  isConfigured() {
    return Boolean(this.token && this.owner && this.repo)
  }

  status() {
    return { configured: this.isConfigured(), platform: 'github' }
  }

  async post(content: string, title = 'post'): Promise<string> {
    const filename = `${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.md`
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${filename}`

    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        message: `Add: ${title}`,
        content: Buffer.from(content).toString('base64'),
      }),
    })
    await checkResponse(resp, 'GitHub')
    const data = await resp.json()
    return data.content.sha as string
  }

  async delete(sha: string): Promise<void> {
    // sha format: "filename::sha" stored by post()
    // Simplified: requires knowing the file path; store as "path::sha"
    const [filePath, fileSha] = sha.split('::')
    if (!filePath || !fileSha) throw new Error('GitHub delete requires "path::sha" format')

    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${filePath}`
    const resp = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `Delete: ${filePath}`, sha: fileSha }),
    })
    await checkResponse(resp, 'GitHub')
  }
}
