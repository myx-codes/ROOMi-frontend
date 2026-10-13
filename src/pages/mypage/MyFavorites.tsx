import { useMemo } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { Star, MapPin, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LIKE_TARGET_PROPERTY } from '@/graphql/user/mutation'
import { GET_FAVORITES } from '@/graphql/user/query'
import { usePropertyRatings } from '@/hooks/usePropertyRatings'
import { useI18n } from '@/i18n'

type ApiProperty = {
  _id: string
  propertyType: string
  propertyLocation: string
  propertyTitle: string
  propertyPrice: number
  propertyRank?: number
  propertyRatingCount?: number
  propertyComments: number
  propertyImages: string[]
}

type FavoriteProperty = {
  id: string
  title: string
  location: string
  price: number
  rating: number
  ratingCount: number
  image: string
}

type GetFavoritesResponse = {
  getFavorites: {
    list: ApiProperty[]
  }
}

type GetFavoritesVariables = {
  input: {
    page: number
    limit: number
  }
}

type LikeTargetPropertyResponse = {
  likeTargetProperty: {
    _id: string
  }
}

type LikeTargetPropertyVariables = {
  propertyId: string
}

const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL ||
  (import.meta.env.PROD
    ? '/graphql'
    : typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:3008/graphql`
      : 'http://localhost:3008/graphql')

function getBackendOrigin(): string {
  if (typeof window !== 'undefined' && GRAPHQL_URL.startsWith('/')) {
    return window.location.origin
  }

  try {
    return new URL(GRAPHQL_URL).origin
  } catch {
    return typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3008'
  }
}

function resolveImageUrl(imagePath?: string): string {
  if (!imagePath) return '/assets/hero-villa.jpg'
  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
    return imagePath
  }

  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${getBackendOrigin()}${cleanPath}`
}

function formatLocation(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

export default function MyFavorites() {
  const { t, formatNumber } = useI18n()
  const { data, loading, error, refetch } = useQuery<GetFavoritesResponse, GetFavoritesVariables>(GET_FAVORITES, {
    variables: {
      input: {
        page: 1,
        limit: 200,
      },
    },
    fetchPolicy: 'network-only',
  })
  const [likeTargetProperty] = useMutation<LikeTargetPropertyResponse, LikeTargetPropertyVariables>(LIKE_TARGET_PROPERTY)

  const toggleLike = async (propertyId: string) => {
    try {
      await likeTargetProperty({ variables: { propertyId } })
      await refetch()
    } catch (e) {
      const message = e instanceof Error ? e.message : t('common.failedToLoadFavorites', { message: '' })
      window.alert(message)
    }
  }

  const baseFavorites: FavoriteProperty[] = (data?.getFavorites?.list || [])
    .map((item) => ({
      id: item._id,
      title: item.propertyTitle,
      location: formatLocation(item.propertyLocation),
      price: item.propertyPrice,
      rating: item.propertyRank || 0,
      ratingCount: item.propertyRatingCount ?? item.propertyComments ?? 0,
      image: resolveImageUrl(item.propertyImages?.[0]),
    }))

  const propertyIds = useMemo(() => baseFavorites.map((property) => property.id), [baseFavorites])
  const ratingsById = usePropertyRatings(propertyIds)
  const favorites = useMemo(
    () =>
      baseFavorites.map((property) => {
        const dbRating = ratingsById[property.id]
        if (!dbRating) return property

        return {
          ...property,
          rating: dbRating.rating,
          ratingCount: dbRating.ratingCount,
        }
      }),
    [baseFavorites, ratingsById],
  )

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground">{t('common.favorites')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('myPage.favoritesSaved', { count: favorites.length })}</p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <p className="text-muted-foreground">{t('common.noFavorites')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {favorites.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden group">
              <div className="relative aspect-[16/9] overflow-hidden">
                <Link to={`/properties/${p.id}`} className="block h-full">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover gentle-animation group-hover:scale-105" />
                </Link>
                <button
                  type="button"
                  onClick={() => toggleLike(p.id)}
                  className="absolute top-4 right-4 z-30 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm"
                  title={t('common.removeFromFavorites')}
                >
                  <Heart className="w-4 h-4 transition-colors fill-red-500 text-red-500" />
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                  <MapPin className="w-3.5 h-3.5" />{p.location}
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{p.title}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-gold fill-gold" />
                    <span className="text-sm font-medium text-foreground">{p.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({Math.max(0, p.ratingCount)})</span>
                  </div>
                  <span className="font-semibold text-foreground">${formatNumber(p.price)}{t('common.perNight')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground mt-4">{t('common.loadingFavorites')}</p>}
      {error && <p className="text-sm text-destructive mt-4">{t('common.failedToLoadFavorites', { message: error.message })}</p>}
    </div>
  )
}
