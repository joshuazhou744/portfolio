import { NextResponse } from 'next/server'

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const apiKey = process.env.NEXT_API_KEY

  if (!apiUrl || !apiKey) {
    return new NextResponse('Missing NEXT_PUBLIC_API_URL or NEXT_API_KEY', { status: 500 })
  }

  const res = await fetch(`${apiUrl}/experiences`, {
    headers: { 'X-API-Key': apiKey }
  })

  const contentType = res.headers.get('content-type') || 'application/json'
  return new NextResponse(res.body, {
    status: res.status,
    headers: { 'content-type': contentType, 'cache-control': 'no-store' }
  })
}


