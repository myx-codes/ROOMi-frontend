import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import { ArrowUpRight, Bot, Loader2, MapPin, MessageSquare, Send, Sparkles, Users, X } from 'lucide-react'
import { ENSURE_CHAT_THREAD, GET_CHAT_THREAD, SEND_CHAT_MESSAGE } from '@/graphql/chat'
import { GET_PROPERTY } from '@/graphql/user/query'
import { getMemberProfile } from '@/lib/auth'
import { resolvePropertyImageUrl } from '@/lib/property'
import { useI18n } from '@/i18n'

type ChatSenderType = 'USER' | 'ASSISTANT' | 'SYSTEM'

type ChatMessage = {
  _id: string
  threadId: string
  senderType: ChatSenderType
  content: string
  createdAt: string
  updatedAt: string
}

type ChatThread = {
  _id: string
  memberId?: string | null
  sessionId?: string | null
  propertyId?: string | null
  title: string
  status: string
  lastMessageAt: string
  createdAt: string
  updatedAt: string
  messages?: ChatMessage[]
}

type EnsureChatThreadResponse = {
  ensureChatThread: ChatThread
}

type EnsureChatThreadVariables = {
  input: {
    sessionId: string
    propertyId?: string | null
    title?: string | null
    language?: string
  }
}

type GetChatThreadResponse = {
  getChatThread: ChatThread
}

type GetChatThreadVariables = {
  input: {
    threadId: string
    sessionId: string
    propertyId?: string | null
  }
}

type SendChatMessageResponse = {
  sendChatMessage: {
    thread: ChatThread
    userMessage: ChatMessage
    assistantMessage?: ChatMessage | null
    messageCount: number
  }
}

type SendChatMessageVariables = {
  input: {
    sessionId: string
    propertyId?: string | null
    threadId?: string | null
    message: string
    language?: string
  }
}

type ChatBubbleProps = {
  senderType: ChatSenderType
  content: string
  createdAt?: string
  language: string
}

type ParsedRecommendation = {
  propertyId: string
  fallbackTitle: string
  rawLine: string
}

type RecommendationPropertyResponse = {
  getProperty: {
    _id: string
    propertyTitle: string
    propertyType: string
    propertyLocation: string
    propertyPrice: number
    propertyBeds: number
    maxGuests?: number | null
    propertyImages: string[]
  }
}

function parseRecommendationContent(content: string): {
  body: string
  recommendations: ParsedRecommendation[]
} {
  const recommendations: ParsedRecommendation[] = []
  const bodyLines: string[] = []

  for (const line of content.split('\n')) {
    const pathMatch = line.match(/\/properties\/([a-f\d]{24})\b/i)
    if (!pathMatch) {
      bodyLines.push(line)
      continue
    }

    const titlePart = line
      .replace(/^\s*\d+[.)]\s*/, '')
      .split(/\s+[—–-]\s+/)[0]
      .trim()

    recommendations.push({
      propertyId: pathMatch[1],
      fallbackTitle: titlePart || 'ROOMi property',
      rawLine: line,
    })
  }

  return {
    body: bodyLines.join('\n').trim(),
    recommendations,
  }
}

function resolveChatLanguage(message: string, selectedLanguage: string): string {
  return /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(message.normalize('NFC'))
    ? 'ko'
    : selectedLanguage
}

function PropertyRecommendationCard({
  recommendation,
  language,
}: {
  recommendation: ParsedRecommendation
  language: string
}) {
  const { data, loading } = useQuery<RecommendationPropertyResponse>(GET_PROPERTY, {
    variables: { propertyId: recommendation.propertyId },
    fetchPolicy: 'cache-first',
  })
  const property = data?.getProperty
  const title = property?.propertyTitle || recommendation.fallbackTitle
  const image = resolvePropertyImageUrl(property?.propertyImages?.[0])
  const locale = language === 'ko' ? 'ko-KR' : language === 'uz' ? 'uz-UZ' : 'en-US'
  const price = property?.propertyPrice
    ? `${new Intl.NumberFormat(locale).format(property.propertyPrice)} UZS`
    : recommendation.rawLine.match(/[\d,]+\s*UZS/i)?.[0] || ''
  const capacity = property?.maxGuests || property?.propertyBeds
  const copy = language === 'ko'
    ? { perNight: '/ 박', guests: '명', details: '상세 보기' }
    : language === 'uz'
      ? { perNight: '/ tun', guests: 'kishi', details: 'Batafsil' }
      : { perNight: '/ night', guests: 'guests', details: 'View details' }

  return (
    <Link
      to={`/properties/${recommendation.propertyId}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      aria-label={`${copy.details}: ${title}`}
    >
      <div className="relative h-28 overflow-hidden bg-muted">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {property?.propertyType ? (
          <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold tracking-wide text-foreground backdrop-blur">
            {property.propertyType}
          </span>
        ) : null}
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{title}</h4>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {property?.propertyLocation ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {property.propertyLocation}
            </span>
          ) : null}
          {capacity ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {capacity} {copy.guests}
            </span>
          ) : null}
        </div>
        {price ? (
          <p className="text-xs text-muted-foreground">
            <strong className="text-sm text-foreground">{price}</strong> {copy.perNight}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

const CHAT_SESSION_KEY = 'roomi_chat_session_id'

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return `session-${Date.now()}`
  }

  const existing = window.localStorage.getItem(CHAT_SESSION_KEY)
  if (existing) return existing

  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`

  window.localStorage.setItem(CHAT_SESSION_KEY, generated)
  return generated
}

function usePropertyChatContext(): string | null {
  const location = useLocation()

  return useMemo(() => {
    const match = matchPath('/properties/:id', location.pathname)
    return match?.params?.id ?? null
  }, [location.pathname])
}

function ChatBubble({ senderType, content, language }: ChatBubbleProps) {
  const isAssistant = senderType !== 'USER'
  const contentLanguage = resolveChatLanguage(content, language)
  const parsed = isAssistant
    ? parseRecommendationContent(content)
    : { body: content, recommendations: [] }
  const hasRecommendations = parsed.recommendations.length > 0

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`${hasRecommendations ? 'w-full max-w-full' : 'max-w-[82%]'} rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
          isAssistant
            ? 'bg-muted text-foreground border border-border'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        {parsed.body ? <p className="whitespace-pre-wrap">{parsed.body}</p> : null}
        {hasRecommendations ? (
          <div className={`${parsed.body ? 'mt-3' : ''} grid gap-2`}>
            {parsed.recommendations.map((recommendation) => (
              <PropertyRecommendationCard
                key={recommendation.propertyId}
                recommendation={recommendation}
                language={contentLanguage}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ChatbotWidget() {
  const { language, t } = useI18n()
  const location = useLocation()
  const propertyId = usePropertyChatContext()
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [thread, setThread] = useState<ChatThread | null>(null)
  const [message, setMessage] = useState('')
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [awaitingAssistantId, setAwaitingAssistantId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [ensureChatThread] = useMutation<EnsureChatThreadResponse, EnsureChatThreadVariables>(ENSURE_CHAT_THREAD)
  const [sendChatMessage] = useMutation<SendChatMessageResponse, SendChatMessageVariables>(SEND_CHAT_MESSAGE)
  const { data: polledThread } = useQuery<GetChatThreadResponse, GetChatThreadVariables>(GET_CHAT_THREAD, {
    variables: {
      input: {
        threadId: thread?._id ?? '',
        sessionId,
        propertyId: propertyId ?? null,
      },
    },
    skip: !open || !sessionId || !thread?._id || !awaitingAssistantId,
    pollInterval: awaitingAssistantId ? 2000 : 0,
    fetchPolicy: 'network-only',
  })

  useEffect(() => {
    setSessionId(getOrCreateSessionId())
  }, [])

  useEffect(() => {
    if (!open || !sessionId) return

    let cancelled = false
    const initialize = async () => {
      setInitializing(true)
      setError('')

      try {
        const payload = {
          sessionId,
          propertyId: propertyId ?? null,
          title: propertyId ? t('chat.propertyThreadTitle') : t('chat.supportThreadTitle'),
          language,
        }

        const { data } = await ensureChatThread({
          variables: { input: payload },
        })

        if (!cancelled) {
          setThread(data?.ensureChatThread ?? null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('chat.unavailable'))
        }
      } finally {
        if (!cancelled) {
          setInitializing(false)
        }
      }
    }

    void initialize()
    return () => {
      cancelled = true
    }
  }, [ensureChatThread, language, open, propertyId, sessionId, refreshKey, t])

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [awaitingAssistantId, open, thread?.messages?.length])

  useEffect(() => {
    const incoming = polledThread?.getChatThread
    if (!incoming || !thread || !awaitingAssistantId) return

    setThread((current) => {
      if (!current || incoming._id !== current._id) return current
      return (incoming.messages?.length ?? 0) > (current.messages?.length ?? 0) ? incoming : current
    })

    const userIndex = (incoming.messages ?? []).findIndex((item) => item._id === awaitingAssistantId)
    const assistantArrived = userIndex >= 0 && (incoming.messages ?? [])
      .slice(userIndex + 1)
      .some((item) => item.senderType === 'ASSISTANT')

    if (assistantArrived) setAwaitingAssistantId(null)
  }, [awaitingAssistantId, polledThread, thread])

  useEffect(() => {
    const authEvent = 'roomi-auth-changed'
    const syncThread = () => {
      if (!open || !sessionId) return
      setThread(null)
      setRefreshKey((value) => value + 1)
    }

    window.addEventListener(authEvent, syncThread)
    return () => window.removeEventListener(authEvent, syncThread)
  }, [open, sessionId])

  const messages = thread?.messages ?? []
  const hasMessages = messages.length > 0
  const title = propertyId ? t('chat.propertyTitle') : t('chat.assistantTitle')
  const memberProfile = getMemberProfile()

  const headerSubtitle = useMemo(() => {
    if (propertyId) return t('chat.propertySubtitle')
    if (memberProfile?.memberNick) return t('chat.welcomeBack', { name: memberProfile.memberNick })
    return t('chat.genericSubtitle')
  }, [memberProfile?.memberNick, propertyId, t])

  const handleSend = async () => {
    const clean = message.trim()
    if (!clean || !sessionId || pending) return

    setPending(true)
    setError('')

    try {
      const { data } = await sendChatMessage({
        variables: {
          input: {
            sessionId,
            propertyId: propertyId ?? null,
            threadId: thread?._id ?? null,
            message: clean,
            language: resolveChatLanguage(clean, language),
          },
        },
      })

      const nextThread = data?.sendChatMessage?.thread ?? null
      if (nextThread) {
        setThread(nextThread)
      }
      const userMessage = data?.sendChatMessage?.userMessage
      if (userMessage) setAwaitingAssistantId(userMessage._id)
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('chat.sendFailed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[80]">
      {open ? (
        <div className="mb-3 w-[min(92vw,390px)] overflow-hidden rounded-3xl border border-border bg-background shadow-2xl shadow-black/10 backdrop-blur">
          <div className="flex items-start justify-between gap-4 border-b border-border bg-[linear-gradient(135deg,rgba(217,176,93,0.16),rgba(255,255,255,0.02))] px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-primary/10 p-2 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{headerSubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t('chat.closeChat')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
            {initializing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('chat.preparing')}
              </div>
            ) : hasMessages ? (
              <>
                {messages.map((item) => (
                  <ChatBubble key={item._id} senderType={item.senderType} content={item.content} language={language} />
                ))}
                {awaitingAssistantId ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('chat.preparing')}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
                {t('chat.emptyPrompt')}
              </div>
            )}
          </div>

          {error ? (
            <div className="px-4 pb-2 text-xs text-destructive">{error}</div>
          ) : null}

          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-muted/40 p-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
                rows={2}
                placeholder={t('chat.typeQuestion')}
                className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={pending || !message.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t('chat.sendMessage')}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-xl shadow-primary/20 transition-transform hover:scale-[1.02]"
      >
        <MessageSquare className="h-4 w-4" />
        {open ? t('chat.closeAssistant') : t('chat.aiAssistant')}
        <Bot className="h-4 w-4 opacity-80" />
      </button>
    </div>
  )
}
