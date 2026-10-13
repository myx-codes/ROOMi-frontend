export type PropertyCategory = 'villa' | 'hotel' | 'sanatorium'

export type PropertyType = 'VILLA' | 'HOTEL' | 'SANATORIUM' | 'APARTMENT' | 'RESORT'
export type ListingPropertyType = Extract<PropertyType, 'VILLA' | 'HOTEL' | 'SANATORIUM'>

export type PropertyStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'HOLD'
  | 'BOOKED'
  | 'DELETE'
export type SortDirection = 'ASC' | 'DESC'

export interface PropertyListItem {
  _id: string
  propertyType: string
  propertyStatus?: string
  propertyLocation: string
  propertyAddress?: string
  propertyTitle: string
  propertyPrice: number
  dynamicPricingEnabled?: boolean | null
  weekendMultiplier?: number | null
  minMultiplier?: number | null
  maxMultiplier?: number | null
  manualMultiplierOverride?: number | null
  propertySquare?: number
  propertyBeds?: number
  propertyRooms?: number
  propertyRank?: number
  propertyRatingCount?: number
  propertyComments: number
  propertyImages: string[]
  propertyDesc?: string | null
  propertyRent?: boolean
  memberId?: string
  deletedAt?: string | null
  constructedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface PropertyCardView {
  id: string
  title: string
  location: string
  price: number
  rating: number
  ratingCount: number
  image: string
  category: PropertyCategory
  amenities: string[]
}

export interface PropertyDetailView extends Omit<PropertyCardView, 'image'> {
  images: string[]
  description: string
}
