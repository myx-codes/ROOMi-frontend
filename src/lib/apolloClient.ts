import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, from } from '@apollo/client'
import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { onError } from '@apollo/client/link/error'
import { setContext } from '@apollo/client/link/context'
import { Observable } from '@apollo/client/utilities'
import { clearAccessToken, getAccessToken } from '@/lib/auth'

const CSRF_STORAGE_KEY = 'csrfToken'

const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL ||
  (import.meta.env.PROD
    ? '/graphql'
    : typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:3008/graphql`
      : 'http://localhost:3008/graphql')

const httpLink = new HttpLink({
  uri: GRAPHQL_URL,
  credentials: 'include',
})

function getCookieValue(name: string): string {
  if (typeof document === 'undefined') return ''
  const encodedName = encodeURIComponent(name)
  const parts = document.cookie.split(';')

  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.startsWith(`${encodedName}=`)) {
      return decodeURIComponent(trimmed.slice(encodedName.length + 1))
    }
  }

  return ''
}

function getCsrfToken(): string {
  if (typeof window === 'undefined') return ''

  return (
    getCookieValue('XSRF-TOKEN') ||
    getCookieValue('CSRF-TOKEN') ||
    getCookieValue('roomi_csrf_token') ||
    getCookieValue('csrfToken') ||
    getCookieValue('_csrf') ||
    window.localStorage.getItem('XSRF-TOKEN') ||
    window.localStorage.getItem(CSRF_STORAGE_KEY) ||
    window.localStorage.getItem('csrfToken') ||
    ''
  )
}

function persistCsrfToken(token: string) {
  if (typeof window === 'undefined') return
  if (!token) return
  window.localStorage.setItem(CSRF_STORAGE_KEY, token)
}

function getCsrfBootstrapUrls(): string[] {
  const configuredCsrfUrl = (import.meta.env.VITE_CSRF_URL as string | undefined) || ''
  const baseOrigin = (() => {
    try {
      return new URL(GRAPHQL_URL).origin
    } catch {
      return ''
    }
  })()

  return [
    configuredCsrfUrl,
    baseOrigin ? `${baseOrigin}/csrf-token` : '',
    baseOrigin ? `${baseOrigin}/csrf` : '',
  ].filter(Boolean)
}

async function bootstrapCsrfToken(): Promise<string> {
  const existingToken = getCsrfToken()
  if (existingToken) return existingToken

  const urls = getCsrfBootstrapUrls()

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      })

      const tokenFromHeader = readCsrfFromResponseHeaders(response.headers)
      persistCsrfToken(tokenFromHeader)

      const tokenFromCookieOrStorage = getCsrfToken()
      if (tokenFromCookieOrStorage) {
        return tokenFromCookieOrStorage
      }
    } catch {
      // Ignore bootstrap failures and continue with the next URL candidate.
    }
  }

  return ''
}

function readCsrfFromResponseHeaders(headers?: Headers): string {
  if (!headers) return ''
  return (
    headers.get('x-csrf-token') ||
    headers.get('csrf-token') ||
    headers.get('x-xsrf-token') ||
    headers.get('X-CSRF-Token') ||
    ''
  )
}

const csrfLink = setContext(async (_, { headers }) => {
  const csrfToken = (await bootstrapCsrfToken()) || getCsrfToken()
  const accessToken = getAccessToken()
  const nextHeaders: Record<string, string> = { ...(headers as Record<string, string> | undefined) }

  if (accessToken) {
    nextHeaders.authorization = `Bearer ${accessToken}`
  }

  if (!csrfToken) {
    return { headers: nextHeaders }
  }

  return {
    headers: {
      ...nextHeaders,
      'x-csrf-token': csrfToken,
      'x-xsrf-token': csrfToken,
    },
  }
})

const captureCsrfLink = new ApolloLink((operation, forward) => {
  if (!forward) return null

  return new Observable((observer) => {
    const subscription = forward(operation).subscribe({
      next: (result) => {
        const response = operation.getContext().response as Response | undefined
        const csrfFromHeader = readCsrfFromResponseHeaders(response?.headers)
        persistCsrfToken(csrfFromHeader)
        observer.next(result)
      },
      error: (networkError) => {
        observer.error(networkError)
      },
      complete: () => {
        observer.complete()
      },
    })

    return () => subscription.unsubscribe()
  })
})

const errorLink = onError(({ error }) => {
  const isGraphqlUnauthorized = CombinedGraphQLErrors.is(error)
    ? error.errors.some((gqlError) => gqlError.extensions?.code === 'UNAUTHENTICATED')
    : false

  const isNetworkUnauthorized =
    ('statusCode' in (error || {}) && (error as { statusCode?: number }).statusCode === 401) ||
    /401|unauth/i.test(error.message)

  const isUnauthorized = isGraphqlUnauthorized || isNetworkUnauthorized

  if (isUnauthorized) {
    clearAccessToken()
  }
})

export const apolloClient = new ApolloClient({
  link: from([errorLink, csrfLink, captureCsrfLink, httpLink]),
  cache: new InMemoryCache(),
})
