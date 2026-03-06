import { CONFIG } from './config'

export function validateToken(authHeader: string | null): boolean {
  if (!authHeader) return false
  const token = authHeader.replace(/^Bearer\s+/i, '')
  return token === CONFIG.DASHBOARD_TOKEN
}

export function getTokenFromQuery(url: URL): string | null {
  return url.searchParams.get('token')
}

export function isAuthValid(authHeader: string | null, queryToken: string | null): boolean {
  if (queryToken === CONFIG.DASHBOARD_TOKEN) return true
  return validateToken(authHeader)
}
