import { NextResponse } from 'next/server'

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const apiKey = process.env.NEXT_API_KEY

  if (!apiUrl || !apiKey) {
    return new NextResponse('Missing NEXT_PUBLIC_API_URL or NEXT_API_KEY', { status: 500 })
  }

  const res = await fetch(`${apiUrl}/resume/download`, {
    headers: { 'X-API-Key': apiKey }
  })

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') || 'application/pdf',
      'content-disposition': res.headers.get('content-disposition') || 'attachment',
      'cache-control': 'no-store'
    }
  })
}


