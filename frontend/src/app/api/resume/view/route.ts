import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const apiKey = process.env.NEXT_API_KEY

  if (!apiUrl || !apiKey) {
    return new NextResponse('Missing NEXT_PUBLIC_API_URL or NEXT_API_KEY', { status: 500 })
  }

  const upstream = await fetch(`${apiUrl}/resume/view`, {
    headers: {
      'X-API-Key': apiKey
    }
  })

  const readable = upstream.body
  const contentType = upstream.headers.get('content-type') || 'application/pdf'
  const status = upstream.status

  return new NextResponse(readable, {
    status,
    headers: {
      'content-type': contentType,
      'cache-control': 'no-store'
    }
  })
}


