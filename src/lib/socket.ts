const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL ||
  (import.meta.env.PROD
    ? '/graphql'
    : typeof window !== 'undefined'
      ? window.location.protocol + '//' + window.location.hostname + ':3008/graphql'
      : 'http://localhost:3008/graphql')

export type SocketConnectionConfig = {
  origin: string
  path: string
}

const DEFAULT_SOCKET_PATH = '/socket.io'

function getBrowserOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:3008'
}

function getOriginFromGraphqlUrl(): string {
  const graphqlBase = GRAPHQL_URL.replace(/\/graphql\/?$/, '')

  try {
    return new URL(graphqlBase).origin
  } catch {
    return getBrowserOrigin()
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}

function normalizeSocketConfig(rawSocketUrl?: string): SocketConnectionConfig {
  const trimmedUrl = rawSocketUrl?.trim()

  if (!trimmedUrl) {
    return {
      origin: getOriginFromGraphqlUrl(),
      path: DEFAULT_SOCKET_PATH,
    }
  }

  if (trimmedUrl.startsWith('/')) {
    return {
      origin: getBrowserOrigin(),
      path: trimTrailingSlash(trimmedUrl) || DEFAULT_SOCKET_PATH,
    }
  }

  try {
    const url = new URL(trimmedUrl)
    return {
      origin: url.origin,
      path: trimTrailingSlash(url.pathname) || DEFAULT_SOCKET_PATH,
    }
  } catch {
    return {
      origin: getBrowserOrigin(),
      path: trimTrailingSlash(trimmedUrl) || DEFAULT_SOCKET_PATH,
    }
  }
}

export function buildSocketConnectionConfig(): SocketConnectionConfig {
  return normalizeSocketConfig(import.meta.env.VITE_WS_URL as string | undefined)
}
