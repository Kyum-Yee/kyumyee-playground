import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/mcp')) {
    const expectedKey = process.env.MCP_API_KEY
    if (!expectedKey) return NextResponse.next() // dev: env 미설정 시 통과
    const auth = request.headers.get('Authorization')
    if (auth !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/mcp/:path*'],
}
