import { useEffect, useMemo, useRef, useState, type WheelEvent } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { Building2, ChevronLeft, ChevronRight, Gem, Heart, HeartPulse, Hotel, House, MapPin, Mountain, Palmtree, Search, SlidersHorizontal, Sparkles, Star, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { GET_PROPERTIES } from '@/graphql/user/query'
import { LIKE_TARGET_PROPERTY } from '@/graphql/user/mutation'
import { isAuthenticated } from '@/lib/auth'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useI18n } from '@/i18n'

type ApiProperty = {
  _id: string
  propertyType: string
  propertyLocation: string
  propertyCoordinates?: { lat?: number | null; lng?: number | null } | null
  propertyTitle: string
  propertyPrice: number
  propertyRank?: number
  propertyRatingCount?: number
  propertyComments?: number
  propertyViews?: number
  propertyLikes?: number
  propertyBeds?: number
  propertyRooms?: number
  propertyImages?: string[]
  propertyDesc?: string | null
  createdAt?: string
  meLiked?: Array<{ myFavorite: boolean }> | null
}

type QueryData = { getProperties: { list: ApiProperty[]; metaCounter?: { total: number } } }
type QueryVariables = { input: { page: number; limit: number; sort?: string; direction?: 'ASC' | 'DESC'; search: Record<string, never> } }

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL ||
  (import.meta.env.PROD
    ? '/graphql'
    : typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:3008/graphql`
      : 'http://localhost:3008/graphql')

const categories = [
  { value: 'all', labelKey: 'common.all', icon: Sparkles },
  { value: 'villa', labelKey: 'categories.villasTitle', icon: House },
  { value: 'hotel', labelKey: 'categories.hotelsTitle', icon: Hotel },
  { value: 'sanatorium', labelKey: 'categories.sanatoriumsTitle', icon: HeartPulse },
  { value: 'resort', labelKey: 'categories.resortsTitle', icon: Palmtree },
  { value: 'apartment', labelKey: 'categories.apartmentsTitle', icon: Building2 },
  { value: 'mountain', labelKey: 'categories.mountainHomesTitle', icon: Mountain },
  { value: 'unique', labelKey: 'categories.uniqueTitle', icon: Gem },
]

type MapCoordinate = { lat: number; lng: number }

type MapMarker = {
  location: string
  coordinate: MapCoordinate
  count: number
  averagePrice: number
}

const fallbackLocationCoordinates: Record<string, MapCoordinate> = {
  TASHKENT: { lat: 41.2995, lng: 69.2401 },
  SAMARKAND: { lat: 39.627, lng: 66.975 },
  BUKHARA: { lat: 39.7681, lng: 64.4556 },
  KHIVA: { lat: 41.3783, lng: 60.3639 },
  CHORVOQ: { lat: 41.6332, lng: 69.9406 },
  BOSTONLIQ: { lat: 41.5583, lng: 69.8819 },
  ZAAMIN: { lat: 39.9606, lng: 68.3958 },
  CHIMGAN: { lat: 41.5479, lng: 70.0194 },
  CHODAK: { lat: 41.0106, lng: 71.0481 },
  BALI: { lat: -8.3405, lng: 115.092 },
  SEOUL: { lat: 37.5665, lng: 126.978 },
  BUSAN: { lat: 35.1796, lng: 129.0756 },
  INCHEON: { lat: 37.4563, lng: 126.7052 },
  DAEGU: { lat: 35.8714, lng: 128.6014 },
  GYEONGJU: { lat: 35.8562, lng: 129.2247 },
  GWANGJU: { lat: 35.1595, lng: 126.8526 },
  CHONJU: { lat: 35.8242, lng: 127.148 },
  DAEJON: { lat: 36.3504, lng: 127.3845 },
  JEJU: { lat: 33.4996, lng: 126.5312 },
}

function backendOrigin() {
  try {
    return new URL(GRAPHQL_URL).origin
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3008'
  }
}

function imageUrl(path?: string) {
  if (!path) return '/assets/hero-villa.jpg'
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  return `${backendOrigin()}${path.startsWith('/') ? path : `/${path}`}`
}

function locationLabel(value: string) {
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(', ')
}

function typeLabel(value: string, translate?: (key: string) => string) {
  const type = value.toLowerCase()
  if (type === 'sanatorium') return translate?.('categories.sanatoriumsTitle') || 'Sanatorium'
  if (type === 'hotel') return translate?.('categories.hotelsTitle') || 'Hotel'
  if (type === 'apartment') return translate?.('categories.apartmentsTitle') || 'Apartment'
  if (type === 'villa') return translate?.('categories.villasTitle') || 'Villa'
  if (type === 'resort') return translate?.('categories.resortsTitle') || 'Resort'
  if (type === 'mountain') return translate?.('categories.mountainHomesTitle') || 'Mountain home'
  if (type === 'unique') return translate?.('categories.uniqueTitle') || 'Unique stay'
  return translate?.('common.property') || 'Property'
}

function displayPrice(value: number, formatNumber: (value: number) => string) {
  const safe = Number(value) || 0
  // Legacy seed data is dollar-like (80/360); new API values are UZS integers.
  const uzs = safe > 100_000 ? safe : safe * 12_500
  return `${formatNumber(Math.round(uzs))} UZS`
}

function normalizePrice(value: number): number {
  const safe = Number(value) || 0
  return safe > 100_000 ? safe : safe * 12_500
}

function distanceInKm(
  first: { lat?: number | null; lng?: number | null },
  second: { lat?: number | null; lng?: number | null },
): number | null {
  if (typeof first.lat !== 'number' || typeof first.lng !== 'number') return null
  if (typeof second.lat !== 'number' || typeof second.lng !== 'number') return null

  const toRadians = (value: number) => value * (Math.PI / 180)
  const earthRadiusKm = 6371
  const deltaLat = toRadians(second.lat - first.lat)
  const deltaLng = toRadians(second.lng - first.lng)
  const lat1 = toRadians(first.lat)
  const lat2 = toRadians(second.lat)
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function propertyCoordinate(item: ApiProperty): MapCoordinate | null {
  const lat = item.propertyCoordinates?.lat
  const lng = item.propertyCoordinates?.lng

  if (typeof lat === 'number' && typeof lng === 'number') {
    return { lat, lng }
  }

  return fallbackLocationCoordinates[item.propertyLocation.toUpperCase()] || null
}

function buildMapMarkers(items: ApiProperty[]): MapMarker[] {
  const grouped = new Map<string, { sumLat: number; sumLng: number; count: number; price: number }>()

  for (const item of items) {
    const coordinate = propertyCoordinate(item)
    if (!coordinate) continue

    const location = item.propertyLocation
    const current = grouped.get(location) || { sumLat: 0, sumLng: 0, count: 0, price: 0 }
    current.sumLat += coordinate.lat
    current.sumLng += coordinate.lng
    current.count += 1
    current.price += normalizePrice(item.propertyPrice)
    grouped.set(location, current)
  }

  return Array.from(grouped.entries())
    .map(([location, value]) => ({
      location,
      coordinate: {
        lat: value.sumLat / value.count,
        lng: value.sumLng / value.count,
      },
      count: value.count,
      averagePrice: value.price / value.count,
    }))
    .sort((a, b) => b.count - a.count)
}

function markerStyle(marker: MapMarker, markers: MapMarker[]) {
  if (markers.length <= 1) {
    return { left: '50%', top: '50%' }
  }

  const lats = markers.map((item) => item.coordinate.lat)
  const lngs = markers.map((item) => item.coordinate.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latRange = Math.max(maxLat - minLat, 0.01)
  const lngRange = Math.max(maxLng - minLng, 0.01)
  const x = 10 + ((marker.coordinate.lng - minLng) / lngRange) * 80
  const y = 10 + (1 - (marker.coordinate.lat - minLat) / latRange) * 80

  return {
    left: `${Math.min(92, Math.max(8, x))}%`,
    top: `${Math.min(92, Math.max(8, y))}%`,
  }
}

function recommendationScore(item: ApiProperty): number {
  const rating = Number(item.propertyRank) || 0
  const reviews = Number(item.propertyRatingCount ?? item.propertyComments) || 0
  const likes = Number(item.propertyLikes) || 0
  const views = Number(item.propertyViews) || 0

  // Ratings are the strongest signal, with real engagement acting as a
  // tie-breaker so the page does not show the same newest records forever.
  return rating * 100 + Math.log1p(reviews) * 12 + Math.log1p(likes) * 5 + Math.log1p(views) * 2
}

function popularityScore(item: ApiProperty): number {
  return (
    (Number(item.propertyViews) || 0) +
    (Number(item.propertyLikes) || 0) * 4 +
    (Number(item.propertyComments) || 0) * 8 +
    (Number(item.propertyRank) || 0) * 20
  )
}

function sortByScore(items: ApiProperty[], score: (item: ApiProperty) => number): ApiProperty[] {
  return [...items].sort((a, b) => {
    const difference = score(b) - score(a)
    if (difference !== 0) return difference
    const aTime = Date.parse(a.createdAt || '')
    const bTime = Date.parse(b.createdAt || '')
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
  })
}

function interleaveByType(items: ApiProperty[], limit = 8): ApiProperty[] {
  const grouped = new Map<string, ApiProperty[]>()
  for (const item of sortByScore(items, recommendationScore)) {
    const type = item.propertyType.toUpperCase()
    const list = grouped.get(type) || []
    list.push(item)
    grouped.set(type, list)
  }

  const result: ApiProperty[] = []
  const groups = Array.from(grouped.values())
  for (let index = 0; result.length < limit && groups.length > 0; index += 1) {
    let added = false
    for (const group of groups) {
      const item = group[index]
      if (!item || result.some((current) => current._id === item._id)) continue
      result.push(item)
      added = true
      if (result.length >= limit) break
    }
    if (!added) break
  }
  return result
}

type SeasonKey = 'winter' | 'spring' | 'summer' | 'autumn'

type SeasonConfig = {
  key: SeasonKey
  titleKey: string
  types: string[]
  locations: string[]
}

const seasonConfigs: Record<SeasonKey, Omit<SeasonConfig, 'key'>> = {
  winter: {
    titleKey: 'propertiesPage.winter',
    types: ['VILLA', 'RESORT', 'HOTEL', 'SANATORIUM'],
    locations: ['CHIMGAN', 'CHORVOQ', 'ZAAMIN', 'BOSTONLIQ'],
  },
  spring: {
    titleKey: 'propertiesPage.spring',
    types: ['VILLA', 'RESORT', 'SANATORIUM'],
    locations: ['CHIMGAN', 'BOSTONLIQ', 'SAMARKAND', 'ZAAMIN'],
  },
  summer: {
    titleKey: 'propertiesPage.summer',
    types: ['RESORT', 'VILLA', 'APARTMENT'],
    locations: ['CHORVOQ', 'BOSTONLIQ', 'CHIMGAN', 'CHODAK', 'BALI'],
  },
  autumn: {
    titleKey: 'propertiesPage.autumn',
    types: ['HOTEL', 'VILLA', 'APARTMENT', 'RESORT'],
    locations: ['SAMARKAND', 'BUKHARA', 'KHIVA', 'ZAAMIN', 'TASHKENT'],
  },
}

function getCurrentSeason(date: Date): SeasonConfig {
  const month = date.getMonth() + 1
  const key: SeasonKey = month <= 2 || month === 12
    ? 'winter'
    : month <= 5
      ? 'spring'
      : month <= 8
        ? 'summer'
        : month <= 11
          ? 'autumn'
          : 'winter'

  return { key, ...seasonConfigs[key] }
}

function seasonalScore(item: ApiProperty, season: SeasonConfig): number {
  const type = item.propertyType.toUpperCase()
  const location = item.propertyLocation.toUpperCase()
  const typeBonus = season.types.includes(type) ? 260 : 0
  const locationBonus = season.locations.includes(location) ? 360 : 0
  return recommendationScore(item) + typeBonus + locationBonus
}

function getNextWeekend(date: Date): { checkIn: string; checkOut: string; label: string } {
  const start = new Date(date)
  const day = start.getDay()
  const daysUntilFriday = (5 - day + 7) % 7 || 7
  start.setDate(start.getDate() + daysUntilFriday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 2)
  const formatIso = (value: Date) => {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const dayOfMonth = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${dayOfMonth}`
  }
  const formatter = new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'long' })
  return {
    checkIn: formatIso(start),
    checkOut: formatIso(end),
    label: `${formatter.format(start)} – ${formatter.format(end)}`,
  }
}

function weekendScore(item: ApiProperty): number {
  const type = item.propertyType.toUpperCase()
  const shortStayBonus = type === 'HOTEL' || type === 'RESORT'
    ? 300
    : type === 'APARTMENT' || type === 'VILLA'
      ? 220
      : 80
  const price = normalizePrice(item.propertyPrice)
  const affordabilityBonus = Math.max(0, 180 - price / 100_000)
  return recommendationScore(item) + shortStayBonus + affordabilityBonus
}

type DiscoverySectionProps = {
  title: string
  properties: ApiProperty[]
  onLike: (id: string) => void
  href?: string
}

function DiscoverySection({ title, properties, onLike, href = '/properties' }: DiscoverySectionProps) {
  const { t } = useI18n()
  const rowRef = useRef<HTMLDivElement>(null)

  const scrollRow = (direction: number) => {
    const row = rowRef.current
    if (!row) return
    row.scrollBy({ left: direction * Math.max(row.clientWidth * 0.82, 280), behavior: 'smooth' })
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const row = rowRef.current
    if (!row || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    event.preventDefault()
    row.scrollLeft += event.deltaY
  }

  if (properties.length === 0) return null

  return (
    <section className="roomi-discovery-section" aria-labelledby={`discovery-${title}`}>
      <div className="roomi-discovery-section__header">
        <div>
          <p className="roomi-discovery-section__eyebrow">{t('propertiesPage.discoveryEyebrow')}</p>
          <h2 id={`discovery-${title}`}>{title}</h2>
        </div>
        <div className="roomi-discovery-section__actions">
          <button type="button" className="roomi-discovery-section__arrow" onClick={() => scrollRow(-1)} aria-label={t('propertiesPage.previousPlaces')}>
            <ChevronLeft size={17} />
          </button>
          <button type="button" className="roomi-discovery-section__arrow" onClick={() => scrollRow(1)} aria-label={t('propertiesPage.nextPlaces')}>
            <ChevronRight size={17} />
          </button>
          <Link to={href} className="roomi-discovery-section__link">
            {t('propertiesPage.seeAll')} <ChevronRight size={16} />
          </Link>
        </div>
      </div>
      <div ref={rowRef} className="roomi-discovery-row" onWheel={handleWheel}>
        {properties.slice(0, 8).map((property) => (
          <ListingCard key={property._id} item={property} onLike={onLike} />
        ))}
      </div>
    </section>
  )
}

function DiscoveryLoading() {
  const { t } = useI18n()

  return (
    <div className="roomi-discovery-loading" aria-label={t('common.loadingProperties')}>
      {Array.from({ length: 4 }).map((_, index) => <span key={index} />)}
    </div>
  )
}

export default function Properties() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [selectedMapLocation, setSelectedMapLocation] = useState<string | null>(null)
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(20_000_000)
  const [minRating, setMinRating] = useState(0)
  const [sort, setSort] = useState<'recommended' | 'price-asc' | 'price-desc'>('recommended')

  const location = searchParams.get('location') || ''
  const category = searchParams.get('category') || 'all'
  const datesSelected = Boolean(searchParams.get('checkIn') || searchParams.get('checkOut'))
  const guests = Number(searchParams.get('guests')) || 1

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setUserCoordinates({ lat: coords.latitude, lng: coords.longitude }),
      () => {
        // Location permission is optional. The nearby row falls back to the
        // most represented destination in the catalog when it is denied.
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 4000 },
    )
  }, [])

  const { data, loading, error, refetch } = useQuery<QueryData, QueryVariables>(GET_PROPERTIES, {
    variables: { input: { page: 1, limit: 200, sort: 'createdAt', direction: 'DESC', search: {} } },
    fetchPolicy: 'cache-and-network',
  })
  const [likeProperty] = useMutation(LIKE_TARGET_PROPERTY)

  const allProperties = useMemo(() => data?.getProperties?.list || [], [data])

  const baseProperties = useMemo(() => {
    const list = allProperties.filter((item) => {
      const normalizedPrice = normalizePrice(item.propertyPrice)
      const matchesLocation = !location || `${item.propertyLocation} ${item.propertyTitle}`.toLowerCase().includes(location.toLowerCase())
      const matchesCategory = category === 'all' || item.propertyType.toLowerCase() === category
      return matchesLocation && matchesCategory && normalizedPrice >= minPrice && normalizedPrice <= maxPrice && (Number(item.propertyRank) || 0) >= minRating
    })
    return [...list].sort((a, b) => {
      if (sort === 'price-asc') return Number(a.propertyPrice) - Number(b.propertyPrice)
      if (sort === 'price-desc') return Number(b.propertyPrice) - Number(a.propertyPrice)
      return (Number(b.propertyRank) || 0) - (Number(a.propertyRank) || 0)
    })
  }, [allProperties, location, category, minPrice, maxPrice, minRating, sort])

  const properties = useMemo(() => {
    if (!selectedMapLocation) return baseProperties
    return baseProperties.filter((item) => item.propertyLocation === selectedMapLocation)
  }, [baseProperties, selectedMapLocation])

  const mapMarkers = useMemo(() => buildMapMarkers(baseProperties), [baseProperties])

  useEffect(() => {
    setSelectedMapLocation(null)
  }, [location, category, minPrice, maxPrice, minRating])

  const isDiscoveryHome = !location && category === 'all' && !datesSelected && guests <= 1 && minPrice === 0 && maxPrice === 20_000_000 && minRating === 0
  const currentSeason = useMemo(() => getCurrentSeason(new Date()), [])
  const nextWeekend = useMemo(() => getNextWeekend(new Date()), [])
  const currentSeasonTitle = t(currentSeason.titleKey)

  const discoveryData = useMemo(() => {
    const recommended = sortByScore(allProperties, recommendationScore).slice(0, 8)
    const recommendedIds = new Set(recommended.map((item) => item._id))
    const popular = sortByScore(allProperties, popularityScore)
      .filter((item) => !recommendedIds.has(item._id))
      .slice(0, 8)
    const fallbackPopular = popular.length >= 4
      ? popular
      : sortByScore(allProperties, popularityScore).slice(0, 8)

    const locations = new Map<string, ApiProperty[]>()
    for (const item of allProperties) {
      const list = locations.get(item.propertyLocation) || []
      list.push(item)
      locations.set(item.propertyLocation, list)
    }
    const topLocationEntry = Array.from(locations.entries())
      .sort((a, b) => b[1].length - a[1].length)[0]
    const topLocation = topLocationEntry?.[0]
    const locationProperties = topLocationEntry
      ? sortByScore(topLocationEntry[1], recommendationScore).slice(0, 8)
      : []

    const nearbyWithDistance = userCoordinates
      ? allProperties
        .map((item) => ({
          item,
          distance: item.propertyCoordinates ? distanceInKm(userCoordinates, item.propertyCoordinates) : null,
        }))
        .filter((entry): entry is { item: ApiProperty; distance: number } => entry.distance !== null)
        .sort((a, b) => a.distance - b.distance)
      : []
    const nearbyProperties = nearbyWithDistance.length > 0
      ? nearbyWithDistance.slice(0, 8).map(({ item }) => item)
      : locationProperties
    const seasonalMatches = allProperties.filter((item) => {
      const type = item.propertyType.toUpperCase()
      const propertyLocation = item.propertyLocation.toUpperCase()
      return currentSeason.types.includes(type) || currentSeason.locations.includes(propertyLocation)
    })
    const seasonalProperties = (seasonalMatches.length >= 4 ? seasonalMatches : allProperties)
      .sort((a, b) => seasonalScore(b, currentSeason) - seasonalScore(a, currentSeason))
      .slice(0, 8)

    const weekendProperties = sortByScore(allProperties, weekendScore).slice(0, 8)

    return {
      recommended,
      popular: fallbackPopular,
      topLocation,
      locationProperties,
      nearbyProperties,
      seasonalProperties,
      weekendProperties,
      diverse: interleaveByType(allProperties),
    }
  }, [allProperties, currentSeason, userCoordinates])

  const updateCategory = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('category')
    else next.set('category', value)
    setSearchParams(next)
  }

  const toggleLike = async (propertyId: string) => {
    if (!isAuthenticated()) {
      window.alert('Sevimlilarga qo‘shish uchun tizimga kiring.')
      return
    }
    await likeProperty({ variables: { propertyId } })
    await refetch()
  }

  return (
    <div className="roomi-marketplace">
      <Navbar forceSolid />
      <main className="roomi-marketplace__main">
        <div className="roomi-category-rail">
          {categories.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.value}
                onClick={() => updateCategory(item.value)}
                className={category === item.value ? 'is-active' : ''}
                data-category={item.value}
              >
                <span className="roomi-category-rail__icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.7} />
                </span>
                <span>{t(item.labelKey)}</span>
              </button>
            )
          })}
        </div>

        <div className="roomi-filter-row">
          <div className="roomi-filter-summary">
            <strong>{loading ? t('common.loading') : t('propertiesPage.resultsFound', { count: properties.length })}</strong>
            <span>{datesSelected ? t('common.dates') : t('propertiesPage.anyDates')}</span>
            {guests > 1 && <span>· {guests} {guests === 1 ? t('common.guest') : t('common.guests')}</span>}
          </div>
          <div className="roomi-filter-actions">
            <button type="button" className="roomi-outline-button" onClick={() => setFiltersOpen((open) => !open)}>
              <SlidersHorizontal size={16} /> {t('common.filters')}
            </button>
            <button type="button" className={`roomi-outline-button ${showMap ? 'is-active' : ''}`} onClick={() => setShowMap((open) => !open)}>
              {showMap ? t('propertiesPage.showList') : t('propertiesPage.showMap')}
            </button>
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="roomi-sort-select" aria-label={t('common.sort')}>
              <option value="recommended">{t('propertiesPage.recommendedSort')}</option>
              <option value="price-asc">{t('propertiesPage.lowPriceSort')}</option>
              <option value="price-desc">{t('propertiesPage.highPriceSort')}</option>
            </select>
          </div>
        </div>

        {filtersOpen && (
          <section className="roomi-filter-panel" aria-label={t('propertiesPage.filtersTitle')}>
            <div className="roomi-filter-panel__header">
              <h2>{t('propertiesPage.filtersTitle')}</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label={t('common.close')}><X size={18} /></button>
            </div>
            <div className="roomi-filter-grid">
              <label><span>{t('propertiesPage.minimumPrice')}</span><input type="number" value={minPrice} min={0} onChange={(e) => setMinPrice(Number(e.target.value) || 0)} /></label>
              <label><span>{t('propertiesPage.maximumPrice')}</span><input type="number" value={maxPrice} min={0} onChange={(e) => setMaxPrice(Number(e.target.value) || 0)} /></label>
              <label><span>{t('common.rating')}</span><select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}><option value={0}>{t('common.all')}</option><option value={4}>4+</option><option value={4.5}>4.5+</option></select></label>
            </div>
          </section>
        )}

        {error && <div className="roomi-state roomi-state--error">{t('common.failedToLoadProperties', { message: error.message })}</div>}
        {showMap ? (
          <div className="roomi-map-layout">
            <aside className="roomi-map-panel" aria-label={t('propertiesPage.mapTitle')}>
              <div className="roomi-map-panel__top">
                <span>{t('propertiesPage.mapKicker')}</span>
                <strong>{selectedMapLocation ? locationLabel(selectedMapLocation) : t('propertiesPage.mapAllAreas')}</strong>
              </div>
              <div className="roomi-map-canvas">
                <div className="roomi-map-canvas__water" />
                <div className="roomi-map-canvas__road roomi-map-canvas__road--one" />
                <div className="roomi-map-canvas__road roomi-map-canvas__road--two" />
                {mapMarkers.map((marker) => {
                  const isActive = selectedMapLocation === marker.location
                  return (
                    <button
                      type="button"
                      key={marker.location}
                      className={`roomi-map-pin ${isActive ? 'is-active' : ''}`}
                      style={markerStyle(marker, mapMarkers)}
                      onClick={() => setSelectedMapLocation(isActive ? null : marker.location)}
                      aria-label={t('propertiesPage.mapMarkerLabel', { location: locationLabel(marker.location), count: marker.count })}
                    >
                      <span>{marker.count}</span>
                      <strong>{locationLabel(marker.location)}</strong>
                    </button>
                  )
                })}
              </div>
              <div className="roomi-map-panel__footer">
                <span>{t('propertiesPage.mapPlacesCount', { count: properties.length })}</span>
                {selectedMapLocation && (
                  <button type="button" onClick={() => setSelectedMapLocation(null)}>
                    {t('propertiesPage.clearMapSelection')}
                  </button>
                )}
              </div>
            </aside>
            <div className="roomi-listing-grid roomi-listing-grid--map">{properties.map((property) => <ListingCard key={property._id} item={property} onLike={toggleLike} />)}</div>
          </div>
        ) : isDiscoveryHome ? (
          <div className="roomi-discovery">
            {loading ? <DiscoveryLoading /> : (
              <>
                <DiscoverySection
                  title={t('propertiesPage.recommended')}
                  properties={discoveryData.recommended}
                  onLike={toggleLike}
                />
                <DiscoverySection
                  title={currentSeasonTitle}
                  properties={discoveryData.seasonalProperties}
                  onLike={toggleLike}
                />
                <DiscoverySection
                  title={t('propertiesPage.nearby')}
                  properties={discoveryData.nearbyProperties}
                  onLike={toggleLike}
                />
                <DiscoverySection
                  title={t('propertiesPage.weekend')}
                  properties={discoveryData.weekendProperties}
                  onLike={toggleLike}
                  href={`/properties?checkIn=${nextWeekend.checkIn}&checkOut=${nextWeekend.checkOut}`}
                />
                <DiscoverySection
                  title={t('propertiesPage.popular')}
                  properties={discoveryData.popular}
                  onLike={toggleLike}
                />
                {discoveryData.topLocation && (
                  <DiscoverySection
                    title={t('propertiesPage.topLocation', { location: locationLabel(discoveryData.topLocation) })}
                    properties={discoveryData.locationProperties}
                    onLike={toggleLike}
                    href={`/properties?location=${encodeURIComponent(discoveryData.topLocation)}`}
                  />
                )}
                <DiscoverySection
                  title={t('propertiesPage.diverse')}
                  properties={discoveryData.diverse}
                  onLike={toggleLike}
                />
              </>
            )}
          </div>
        ) : (
          <div className="roomi-listing-grid">
            {properties.map((property) => <ListingCard key={property._id} item={property} onLike={toggleLike} />)}
          </div>
        )}
        {!loading && !error && properties.length === 0 && <div className="roomi-state">{t('propertiesPage.noResults')}</div>}
      </main>
      <Footer />
    </div>
  )
}

function ListingCard({ item, onLike }: { item: ApiProperty; onLike: (id: string) => void }) {
  const { t, formatNumber } = useI18n()
  const liked = Boolean(item.meLiked?.some((like) => like.myFavorite))
  const rating = Number(item.propertyRank) || 0
  return (
    <article className="roomi-listing-card">
      <Link to={`/properties/${item._id}`} className="roomi-listing-card__image-wrap">
        <img src={imageUrl(item.propertyImages?.[0])} alt={item.propertyTitle} loading="lazy" onError={(event) => { event.currentTarget.src = '/assets/hero-villa.jpg' }} />
        <span className="roomi-listing-card__badge">{typeLabel(item.propertyType, t)}</span>
      </Link>
      <button type="button" className={`roomi-listing-card__heart ${liked ? 'is-liked' : ''}`} onClick={() => onLike(item._id)} aria-label={liked ? t('common.removeFromFavorites') : t('common.addToFavorites')}>
        <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
      </button>
      <Link to={`/properties/${item._id}`} className="roomi-listing-card__body">
        <div className="roomi-listing-card__title-row"><h2>{item.propertyTitle}</h2><span><Star size={14} fill="currentColor" /> {rating ? rating.toFixed(1) : 'New'}</span></div>
        <p className="roomi-listing-card__location"><MapPin size={14} /> {locationLabel(item.propertyLocation)}</p>
        <p className="roomi-listing-card__meta">{item.propertyBeds || 1} {t('common.beds').toLowerCase()} · {item.propertyRooms || 1} {t('common.rooms').toLowerCase()} · {item.propertyComments || 0} {t('common.comments').toLowerCase()}</p>
        <p className="roomi-listing-card__price"><strong>{displayPrice(item.propertyPrice, formatNumber)}</strong> <span>{t('common.perNight')}</span></p>
      </Link>
    </article>
  )
}
