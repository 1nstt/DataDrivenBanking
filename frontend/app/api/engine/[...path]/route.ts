import { NextRequest, NextResponse } from "next/server"

const BACKEND_BASE_URL = process.env.ENGINE_API_URL || "http://localhost:8000"

async function proxyRequest(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const url = new URL(`${BACKEND_BASE_URL}/${path.join("/")}`)
  url.search = request.nextUrl.search

  const headers = new Headers(request.headers)
  headers.delete("host")
  headers.delete("content-length")

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text()
  }

  const response = await fetch(url, init)
  const responseHeaders = new Headers(response.headers)
  responseHeaders.delete("content-encoding")
  responseHeaders.delete("content-length")

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context)
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 })
}
