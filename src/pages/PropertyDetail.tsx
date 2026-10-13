// =============================================================================
// PROPERTY DETAIL PAGE
// =============================================================================
// Bu sahifa bitta property haqida to'liq ma'lumot ko'rsatadi
// Booking, Comments va Gallery funksiyalari mavjud
// =============================================================================

// -----------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------
import { useEffect, useMemo, useState, type ElementType, type FC, type FormEvent } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
  Wifi,
  Waves,
  Sparkles,
  Car,
  UtensilsCrossed,
  Dumbbell,
  Wind,
  Trees,
  MessageSquare,
  Send,
  CreditCard,
  Heart,
  Share2,
} from 'lucide-react'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { DEFAULT_GUEST_COUNTS, GuestPicker, totalGuests, type GuestCounts } from '@/components/GuestPicker'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RatingInput } from '@/components/RatingInput'
import { RatingPreview } from '@/components/RatingPreview'
import { CREATE_BOOKINGS, CREATE_COMMENT, LIKE_TARGET_PROPERTY } from '@/graphql/user/mutation'
import {
  GET_BOOKABLE_UNITS,
  GET_COMMENTS,
  GET_PROPERTY,
  GET_PROPERTY_PRICE_PREVIEW,
  GET_RECOMMENDED_PROPERTIES,
} from '@/graphql/user/query'
import { usePropertyRatings } from '@/hooks/usePropertyRatings'
import { useI18n } from '@/i18n'
import { isAuthenticated } from '@/lib/auth'
import { CommentGroup } from '@/lib/client/enums/comment.enum'

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------
enum PropertyCategory {
  VILLA = 'villa',
  HOTEL = 'hotel',
  SANATORIUM = 'sanatorium',
  APARTMENT = 'apartment',
  RESORT = 'resort',
}

enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

// -----------------------------------------------------------------------------
// TYPES & INTERFACES
// -----------------------------------------------------------------------------

// API Response Types
interface ApiProperty {
  _id: string
  propertyType: string
  propertyLocation: string
  propertyTitle: string
  propertyPrice: number
  dynamicPricingEnabled?: boolean | null
  weekendMultiplier?: number | null
  minMultiplier?: number | null
  maxMultiplier?: number | null
  manualMultiplierOverride?: number | null
  propertyRank?: number
  propertyRatingCount?: number
  propertyComments: number
  propertyImages: string[]
  propertyDesc?: string | null
  propertyBeds?: number | null
  propertyRooms?: number | null
  meLiked?: Array<{ myFavorite: boolean }> | null
}

interface PricePreviewItem {
  date: string
  basePrice: number
  multiplier: number
  pricePerDay: number
  isWeekend: boolean
  mode: string
  explanation: string[]
}

interface PricePreviewResponse {
  getPropertyPricePreview: {
    nights: number
    baseTotal: number
    totalPrice: number
    averagePrice: number
    quantity?: number | null
    billableGuests?: number | null
    unitId?: string | null
    unitName?: string | null
    unitType?: string | null
    rateModel?: string | null
    currency?: string | null
    nightlyTotal?: number | null
    cleaningFee?: number | null
    petFee?: number | null
    extraGuestFee?: number | null
    guestTotal?: number | null
    hostCommissionAmount?: number | null
    hostPayoutAmount?: number | null
    dates: PricePreviewItem[]
  }
}

interface PricePreviewVariables {
  input: {
    propertyId: string
    startDate: string
    endDate: string
    unitId?: string
    quantity?: number
    guests?: number
    adults?: number
    children?: number
    infants?: number
    pets?: number
  }
}

interface BookableUnitView {
  _id: string
  name: string
  unitType: string
  inventoryCount: number
  basePrice: number
  rateModel: string
  maxGuests: number
  petsAllowed?: boolean | null
  infantsAllowed?: boolean | null
  packageNights?: number | null
  packagePerPerson?: boolean | null
}

interface GetBookableUnitsResponse {
  getBookableUnits: { list: BookableUnitView[] }
}

interface GetBookableUnitsVariables {
  propertyId: string
}

interface MemberData {
  _id: string
  memberNick: string
  memberFullName: string | null
  memberImage?: string
}

interface BackendComment {
  _id: string
  commentStatus: string
  commentGroup: CommentGroup
  commentContent: string
  commentStars?: number | null
  commentRefId: string
  createdAt: string
  updatedAt: string
  memberData?: MemberData | null
}

interface GetPropertyResponse {
  getProperty: ApiProperty
}

interface GetPropertyVariables {
  propertyId: string
}

interface GetRecommendedPropertiesResponse {
  getProperties: {
    list: ApiProperty[]
  }
}

interface GetRecommendedPropertiesVariables {
  input: {
    page: number
    limit: number
    sort: string
    direction: SortDirection
    search: {
      typeList?: string[]
    }
  }
}

interface GetCommentsResponse {
  getComments: {
    list: BackendComment[]
  }
}

interface GetCommentsVariables {
  input: {
    page: number
    limit: number
    sort?: string
    direction?: SortDirection
    search: {
      commentRefId: string
    }
  }
}

interface CreateBookingResponse {
  createBooking: {
    _id: string
  }
}

interface CreateBookingVariables {
  input: {
    propertyId: string
    unitId?: string
    quantity?: number
    bookingStart: string
    bookingEnd: string
    bookingGuests: number
    adults?: number
    children?: number
    infants?: number
    pets?: number
    totalPrice: number
  }
}

interface CreateCommentResponse {
  createComment: {
    _id: string
    commentStatus: string
    commentGroup: CommentGroup
    commentContent: string
    commentStars?: number | null
    commentRefId: string
    memberId: string
    createdAt: string
    updatedAt: string
  }
}

interface CreateCommentVariables {
  input: {
    commentContent: string
    commentRefId: string
    commentGroup: CommentGroup
    commentStars?: number
  }
}

// Domain Types
interface DisplayProperty {
  id: string
  title: string
  location: string
  propertyType: string
  propertyLocation: string
  price: number
  rating: number
  ratingCount: number
  images: string[]
  category: PropertyCategory
  amenities: string[]
  description: string
}

interface CommentItem {
  id: string
  name: string
  message: string
  rating: number
  createdAt: string
}

interface SavedCard {
  id: string
  brand: string
  last4: string
  expiry: string
}

interface BookingSummary {
  nights: number
  totalPrice: number
  baseTotal?: number
  items?: PricePreviewItem[]
}

// Component Props
interface ImageGalleryProps {
  images: string[]
  title: string
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onSelect: (index: number) => void
}

interface BookingReviewModalProps {
  property: DisplayProperty
  checkInDate: string
  checkOutDate: string
  guestCount: number
  savedCards: SavedCard[]
  selectedCardId: string
  bookingError: string
  bookingLoading: boolean
  bookingSummary: BookingSummary | null
  onSelectCard: (id: string) => void
  onClose: () => void
  onConfirm: () => void
}

interface PropertyImagesProps {
  images: string[]
  title: string
  onImageClick: (index: number) => void
}

interface BookingSidebarProps {
  property: DisplayProperty
  units: BookableUnitView[]
  selectedUnitId: string
  unitQuantity: number
  checkInDate: string
  checkOutDate: string
  guestCounts: GuestCounts
  bookingError: string
  bookingSummary: BookingSummary | null
  pricingLoading: boolean
  onCheckInChange: (date: string) => void
  onCheckOutChange: (date: string) => void
  onGuestCountsChange: (counts: GuestCounts) => void
  onUnitChange: (unitId: string) => void
  onUnitQuantityChange: (quantity: number) => void
  onReviewBooking: () => void
}

interface CommentSectionProps {
  propertyId: string
  comments: CommentItem[]
  commentsLoading: boolean
  commentsError?: Error
  commentError: string
  commentLoading: boolean
  message: string
  rating: number
  onMessageChange: (message: string) => void
  onRatingChange: (rating: number) => void
  onSubmit: (e: FormEvent) => void
}

interface RecommendedPropertiesProps {
  property: DisplayProperty
  properties: ApiProperty[]
  loading: boolean
}

interface AmenityItemProps {
  amenity: string
}

// -----------------------------------------------------------------------------
// ENVIRONMENT CONFIG
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
const STORAGE_KEYS = {
  SAVED_CARDS: 'roomi_saved_cards',
} as const

const QUERY_CONFIG = {
  COMMENTS: {
    PAGE: 1,
    LIMIT: 50,
    SORT_FIELD: 'createdAt',
    SORT_DIRECTION: SortDirection.DESC,
  },
} as const

const DEFAULT_IMAGE = '/assets/hero-villa.jpg'

const AMENITY_ICONS: Record<string, ElementType> = {
  wifi: Wifi,
  pool: Waves,
  spa: Sparkles,
  parking: Car,
  restaurant: UtensilsCrossed,
  gym: Dumbbell,
  ac: Wind,
  garden: Trees,
}

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  pool: 'Pool',
  spa: 'Spa',
  parking: 'Parking',
  restaurant: 'Restaurant',
  gym: 'Gym',
  ac: 'Air Conditioning',
  garden: 'Garden',
}

const RATING_LIMITS = {
  MIN: 1,
  MAX: 5,
  DEFAULT: 5,
} as const

// -----------------------------------------------------------------------------
// ANIMATION VARIANTS
// -----------------------------------------------------------------------------
const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const slideUpVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: 20, opacity: 0 },
}

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

function formatMoney(value: number, formatNumber: (value: number) => string = (number) => new Intl.NumberFormat('uz-UZ').format(number)): string {
  const numeric = Number(value) || 0
  const uzs = numeric > 100_000 ? numeric : numeric * 12_500
  return `${formatNumber(Math.round(uzs))} UZS`
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
    case 'APARTMENT':
      return PropertyCategory.APARTMENT
    case 'RESORT':
      return PropertyCategory.RESORT
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

function normalizeStars(stars?: number | null): number {
  if (typeof stars !== 'number' || !Number.isFinite(stars)) {
    return 0
  }
  return Math.min(RATING_LIMITS.MAX, Math.max(RATING_LIMITS.MIN, Math.round(stars)))
}

function cleanCommentMessage(content: string): string {
  if (!content) return ''
  return content.replace(/^(?:ROOMi_RATING|rating):\d{1,2}\s*\r?\n/, '').trim()
}

function parseDescriptionAndAmenities(description?: string | null): {
  description: string
  amenities: string[]
} {
  if (!description) {
    return { description: '', amenities: [] }
  }

  // Remove sanatorium meta
  const descWithoutMeta = description
    .replace(/(?:\n|^)ROOMI_SANATORIUM_META:[^\n]+/g, '')
    .trim()

  // Extract amenities
  const amenitiesMatch = descWithoutMeta.match(/(?:^|\n)Amenities:\s*([^\n]+)/i)

  if (!amenitiesMatch) {
    return { description: descWithoutMeta, amenities: [] }
  }

  const cleanDescription = descWithoutMeta
    .replace(/(?:\n|^)Amenities:\s*[^\n]+/i, '')
    .trim()

  const amenities = amenitiesMatch[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((label) => {
      const found = Object.entries(AMENITY_LABELS).find(
        ([, value]) => value.toLowerCase() === label.toLowerCase(),
      )
      return found?.[0] || label.toLowerCase().replace(/\s+/g, '-')
    })

  return { description: cleanDescription, amenities }
}

function mapApiPropertyToDisplay(item: ApiProperty): DisplayProperty {
  const parsed = parseDescriptionAndAmenities(item.propertyDesc)

  return {
    id: item._id,
    title: item.propertyTitle,
    location: formatLocation(item.propertyLocation),
    propertyType: item.propertyType.toUpperCase(),
    propertyLocation: item.propertyLocation,
    price: item.propertyPrice,
    rating: item.propertyRank || 0,
    ratingCount: item.propertyRatingCount ?? item.propertyComments ?? 0,
    images: (item.propertyImages || []).map(resolveImageUrl),
    category: normalizePropertyType(item.propertyType),
    amenities: parsed.amenities,
    description: parsed.description,
  }
}

function mapBackendCommentToItem(comment: BackendComment, fallbackGuestName: string): CommentItem {
  return {
    id: comment._id,
    name: comment.memberData?.memberFullName || comment.memberData?.memberNick || fallbackGuestName,
    message: cleanCommentMessage(comment.commentContent),
    rating: normalizeStars(comment.commentStars),
    createdAt: comment.createdAt,
  }
}

function calculateBookingSummary(
  checkInDate: string,
  checkOutDate: string,
  pricePerNight: number,
): BookingSummary | null {
  if (!checkInDate || !checkOutDate) return null

  const start = new Date(checkInDate)
  const end = new Date(checkOutDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return null
  }

  const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const totalPrice = Math.max(1, Math.round(nights * pricePerNight))

  return { nights, totalPrice }
}

function buildBookingSummaryFromPreview(preview?: PricePreviewResponse['getPropertyPricePreview'] | null): BookingSummary | null {
  if (!preview) return null

  return {
    nights: preview.nights,
    totalPrice: preview.guestTotal ?? preview.totalPrice,
    baseTotal: preview.baseTotal,
    items: preview.dates,
  }
}

function readSavedCards(): SavedCard[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_CARDS)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function sortCommentsByDate(comments: CommentItem[]): CommentItem[] {
  return [...comments].sort((a, b) => {
    const aTime = Date.parse(a.createdAt)
    const bTime = Date.parse(b.createdAt)
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
  })
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

/** Loading state */
const LoadingState: FC<{ message?: string }> = ({ message }) => {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        <p className="text-lg text-muted-foreground">{message || t('common.loading')}</p>
      </div>
    </div>
  )
}

/** Error state */
const ErrorState: FC<{ message: string }> = ({ message }) => {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-lg text-destructive">{t('common.failedToLoadProperty', { message })}</p>
    </div>
  )
}

/** Not found state */
const NotFoundState: FC = () => {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-lg text-muted-foreground">{t('common.propertyNotFound')}</p>
    </div>
  )
}

/** Back button */
const BackButton: FC<{ onClick: () => void }> = ({ onClick }) => {
  const { t } = useI18n()

  return (
    <button
      onClick={onClick}
      className="text-sm text-muted-foreground hover:text-primary gentle-animation mb-6 inline-flex items-center gap-1"
    >
      <ChevronLeft className="w-4 h-4" />
      {t('common.back')}
    </button>
  )
}

/** Star rating display */
const StarRating: FC<{ rating: number; size?: 'sm' | 'md' }> = ({ rating, size = 'sm' }) => {
  const starSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${starSize} ${i < rating ? 'text-gold fill-gold' : 'text-muted'}`}
        />
      ))}
    </div>
  )
}

/** Amenity item */
const AmenityItem: FC<AmenityItemProps> = ({ amenity }) => {
  const { amenityLabel } = useI18n()
  const Icon = AMENITY_ICONS[amenity] || Wifi
  const label = amenityLabel(amenity)

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
      <Icon className="w-5 h-5 text-primary shrink-0" />
      <span className="text-sm text-foreground">{label}</span>
    </div>
  )
}

/** Property images grid */
const PropertyImages: FC<PropertyImagesProps> = ({ images, title, onImageClick }) => {
  const { t } = useI18n()
  const previewImages = images.slice(1, 5)
  const extraImages = images.slice(5)

  return (
    <div className="roomi-gallery mb-10 space-y-3">
      <div className="roomi-gallery__grid grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Main image */}
        <div
          className="roomi-gallery__main relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group"
          onClick={() => onImageClick(0)}
        >
          <img
            src={images[0]}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* First 4 thumbnails */}
        <div className="roomi-gallery__side grid grid-cols-2 gap-3">
          {previewImages.map((img, i) => (
            <div
              key={`${img}-${i}`}
              className="roomi-gallery__tile relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => onImageClick(i + 1)}
            >
              <img
                src={img}
                alt={`${title} ${i + 2}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ))}
        </div>

        <button type="button" className="roomi-gallery__show-all" onClick={() => onImageClick(0)}>
          {t('common.morePhotos', { count: images.length })}
        </button>
      </div>

      {extraImages.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-3">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            {t('common.morePhotos', { count: extraImages.length })}
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {extraImages.map((img, i) => {
              const imageIndex = i + 5

              return (
                <button
                  key={`${img}-${imageIndex}`}
                  type="button"
                  className="relative aspect-square rounded-lg overflow-hidden border border-border/60 hover:border-gold/60 transition-colors"
                  onClick={() => onImageClick(imageIndex)}
                  aria-label={t('common.viewImage', { index: imageIndex + 1 })}
                >
                  <img
                    src={img}
                    alt={`${title} ${imageIndex + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** Image gallery modal */
const ImageGallery: FC<ImageGalleryProps> = ({
  images,
  title,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onSelect,
}) => {
  const { t } = useI18n()

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeVariants}
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label={t('common.closeGallery')}
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Previous button */}
      <button
        onClick={onPrev}
        className="absolute left-4 md:left-8 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label={t('common.previousImage')}
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>

      {/* Current image */}
      <img
        src={images[currentIndex]}
        alt={`${title} ${currentIndex + 1}`}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
      />

      {/* Next button */}
      <button
        onClick={onNext}
        className="absolute right-4 md:right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label={t('common.nextImage')}
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Dots indicator */}
      <div className="absolute bottom-8 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === currentIndex ? 'bg-white scale-125' : 'bg-white/40'
            }`}
            aria-label={t('common.viewImage', { index: i + 1 })}
          />
        ))}
      </div>
    </motion.div>
  )
}

/** Property header info */
const PropertyHeader: FC<{
  property: DisplayProperty
  rating: number
  reviewCount: number
}> = ({ property, rating, reviewCount }) => {
  const { propertyTypeLabel } = useI18n()

  return (
    <div className="roomi-detail-heading__copy">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">
          {propertyTypeLabel(property.category)}
        </span>
        <RatingPreview value={rating} count={reviewCount} />
      </div>

      <h1 className="font-sans text-3xl md:text-4xl font-bold text-foreground mb-2">
        {property.title}
      </h1>

      <div className="flex items-center gap-1 text-muted-foreground mb-8">
        <MapPin className="w-4 h-4" />
        <span className="text-sm">{property.location}</span>
      </div>
    </div>
  )
}

/** Property description section */
const DescriptionSection: FC<{ description: string }> = ({ description }) => {
  const { t } = useI18n()

  return (
    <div className="mb-10">
      <h2 className="font-sans text-xl font-semibold text-foreground mb-3">{t('common.description')}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description || t('common.noDescription')}
      </p>
    </div>
  )
}

/** Amenities section */
const AmenitiesSection: FC<{ amenities: string[] }> = ({ amenities }) => {
  const { t } = useI18n()
  const displayAmenities = amenities.length > 0 ? amenities : ['wifi']

  return (
    <div className="mb-10">
      <h2 className="font-sans text-xl font-semibold text-foreground mb-4">{t('common.amenities')}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {displayAmenities.map((amenity) => (
          <AmenityItem key={amenity} amenity={amenity} />
        ))}
      </div>
    </div>
  )
}

/** Location map section */
const LocationSection: FC<{ title: string; location: string }> = ({ title, location }) => {
  const { t } = useI18n()

  return (
    <div className="mb-10">
      <h2 className="font-sans text-xl font-semibold text-foreground mb-4">{t('common.location')}</h2>
      <div className="rounded-2xl overflow-hidden border border-border bg-card">
        <iframe
          title={`${title} ${t('common.location')}`}
          src={`https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`}
          className="w-full h-[320px]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  )
}

/** Single comment item */
const CommentCard: FC<{ comment: CommentItem }> = ({ comment }) => {
  const { formatDate } = useI18n()

  return (
    <article className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4 mb-2">
        <p className="font-medium text-foreground">{comment.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(comment.createdAt)}
        </p>
      </div>
      <StarRating rating={comment.rating} />
      <p className="text-sm text-muted-foreground leading-relaxed mt-2">{comment.message}</p>
    </article>
  )
}

/** Comment form */
const CommentForm: FC<{
  message: string
  rating: number
  loading: boolean
  onMessageChange: (message: string) => void
  onRatingChange: (rating: number) => void
  onSubmit: (e: FormEvent) => void
}> = ({ message, rating, loading, onMessageChange, onRatingChange, onSubmit }) => {
  const { t } = useI18n()

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card border border-border rounded-2xl p-5 mb-6 space-y-4"
    >
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          {t('common.rating')}
        </label>
        <RatingInput value={rating} onChange={onRatingChange} />
        <RatingPreview value={rating} className="mt-2" />
      </div>

      <Textarea
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder={t('propertyDetail.shareExperience')}
        required
      />

      <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
        <Send className="w-4 h-4" />
        {loading ? t('common.postingEllipsis') : t('common.postComment')}
      </Button>
    </form>
  )
}

/** Comments section */
const CommentSection: FC<CommentSectionProps> = ({
  comments,
  commentsLoading,
  commentsError,
  commentError,
  commentLoading,
  message,
  rating,
  onMessageChange,
  onRatingChange,
  onSubmit,
}) => {
  const { t } = useI18n()

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-gold" />
        <h2 className="font-sans text-xl font-semibold text-foreground">{t('propertyDetail.commentsTitle')}</h2>
      </div>

      <CommentForm
        message={message}
        rating={rating}
        loading={commentLoading}
        onMessageChange={onMessageChange}
        onRatingChange={onRatingChange}
        onSubmit={onSubmit}
      />

      {commentError && (
        <div className="mb-4 bg-card border border-border rounded-2xl p-4 text-sm text-destructive">
          {commentError}
        </div>
      )}

      <div className="space-y-4">
        {commentsLoading && (
          <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted-foreground">
            {t('common.loadingComments')}
          </div>
        )}

        {commentsError && (
          <div className="bg-card border border-border rounded-2xl p-5 text-sm text-destructive">
            {t('common.failedToLoadComments', { message: commentsError.message })}
          </div>
        )}

        {!commentsLoading && !commentsError && comments.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted-foreground">
            {t('common.noComments')}
          </div>
        )}

        {!commentsLoading && !commentsError && comments.length > 0 && (
          <div className="max-h-[480px] overflow-y-auto pr-2 space-y-4">
            {comments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Related stays shown after the detail content, ranked by type, location and price. */
const RecommendedProperties: FC<RecommendedPropertiesProps> = ({ property, properties, loading }) => {
  const { propertyTypeLabel, t, formatNumber } = useI18n()

  if (!loading && properties.length === 0) return null

  return (
    <section className="roomi-recommendations" aria-labelledby="roomi-recommendations-title">
      <div className="roomi-recommendations__header">
        <div>
          <p className="roomi-recommendations__eyebrow">{t('propertyDetail.recommendationsEyebrow')}</p>
          <h2 id="roomi-recommendations-title">{t('propertyDetail.similarTitle', { type: propertyTypeLabel(property.propertyType) })}</h2>
          <p className="roomi-recommendations__subtitle">
            {t('propertyDetail.similarSubtitle', { location: property.location })}
          </p>
        </div>
        <Link to={`/properties?category=${property.category}`} className="roomi-recommendations__link">
          {t('propertyDetail.seeAll')}
        </Link>
      </div>

      {loading ? (
        <div className="roomi-recommendations__loading" aria-live="polite">
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div className="roomi-listing-grid roomi-recommendations__grid">
          {properties.map((item) => (
            <article key={item._id} className="roomi-listing-card">
              <Link to={`/properties/${item._id}`} className="roomi-listing-card__image-wrap">
                <img
                  src={resolveImageUrl(item.propertyImages?.[0])}
                  alt={item.propertyTitle}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_IMAGE
                  }}
                />
                <span className="roomi-listing-card__badge">{propertyTypeLabel(item.propertyType)}</span>
              </Link>
              <Link to={`/properties/${item._id}`} className="roomi-listing-card__body">
                <div className="roomi-listing-card__title-row">
                  <h3>{item.propertyTitle}</h3>
                  <span>
                    <Star size={14} fill="currentColor" />
                    {Number(item.propertyRank) > 0 ? Number(item.propertyRank).toFixed(1) : t('propertyDetail.newRating')}
                  </span>
                </div>
                <p className="roomi-listing-card__location">
                  <MapPin size={14} /> {formatLocation(item.propertyLocation)}
                </p>
                <p className="roomi-listing-card__meta">
                  {item.propertyBeds || 1} {t('common.beds').toLowerCase()} · {item.propertyRooms || 1} {t('common.rooms').toLowerCase()} · {item.propertyComments || 0} {t('common.comments').toLowerCase()}
                </p>
                <p className="roomi-listing-card__price">
                  <strong>{formatMoney(item.propertyPrice, formatNumber)}</strong> <span>{t('common.perNight')}</span>
                </p>
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

/** Date input field */
const DateInput: FC<{
  label: string
  value: string
  onChange: (value: string) => void
}> = ({ label, value, onChange }) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1 block uppercase tracking-wider">
      {label}
    </label>
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground outline-none focus:ring-2 focus:ring-primary/30"
    />
  </div>
)

/** Booking sidebar */
const BookingSidebar: FC<BookingSidebarProps> = ({
  property,
  units,
  selectedUnitId,
  unitQuantity,
  checkInDate,
  checkOutDate,
  guestCounts,
  bookingError,
  bookingSummary,
  pricingLoading,
  onCheckInChange,
  onCheckOutChange,
  onGuestCountsChange,
  onUnitChange,
  onUnitQuantityChange,
  onReviewBooking,
}) => {
  const { t, formatNumber } = useI18n()
  const selectedUnit = units.find((unit) => unit._id === selectedUnitId)
  const nightlyPrice = bookingSummary?.items?.[0]?.pricePerDay ?? property.price
  const totalPrice = bookingSummary?.totalPrice ?? Math.round(property.price)

  return (
    <div className="roomi-booking-sidebar lg:col-span-1">
      <div className="roomi-booking-card sticky top-28 bg-card rounded-2xl p-6 elevated-shadow border border-border">
        {/* Price display */}
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-3xl font-bold text-foreground">{formatMoney(nightlyPrice, formatNumber)}</span>
          <span className="text-sm text-muted-foreground">{t('common.perNight')}</span>
        </div>

        {bookingSummary ? (
          <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span>{t('propertyDetail.nights', { count: bookingSummary.nights })}</span>
              <span className="text-foreground font-medium">{formatMoney(totalPrice, formatNumber)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {bookingSummary.items?.slice(0, 4).map((item) => (
                <span key={item.date} className="rounded-full bg-background px-2.5 py-1">
                  {item.date} · {formatMoney(item.pricePerDay, formatNumber)}
                </span>
              ))}
            </div>
            {pricingLoading ? <p className="mt-2">{t('propertyDetail.recalculatingPricing')}</p> : null}
          </div>
        ) : null}

        {/* Booking form */}
        <div className="space-y-3 mb-6">
          {units.length > 1 && (
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('propertyDetail.roomOrUnitType')}
              <select
                value={selectedUnitId}
                onChange={(event) => onUnitChange(event.target.value)}
                className="mt-1.5 text-sm w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              >
                {units.map((unit) => (
                  <option key={unit._id} value={unit._id}>
                    {unit.name} · {unit.inventoryCount} {t('common.available')} · {formatMoney(unit.basePrice, formatNumber)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(() => {
            const selectedUnit = units.find((unit) => unit._id === selectedUnitId)
            if (!selectedUnit || selectedUnit.unitType === 'ENTIRE_UNIT' || selectedUnit.inventoryCount <= 1) return null
            return (
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('propertyDetail.numberOfRooms')}
                <select
                  value={unitQuantity}
                  onChange={(event) => onUnitQuantityChange(Number(event.target.value))}
                  className="mt-1.5 text-sm w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {Array.from({ length: selectedUnit.inventoryCount }, (_, index) => index + 1).map((quantity) => (
                    <option key={quantity} value={quantity}>{quantity}</option>
                  ))}
                </select>
              </label>
            )
          })()}
          <div className="grid grid-cols-2 gap-3">
            <DateInput label={t('common.checkIn')} value={checkInDate} onChange={onCheckInChange} />
            <DateInput label={t('common.checkOut')} value={checkOutDate} onChange={onCheckOutChange} />
          </div>
          <GuestPicker
            value={guestCounts}
            onChange={onGuestCountsChange}
            maxGuests={(selectedUnit?.maxGuests ?? 16) * Math.max(1, unitQuantity)}
            petsAllowed={selectedUnit?.petsAllowed !== false}
            infantsAllowed={selectedUnit?.infantsAllowed !== false}
          />
        </div>

        {/* Review button */}
        <Button type="button" onClick={onReviewBooking} className="w-full h-12 text-base">
          {t('common.booking')}
        </Button>

        {/* Error message */}
        {bookingError && <p className="text-sm text-destructive mt-3">{bookingError}</p>}
      </div>
    </div>
  )
}

/** Card selection item */
const CardSelectItem: FC<{
  card: SavedCard
  isSelected: boolean
  onSelect: () => void
}> = ({ card, isSelected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`w-full text-left p-2.5 rounded-lg border gentle-animation flex items-center justify-between ${
      isSelected
        ? 'border-primary bg-primary/10'
        : 'border-border bg-background hover:bg-muted'
    }`}
  >
    <span className="flex items-center gap-2 text-foreground">
      <CreditCard className="w-4 h-4" />
      {card.brand} •••• {card.last4}
    </span>
    <span className="text-xs text-muted-foreground">{card.expiry}</span>
  </button>
)

/** Booking review modal */
const BookingReviewModal: FC<BookingReviewModalProps> = ({
  property,
  checkInDate,
  checkOutDate,
  guestCount,
  savedCards,
  selectedCardId,
  bookingError,
  bookingLoading,
  bookingSummary,
  onSelectCard,
  onClose,
  onConfirm,
}) => {
  const { t, formatDate, formatNumber } = useI18n()

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeVariants}
      className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        variants={slideUpVariants}
        className="w-full max-w-lg bg-card border border-border rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-sans text-xl font-semibold text-foreground">{t('common.reviewBooking')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted gentle-animation"
            aria-label={t('common.closeModal')}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Booking summary */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm mb-3">
          <p className="font-medium text-foreground">{t('common.bookingSummary')}</p>
          <p className="text-muted-foreground mt-1">{property.title}</p>
          <p className="text-muted-foreground">
            {formatDate(checkInDate)} → {formatDate(checkOutDate)} · {guestCount} {guestCount > 1 ? t('common.guests') : t('common.guest')}
          </p>
          {bookingSummary ? (
            <div className="mt-1 space-y-1">
              <p className="text-foreground font-medium">{t('common.total')}: {formatMoney(bookingSummary.totalPrice, formatNumber)}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {bookingSummary.items?.slice(0, 4).map((item) => (
                  <span key={item.date} className="rounded-full bg-background px-2.5 py-1 text-muted-foreground">
                    {item.date} · {formatMoney(item.pricePerDay, formatNumber)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              {t('propertyDetail.selectValidDates')}
            </p>
          )}
        </div>

        {/* Card selection */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm mb-4">
          <p className="font-medium text-foreground mb-2">{t('common.selectCard')}</p>
          {savedCards.length === 0 ? (
            <p className="text-destructive">{t('propertyDetail.noSavedCards')}</p>
          ) : (
            <div className="space-y-2">
              {savedCards.map((card) => (
                <CardSelectItem
                  key={card.id}
                  card={card}
                  isSelected={selectedCardId === card.id}
                  onSelect={() => onSelectCard(card.id)}
                />
              ))}
              {savedCards.length === 1 && (
                <p className="text-xs text-muted-foreground">
                  {t('propertyDetail.oneCardAutoSelected')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {bookingError && <p className="text-sm text-destructive mb-3">{bookingError}</p>}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="h-11">
            {t('common.back')}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={bookingLoading} className="h-11">
            {bookingLoading ? t('common.booking') : t('common.confirmBooking')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// -----------------------------------------------------------------------------
// CUSTOM HOOKS
// -----------------------------------------------------------------------------

/** Escape key handler hook */
function useEscapeKey(callbacks: Array<() => void>): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callbacks.forEach((callback) => callback())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [callbacks])
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
export default function PropertyDetail(): JSX.Element {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [guestCounts, setGuestCounts] = useState<GuestCounts>(DEFAULT_GUEST_COUNTS)
  const guestCount = totalGuests(guestCounts)
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [unitQuantity, setUnitQuantity] = useState(1)

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------
  const {
    data: propertyData,
    loading: propertyLoading,
    error: propertyError,
    refetch: refetchProperty,
  } = useQuery<GetPropertyResponse, GetPropertyVariables>(GET_PROPERTY, {
    variables: { propertyId: id || '' },
    skip: !id,
    fetchPolicy: 'network-only',
  })

  const { data: unitsData } = useQuery<GetBookableUnitsResponse, GetBookableUnitsVariables>(GET_BOOKABLE_UNITS, {
    variables: { propertyId: id || '' },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  })

  const recommendedPropertyType = propertyData?.getProperty?.propertyType?.toUpperCase()
  const {
    data: recommendedData,
    loading: recommendedLoading,
  } = useQuery<GetRecommendedPropertiesResponse, GetRecommendedPropertiesVariables>(GET_RECOMMENDED_PROPERTIES, {
    variables: {
      input: {
        page: 1,
        limit: 24,
        sort: 'propertyRank',
        direction: SortDirection.DESC,
        search: {
          typeList: recommendedPropertyType ? [recommendedPropertyType] : undefined,
        },
      },
    },
    skip: !recommendedPropertyType,
    fetchPolicy: 'cache-and-network',
  })

  const {
    data: commentsData,
    loading: commentsLoading,
    error: commentsError,
    refetch: refetchComments,
  } = useQuery<GetCommentsResponse, GetCommentsVariables>(GET_COMMENTS, {
    variables: {
      input: {
        page: QUERY_CONFIG.COMMENTS.PAGE,
        limit: QUERY_CONFIG.COMMENTS.LIMIT,
        sort: QUERY_CONFIG.COMMENTS.SORT_FIELD,
        direction: QUERY_CONFIG.COMMENTS.SORT_DIRECTION,
        search: {
          commentRefId: id || '',
        },
      },
    },
    skip: !id,
    fetchPolicy: 'network-only',
  })

  const shouldPreviewPricing = Boolean(id && checkInDate && checkOutDate)
  const {
    data: pricePreviewData,
    loading: pricePreviewLoading,
  } = useQuery<PricePreviewResponse, PricePreviewVariables>(GET_PROPERTY_PRICE_PREVIEW, {
    variables: {
      input: {
        propertyId: id || '',
        unitId: selectedUnitId || undefined,
        quantity: unitQuantity,
        guests: guestCount,
        adults: guestCounts.adults,
        children: guestCounts.children,
        infants: guestCounts.infants,
        pets: guestCounts.pets,
        startDate: checkInDate,
        endDate: checkOutDate,
      },
    },
    skip: !shouldPreviewPricing,
    fetchPolicy: 'network-only',
  })

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------
  const [createBooking, { loading: bookingLoading }] = useMutation<
    CreateBookingResponse,
    CreateBookingVariables
  >(CREATE_BOOKINGS)

  const [createComment, { loading: commentLoading }] = useMutation<
    CreateCommentResponse,
    CreateCommentVariables
  >(CREATE_COMMENT)
  const [likeProperty] = useMutation(LIKE_TARGET_PROPERTY)

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [currentImage, setCurrentImage] = useState(0)
  const [showGallery, setShowGallery] = useState(false)
  const [showBookingReview, setShowBookingReview] = useState(false)
  const [saved, setSaved] = useState(false)

   // Comment form state
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<number>(RATING_LIMITS.DEFAULT)
  const [commentError, setCommentError] = useState('')

  // Booking form state
  const [bookingError, setBookingError] = useState('')
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [selectedCardId, setSelectedCardId] = useState('')

  // ---------------------------------------------------------------------------
  // MEMOIZED VALUES
  // ---------------------------------------------------------------------------
  const property = useMemo<DisplayProperty | undefined>(() => {
    if (!propertyData?.getProperty) return undefined
    return mapApiPropertyToDisplay(propertyData.getProperty)
  }, [propertyData])

  const recommendedProperties = useMemo(() => {
    if (!property) return []

    const targetPrice = Number(property.price) || 0
    return (recommendedData?.getProperties?.list ?? [])
      .filter((item) => item._id !== property.id)
      .map((item) => {
        const itemPrice = Number(item.propertyPrice) || 0
        const sameLocation = item.propertyLocation === property.propertyLocation
        const priceDistance = targetPrice > 0
          ? Math.abs(itemPrice - targetPrice) / targetPrice
          : 1

        // Keep recommendations relevant even when the API rank is the same:
        // location gets priority, then a similar nightly price, then rating.
        const score =
          (sameLocation ? 1000 : 0) +
          Math.max(0, 100 - priceDistance * 100) +
          (Number(item.propertyRank) || 0) * 20

        return { item, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ item }) => item)
  }, [property, recommendedData])

  const units = useMemo(() => unitsData?.getBookableUnits?.list ?? [], [unitsData])

  const propertyIds = useMemo(() => (property ? [property.id] : []), [property])
  const ratingsById = usePropertyRatings(propertyIds)

  const displayedRating = useMemo(() => {
    if (!property) return 0
    return ratingsById[property.id]?.rating ?? property.rating ?? 0
  }, [property, ratingsById])

  const displayedReviews = useMemo(() => {
    if (!property) return 0
    return ratingsById[property.id]?.ratingCount ?? property.ratingCount ?? 0
  }, [property, ratingsById])

  const propertyComments = useMemo<CommentItem[]>(() => {
    const list = commentsData?.getComments?.list ?? []

    const filtered = list.filter(
      (c) => c.commentGroup === CommentGroup.PROPERTY && c.commentRefId === id,
    )

    const mapped = filtered.map((comment) => mapBackendCommentToItem(comment, t('common.guest')))
    return sortCommentsByDate(mapped)
  }, [commentsData, id, t])

  const images = useMemo(() => {
    if (!property || property.images.length === 0) {
      return [DEFAULT_IMAGE]
    }
    return property.images
  }, [property])

  const bookingSummary = useMemo(() => {
    const preview = pricePreviewData?.getPropertyPricePreview
    return buildBookingSummaryFromPreview(preview) ?? calculateBookingSummary(checkInDate, checkOutDate, property?.price ?? 0)
  }, [checkInDate, checkOutDate, pricePreviewData, property?.price])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------
  useEscapeKey([
    () => setShowGallery(false),
    () => setShowBookingReview(false),
  ])

  useEffect(() => {
    if (!units.length) return
    if (!units.some((unit) => unit._id === selectedUnitId)) {
      setSelectedUnitId(units[0]._id)
      setUnitQuantity(1)
    }
  }, [units, selectedUnitId])

  useEffect(() => {
    const selectedUnit = units.find((unit) => unit._id === selectedUnitId)
    const maxQuantity = selectedUnit?.unitType === 'ENTIRE_UNIT'
      ? 1
      : Math.max(1, selectedUnit?.inventoryCount ?? 1)
    setUnitQuantity((current) => Math.min(Math.max(1, current), maxQuantity))
  }, [units, selectedUnitId])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleGoBack = () => navigate(-1)

  const handleSave = async () => {
    if (!property) return
    if (!isAuthenticated()) {
      const message = t('common.signedInRequired')
      window.alert(message)
      navigate('/sign-in')
      return
    }
    try {
      await likeProperty({ variables: { propertyId: property.id } })
      setSaved((value) => !value)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('propertyDetail.saveFailed'))
    }
  }

  const handleShare = async () => {
    const shareData = { title: property?.title || 'ROOMi', url: window.location.href }
    try {
      if (navigator.share) await navigator.share(shareData)
      else await navigator.clipboard.writeText(window.location.href)
    } catch {
      // The user cancelled the native share sheet.
    }
  }

  const handleImageClick = (index: number) => {
    setCurrentImage(index)
    setShowGallery(true)
  }

  const handlePrevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length)
  }

  const handleNextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length)
  }

  const handleReviewBooking = () => {
    setBookingError('')

    if (!isAuthenticated()) {
      const message = t('common.signedInRequired')
      setBookingError(message)
      window.alert(message)
      return
    }

    const cards = readSavedCards()
    setSavedCards(cards)
    if (cards.length === 0) {
      const message = t('propertyDetail.noSavedCardFound')
      setBookingError(message)
      window.alert(message)
      navigate('/my-page/payments')
      return
    }

    if (cards.length === 1) {
      setSelectedCardId(cards[0].id)
    } else if (!cards.some((card) => card.id === selectedCardId)) {
      setSelectedCardId('')
    }

    setShowBookingReview(true)

    if (!checkInDate || !checkOutDate) {
      setBookingError(t('propertyDetail.selectDates'))
      return
    }

    if (!bookingSummary) {
      setBookingError(t('propertyDetail.checkOutAfterCheckIn'))
    }
  }

  const handleCreateBooking = async () => {
    if (!property) return

    setBookingError('')

    if (!isAuthenticated()) {
      const message = t('common.signedInRequired')
      setBookingError(message)
      window.alert(message)
      return
    }

    if (!bookingSummary) {
      setBookingError(t('propertyDetail.checkOutAfterCheckIn'))
      return
    }

    if (savedCards.length === 0) {
      const message = t('propertyDetail.noSavedCardFound')
      setBookingError(message)
      window.alert(message)
      navigate('/my-page/payments')
      return
    }

    if (!selectedCardId) {
      setBookingError(t('propertyDetail.selectCardContinue'))
      return
    }

    try {
      const { data: bookingData } = await createBooking({
        variables: {
          input: {
            propertyId: property.id,
            unitId: selectedUnitId || undefined,
            quantity: unitQuantity,
            bookingStart: checkInDate,
            bookingEnd: checkOutDate,
            bookingGuests: guestCount,
            adults: guestCounts.adults,
            children: guestCounts.children,
            infants: guestCounts.infants,
            pets: guestCounts.pets,
            totalPrice: bookingSummary.totalPrice,
          },
        },
      })

      if (!bookingData?.createBooking?._id) {
        const errorMessage = t('propertyDetail.bookingNotCreated')
        setBookingError(errorMessage)
        window.alert(`${t('propertyDetail.bookingFailed')}: ${errorMessage}`)
        return
      }

      setShowBookingReview(false)
      window.alert(`${t('propertyDetail.bookedSuccessfully')}: ${t('propertyDetail.bookingCreated')}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('propertyDetail.failedToCreateBooking')
      setBookingError(errorMessage)
      window.alert(`${t('propertyDetail.bookingFailed')}: ${errorMessage}`)
    }
  }

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault()
    setCommentError('')

    const cleanMessage = message.trim()
    if (!cleanMessage) return

    if (!isAuthenticated()) {
      setCommentError(t('propertyDetail.signInToComment'))
      return
    }

    if (rating < RATING_LIMITS.MIN || rating > RATING_LIMITS.MAX) {
      setCommentError(t('propertyDetail.ratingBetween', {
        min: RATING_LIMITS.MIN,
        max: RATING_LIMITS.MAX,
      }))
      return
    }

    if (!property) return

    try {
      const { data: commentData } = await createComment({
        variables: {
          input: {
            commentContent: cleanMessage,
            commentRefId: property.id,
            commentGroup: CommentGroup.PROPERTY,
            commentStars: rating,
          },
        },
      })

      if (!commentData?.createComment?._id) {
        throw new Error(t('propertyDetail.commentNotCreated'))
      }

      setMessage('')
      setRating(RATING_LIMITS.DEFAULT)

      await Promise.all([refetchComments(), refetchProperty()])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('propertyDetail.failedToPostComment')
      setCommentError(errorMessage)
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER CONDITIONS
  // ---------------------------------------------------------------------------
  if (propertyLoading) {
    return <LoadingState message={t('common.loadingProperty')} />
  }

  if (propertyError) {
    return <ErrorState message={propertyError.message} />
  }

  if (!property) {
    return <NotFoundState />
  }

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="roomi-detail-page min-h-screen bg-background">
      <Navbar forceSolid />

      <main className="roomi-detail-main max-w-7xl mx-auto px-6 pt-8 pb-16">
        <BackButton onClick={handleGoBack} />

        <div className="roomi-detail-topline">
          <PropertyHeader
            property={property}
            rating={displayedRating}
            reviewCount={displayedReviews}
          />
          <div className="roomi-detail-actions">
            <button type="button" onClick={handleShare}>
              <Share2 size={16} /> {t('common.share')}
            </button>
            <button type="button" onClick={handleSave} className={saved ? 'is-saved' : ''}>
              <Heart size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? t('common.saved') : t('common.save')}
            </button>
          </div>
        </div>

        <PropertyImages images={images} title={property.title} onImageClick={handleImageClick} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left column - Property details */}
          <div className="lg:col-span-2">
            <DescriptionSection description={property.description} />

            <AmenitiesSection amenities={property.amenities} />

            <LocationSection title={property.title} location={property.location} />

            <CommentSection
              propertyId={property.id}
              comments={propertyComments}
              commentsLoading={commentsLoading}
              commentsError={commentsError}
              commentError={commentError}
              commentLoading={commentLoading}
              message={message}
              rating={rating}
              onMessageChange={setMessage}
              onRatingChange={setRating}
              onSubmit={handleSubmitComment}
            />
          </div>

          {/* Right column - Booking sidebar */}
          <BookingSidebar
            property={property}
            units={units}
            selectedUnitId={selectedUnitId}
            unitQuantity={unitQuantity}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            guestCounts={guestCounts}
            bookingError={bookingError}
            bookingSummary={bookingSummary}
            pricingLoading={pricePreviewLoading}
            onCheckInChange={setCheckInDate}
            onCheckOutChange={setCheckOutDate}
            onGuestCountsChange={setGuestCounts}
            onUnitChange={(unitId) => {
              setSelectedUnitId(unitId)
              setUnitQuantity(1)
            }}
            onUnitQuantityChange={setUnitQuantity}
            onReviewBooking={handleReviewBooking}
          />
        </div>

        <RecommendedProperties
          property={property}
          properties={recommendedProperties}
          loading={recommendedLoading}
        />
      </main>

      <Footer />

      {/* Image gallery modal */}
      <AnimatePresence>
        {showGallery && (
          <ImageGallery
            images={images}
            title={property.title}
            currentIndex={currentImage}
            onClose={() => setShowGallery(false)}
            onPrev={handlePrevImage}
            onNext={handleNextImage}
            onSelect={setCurrentImage}
          />
        )}
      </AnimatePresence>

      {/* Booking review modal */}
      <AnimatePresence>
        {showBookingReview && (
          <BookingReviewModal
            property={property}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            guestCount={guestCount}
            savedCards={savedCards}
            selectedCardId={selectedCardId}
            bookingError={bookingError}
            bookingLoading={bookingLoading}
            bookingSummary={bookingSummary}
            onSelectCard={setSelectedCardId}
            onClose={() => setShowBookingReview(false)}
            onConfirm={handleCreateBooking}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
