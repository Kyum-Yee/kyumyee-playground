import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { NotionPublisher } from '@/lib/platforms/notion'
import { XPoster } from '@/lib/platforms/x'
import { GitHubPusher } from '@/lib/platforms/github'
import { LinkedInPoster } from '@/lib/platforms/linkedin'
import { ThreadsPoster } from '@/lib/platforms/threads'
import { MastodonPoster } from '@/lib/platforms/mastodon'
import { RedditPoster } from '@/lib/platforms/reddit'
import type { Poster } from '@/lib/platforms/base'

export const runtime = 'nodejs'
export const maxDuration = 60

// ── Platform registry ──────────────────────────────────────────────────────────

const PLATFORM_MAP: Record<string, () => Poster> = {
  notion: () => new NotionPublisher(),
  x: () => new XPoster(),
  github: () => new GitHubPusher(),
  linkedin: () => new LinkedInPoster(),
  threads: () => new ThreadsPoster(),
  mastodon: () => new MastodonPoster(),
  reddit: () => new RedditPoster(),
}

function getPlatform(name: string): Poster {
  const factory = PLATFORM_MAP[name]
  if (!factory) throw new Error(`Unknown platform: ${name}. Valid: ${Object.keys(PLATFORM_MAP).join(', ')}`)
  return factory()
}

// ── In-memory scheduler (MVP) ─────────────────────────────────────────────────

interface ScheduledJob {
  job_id: string
  platform: string
  content: string
  title: string
  at: string
  extra: Record<string, unknown>
}

const scheduledJobs: Map<string, ScheduledJob> = new Map()

function scheduleJob(job: Omit<ScheduledJob, 'job_id'>): string {
  const job_id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  scheduledJobs.set(job_id, { ...job, job_id })
  const delay = new Date(job.at).getTime() - Date.now()
  if (delay > 0) {
    setTimeout(async () => {
      const j = scheduledJobs.get(job_id)
      if (!j) return
      try {
        const poster = getPlatform(j.platform)
        await poster.post(j.content, j.title, j.extra)
      } catch (_) { /* best-effort */ }
      scheduledJobs.delete(job_id)
    }, delay)
  }
  return job_id
}

// ── MCP Server factory ────────────────────────────────────────────────────────

function buildMcpServer() {
  const server = new McpServer({ name: 'kyumyee', version: '1.0.0' })

  // help
  server.tool('help', 'List all available tools and their signatures', {}, async () => ({
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        tools: [
          'help()',
          'deploy_content(platform, content, title?, schedule?, extra?)',
          'recall_content(platform, post_id)',
          'get_deploy_status(platform?)',
          'list_scheduled()',
          'cancel_scheduled(job_id)',
          'transform_style(content, style, max_exaggeration?)',
        ],
        platforms: Object.keys(PLATFORM_MAP),
        styles: ['logical_thinking', 'keep_original'],
      }),
    }],
  }))

  // deploy_content
  server.tool(
    'deploy_content',
    'Deploy content to a platform (immediately or scheduled)',
    {
      platform: z.enum(['notion', 'x', 'github', 'linkedin', 'threads', 'mastodon', 'reddit']),
      content: z.string(),
      title: z.string().optional(),
      schedule: z.string().optional().describe('ISO 8601 datetime for scheduled post'),
      extra: z.record(z.string(), z.unknown()).optional(),
    },
    async ({ platform, content, title = '', schedule, extra = {} }) => {
      if (schedule) {
        const job_id = scheduleJob({ platform, content, title, at: schedule, extra })
        return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, scheduled: true, job_id, at: schedule }) }] }
      }
      const poster = getPlatform(platform)
      const post_id = await poster.post(content, title, extra)
      return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, platform, post_id }) }] }
    },
  )

  // recall_content
  server.tool(
    'recall_content',
    'Delete/recall a previously deployed post',
    {
      platform: z.enum(['notion', 'x', 'github', 'linkedin', 'threads', 'mastodon', 'reddit']),
      post_id: z.string(),
    },
    async ({ platform, post_id }) => {
      const poster = getPlatform(platform)
      await poster.delete(post_id)
      return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, platform, recalled: post_id }) }] }
    },
  )

  // get_deploy_status
  server.tool(
    'get_deploy_status',
    'Get deployment status (configuration) for one or all platforms',
    { platform: z.string().optional() },
    async ({ platform }) => {
      if (platform) {
        const poster = getPlatform(platform)
        return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, ...poster.status() }) }] }
      }
      const statuses = Object.fromEntries(
        Object.keys(PLATFORM_MAP).map(p => [p, PLATFORM_MAP[p]().status()])
      )
      return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, statuses }) }] }
    },
  )

  // list_scheduled
  server.tool('list_scheduled', 'List all scheduled (pending) deployments', {}, async () => ({
    content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, jobs: Array.from(scheduledJobs.values()) }) }],
  }))

  // cancel_scheduled
  server.tool(
    'cancel_scheduled',
    'Cancel a scheduled deployment by job ID',
    { job_id: z.string() },
    async ({ job_id }) => {
      scheduledJobs.delete(job_id)
      return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, cancelled: job_id }) }] }
    },
  )

  // transform_style
  server.tool(
    'transform_style',
    'Transform content style using Claude API',
    {
      content: z.string(),
      style: z.enum(['logical_thinking', 'keep_original']),
      max_exaggeration: z.number().int().min(0).default(1),
    },
    async ({ content, style, max_exaggeration }) => {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const styleInstructions: Record<string, string> = {
        logical_thinking: `Rewrite the following content in a concise, logical style. Remove unnecessary filler words. Keep at most ${max_exaggeration} exaggerated expression(s). Return only the rewritten content.`,
        keep_original: `Lightly polish the following content while preserving the author's original voice and style. Keep at most ${max_exaggeration} exaggerated expression(s). Return only the polished content.`,
      }

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `${styleInstructions[style]}\n\n---\n${content}`,
          },
        ],
      })

      const transformed = message.content[0].type === 'text' ? message.content[0].text : ''
      return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, transformed }) }] }
    },
  )

  return server
}

// ── Next.js route handler ─────────────────────────────────────────────────────

export async function POST(request: Request) {
  const server = buildMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
    enableJsonResponse: true,
  })
  await server.connect(transport)
  return transport.handleRequest(request)
}

export async function DELETE(request: Request) {
  const server = buildMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })
  await server.connect(transport)
  return transport.handleRequest(request)
}

export async function GET() {
  return new Response(JSON.stringify({ name: 'kyumyee MCP', version: '1.0.0', tools: 7 }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
