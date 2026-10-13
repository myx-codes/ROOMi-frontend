import { useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import { BarChart3, Users, Home, Newspaper } from 'lucide-react'
import { useI18n } from '@/i18n'
import {
  GET_ALL_BOARD_ARTICLES_BY_ADMIN,
  GET_ALL_MEMBERS_BY_ADMIN,
  GET_ALL_PROPERTIES_BY_ADMIN,
} from '@/graphql/user/query'

type MemberStatus = 'ACTIVE' | 'BLOCK' | 'DELETE'
type MemberType = 'USER' | 'AGENT' | 'ADMIN'
type PropertyStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'HOLD'
  | 'DELETE'
  | 'BOOKED'
type ArticleStatus = 'ACTIVE' | 'WAITING' | 'DELETE' | 'HOLD'
type ArticleCategory = 'FREE' | 'NEWS' | 'EVENT' | 'HELP' | 'RECOMMEND' | 'LIFESTYLE'

type AnalyticsMember = {
  _id: string
  memberType: MemberType
  memberStatus: MemberStatus
  createdAt: string
}

type AnalyticsProperty = {
  _id: string
  propertyTitle: string
  propertyStatus: PropertyStatus
  propertyPrice: number
  createdAt: string
}

type AnalyticsArticle = {
  _id: string
  articleCategory: ArticleCategory
  articleStatus: ArticleStatus
  createdAt: string
}

type GetAllMembersByAdminResponse = {
  getAllMembersByAdmin: {
    list: AnalyticsMember[]
    metaCounter?: Array<{
      total?: number | null
    }> | null
  }
}

type GetAllMembersByAdminVariables = {
  input: {
    page: number
    limit: number
    sort: string
    direction: 'ASC' | 'DESC'
    search: {
      memberStatus?: MemberStatus
      memberType?: MemberType
      text?: string
    }
  }
}

type GetAllPropertiesByAdminResponse = {
  getAllPropertiesByAdmin: {
    list: AnalyticsProperty[]
    metaCounter?: Array<{
      total?: number | null
    }> | null
  }
}

type GetAllPropertiesByAdminVariables = {
  input: {
    page: number
    limit: number
    sort: string
    direction: 'ASC' | 'DESC'
    search: {
      propertyStatus?: PropertyStatus
      propertyLocationList?: string[]
    }
  }
}

type GetAllBoardArticlesByAdminResponse = {
  getAllBoardArticlesByAdmin: {
    list: AnalyticsArticle[]
    metaCounter?: Array<{
      total?: number | null
    }> | null
  }
}

type GetAllBoardArticlesByAdminVariables = {
  input: {
    page: number
    limit: number
    sort: string
    direction: 'ASC' | 'DESC'
    search: {
      articleStatus?: ArticleStatus
      articleCategory?: ArticleCategory
    }
  }
}

function buildRecentMonthBuckets(
  monthCount: number,
  intlLocale: string,
): Array<{ key: string; label: string; count: number }> {
  const now = new Date()
  const buckets: Array<{ key: string; label: string; count: number }> = []

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString(intlLocale, { month: 'short' })
    buckets.push({ key, label, count: 0 })
  }

  return buckets
}

export default function AdminAnalytics() {
  const { t, formatNumber, intlLocale } = useI18n()
  const {
    data: membersData,
    loading: membersLoading,
    error: membersError,
  } = useQuery<GetAllMembersByAdminResponse, GetAllMembersByAdminVariables>(GET_ALL_MEMBERS_BY_ADMIN, {
    variables: {
      input: {
        page: 1,
        limit: 200,
        sort: 'createdAt',
        direction: 'DESC',
        search: {
          text: '',
        },
      },
    },
    fetchPolicy: 'network-only',
  })

  const {
    data: propertiesData,
    loading: propertiesLoading,
    error: propertiesError,
  } = useQuery<GetAllPropertiesByAdminResponse, GetAllPropertiesByAdminVariables>(GET_ALL_PROPERTIES_BY_ADMIN, {
    variables: {
      input: {
        page: 1,
        limit: 200,
        sort: 'createdAt',
        direction: 'DESC',
        search: {},
      },
    },
    fetchPolicy: 'network-only',
  })

  const {
    data: articlesData,
    loading: articlesLoading,
    error: articlesError,
  } = useQuery<GetAllBoardArticlesByAdminResponse, GetAllBoardArticlesByAdminVariables>(GET_ALL_BOARD_ARTICLES_BY_ADMIN, {
    variables: {
      input: {
        page: 1,
        limit: 200,
        sort: 'createdAt',
        direction: 'DESC',
        search: {},
      },
    },
    fetchPolicy: 'network-only',
  })

  const isLoading = membersLoading || propertiesLoading || articlesLoading
  const firstError = membersError || propertiesError || articlesError

  const members = useMemo(() => membersData?.getAllMembersByAdmin?.list ?? [], [membersData])
  const properties = useMemo(() => propertiesData?.getAllPropertiesByAdmin?.list ?? [], [propertiesData])
  const articles = useMemo(() => articlesData?.getAllBoardArticlesByAdmin?.list ?? [], [articlesData])

  const totalMembers = useMemo(() => {
    const total = membersData?.getAllMembersByAdmin?.metaCounter?.[0]?.total
    return typeof total === 'number' ? total : members.length
  }, [membersData, members.length])

  const totalProperties = useMemo(() => {
    const total = propertiesData?.getAllPropertiesByAdmin?.metaCounter?.[0]?.total
    return typeof total === 'number' ? total : properties.length
  }, [propertiesData, properties.length])

  const totalArticles = useMemo(() => {
    const total = articlesData?.getAllBoardArticlesByAdmin?.metaCounter?.[0]?.total
    return typeof total === 'number' ? total : articles.length
  }, [articlesData, articles.length])

  const averagePropertyPrice = useMemo(() => {
    if (properties.length === 0) return 0
    const sum = properties.reduce((acc, property) => acc + (property.propertyPrice || 0), 0)
    return Math.round(sum / properties.length)
  }, [properties])

  const monthlyMembers = useMemo(() => {
    const buckets = buildRecentMonthBuckets(6, intlLocale)
    const indexByKey = new Map(buckets.map((bucket, index) => [bucket.key, index]))

    members.forEach((member) => {
      const date = new Date(member.createdAt)
      if (Number.isNaN(date.getTime())) return
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const index = indexByKey.get(key)
      if (index === undefined) return
      buckets[index].count += 1
    })

    return buckets
  }, [intlLocale, members])

  const maxMonthlyMembers = Math.max(1, ...monthlyMembers.map((item) => item.count))

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground">{t('common.analytics')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.platformOverview')}</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground mb-4">{t('common.loadingAnalytics')}</p>}
      {firstError && <p className="text-sm text-destructive mb-4">{t('common.failedToLoadAnalytics', { message: firstError.message })}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{t('admin.live')}</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{formatNumber(totalMembers)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('admin.totalUsers')}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <Home className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{t('admin.live')}</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{formatNumber(totalProperties)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('admin.totalProperties')}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <Newspaper className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{t('admin.live')}</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{formatNumber(totalArticles)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('admin.boardArticles')}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{t('admin.average')}</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">${formatNumber(averagePropertyPrice)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('admin.averagePropertyPrice')}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-6">{t('admin.newUsersLast6Months')}</h3>
        <div className="flex items-end gap-4 h-48">
          {monthlyMembers.map((item) => (
            <div key={item.key} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-foreground">{item.count}</span>
              <div
                className="w-full bg-gold/80 rounded-t-lg gentle-animation hover:bg-gold"
                style={{ height: `${(item.count / maxMonthlyMembers) * 100}%` }}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
