const DEFAULT_BASE_URL = "http://localhost:8000"

export function getEngineApiBaseUrl() {
  return process.env.NEXT_PUBLIC_ENGINE_API_URL || DEFAULT_BASE_URL
}

export async function fetchEngineJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getEngineApiBaseUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}