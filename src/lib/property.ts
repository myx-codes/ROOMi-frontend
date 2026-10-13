import { amenityLabels } from '@/data/mockData'
import type {
  ListingPropertyType,
  PropertyCardView,
  PropertyCategory,
  PropertyDetailView,
  PropertyListItem,
  PropertyStatus,
  PropertyType,
} from '@/types/property'

export const DEFAULT_PROPERTY_IMAGE = '/assets/hero-villa.jpg'
export const SANATORIUM_META_MARKER = 'ROOMI_SANATORIUM_META:'

export const PROPERTY_CATEGORIES: PropertyCategory[] = ['villa', 'hotel', 'sanatorium']
export const LISTING_PROPERTY_TYPES: ListingPropertyType[] = ['VILLA', 'HOTEL', 'SANATORIUM']
export const PROPERTY_STATUSES: PropertyStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'SUSPENDED',
  'ARCHIVED',
  'HOLD',
  'BOOKED',
  'DELETE',
]

const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL ||
  (import.meta.env.PROD
    ? '/graphql'
    : typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:3008/graphql`
      : 'http://localhost:3008/graphql')

export function getBackendOrigin(): string {
  if (typeof window !== 'undefined' && GRAPHQL_URL.startsWith('/')) {
    return window.location.origin
  }

  try {
    return new URL(GRAPHQL_URL).origin
  } catch {
    return typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:3008`
      : 'http://localhost:3008'
  }
}

export function resolvePropertyImageUrl(imagePath?: string): string {
  if (!imagePath) {
    return DEFAULT_PROPERTY_IMAGE
  }

  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
    return imagePath
  }

  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${getBackendOrigin()}${cleanPath}`
}

export function isPropertyCategory(value?: string | null): value is PropertyCategory {
  return !!value && PROPERTY_CATEGORIES.includes(value as PropertyCategory)
}

export function normalizePropertyCategory(type?: string | null): PropertyCategory {
  const normalized = String(type || '').toUpperCase()

  if (normalized === 'HOTEL') return 'hotel'
  if (normalized === 'SANATORIUM') return 'sanatorium'
  return 'villa'
}

export function normalizeListingPropertyType(type?: string | null): ListingPropertyType {
  const normalized = String(type || '').toUpperCase()
  return LISTING_PROPERTY_TYPES.includes(normalized as ListingPropertyType)
    ? (normalized as ListingPropertyType)
    : 'VILLA'
}

export function normalizePropertyType(type?: string | null): PropertyType {
  const normalized = String(type || '').toUpperCase()
  if (normalized === 'APARTMENT' || normalized === 'RESORT') {
    return normalized
  }

  return normalizeListingPropertyType(normalized)
}

export function normalizePropertyStatus(status?: string | null): PropertyStatus {
  const normalized = String(status || '').toUpperCase()
  return PROPERTY_STATUSES.includes(normalized as PropertyStatus)
    ? (normalized as PropertyStatus)
    : 'PENDING_REVIEW'
}

export function formatPropertyLocation(value?: string | null): string {
  return String(value || '')
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function toFiniteNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export function toPositiveCount(value: unknown): number {
  const count = Math.round(toFiniteNumber(value))
  return count > 0 ? count : 0
}

export function parseAmenitiesFromDescription(description?: string | null): string[] {
  if (!description) return []

  const match = description.match(/(?:^|\n)Amenities:\s*([^\n]+)/i)
  if (!match) return []

  return match[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((label) => {
      const found = Object.entries(amenityLabels).find(([, value]) => value.toLowerCase() === label.toLowerCase())
      return found?.[0] || label.toLowerCase().replace(/\s+/g, '-')
    })
}

export function parsePropertyDescription(description?: string | null): {
  description: string
  amenities: string[]
} {
  if (!description) {
    return { description: '', amenities: [] }
  }

  const withoutMeta = description
    .replace(new RegExp(`(?:\\n|^)${SANATORIUM_META_MARKER}[^\\n]+`, 'g'), '')
    .trim()

  const amenitiesMatch = withoutMeta.match(/(?:^|\n)Amenities:\s*([^\n]+)/i)

  if (!amenitiesMatch) {
    return { description: withoutMeta, amenities: [] }
  }

  return {
    description: withoutMeta.replace(/(?:\n|^)Amenities:\s*[^\n]+/i, '').trim(),
    amenities: parseAmenitiesFromDescription(withoutMeta),
  }
}

export function mapPropertyListItemToCard(item: PropertyListItem): PropertyCardView {
  return {
    id: item._id,
    title: item.propertyTitle,
    location: formatPropertyLocation(item.propertyLocation),
    price: item.propertyPrice,
    rating: toFiniteNumber(item.propertyRank),
    ratingCount: toPositiveCount(item.propertyRatingCount ?? item.propertyComments),
    image: resolvePropertyImageUrl(item.propertyImages?.[0]),
    category: normalizePropertyCategory(item.propertyType),
    amenities: parseAmenitiesFromDescription(item.propertyDesc),
  }
}

export function mapPropertyListItemToDetail(item: PropertyListItem): PropertyDetailView {
  const parsed = parsePropertyDescription(item.propertyDesc)

  return {
    id: item._id,
    title: item.propertyTitle,
    location: formatPropertyLocation(item.propertyLocation),
    price: item.propertyPrice,
    rating: toFiniteNumber(item.propertyRank),
    ratingCount: toPositiveCount(item.propertyRatingCount ?? item.propertyComments),
    images: (item.propertyImages || []).map(resolvePropertyImageUrl),
    category: normalizePropertyCategory(item.propertyType),
    amenities: parsed.amenities,
    description: parsed.description,
  }
}
