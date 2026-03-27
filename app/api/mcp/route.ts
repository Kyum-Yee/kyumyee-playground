import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
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

// ── Session-isolated state ─────────────────────────────────────────────────────

interface ScheduledJob {
  job_id: string
  platform: string
  content: string
  title: string
  at: string
  extra: Record<string, unknown>
}

interface GeminiTask {
  task_id: string
  status: 'pending' | 'done'
  prompt: string
  result?: string
  created: number
}

interface SessionState {
  scheduledJobs: Map<string, ScheduledJob>
  geminiTasks: Map<string, GeminiTask>
  lastActive: number
}

const sessions = new Map<string, SessionState>()
const SESSION_TTL_MS = 30 * 60 * 1000  // 30 minutes

function getSession(id: string): SessionState {
  const s = sessions.get(id)
  if (s) { s.lastActive = Date.now(); return s }
  const fresh: SessionState = {
    scheduledJobs: new Map(),
    geminiTasks: new Map(),
    lastActive: Date.now(),
  }
  sessions.set(id, fresh)
  return fresh
}

function evictExpired() {
  const cutoff = Date.now() - SESSION_TTL_MS
  for (const [id, s] of sessions) {
    if (s.lastActive < cutoff) sessions.delete(id)
  }
}

// ── MCP Server factory ────────────────────────────────────────────────────────

function buildMcpServer(sessionId: string) {
  evictExpired()
  const session = getSession(sessionId)
  const server = new McpServer({ name: 'kyumyee', version: '1.1.0' })

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
          'prepare_gemini_task(content, task_type, model?)',
          'submit_gemini_result(task_id, result)',
          'get_gemini_result(task_id)',
        ],
        platforms: Object.keys(PLATFORM_MAP),
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
        const job_id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const job: ScheduledJob = { job_id, platform, content, title, at: schedule, extra }
        session.scheduledJobs.set(job_id, job)
        const delay = new Date(schedule).getTime() - Date.now()
        if (delay > 0) {
          setTimeout(async () => {
            const j = session.scheduledJobs.get(job_id)
            if (!j) return
            try {
              const poster = getPlatform(j.platform)
              await poster.post(j.content, j.title, j.extra)
            } catch (_) { /* best-effort */ }
            session.scheduledJobs.delete(job_id)
          }, delay)
        }
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
  server.tool('list_scheduled', 'List all scheduled (pending) deployments for this session', {}, async () => ({
    content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, jobs: Array.from(session.scheduledJobs.values()) }) }],
  }))

  // cancel_scheduled
  server.tool(
    'cancel_scheduled',
    'Cancel a scheduled deployment by job ID',
    { job_id: z.string() },
    async ({ job_id }) => {
      session.scheduledJobs.delete(job_id)
      return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, cancelled: job_id }) }] }
    },
  )

  // ── Gemini CLI 위임 툴 ──────────────────────────────────────────────────────

  // prepare_gemini_task
  server.tool(
    'prepare_gemini_task',
    'Prepare a task for Gemini CLI execution. Returns a task_id and the CLI command to run.',
    {
      content: z.string(),
      task_type: z.enum(['transform', 'analyze', 'summarize']),
      model: z.string().optional().default('gemini-2.0-flash'),
    },
    async ({ content, task_type, model }) => {
      const task_id = `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

      const prompts: Record<string, string> = {
        transform: `Rewrite the following content in a clear, concise style:\n\n${content}`,
        analyze: `Analyze the following content and provide key insights:\n\n${content}`,
        summarize: `Summarize the following content in 3-5 sentences:\n\n${content}`,
      }
      const prompt = prompts[task_type]
      session.geminiTasks.set(task_id, { task_id, status: 'pending', prompt, created: Date.now() })

      const escapedPrompt = prompt.replace(/'/g, "'\\''")
      const cmd = `echo '${escapedPrompt}' | gemini --model "${model}" --output-format json`

      return { content: [{ type: 'text' as const, text: JSON.stringify({ task_id, cmd, status: 'pending' }) }] }
    },
  )

  // submit_gemini_result
  server.tool(
    'submit_gemini_result',
    'Submit the output from a Gemini CLI run back to the session.',
    { task_id: z.string(), result: z.string() },
    async ({ task_id, result }) => {
      const task = session.geminiTasks.get(task_id)
      if (!task) throw new Error(`Unknown task_id: ${task_id}`)
      task.result = result
      task.status = 'done'
      return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, task_id }) }] }
    },
  )

  // get_gemini_result
  server.tool(
    'get_gemini_result',
    'Retrieve the result of a completed Gemini task.',
    { task_id: z.string() },
    async ({ task_id }) => {
      const task = session.geminiTasks.get(task_id)
      if (!task) throw new Error(`Unknown task_id: ${task_id}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(task) }] }
    },
  )

  return server
}

// ── Next.js route handler ─────────────────────────────────────────────────────

export async function POST(request: Request) {
  const sessionId = request.headers.get('Mcp-Session-Id') ?? crypto.randomUUID()
  const server = buildMcpServer(sessionId)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  return transport.handleRequest(request)
}

export async function DELETE(request: Request) {
  const sessionId = request.headers.get('Mcp-Session-Id') ?? crypto.randomUUID()
  const server = buildMcpServer(sessionId)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
  })
  await server.connect(transport)
  return transport.handleRequest(request)
}

export async function GET() {
  return new Response(JSON.stringify({ name: 'kyumyee MCP', version: '1.1.0', tools: 9 }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
