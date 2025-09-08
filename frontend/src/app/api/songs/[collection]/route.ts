import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { collection: string } }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const apiKey = process.env.NEXT_API_KEY

  if (!apiUrl || !apiKey) {
    return new NextResponse('Missing NEXT_PUBLIC_API_URL or NEXT_API_KEY', { status: 500 })
  }

  const url = new URL(_req.url)
  const noshuffle = url.searchParams.get('noshuffle') ?? 'false'

  const res = await fetch(`${apiUrl}/songs/${encodeURIComponent(params.collection)}?noshuffle=${encodeURIComponent(noshuffle)}`, {
    headers: { 'X-API-Key': apiKey }
  })

  const contentType = res.headers.get('content-type') || 'application/json'
  return new NextResponse(res.body, {
    status: res.status,
    headers: { 'content-type': contentType, 'cache-control': 'no-store' }
  })
}


