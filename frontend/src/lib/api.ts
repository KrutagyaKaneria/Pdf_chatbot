// Use a relative base by default so development requests can be proxied
// by the CRA dev server (see package.json `proxy`), avoiding cross-origin
// cookie issues during local development. In non-local builds, prefer the
// configured API URL and ignore localhost values that may have been baked
// into a bundle by accident.
function resolveApiBaseUrl() {
  const configuredBaseUrl = (
    process.env.REACT_APP_API_BASE_URL ?? process.env.REACT_APP_BACKEND_URL ?? ''
  ).trim()
  if (typeof window === 'undefined') {
    return configuredBaseUrl
  }

  const isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  if (configuredBaseUrl && (!configuredBaseUrl.includes('localhost') || isLocalHost)) {
    return configuredBaseUrl.replace(/\/$/, '')
  }

  return isLocalHost ? '' : window.location.origin
}

const API_BASE_URL = resolveApiBaseUrl()

type StoredUser = {
  user_id: string
  email?: string
  name?: string
}

type AuthSession = {
  accessToken: string | null
  user: StoredUser | null
}

type AuthResponse = {
  success: boolean
  message?: string
  data?: {
    user?: StoredUser
    tokens?: { access_token?: string }
  }
  user?: StoredUser
  tokens?: { access_token?: string }
}

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_KEY = 'auth_user'
let refreshPromise: Promise<AuthSession | null> | null = null

export function getStoredAuth(): AuthSession {
  if (typeof window === 'undefined') {
    return { accessToken: null, user: null }
  }
  const accessToken = window.localStorage.getItem(AUTH_TOKEN_KEY)
  const userRaw = window.localStorage.getItem(AUTH_USER_KEY)
  let user: StoredUser | null = null
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as StoredUser
    } catch {
      window.localStorage.removeItem(AUTH_USER_KEY)
    }
  }
  return { accessToken, user }
}

export function storeAuthSession(accessToken: string | null, user: StoredUser | null) {
  if (typeof window === 'undefined') return
  if (accessToken) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken)
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
  }
  if (user) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  } else {
    window.localStorage.removeItem(AUTH_USER_KEY)
  }
}

export function clearAuthSession() {
  storeAuthSession(null, null)
}

async function parseAuthResponse(response: Response): Promise<AuthSession> {
  const payload = (await response.json()) as AuthResponse
  const user = payload.data?.user ?? payload.user ?? null
  const accessToken = payload.data?.tokens?.access_token ?? payload.tokens?.access_token ?? null
  if (!user || !accessToken) {
    throw new Error(payload.message || 'Authentication failed')
  }
  storeAuthSession(accessToken, user)
  return { accessToken, user }
}

export async function loginRequest(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.detail || payload?.message || 'Login failed')
  }
  return parseAuthResponse(response)
}

export async function signupRequest(name: string, email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.detail || payload?.message || 'Signup failed')
  }
  return parseAuthResponse(response)
}

export async function logoutRequest() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
    })
  } finally {
    clearAuthSession()
  }
}

export async function refreshAccessToken(): Promise<AuthSession | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!response.ok) {
      clearAuthSession()
      return null
    }
    return parseAuthResponse(response)
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

export function authHeaders(): Record<string, string> {
  const { accessToken } = getStoredAuth()
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}

async function retryAfterRefresh(input: RequestInfo | URL, init: RequestInit | undefined, originalResponse: Response) {
  if (originalResponse.status !== 401) {
    return originalResponse
  }

  const refreshed = await refreshAccessToken()
  if (!refreshed?.accessToken) {
    return originalResponse
  }

  const nextHeaders = new Headers(init?.headers || {})
  nextHeaders.set('Authorization', `Bearer ${refreshed.accessToken}`)
  const nextInit: RequestInit = {
    ...init,
    headers: nextHeaders,
  }
  return fetch(input, nextInit)
}

export async function apiFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {})
  const { accessToken } = getStoredAuth()
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  const response = await fetch(`${API_BASE_URL}${input}`, {
    ...init,
    headers,
    credentials: 'include',
  })
  return retryAfterRefresh(`${API_BASE_URL}${input}`, { ...init, headers }, response)
}

export async function apiJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(input, init)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || 'Request failed')
  }
  return payload as T
}

export function uploadPdf(
  file: File,
  onProgress: (percent: number) => void,
): Promise<Response> {
  return new Promise(async (resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const send = async (token?: string | null) => {
      const request = new XMLHttpRequest()
      request.open('POST', `${API_BASE_URL}/upload-pdf`)
      request.withCredentials = true
      if (token) {
        request.setRequestHeader('Authorization', `Bearer ${token}`)
      }
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      }
      request.onload = async () => {
        if (request.status === 401) {
          const refreshed = await refreshAccessToken()
          if (refreshed?.accessToken) {
            send(refreshed.accessToken)
            return
          }
        }
        resolve(new Response(request.responseText, { status: request.status, statusText: request.statusText }))
      }
      request.onerror = () => reject(new Error('Upload failed'))
      request.send(formData)
    }

    const token = getStoredAuth().accessToken
    if (!token) {
      const refreshed = await refreshAccessToken()
      if (!refreshed?.accessToken) {
        reject(new Error('Missing session'))
        return
      }
      send(refreshed.accessToken)
      return
    }
    send(token)
  })
}

export type { StoredUser }
