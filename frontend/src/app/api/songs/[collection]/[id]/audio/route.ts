import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { collection: string, id: string } }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const apiKey = process.env.NEXT_API_KEY

  if (!apiUrl || !apiKey) {
    return new NextResponse('Missing NEXT_PUBLIC_API_URL or NEXT_API_KEY', { status: 500 })
  }

  const res = await fetch(`${apiUrl}/songs/${encodeURIComponent(params.collection)}/${encodeURIComponent(params.id)}/audio`, {
    headers: { 'X-API-Key': apiKey }
  })

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') || 'audio/mpeg',
      'cache-control': 'no-store'
    }
  })
}


