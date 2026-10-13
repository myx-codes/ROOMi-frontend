// =============================================================================
// FEATURED PROPERTIES COMPONENT
// =============================================================================
// Bu komponent featured propertylarni kategoriyalar bo'yicha ko'rsatadi
// Villa, Hotel va Sanatorium uchun turli layoutlar ishlatiladi
// =============================================================================

// -----------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------
import { motion, type Variants } from 'framer-motion'
import {
  Star,
  Heart,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState, type FC } from 'react'
import { useQuery } from '@apollo/client/react'
import { Link } from 'react-router-dom'
import { ScrollSafeVideo } from '@/components/ScrollSafeVideo'
import { GET_FEATURED_PROPERTIES } from '@/graphql/user/query'
import { useI18n } from '@/i18n'
import { isAuthenticated } from '@/lib/auth'

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------
enum PropertyCategory {
  VILLA = 'villa',
  HOTEL = 'hotel',
  SANATORIUM = 'sanatorium',
}

enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

// -----------------------------------------------------------------------------
// TYPES & INTERFACES
// -----------------------------------------------------------------------------
interface SanatoriumHighlight {
  label: string
  desc: string
}

interface SanatoriumMeta {
  badge: string
  quote: string
  highlights: SanatoriumHighlight[]
}

interface FeaturedProperty {
  id: string
  title: string
  location: string
  price: number
  rating: number
  ratingCount: number
  image: string
  category: PropertyCategory
  sanatoriumMeta?: SanatoriumMeta
}

interface CategoryConfig {
  title: string
  type: PropertyCategory
  sub: string
  color: string
  bg: string
}

interface PropertyFromAPI {
  _id: string
  propertyType: string
  propertyLocation: string
  propertyTitle: string
  propertyPrice: number
  propertyRank?: number
  propertyRatingCount?: number
  propertyComments: number
  propertyImages: string[]
  propertyDesc?: string | null
}

interface GetPropertiesResponse {
  getProperties: {
    list: PropertyFromAPI[]
  }
}

interface GetPropertiesVariables {
  input: {
    page: number
    limit: number
    sort?: string
    direction?: SortDirection
    search: Record<string, never>
  }
}

interface PropertyCardProps {
  property: FeaturedProperty
  index: number
  compact?: boolean
}

interface VillaVideoHeroLayoutProps {
  properties: FeaturedProperty[]
}

interface SanatoriumWideCardProps {
  property: FeaturedProperty
  index: number
}

type PropertiesByCategory = Record<PropertyCategory, FeaturedProperty[]>
type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

// -----------------------------------------------------------------------------
// ENVIRONMENT CONFIGURATION
// -----------------------------------------------------------------------------
const ENV = {
  GRAPHQL_URL:
    import.meta.env.VITE_GRAPHQL_URL ||
    (import.meta.env.PROD
      ? '/graphql'
      : typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3008/graphql`
        : 'http://localhost:3008/graphql'),
} as const

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------
function getCategories(t: TranslateFn): CategoryConfig[] {
  return [
    {
      title: t('featured.villasSection'),
      type: PropertyCategory.VILLA,
      sub: t('featured.villasSub'),
      color: 'text-amber-600',
      bg: 'bg-amber-600',
    },
    {
      title: t('featured.hotelsSection'),
      type: PropertyCategory.HOTEL,
      sub: t('featured.hotelsSub'),
      color: 'text-blue-600',
      bg: 'bg-blue-600',
    },
    {
      title: t('featured.sanatoriumsSection'),
      type: PropertyCategory.SANATORIUM,
      sub: t('featured.sanatoriumsSub'),
      color: 'text-emerald-600',
      bg: 'bg-emerald-600',
    },
  ]
}

const DISPLAY_LIMITS: Record<PropertyCategory, number> = {
  [PropertyCategory.VILLA]: 6,
  [PropertyCategory.HOTEL]: 6,
  [PropertyCategory.SANATORIUM]: 2,
}

const QUERY_CONFIG = {
  PAGE: 1,
  LIMIT: 100,
  SORT_FIELD: 'createdAt',
  SORT_DIRECTION: SortDirection.DESC,
} as const

const SANATORIUM_META_MARKER = 'ROOMI_SANATORIUM_META:'

function getDefaultSanatoriumMeta(t: TranslateFn): SanatoriumMeta {
  return {
    badge: t('agent.defaultBadge'),
    quote: t('agent.defaultQuote'),
    highlights: [
      { label: t('agent.highlight1Title'), desc: t('agent.highlight1Desc') },
      { label: t('agent.highlight2Title'), desc: t('agent.highlight2Desc') },
      { label: t('agent.highlight3Title'), desc: t('agent.highlight3Desc') },
      { label: t('agent.highlight4Title'), desc: t('agent.highlight4Desc') },
    ],
  }
}

const DEFAULT_IMAGE = '/assets/hero-villa.jpg'

// -----------------------------------------------------------------------------
// ANIMATION VARIANTS
// -----------------------------------------------------------------------------
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

const cascadeVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: EASE_OUT_EXPO,
      delay,
    },
  }),
}

const fadeInScaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 1,
    },
  },
}

const slideInVariants = (isEven: boolean): Variants => ({
  hidden: {
    opacity: 0,
    x: isEven ? -50 : 50,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 1,
      ease: EASE_OUT_EXPO,
    },
  },
})

// -----------------------------------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------------------------------
function getBackendOrigin(): string {
  if (typeof window !== 'undefined' && ENV.GRAPHQL_URL.startsWith('/')) {
    return window.location.origin
  }

  try {
    return new URL(ENV.GRAPHQL_URL).origin
  } catch {
    return typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3008'
  }
}

function resolveImageUrl(imagePath?: string): string {
  if (!imagePath) {
    return DEFAULT_IMAGE
  }

  const isAbsoluteUrl = /^https?:\/\//i.test(imagePath)
  const isDataUrl = imagePath.startsWith('data:')
  const isBlobUrl = imagePath.startsWith('blob:')

  if (isAbsoluteUrl || isDataUrl || isBlobUrl) {
    return imagePath
  }

  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${getBackendOrigin()}${cleanPath}`
}

function normalizePropertyType(type: string): PropertyCategory {
  const normalized = type.toUpperCase()

  switch (normalized) {
    case 'HOTEL':
      return PropertyCategory.HOTEL
    case 'SANATORIUM':
      return PropertyCategory.SANATORIUM
    default:
      return PropertyCategory.VILLA
  }
}

function formatLocation(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function toFiniteNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function toPositiveCount(value: unknown): number {
  const count = Math.round(toFiniteNumber(value))
  return count > 0 ? count : 0
}

function parseSanatoriumMeta(description?: string | null): SanatoriumMeta | undefined {
  if (!description) {
    return undefined
  }

  const regex = new RegExp(`${SANATORIUM_META_MARKER}([^\\n]+)`)
  const match = description.match(regex)

  if (!match?.[1]) {
    return undefined
  }

  try {
    const rawJson = match[1].trim()
    let parsed: Record<string, unknown>

    try {
      parsed = JSON.parse(rawJson)
    } catch {
      parsed = JSON.parse(decodeURIComponent(rawJson))
    }

    const badge = extractString(parsed, ['badge', 'b'])
    const quote = extractString(parsed, ['quote', 'q'])
    const highlights = extractHighlights(parsed)

    if (!badge || !quote || highlights.length === 0) {
      return undefined
    }

    return { badge, quote, highlights }
  } catch {
    return undefined
  }
}

function extractString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (typeof obj[key] === 'string' && obj[key].trim()) {
      return obj[key].trim()
    }
  }
  return ''
}

function extractHighlights(parsed: Record<string, unknown>): SanatoriumHighlight[] {
  const rawHighlights = Array.isArray(parsed.highlights)
    ? parsed.highlights
    : Array.isArray(parsed.h)
      ? parsed.h.map(normalizeHighlightItem)
      : []

  return rawHighlights
    .map((item): SanatoriumHighlight => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        return {
          label: String(record.label || '').trim(),
          desc: String(record.desc || '').trim(),
        }
      }
      return { label: '', desc: '' }
    })
    .filter((item) => item.label && item.desc)
}

function normalizeHighlightItem(item: unknown): unknown {
  if (Array.isArray(item)) {
    return {
      label: String(item[0] ?? ''),
      desc: String(item[1] ?? ''),
    }
  }
  return item
}

function mapApiPropertyToFeatured(apiProperty: PropertyFromAPI): FeaturedProperty {
  return {
    id: apiProperty._id,
    title: apiProperty.propertyTitle,
    location: formatLocation(apiProperty.propertyLocation),
    price: apiProperty.propertyPrice,
    rating: toFiniteNumber(apiProperty.propertyRank),
    ratingCount: toPositiveCount(apiProperty.propertyRatingCount ?? apiProperty.propertyComments),
    image: resolveImageUrl(apiProperty.propertyImages?.[0]),
    category: normalizePropertyType(apiProperty.propertyType),
    sanatoriumMeta: parseSanatoriumMeta(apiProperty.propertyDesc),
  }
}

function groupPropertiesByCategory(properties: FeaturedProperty[]): PropertiesByCategory {
  const grouped: PropertiesByCategory = {
    [PropertyCategory.VILLA]: [],
    [PropertyCategory.HOTEL]: [],
    [PropertyCategory.SANATORIUM]: [],
  }

  for (const category of Object.values(PropertyCategory)) {
    const limit = DISPLAY_LIMITS[category]
    grouped[category] = properties
      .filter((prop) => prop.category === category)
      .slice(0, limit)
  }

  return grouped
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

/** Rating ko'rsatuvchi kichik component */
const RatingDisplay: FC<{ rating: number; count: number; className?: string }> = ({
  rating,
  count,
  className = '',
}) => (
  <div className={`flex items-center gap-1.5 ${className}`}>
    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
    <span className="font-semibold">{rating.toFixed(1)}</span>
    <span className="text-xs opacity-70">({count})</span>
  </div>
)

/** Like tugmasi */
const LikeButton: FC<{ isLiked: boolean; onToggle: () => void }> = ({ isLiked, onToggle }) => {
  const { t } = useI18n()

  return (
    <button
      onClick={onToggle}
      className="absolute top-4 right-4 z-20 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform"
      aria-label={isLiked ? t('common.removeFromFavorites') : t('common.addToFavorites')}
    >
      <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-slate-900'}`} />
    </button>
  )
}

/** Kategoriya badge */
const CategoryBadge: FC<{ category: PropertyCategory }> = ({ category }) => {
  const { propertyTypeLabel } = useI18n()

  return (
    <div className="absolute top-4 left-4 bg-white/95 px-3 py-1.5 rounded-xl border border-slate-100/50">
      <span className="text-[12px] font-black uppercase tracking-widest text-slate-900">
        {propertyTypeLabel(category)}
      </span>
    </div>
  )
}

/** Section header */
const SectionHeader: FC<{ category: CategoryConfig }> = ({ category }) => {
  const { t } = useI18n()

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="relative">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: '40px' }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className={`h-1 ${category.bg} mb-4 rounded-full`}
        />
        <span
          className={`${category.color} text-[10px] tracking-[0.3em] uppercase font-bold block mb-2`}
        >
          {category.sub}
        </span>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 tracking-tight italic">
          {category.title}
        </h2>
      </div>

      <Link
        to={`/properties?type=${category.type}`}
        className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-sm font-semibold"
      >
        {t('featured.viewAll')}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  )
}

/** Verified badge (Sanatorium uchun) */
const VerifiedBadge: FC<{ isEven: boolean }> = ({ isEven }) => {
  const { t } = useI18n()

  return (
    <motion.div
      custom={0.6}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={cascadeVariants}
      className={`absolute -bottom-8 ${isEven ? 'right-10' : 'left-10'} bg-white p-6 rounded-[2rem] shadow-xl hidden md:block border border-emerald-50 z-20`}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest leading-none mb-1">
            {t('featured.verified')}
          </p>
          <p className="text-slate-900 font-bold text-sm">{t('featured.healthSanctuary')}</p>
        </div>
      </div>
    </motion.div>
  )
}

// -----------------------------------------------------------------------------
// PROPERTY CARD COMPONENT
// -----------------------------------------------------------------------------
const PropertyCard: FC<PropertyCardProps> = ({ property, index, compact = false }) => {
  const { t, formatNumber } = useI18n()
  const [isLiked, setIsLiked] = useState(false)

  const cardClasses = compact
    ? 'rounded-3xl'
    : 'rounded-[2rem] shadow-sm hover:shadow-xl'

  const aspectClasses = compact ? 'aspect-[16/10]' : 'aspect-[16/11]'

  const handleToggleLike = () => {
    if (!isAuthenticated()) {
      window.alert(t('common.signedInRequired'))
      return
    }
    setIsLiked(!isLiked)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`group bg-white overflow-hidden border border-slate-100 transition-all ${cardClasses}`}
    >
      {/* Image Section */}
      <div className={`relative ${aspectClasses} overflow-hidden`}>
        <Link
          to={`/properties/${property.id}`}
          aria-label={property.title}
          className="absolute inset-0 z-10"
        />
        <img
          src={property.image}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <LikeButton isLiked={isLiked} onToggle={handleToggleLike} />
        <CategoryBadge category={property.category} />
      </div>

      {/* Content Section */}
      <div className="p-6">
        <div className="flex items-center gap-1 text-slate-400 text-[10px] mb-2 font-bold uppercase tracking-widest">
          <MapPin className="w-3 h-3" />
          {property.location}
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-5 truncate group-hover:text-blue-600 transition-colors">
          {property.title}
        </h3>

        <div className="flex items-center justify-between pt-5 border-t border-slate-50">
          <RatingDisplay
            rating={property.rating}
            count={property.ratingCount}
            className="text-sm text-slate-900"
          />
          <div className="text-right leading-none">
            <span className="text-xl font-bold">${formatNumber(property.price)}</span>
            <span className="text-[10px] text-slate-400 ml-1 font-bold">{t('common.perNight')}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// -----------------------------------------------------------------------------
// VILLA VIDEO HERO LAYOUT
// -----------------------------------------------------------------------------
const VillaVideoHeroLayout: FC<VillaVideoHeroLayoutProps> = ({ properties }) => {
  const { t } = useI18n()

  const mainVilla = properties[0]
  const sideVillas = properties.slice(1, 6)

  if (!mainVilla) {
    return null
  }

  return (
    <div className="space-y-10">
      {/* Main Hero Visual */}
      <motion.div
        className="relative w-full h-[550px] lg:h-[650px] rounded-[1rem] overflow-hidden shadow-2xl"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInScaleVariants}
      >
        <Link
          to={`/properties/${mainVilla.id}`}
          aria-label={mainVilla.title}
          className="absolute inset-0 z-10"
        />

        <ScrollSafeVideo
          src="/videos/villa2.webm"
          poster={mainVilla.image}
          alt={mainVilla.title}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Content Overlay */}
        <div className="absolute bottom-10 left-10 right-10 z-20 flex items-end justify-between">
          <div className="text-white space-y-2">
            <h3 className="text-4xl font-bold">{mainVilla.title}</h3>
            <p className="flex items-center gap-2 opacity-80 text-sm">
              <MapPin className="w-4 h-4" />
              {mainVilla.location}
            </p>
            <RatingDisplay
              rating={mainVilla.rating}
              count={mainVilla.ratingCount}
              className="text-sm text-white"
            />
          </div>

          <Link
            to={`/properties/${mainVilla.id}`}
            className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-amber-500 hover:text-white transition-all shadow-xl"
          >
            {t('common.bookingNow')}
          </Link>
        </div>
      </motion.div>

      {/* Side Villas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {sideVillas.map((property, index) => (
          <PropertyCard
            key={property.id}
            property={property}
            index={index}
            compact
          />
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// SANATORIUM WIDE CARD COMPONENT
// -----------------------------------------------------------------------------
const SanatoriumWideCard: FC<SanatoriumWideCardProps> = ({ property, index }) => {
  const { t } = useI18n()
  const isEven = index % 2 === 0
  const meta = property.sanatoriumMeta ?? getDefaultSanatoriumMeta(t)

  const containerClasses = isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'

  return (
    <div className={`flex flex-col ${containerClasses} items-center gap-16 lg:gap-24`}>
      {/* Visual Side */}
      <motion.div
        className="w-full lg:w-3/5 relative group"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={slideInVariants(isEven)}
      >
        {/* Background decoration */}
        <div className="absolute -inset-4 bg-emerald-50 rounded-[4rem] -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform duration-700" />

        {/* Image container */}
        <div className="relative h-[480px] rounded-[3.5rem] overflow-hidden shadow-2xl border-[6px] border-white">
          <Link
            to={`/properties/${property.id}`}
            aria-label={property.title}
            className="absolute inset-0 z-10"
          />
          <motion.img
            src={property.image}
            alt={property.title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 1.5 }}
            loading="lazy"
          />
        </div>

        <VerifiedBadge isEven={isEven} />
      </motion.div>

      {/* Content Side */}
      <div className="w-full lg:w-2/5 space-y-8">
        {/* Header */}
        <motion.div
          custom={0.2}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={cascadeVariants}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            {meta.badge}
          </div>
          <h3 className="text-4xl font-display font-bold text-slate-900 leading-tight">
            {property.title}
          </h3>
          <RatingDisplay
            rating={property.rating}
            count={property.ratingCount}
            className="mt-3 text-sm text-slate-600"
          />
        </motion.div>

        {/* Quote */}
        <motion.p
          custom={0.4}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={cascadeVariants}
          className="text-slate-500 text-lg leading-relaxed font-light italic"
        >
          "{meta.quote}"
        </motion.p>

        {/* Highlights Grid */}
        <div className="grid grid-cols-2 gap-4">
          {meta.highlights.slice(0, 4).map((highlight, i) => (
            <motion.div
              key={highlight.label}
              custom={0.5 + i * 0.1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={cascadeVariants}
              className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all shadow-sm"
            >
              <span className="block font-bold text-slate-900 text-base">
                {highlight.label}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                {highlight.desc}
              </span>
            </motion.div>
          ))}
        </div>

        {/* CTA Link */}
        <motion.div
          custom={0.9}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={cascadeVariants}
          className="pt-4"
        >
          <Link
            to={`/properties/${property.id}`}
            className="group flex items-center justify-center lg:justify-start gap-4 text-emerald-600 font-bold text-lg"
          >
            {t('featured.viewSanctuaryDetails')}
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// CATEGORY SECTION COMPONENT
// -----------------------------------------------------------------------------
const CategorySection: FC<{
  category: CategoryConfig
  properties: FeaturedProperty[]
}> = ({ category, properties }) => {
  if (properties.length === 0) {
    return null
  }

  const renderLayout = () => {
    switch (category.type) {
      case PropertyCategory.VILLA:
        return <VillaVideoHeroLayout properties={properties} />

      case PropertyCategory.SANATORIUM:
        return (
          <div className="space-y-32">
            {properties.slice(0, 2).map((property, index) => (
              <SanatoriumWideCard
                key={property.id}
                property={property}
                index={index}
              />
            ))}
          </div>
        )

      case PropertyCategory.HOTEL:
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.slice(0, 6).map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                index={index}
              />
            ))}
          </div>
        )
    }
  }

  return (
    <div className="space-y-16">
      <SectionHeader category={category} />
      {renderLayout()}
    </div>
  )
}

// -----------------------------------------------------------------------------
// LOADING & ERROR STATES
// -----------------------------------------------------------------------------
const LoadingState: FC = () => {
  const { t } = useI18n()

  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      <span className="ml-3 text-sm text-slate-500">{t('featured.loading')}</span>
    </div>
  )
}

const ErrorState: FC<{ message: string }> = ({ message }) => {
  const { t } = useI18n()

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <p className="text-sm text-red-600">{t('featured.failed', { message })}</p>
    </div>
  )
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT - FEATURED PROPERTIES
// -----------------------------------------------------------------------------
export function FeaturedProperties(): JSX.Element {
  const { t } = useI18n()
  const categories = useMemo(() => getCategories(t), [t])
  // Fetch properties from API
  const { data, loading, error } = useQuery<GetPropertiesResponse, GetPropertiesVariables>(
    GET_FEATURED_PROPERTIES,
    {
      variables: {
        input: {
          page: QUERY_CONFIG.PAGE,
          limit: QUERY_CONFIG.LIMIT,
          sort: QUERY_CONFIG.SORT_FIELD,
          direction: QUERY_CONFIG.SORT_DIRECTION,
          search: {},
        },
      },
      fetchPolicy: 'cache-first',
    },
  )

  // Transform API data to FeaturedProperty[]
  const allProperties = useMemo<FeaturedProperty[]>(() => {
    const list = data?.getProperties?.list ?? []
    return list.map(mapApiPropertyToFeatured)
  }, [data])

  // Group properties by category with display limits
  const propertiesByCategory = useMemo<PropertiesByCategory>(
    () => groupPropertiesByCategory(allProperties),
    [allProperties],
  )

  return (
    <section
      id="featured"
      className="overflow-hidden px-6 py-24 sm:py-28"
      aria-label={t('common.properties')}
    >
      <div className="premium-panel mx-auto max-w-7xl rounded-[2.75rem] px-5 py-10 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-20 max-w-3xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gold">
            {t('featured.eyebrow')}
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold text-slate-900 sm:text-5xl">
            {t('featured.title')}
            <span className="ml-3 italic text-gold">{t('featured.titleAccent')}</span>
          </h2>
          <p className="mt-5 text-base text-slate-500 sm:text-lg">
            {t('featured.description')}
          </p>
        </motion.div>

        <div className="space-y-40">
          {loading && <LoadingState />}
          {error && <ErrorState message={error.message} />}

          {!loading &&
            !error &&
            categories.map((category) => (
              <CategorySection
                key={category.type}
                category={category}
                properties={propertiesByCategory[category.type]}
              />
            ))}
        </div>
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------------
// DEFAULT EXPORT
// -----------------------------------------------------------------------------
export default FeaturedProperties
