import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { enUS, ko, uz } from 'date-fns/locale'
import {
  amenityTranslations,
  languageOptions,
  translations,
  type TranslationTree,
} from './translations'
import type { Language } from './types'

const STORAGE_KEY = 'roomi_language'

const dateFnsLocales = {
  en: enUS,
  ko,
  uz,
} as const

const intlLocales: Record<Language, string> = {
  en: 'en-US',
  ko: 'ko-KR',
  uz: 'uz-UZ',
}

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  dateFnsLocale: (typeof dateFnsLocales)[Language]
  intlLocale: string
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string
  formatNumber: (value: number) => string
  amenityLabel: (key: string) => string
  propertyTypeLabel: (value?: string | null) => string
  bookingStatusLabel: (value?: string | null) => string
  bookingStatusShortLabel: (value?: string | null) => string
  memberTypeLabel: (value?: string | null) => string
  memberStatusLabel: (value?: string | null) => string
  propertyStatusLabel: (value?: string | null) => string
  articleStatusLabel: (value?: string | null) => string
  articleCategoryLabel: (value?: string | null) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function getNestedValue(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split('.')
  let current: string | TranslationTree | undefined = tree

  for (const part of parts) {
    if (!current || typeof current === 'string') {
      return undefined
    }

    current = current[part]
  }

  return typeof current === 'string' ? current : undefined
}

function applyVars(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template

  return template.replace(/\{\{(.*?)\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim()
    return String(vars[key] ?? '')
  })
}

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en'

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'ko' || stored === 'uz') {
    return stored
  }

  return 'en'
}

function normalizeStatus(value?: string | null): string {
  return String(value || '').trim().toUpperCase()
}

function normalizePropertyType(value?: string | null): string {
  return String(value || '').trim().toUpperCase()
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = intlLocales[language]
    document.title = getNestedValue(translations[language], 'common.siteTitle') || 'ROOMi'
    const description = getNestedValue(translations[language], 'common.siteDescription')
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description)
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
      document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description)
    }
  }, [language])

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, vars?: Record<string, string | number>) => {
      const localized = getNestedValue(translations[language], key)
      const fallback = getNestedValue(translations.en, key) || key
      return applyVars(localized || fallback, vars)
    }

    const formatDate = (valueToFormat: string | Date, options?: Intl.DateTimeFormatOptions) => {
      if (!valueToFormat) {
        return t('common.notSelected')
      }

      const date =
        valueToFormat instanceof Date ? valueToFormat : new Date(valueToFormat)

      if (Number.isNaN(date.getTime())) {
        return t('common.invalidDate')
      }

      return new Intl.DateTimeFormat(intlLocales[language], options).format(date)
    }

    const formatNumber = (valueToFormat: number) => {
      return new Intl.NumberFormat(intlLocales[language]).format(valueToFormat)
    }

    const amenityLabel = (key: string) => {
      return amenityTranslations[key]?.[language] || amenityTranslations[key]?.en || key
    }

    const propertyTypeLabel = (value?: string | null) => {
      switch (normalizePropertyType(value)) {
        case 'HOTEL':
          return t('categories.hotelsTitle')
        case 'SANATORIUM':
          return t('categories.sanatoriumsTitle')
        case 'VILLA':
          return t('categories.villasTitle')
        case 'APARTMENT':
          return language === 'ko' ? '아파트' : language === 'uz' ? 'Apartament' : 'Apartment'
        case 'RESORT':
          return language === 'ko' ? '리조트' : language === 'uz' ? 'Resort' : 'Resort'
        default:
          return t('common.property')
      }
    }

    const bookingStatusLabel = (value?: string | null) => {
      switch (normalizeStatus(value)) {
        case 'CONFIRMED':
          return language === 'ko' ? '확정됨' : language === 'uz' ? 'Tasdiqlangan' : 'Confirmed'
        case 'REQUESTED':
          return language === 'ko' ? '요청됨' : language === 'uz' ? 'So‘rov yuborilgan' : 'Requested'
        case 'AWAITING_PAYMENT':
          return language === 'ko' ? '결제 대기' : language === 'uz' ? 'To‘lov kutilmoqda' : 'Awaiting payment'
        case 'WAITING':
        case 'PENDING':
          return language === 'ko' ? '대기 중' : language === 'uz' ? 'Kutilmoqda' : 'Waiting'
        case 'CANCELLED':
          return language === 'ko' ? '취소됨' : language === 'uz' ? 'Bekor qilingan' : 'Cancelled'
        case 'EXPIRED':
          return language === 'ko' ? '만료됨' : language === 'uz' ? 'Muddati tugagan' : 'Expired'
        case 'FINISHED':
        case 'COMPLETED':
          return language === 'ko' ? '완료됨' : language === 'uz' ? 'Tugallangan' : 'Completed'
        default:
          return value || '-'
      }
    }

    const bookingStatusShortLabel = (value?: string | null) => {
      switch (normalizeStatus(value)) {
        case 'CONFIRMED':
          return t('agent.confirmed')
        case 'REQUESTED':
          return language === 'ko' ? '요청' : language === 'uz' ? 'So‘rov' : 'Requested'
        case 'AWAITING_PAYMENT':
          return language === 'ko' ? '결제 대기' : language === 'uz' ? 'To‘lov' : 'Payment'
        case 'WAITING':
        case 'PENDING':
          return language === 'ko' ? '대기' : language === 'uz' ? 'Kutilmoqda' : 'Waiting'
        case 'CANCELLED':
          return language === 'ko' ? '취소' : language === 'uz' ? 'Bekor' : 'Cancelled'
        case 'EXPIRED':
          return language === 'ko' ? '만료' : language === 'uz' ? 'Tugagan' : 'Expired'
        case 'FINISHED':
        case 'COMPLETED':
          return t('agent.completed')
        default:
          return value || '-'
      }
    }

    const memberTypeLabel = (value?: string | null) => {
      switch (normalizeStatus(value)) {
        case 'USER':
          return t('auth.user')
        case 'AGENT':
          return t('auth.agent')
        case 'ADMIN':
          return t('auth.admin')
        default:
          return value || '-'
      }
    }

    const memberStatusLabel = (value?: string | null) => {
      switch (normalizeStatus(value)) {
        case 'ACTIVE':
          return language === 'ko' ? '활성' : language === 'uz' ? 'Faol' : 'Active'
        case 'BLOCK':
          return language === 'ko' ? '차단됨' : language === 'uz' ? 'Bloklangan' : 'Blocked'
        case 'DELETE':
          return language === 'ko' ? '삭제됨' : language === 'uz' ? 'O‘chirilgan' : 'Deleted'
        default:
          return value || '-'
      }
    }

    const propertyStatusLabel = (value?: string | null) => {
      switch (normalizeStatus(value)) {
        case 'DRAFT':
          return language === 'ko' ? '임시 저장' : language === 'uz' ? 'Qoralama' : 'Draft'
        case 'PENDING_REVIEW':
          return language === 'ko' ? '검토 대기' : language === 'uz' ? 'Tekshiruvda' : 'Pending review'
        case 'ACTIVE':
          return language === 'ko' ? '활성' : language === 'uz' ? 'Faol' : 'ACTIVE'
        case 'SUSPENDED':
          return language === 'ko' ? '중지됨' : language === 'uz' ? 'To‘xtatilgan' : 'Suspended'
        case 'ARCHIVED':
          return language === 'ko' ? '보관됨' : language === 'uz' ? 'Arxivlangan' : 'Archived'
        case 'HOLD':
          return language === 'ko' ? '보류' : language === 'uz' ? 'Kutishda' : 'HOLD'
        case 'BOOKED':
          return language === 'ko' ? '예약됨' : language === 'uz' ? 'Band qilingan' : 'BOOKED'
        case 'DELETE':
          return language === 'ko' ? '삭제됨' : language === 'uz' ? 'O‘chirilgan' : 'DELETE'
        default:
          return value || '-'
      }
    }

    const articleStatusLabel = (value?: string | null) => {
      switch (normalizeStatus(value)) {
        case 'ACTIVE':
          return language === 'ko' ? '활성' : language === 'uz' ? 'Faol' : 'ACTIVE'
        case 'WAITING':
          return language === 'ko' ? '대기' : language === 'uz' ? 'Kutilmoqda' : 'WAITING'
        case 'HOLD':
          return language === 'ko' ? '보류' : language === 'uz' ? 'Kutishda' : 'HOLD'
        case 'DELETE':
          return language === 'ko' ? '삭제됨' : language === 'uz' ? 'O‘chirilgan' : 'DELETE'
        default:
          return value || '-'
      }
    }

    const articleCategoryLabel = (value?: string | null) => {
      switch (normalizeStatus(value)) {
        case 'FREE':
          return language === 'ko' ? '자유' : language === 'uz' ? 'Erkin' : 'FREE'
        case 'NEWS':
          return language === 'ko' ? '뉴스' : language === 'uz' ? 'Yangilik' : 'NEWS'
        case 'EVENT':
          return language === 'ko' ? '이벤트' : language === 'uz' ? 'Tadbir' : 'EVENT'
        case 'HELP':
          return language === 'ko' ? '도움말' : language === 'uz' ? 'Yordam' : 'HELP'
        case 'RECOMMEND':
          return language === 'ko' ? '추천' : language === 'uz' ? 'Tavsiya' : 'RECOMMEND'
        case 'LIFESTYLE':
          return language === 'ko' ? '라이프스타일' : language === 'uz' ? 'Turmush tarzi' : 'LIFESTYLE'
        default:
          return value || '-'
      }
    }

    return {
      language,
      setLanguage: setLanguageState,
      t,
      dateFnsLocale: dateFnsLocales[language],
      intlLocale: intlLocales[language],
      formatDate,
      formatNumber,
      amenityLabel,
      propertyTypeLabel,
      bookingStatusLabel,
      bookingStatusShortLabel,
      memberTypeLabel,
      memberStatusLabel,
      propertyStatusLabel,
      articleStatusLabel,
      articleCategoryLabel,
    }
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }

  return context
}

export type { Language }
export { languageOptions }
