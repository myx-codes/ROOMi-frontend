import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { Star, MapPin, Pencil, Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CREATE_PROPERTY, UPDATE_PROPERTY } from '@/graphql/user/mutation'
import { GET_PROPERTIES } from '@/graphql/user/query'
import { usePropertyRatings } from '@/hooks/usePropertyRatings'
import { useI18n } from '@/i18n'
import { getMemberProfile } from '@/lib/auth'
import { amenityLabels } from '@/data/mockData'

type PropertyType = 'VILLA' | 'HOTEL' | 'SANATORIUM'
type PropertyStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'HOLD'
  | 'BOOKED'
  | 'DELETE'

type CreatedProperty = {
  _id: string
  propertyType: string
  propertyStatus?: PropertyStatus
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
  updatedAt?: string
}

type CreatePropertyResponse = {
  createProperty: CreatedProperty
}

type CreatePropertyVariables = {
  input: {
    propertyType: PropertyType
    propertyLocation: string
    propertyAddress: string
    propertyTitle: string
    propertyPrice: number
    dynamicPricingEnabled?: boolean
    weekendMultiplier?: number
    minMultiplier?: number
    maxMultiplier?: number
    manualMultiplierOverride?: number | null
    propertySquare: number
    propertyBeds: number
    propertyRooms: number
    propertyImages: string[]
    propertyDesc: string
  }
}

type UpdatePropertyResponse = {
  updateProperty: {
    _id: string
    propertyTitle: string
    propertyPrice: number
    propertyStatus: PropertyStatus
    propertyImages: string[]
    updatedAt: string
  }
}

type UpdatePropertyVariables = {
  input: {
    _id: string
    propertyType?: PropertyType
    propertyStatus?: PropertyStatus
    propertyLocation?: string
    propertyAddress?: string
    propertyTitle?: string
    propertyPrice?: number
    dynamicPricingEnabled?: boolean
    weekendMultiplier?: number
    minMultiplier?: number
    maxMultiplier?: number
    manualMultiplierOverride?: number | null
    propertySquare?: number
    propertyBeds?: number
    propertyRooms?: number
    propertyDesc?: string
    propertyImages?: string[]
  }
}

type EditListingForm = {
  _id: string
  propertyType: PropertyType
  propertyStatus: PropertyStatus
  propertyLocation: string
  propertyAddress: string
  propertyTitle: string
  propertyPrice: string
  dynamicPricingEnabled: boolean
  weekendMultiplier: string
  minMultiplier: string
  maxMultiplier: string
  manualMultiplierOverride: string
  propertySquare: string
  propertyBeds: string
  propertyRooms: string
  propertyDesc: string
}

type EditImagePreview = {
  id: string
  url: string
  isNew: boolean
}

type GetPropertiesResponse = {
  getProperties: {
    list: CreatedProperty[]
    metaCounter?: {
      total?: number
    }
  }
}

type GetPropertiesVariables = {
  input: {
    page: number
    limit: number
    sort?: string
    direction?: 'ASC' | 'DESC'
    search: {
      memberId?: string
    }
  }
}

type LocalPropertyCard = {
  id: string
  title: string
  location: string
  price: number
  rating: number
  ratingCount: number
  image: string
  propertyType: PropertyType
  category: 'villa' | 'hotel' | 'sanatorium'
}

type ImagesUploaderPayload = {
  data?: {
    imagesUploader?: string[]
  }
  errors?: Array<{
    message: string
  }>
}

type SanatoriumHighlight = {
  label: string
  desc: string
}

type SanatoriumMeta = {
  badge: string
  quote: string
  highlights: SanatoriumHighlight[]
}

type CompactSanatoriumMeta = {
  b: string
  q: string
  h: Array<[string, string]>
}

type UploadMessages = {
  serverError: string
  unknownError: string
  emptyError: string
}

const FALLBACK_IMAGE = '/assets/hero-villa.jpg'
const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL ||
  (import.meta.env.PROD
    ? '/graphql'
    : typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:3008/graphql`
      : 'http://localhost:3008/graphql')
const PROPERTY_DESC_MAX_LENGTH = 500
const AGENT_PAGE_SIZE = 10
const AMENITY_OPTIONS = Object.entries(amenityLabels)
const SANATORIUM_META_MARKER = 'ROOMI_SANATORIUM_META:'

const PROPERTY_TYPE_PRIORITY: Record<PropertyType, number> = {
  HOTEL: 0,
  SANATORIUM: 1,
  VILLA: 2,
}

function createDefaultSanatoriumHighlights(
  t: (key: string, vars?: Record<string, string | number>) => string,
): SanatoriumHighlight[] {
  return [
    { label: t('agent.highlight1Title'), desc: t('agent.highlight1Desc') },
    { label: t('agent.highlight2Title'), desc: t('agent.highlight2Desc') },
    { label: t('agent.highlight3Title'), desc: t('agent.highlight3Desc') },
    { label: t('agent.highlight4Title'), desc: t('agent.highlight4Desc') },
  ]
}

function cloneHighlights(highlights: SanatoriumHighlight[]): SanatoriumHighlight[] {
  return highlights.map((item) => ({ ...item }))
}

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
  if (!imagePath) return FALLBACK_IMAGE
  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
    return imagePath
  }

  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${getBackendOrigin()}${cleanPath}`
}

function mapPropertyTypeToCategory(type: string): 'villa' | 'hotel' | 'sanatorium' {
  const normalized = type.toUpperCase()
  if (normalized === 'HOTEL') return 'hotel'
  if (normalized === 'SANATORIUM') return 'sanatorium'
  return 'villa'
}

function normalizePropertyTypeForForm(type?: string): PropertyType {
  const normalized = (type || '').toUpperCase()
  if (normalized === 'HOTEL' || normalized === 'SANATORIUM' || normalized === 'VILLA') {
    return normalized
  }
  return 'VILLA'
}

function normalizePropertyStatusForForm(status?: string): PropertyStatus {
  const normalized = (status || '').toUpperCase()
  if (
    normalized === 'DRAFT' ||
    normalized === 'PENDING_REVIEW' ||
    normalized === 'ACTIVE' ||
    normalized === 'SUSPENDED' ||
    normalized === 'ARCHIVED' ||
    normalized === 'HOLD' ||
    normalized === 'BOOKED' ||
    normalized === 'DELETE'
  ) {
    return normalized
  }
  return 'PENDING_REVIEW'
}

function toLocalPropertyCard(item: CreatedProperty): LocalPropertyCard {
  const normalizedType = normalizePropertyTypeForForm(item.propertyType)

  return {
    id: item._id,
    title: item.propertyTitle,
    location: item.propertyLocation,
    price: item.propertyPrice,
    rating: item.propertyRank || 0,
    ratingCount: item.propertyRatingCount ?? item.propertyComments ?? 0,
    image: resolveImageUrl(item.propertyImages?.[0]),
    propertyType: normalizedType,
    category: mapPropertyTypeToCategory(normalizedType),
  }
}

function buildDescriptionWithExtras(
  baseDescription: string,
  amenities: string[],
  sanatoriumMeta?: SanatoriumMeta,
): string {
  const cleanDescription = baseDescription.trim()
  const chunks = [cleanDescription]

  if (amenities.length > 0) {
    const amenityText = amenities
      .map((key) => amenityLabels[key] || key)
      .join(', ')

    chunks.push(`Amenities: ${amenityText}`)
  }

  const basePayload = chunks.filter(Boolean).join('\n\n')

  if (!sanatoriumMeta) {
    return basePayload
  }

  const compactMeta: CompactSanatoriumMeta = {
    b: sanatoriumMeta.badge.trim(),
    q: sanatoriumMeta.quote.trim(),
    h: sanatoriumMeta.highlights.map((item) => [item.label.trim(), item.desc.trim()]),
  }

  const withMeta = [basePayload, `${SANATORIUM_META_MARKER}${JSON.stringify(compactMeta)}`]
    .filter(Boolean)
    .join('\n\n')

  // Keep create flow stable with backend validator (`<= 500`) even for rich sanatorium metadata.
  if (withMeta.length > PROPERTY_DESC_MAX_LENGTH) {
    return basePayload
  }

  return withMeta
}

function parseSanatoriumMeta(rawMeta: string): SanatoriumMeta | undefined {
  if (!rawMeta.trim()) {
    return undefined
  }

  try {
    let parsed: Record<string, unknown>

    try {
      parsed = JSON.parse(rawMeta)
    } catch {
      parsed = JSON.parse(decodeURIComponent(rawMeta))
    }

    const badge = String(parsed.b ?? parsed.badge ?? '').trim()
    const quote = String(parsed.q ?? parsed.quote ?? '').trim()

    const rawHighlights = Array.isArray(parsed.h)
      ? parsed.h
      : Array.isArray(parsed.highlights)
        ? parsed.highlights
        : []

    const highlights = rawHighlights
      .map((item): SanatoriumHighlight => {
        if (Array.isArray(item)) {
          return {
            label: String(item[0] ?? '').trim(),
            desc: String(item[1] ?? '').trim(),
          }
        }

        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>
          return {
            label: String(record.label ?? '').trim(),
            desc: String(record.desc ?? '').trim(),
          }
        }

        return { label: '', desc: '' }
      })
      .filter((item) => item.label && item.desc)

    if (!badge || !quote || highlights.length === 0) {
      return undefined
    }

    return { badge, quote, highlights }
  } catch {
    return undefined
  }
}

function parseDescriptionForEdit(propertyDesc?: string | null): {
  baseDescription: string
  amenities: string[]
  sanatoriumMeta?: SanatoriumMeta
} {
  const full = (propertyDesc || '').trim()
  if (!full) {
    return { baseDescription: '', amenities: [] }
  }

  let descriptionPart = full
  let sanatoriumMeta: SanatoriumMeta | undefined

  const markerIndex = full.indexOf(SANATORIUM_META_MARKER)
  if (markerIndex >= 0) {
    descriptionPart = full.slice(0, markerIndex).trim()
    const rawMeta = full.slice(markerIndex + SANATORIUM_META_MARKER.length).trim()
    sanatoriumMeta = parseSanatoriumMeta(rawMeta)
  }

  const labelToKey = AMENITY_OPTIONS.reduce<Record<string, string>>((acc, [key, label]) => {
    acc[label.toLowerCase()] = key
    return acc
  }, {})

  const chunks = descriptionPart
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  const amenities: string[] = []
  const baseChunks: string[] = []

  chunks.forEach((chunk) => {
    if (chunk.startsWith('Amenities:')) {
      const rawAmenities = chunk
        .slice('Amenities:'.length)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

      rawAmenities.forEach((item) => {
        const key = labelToKey[item.toLowerCase()]
        if (key) {
          amenities.push(key)
        }
      })
      return
    }

    baseChunks.push(chunk)
  })

  return {
    baseDescription: baseChunks.join('\n\n').trim(),
    amenities: Array.from(new Set(amenities)),
    sanatoriumMeta,
  }
}

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
    getCookieValue('csrfToken') ||
    getCookieValue('_csrf') ||
    window.localStorage.getItem('XSRF-TOKEN') ||
    window.localStorage.getItem('csrfToken') ||
    ''
  )
}

async function uploadImages(
  files: File[],
  target: string,
  messages: UploadMessages,
): Promise<string[]> {
  const formData = new FormData()
  const query = `
    mutation ImagesUploader($files: [Upload!]!, $target: String!) {
      imagesUploader(files: $files, target: $target)
    }
  `

  const operations = {
    query,
    variables: {
      files: files.map(() => null),
      target,
    },
  }

  const map: Record<string, string[]> = {}
  files.forEach((_, index) => {
    map[String(index)] = [`variables.files.${index}`]
  })

  formData.append('operations', JSON.stringify(operations))
  formData.append('map', JSON.stringify(map))

  files.forEach((file, index) => {
    formData.append(String(index), file, file.name)
  })

  const csrfToken = getCsrfToken()
  const headers: Record<string, string> = {}
  headers['apollo-require-preflight'] = 'true'
  headers['x-apollo-operation-name'] = 'ImagesUploader'

  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken
    headers['x-xsrf-token'] = csrfToken
  }

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  })

  if (!response.ok) {
    throw new Error(messages.serverError)
  }

  const payload = (await response.json()) as ImagesUploaderPayload
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message || messages.unknownError)
  }

  const uploaded = payload.data?.imagesUploader || []
  if (uploaded.length === 0) {
    throw new Error(messages.emptyError)
  }

  return uploaded
}

export default function AgentProperties() {
  const { t, formatNumber, amenityLabel, propertyTypeLabel, propertyStatusLabel } = useI18n()
  const memberId = getMemberProfile()?._id
  const defaultSanatoriumBadge = t('agent.defaultBadge')
  const defaultSanatoriumQuote = t('agent.defaultQuote')
  const defaultSanatoriumHighlights = useMemo(
    () => createDefaultSanatoriumHighlights(t),
    [t],
  )
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | PropertyType>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditListingForm | null>(null)
  const [editImagePaths, setEditImagePaths] = useState<string[]>([])
  const [editNewFiles, setEditNewFiles] = useState<File[]>([])
  const [editNewPreviewUrls, setEditNewPreviewUrls] = useState<string[]>([])
  const [editActivePreviewIndex, setEditActivePreviewIndex] = useState(0)
  const [editSelectedAmenities, setEditSelectedAmenities] = useState<string[]>([])
  const [editSanatoriumBadge, setEditSanatoriumBadge] = useState(defaultSanatoriumBadge)
  const [editSanatoriumQuote, setEditSanatoriumQuote] = useState(defaultSanatoriumQuote)
  const [editSanatoriumHighlights, setEditSanatoriumHighlights] = useState<SanatoriumHighlight[]>(
    defaultSanatoriumHighlights,
  )

  const [propertyType, setPropertyType] = useState<PropertyType>('VILLA')
  const [propertyTitle, setPropertyTitle] = useState('')
  const [propertyLocation, setPropertyLocation] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [propertyPrice, setPropertyPrice] = useState('')
  const [dynamicPricingEnabled, setDynamicPricingEnabled] = useState(true)
  const [weekendMultiplier, setWeekendMultiplier] = useState('1.22')
  const [minMultiplier, setMinMultiplier] = useState('0.85')
  const [maxMultiplier, setMaxMultiplier] = useState('1.8')
  const [manualMultiplierOverride, setManualMultiplierOverride] = useState('')
  const [propertySquare, setPropertySquare] = useState('')
  const [propertyBeds, setPropertyBeds] = useState('')
  const [propertyRooms, setPropertyRooms] = useState('')
  const [propertyDesc, setPropertyDesc] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [sanatoriumBadge, setSanatoriumBadge] = useState(defaultSanatoriumBadge)
  const [sanatoriumQuote, setSanatoriumQuote] = useState(defaultSanatoriumQuote)
  const [sanatoriumHighlights, setSanatoriumHighlights] = useState<SanatoriumHighlight[]>(
    defaultSanatoriumHighlights,
  )

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)

  const [createProperty, { loading: createLoading }] = useMutation<CreatePropertyResponse, CreatePropertyVariables>(CREATE_PROPERTY)
  const [updateProperty] = useMutation<UpdatePropertyResponse, UpdatePropertyVariables>(UPDATE_PROPERTY)

  const {
    data: propertiesData,
    loading: propertiesLoading,
    error: propertiesError,
    refetch: refetchProperties,
  } = useQuery<GetPropertiesResponse, GetPropertiesVariables>(GET_PROPERTIES, {
    skip: !memberId,
    variables: {
      input: {
        page: 1,
        limit: 100,
        sort: 'createdAt',
        direction: 'DESC',
        search: {
          memberId: memberId || undefined,
        },
      },
    },
    fetchPolicy: 'network-only',
  })

  const sourcePropertiesById = useMemo(() => {
    const entries = propertiesData?.getProperties?.list || []
    return entries.reduce<Record<string, CreatedProperty>>((acc, item) => {
      acc[item._id] = item
      return acc
    }, {})
  }, [propertiesData])

  const myProperties = useMemo(
    () => (propertiesData?.getProperties?.list || []).map(toLocalPropertyCard),
    [propertiesData],
  )
  const propertyIds = useMemo(() => myProperties.map((property) => property.id), [myProperties])
  const ratingsById = usePropertyRatings(propertyIds)
  const myPropertiesWithDbRatings = useMemo(
    () =>
      myProperties.map((property) => {
        const dbRating = ratingsById[property.id]
        if (!dbRating) return property

        return {
          ...property,
          rating: dbRating.rating,
          ratingCount: dbRating.ratingCount,
        }
    }),
    [myProperties, ratingsById],
  )

  const propertyOverview = useMemo(() => {
    const total = myPropertiesWithDbRatings.length
    const active = sourcePropertiesById
      ? Object.values(sourcePropertiesById).filter((item) => normalizePropertyStatusForForm(item.propertyStatus) === 'ACTIVE').length
      : 0
    const hold = sourcePropertiesById
      ? Object.values(sourcePropertiesById).filter((item) => normalizePropertyStatusForForm(item.propertyStatus) === 'HOLD').length
      : 0
    const booked = sourcePropertiesById
      ? Object.values(sourcePropertiesById).filter((item) => normalizePropertyStatusForForm(item.propertyStatus) === 'BOOKED').length
      : 0
    const dynamicPricing = sourcePropertiesById
      ? Object.values(sourcePropertiesById).filter((item) => item.dynamicPricingEnabled !== false).length
      : 0
    const averagePrice = total
      ? Math.round(myPropertiesWithDbRatings.reduce((sum, item) => sum + Number(item.price || 0), 0) / total)
      : 0

    return {
      total,
      active,
      hold,
      booked,
      dynamicPricing,
      averagePrice,
    }
  }, [myPropertiesWithDbRatings, sourcePropertiesById])

  const filteredSortedProperties = useMemo(() => {
    const sorted = [...myPropertiesWithDbRatings].sort(
      (a, b) => PROPERTY_TYPE_PRIORITY[a.propertyType] - PROPERTY_TYPE_PRIORITY[b.propertyType],
    )

    if (selectedTypeFilter === 'ALL') {
      return sorted
    }

    return sorted.filter((property) => property.propertyType === selectedTypeFilter)
  }, [myPropertiesWithDbRatings, selectedTypeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredSortedProperties.length / AGENT_PAGE_SIZE))

  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * AGENT_PAGE_SIZE
    return filteredSortedProperties.slice(startIndex, startIndex + AGENT_PAGE_SIZE)
  }, [filteredSortedProperties, currentPage])

  const pageStartItem =
    filteredSortedProperties.length === 0 ? 0 : (currentPage - 1) * AGENT_PAGE_SIZE + 1
  const pageEndItem = Math.min(currentPage * AGENT_PAGE_SIZE, filteredSortedProperties.length)

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTypeFilter])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const mainPreviewImage = previewUrls[activePreviewIndex] || previewUrls[0] || ''
  const sidePreviewImages = previewUrls
    .map((image, index) => ({ image, index }))
    .filter((item) => item.index !== activePreviewIndex)
    .slice(0, 4)

  const editImagePreviews = useMemo<EditImagePreview[]>(
    () => [
      ...editImagePaths.map((path, index) => ({
        id: `existing-${index}-${path}`,
        url: resolveImageUrl(path),
        isNew: false,
      })),
      ...editNewPreviewUrls.map((url, index) => ({
        id: `new-${index}-${url.slice(0, 16)}`,
        url,
        isNew: true,
      })),
    ],
    [editImagePaths, editNewPreviewUrls],
  )

  const mainEditPreviewImage =
    editImagePreviews[editActivePreviewIndex]?.url || editImagePreviews[0]?.url || ''
  const sideEditPreviewImages = editImagePreviews
    .map((image, index) => ({ ...image, index }))
    .filter((item) => item.index !== editActivePreviewIndex)
    .slice(0, 4)

  const resetForm = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    setPropertyType('VILLA')
    setPropertyTitle('')
    setPropertyLocation('')
    setPropertyAddress('')
    setPropertyPrice('')
    setDynamicPricingEnabled(true)
    setWeekendMultiplier('1.22')
    setMinMultiplier('0.85')
    setMaxMultiplier('1.8')
    setManualMultiplierOverride('')
    setPropertySquare('')
    setPropertyBeds('')
    setPropertyRooms('')
    setPropertyDesc('')
    setSelectedAmenities([])
    setSanatoriumBadge(defaultSanatoriumBadge)
    setSanatoriumQuote(defaultSanatoriumQuote)
    setSanatoriumHighlights(cloneHighlights(defaultSanatoriumHighlights))
    setSelectedFiles([])
    setPreviewUrls([])
    setActivePreviewIndex(0)
  }

  const resetEditImageDraft = () => {
    editNewPreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    setEditImagePaths([])
    setEditNewFiles([])
    setEditNewPreviewUrls([])
    setEditActivePreviewIndex(0)
  }

  const closeEditForm = () => {
    setIsEditOpen(false)
    setEditForm(null)
    resetEditImageDraft()
    setEditSelectedAmenities([])
    setEditSanatoriumBadge(defaultSanatoriumBadge)
    setEditSanatoriumQuote(defaultSanatoriumQuote)
    setEditSanatoriumHighlights(cloneHighlights(defaultSanatoriumHighlights))
  }

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      editNewPreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls, editNewPreviewUrls])

  const updateSanatoriumHighlight = (index: number, field: 'label' | 'desc', value: string) => {
    setSanatoriumHighlights((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const updateEditSanatoriumHighlight = (index: number, field: 'label' | 'desc', value: string) => {
    setEditSanatoriumHighlights((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const toggleAmenity = (amenityKey: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityKey)
        ? prev.filter((item) => item !== amenityKey)
        : [...prev, amenityKey],
    )
  }

  const toggleEditAmenity = (amenityKey: string) => {
    setEditSelectedAmenities((prev) =>
      prev.includes(amenityKey)
        ? prev.filter((item) => item !== amenityKey)
        : [...prev, amenityKey],
    )
  }

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const maxSizeInBytes = 5 * 1024 * 1024
    const hasInvalidFile = files.some((file) => !file.type.startsWith('image/') || file.size > maxSizeInBytes)
    if (hasInvalidFile) {
      setSubmitSuccess('')
      setSubmitError(t('agent.imageRules'))
      e.target.value = ''
      return
    }

    const existingKeys = new Set(selectedFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`))
    const filesToAdd = files.filter((file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`))

    if (filesToAdd.length === 0) {
      setSubmitSuccess('')
      setSubmitError(t('agent.imagesAlreadyAdded'))
      e.target.value = ''
      return
    }

    const previews = filesToAdd.map((file) => URL.createObjectURL(file))

    setSelectedFiles((prev) => [...prev, ...filesToAdd])
    setPreviewUrls((prev) => [...prev, ...previews])
    if (previewUrls.length === 0) {
      setActivePreviewIndex(0)
    }
    setSubmitError('')
    e.target.value = ''
  }

  const handleRemoveImage = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove))
    setPreviewUrls((prev) => {
      const removed = prev[indexToRemove]
      if (removed) URL.revokeObjectURL(removed)
      const next = prev.filter((_, index) => index !== indexToRemove)
      if (next.length === 0) {
        setActivePreviewIndex(0)
      } else if (activePreviewIndex >= next.length) {
        setActivePreviewIndex(next.length - 1)
      }
      return next
    })
  }

  const handleEditImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const maxSizeInBytes = 5 * 1024 * 1024
    const hasInvalidFile = files.some(
      (file) => !file.type.startsWith('image/') || file.size > maxSizeInBytes,
    )

    if (hasInvalidFile) {
      setSubmitSuccess('')
      setSubmitError(t('agent.imageRules'))
      e.target.value = ''
      return
    }

    const existingKeys = new Set(
      editNewFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
    )
    const filesToAdd = files.filter(
      (file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`),
    )

    if (filesToAdd.length === 0) {
      setSubmitSuccess('')
      setSubmitError(t('agent.imagesAlreadyAdded'))
      e.target.value = ''
      return
    }

    const previews = filesToAdd.map((file) => URL.createObjectURL(file))
    setEditNewFiles((prev) => [...prev, ...filesToAdd])
    setEditNewPreviewUrls((prev) => [...prev, ...previews])

    if (editImagePreviews.length === 0) {
      setEditActivePreviewIndex(0)
    }

    setSubmitError('')
    e.target.value = ''
  }

  const handleRemoveEditImage = (indexToRemove: number) => {
    if (indexToRemove < editImagePaths.length) {
      setEditImagePaths((prev) => prev.filter((_, index) => index !== indexToRemove))
    } else {
      const newIndex = indexToRemove - editImagePaths.length
      setEditNewFiles((prev) => prev.filter((_, index) => index !== newIndex))
      setEditNewPreviewUrls((prev) => {
        const removed = prev[newIndex]
        if (removed) URL.revokeObjectURL(removed)
        return prev.filter((_, index) => index !== newIndex)
      })
    }

    const remainingCount = editImagePreviews.length - 1
    if (remainingCount <= 0) {
      setEditActivePreviewIndex(0)
      return
    }

    if (editActivePreviewIndex >= remainingCount) {
      setEditActivePreviewIndex(remainingCount - 1)
    }
  }

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    const numericPrice = Number(propertyPrice)
    const numericWeekendMultiplier = Number(weekendMultiplier)
    const numericMinMultiplier = Number(minMultiplier)
    const numericMaxMultiplier = Number(maxMultiplier)
    const numericManualOverride = manualMultiplierOverride.trim() ? Number(manualMultiplierOverride) : undefined
    const numericSquare = Number(propertySquare)
    const numericBeds = Number(propertyBeds)
    const numericRooms = Number(propertyRooms)

    if (!propertyTitle.trim() || !propertyLocation.trim() || !propertyAddress.trim() || !propertyDesc.trim()) {
      setSubmitError(t('agent.completeRequired'))
      return
    }

    if (selectedAmenities.length === 0) {
      setSubmitError(t('agent.selectAmenity'))
      return
    }

    if (propertyType === 'SANATORIUM') {
      const hasInvalidHighlights = sanatoriumHighlights.some(
        (item) => !item.label.trim() || !item.desc.trim(),
      )

      if (!sanatoriumBadge.trim() || !sanatoriumQuote.trim() || hasInvalidHighlights) {
        setSubmitError(t('agent.completeSanatorium'))
        return
      }
    }

    if (selectedFiles.length < 5) {
      setSubmitError(t('agent.atLeastFiveImages'))
      return
    }

    if (
      [numericPrice, numericSquare, numericBeds, numericRooms].some((value) => Number.isNaN(value) || value <= 0) ||
      [numericWeekendMultiplier, numericMinMultiplier, numericMaxMultiplier].some((value) => Number.isNaN(value) || value <= 0) ||
      (numericManualOverride !== undefined && (Number.isNaN(numericManualOverride) || numericManualOverride <= 0))
    ) {
      setSubmitError(t('agent.positiveNumbers'))
      return
    }

    if (numericMinMultiplier > numericMaxMultiplier) {
      setSubmitError(t('agent.positiveNumbers'))
      return
    }

    try {
      const uploadedPaths = await uploadImages(selectedFiles, 'property', {
        serverError: t('agent.uploadServerError'),
        unknownError: t('agent.uploadUnknownError'),
        emptyError: t('agent.uploadEmpty'),
      })

      if (uploadedPaths.length < 5) {
        setSubmitError(t('agent.fewerImages'))
        return
      }

      const sanatoriumMeta: SanatoriumMeta | undefined =
        propertyType === 'SANATORIUM'
          ? {
              badge: sanatoriumBadge.trim(),
              quote: sanatoriumQuote.trim(),
              highlights: sanatoriumHighlights.map((item) => ({
                label: item.label.trim(),
                desc: item.desc.trim(),
              })),
            }
          : undefined

      const propertyDescPayload = buildDescriptionWithExtras(propertyDesc, selectedAmenities, sanatoriumMeta)

      if (propertyDescPayload.length > PROPERTY_DESC_MAX_LENGTH) {
        setSubmitError(t('agent.descriptionLimit', { count: PROPERTY_DESC_MAX_LENGTH }))
        return
      }

      const { data } = await createProperty({

        variables: {
          input: {
            propertyType,
            propertyTitle: propertyTitle.trim(),
            propertyLocation: propertyLocation.trim(),
            propertyAddress: propertyAddress.trim(),
            propertyPrice: numericPrice,
            dynamicPricingEnabled,
            weekendMultiplier: numericWeekendMultiplier,
            minMultiplier: numericMinMultiplier,
            maxMultiplier: numericMaxMultiplier,
            manualMultiplierOverride: numericManualOverride,
            propertySquare: numericSquare,
            propertyBeds: numericBeds,
            propertyRooms: numericRooms,
            propertyImages: uploadedPaths,
            propertyDesc: propertyDescPayload,
          },
        },
      })

      if (!data?.createProperty?._id) {
        const message = t('agent.listingNotCreated')
        setSubmitError(message)
        window.alert(`${t('agent.addListingFailureTitle')}: ${message}`)
        return
      }

      await refetchProperties()
      setSubmitSuccess(t('agent.createSuccess'))
      resetForm()
      setIsAddOpen(false)
      window.alert(`${t('agent.addListingSuccessTitle')}: ${t('agent.createLive')}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('agent.listingCreateError')
      setSubmitError(message)
      window.alert(`${t('agent.addListingFailureTitle')}: ${message}`)
    }
  }

  const openEditListing = (property: CreatedProperty) => {
    setSubmitError('')
    setSubmitSuccess('')
    setIsAddOpen(false)
    resetEditImageDraft()

    const parsed = parseDescriptionForEdit(property.propertyDesc)
    setEditSelectedAmenities(parsed.amenities)
    setEditSanatoriumBadge(parsed.sanatoriumMeta?.badge || defaultSanatoriumBadge)
    setEditSanatoriumQuote(
      parsed.sanatoriumMeta?.quote ||
      defaultSanatoriumQuote,
    )
    setEditSanatoriumHighlights(
      parsed.sanatoriumMeta?.highlights?.length
        ? parsed.sanatoriumMeta.highlights
        : cloneHighlights(defaultSanatoriumHighlights),
    )

    const existingImages = (property.propertyImages || []).filter(Boolean)
    setEditImagePaths(existingImages)
    setEditActivePreviewIndex(0)

    setEditForm({
      _id: property._id,
      propertyType: normalizePropertyTypeForForm(property.propertyType),
      propertyStatus: normalizePropertyStatusForForm(property.propertyStatus),
      propertyLocation: property.propertyLocation || '',
      propertyAddress: property.propertyAddress || '',
      propertyTitle: property.propertyTitle || '',
      propertyPrice: String(property.propertyPrice || ''),
      dynamicPricingEnabled: property.dynamicPricingEnabled ?? true,
      weekendMultiplier: String(property.weekendMultiplier ?? 1.22),
      minMultiplier: String(property.minMultiplier ?? 0.85),
      maxMultiplier: String(property.maxMultiplier ?? 1.8),
      manualMultiplierOverride: property.manualMultiplierOverride != null ? String(property.manualMultiplierOverride) : '',
      propertySquare: String(property.propertySquare || ''),
      propertyBeds: String(property.propertyBeds || ''),
      propertyRooms: String(property.propertyRooms || ''),
      propertyDesc: parsed.baseDescription,
    })
    setIsEditOpen(true)
  }

  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm) return

    setSubmitError('')
    setSubmitSuccess('')

    const numericPrice = Number(editForm.propertyPrice)
    const numericWeekendMultiplier = Number(editForm.weekendMultiplier)
    const numericMinMultiplier = Number(editForm.minMultiplier)
    const numericMaxMultiplier = Number(editForm.maxMultiplier)
    const numericManualOverride = editForm.manualMultiplierOverride.trim()
      ? Number(editForm.manualMultiplierOverride)
      : undefined
    const numericSquare = Number(editForm.propertySquare)
    const numericBeds = Number(editForm.propertyBeds)
    const numericRooms = Number(editForm.propertyRooms)
    const cleanDesc = editForm.propertyDesc.trim()

    if (!editForm.propertyTitle.trim() || !editForm.propertyLocation.trim() || !editForm.propertyAddress.trim()) {
      setSubmitError(t('agent.completeRequired'))
      return
    }

    if (
      [numericPrice, numericSquare, numericBeds, numericRooms].some((value) => Number.isNaN(value) || value <= 0) ||
      [numericWeekendMultiplier, numericMinMultiplier, numericMaxMultiplier].some((value) => Number.isNaN(value) || value <= 0) ||
      (numericManualOverride !== undefined && (Number.isNaN(numericManualOverride) || numericManualOverride <= 0))
    ) {
      setSubmitError(t('agent.positiveNumbers'))
      return
    }

    if (numericMinMultiplier > numericMaxMultiplier) {
      setSubmitError(t('agent.positiveNumbers'))
      return
    }

    if (!cleanDesc) {
      setSubmitError(t('agent.descriptionRequired'))
      return
    }

    let sanatoriumMeta: SanatoriumMeta | undefined

    if (editForm.propertyType === 'SANATORIUM') {
      const hasInvalidHighlights = editSanatoriumHighlights.some(
        (item) => !item.label.trim() || !item.desc.trim(),
      )

      if (!editSanatoriumBadge.trim() || !editSanatoriumQuote.trim() || hasInvalidHighlights) {
        setSubmitError(t('agent.completeSanatoriumShowcase'))
        return
      }

      sanatoriumMeta = {
        badge: editSanatoriumBadge.trim(),
        quote: editSanatoriumQuote.trim(),
        highlights: editSanatoriumHighlights.map((item) => ({
          label: item.label.trim(),
          desc: item.desc.trim(),
        })),
      }
    }

    const propertyDescPayload = buildDescriptionWithExtras(
      cleanDesc,
      editSelectedAmenities,
      sanatoriumMeta,
    )

    if (propertyDescPayload.length > PROPERTY_DESC_MAX_LENGTH) {
      setSubmitError(t('agent.descriptionLimit', { count: PROPERTY_DESC_MAX_LENGTH }))
      return
    }

    if (editImagePaths.length + editNewFiles.length === 0) {
      setSubmitError(t('agent.addOneImage'))
      return
    }

    setEditingPropertyId(editForm._id)

    try {
      const uploadedPaths =
        editNewFiles.length > 0
          ? await uploadImages(editNewFiles, 'property', {
              serverError: t('agent.uploadServerError'),
              unknownError: t('agent.uploadUnknownError'),
              emptyError: t('agent.uploadEmpty'),
            })
          : []

      const finalImages = [...editImagePaths, ...uploadedPaths]
      if (finalImages.length === 0) {
        setSubmitError(t('agent.oneImageRequired'))
        return
      }

      const { data } = await updateProperty({
        variables: {
          input: {
            _id: editForm._id,
            propertyType: editForm.propertyType,
            propertyStatus: editForm.propertyStatus,
            propertyLocation: editForm.propertyLocation.trim(),
            propertyAddress: editForm.propertyAddress.trim(),
            propertyTitle: editForm.propertyTitle.trim(),
            propertyPrice: numericPrice,
            dynamicPricingEnabled: editForm.dynamicPricingEnabled,
            weekendMultiplier: numericWeekendMultiplier,
            minMultiplier: numericMinMultiplier,
            maxMultiplier: numericMaxMultiplier,
            manualMultiplierOverride: numericManualOverride,
            propertySquare: numericSquare,
            propertyBeds: numericBeds,
            propertyRooms: numericRooms,
            propertyDesc: propertyDescPayload,
            propertyImages: finalImages,
          },
        },
      })

      if (!data?.updateProperty?._id) {
        const message = t('agent.listingNotUpdated')
        setSubmitError(message)
        window.alert(`${t('agent.saveChangesFailureTitle')}: ${message}`)
        return
      }

      await refetchProperties()
      setSubmitSuccess(t('agent.updateSuccess'))
      closeEditForm()
      window.alert(`${t('agent.saveChangesTitle')}: ${t('agent.updateLive')}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('agent.listingUpdateError')
      setSubmitError(message)
      window.alert(`${t('agent.saveChangesFailureTitle')}: ${message}`)
    } finally {
      setEditingPropertyId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">{t('agent.myProperties')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('agent.listingsCount', { count: myPropertiesWithDbRatings.length })}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAddOpen(true)
            closeEditForm()
            setSubmitError('')
            setSubmitSuccess('')
          }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 gentle-animation"
        >
          <Plus className="w-4 h-4" />
          {t('common.addListing')}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t('common.properties')}</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">{formatNumber(propertyOverview.total)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{propertyStatusLabel('ACTIVE')}</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">{formatNumber(propertyOverview.active)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{propertyStatusLabel('HOLD')}</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">{formatNumber(propertyOverview.hold)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t('agent.dynamicPricing')}</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">{formatNumber(propertyOverview.dynamicPricing)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t('agent.averagePrice')}</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">{formatNumber(propertyOverview.averagePrice)} UZS</p>
        </div>
      </div>

      {isAddOpen && (
        <div className="mb-8 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-foreground">{t('agent.addNewListing')}</h3>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted gentle-animation"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleCreateProperty} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.type')}</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                <option value="VILLA">{propertyTypeLabel('VILLA')}</option>
                <option value="HOTEL">{propertyTypeLabel('HOTEL')}</option>
                <option value="SANATORIUM">{propertyTypeLabel('SANATORIUM')}</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.title')}</label>
              <input
                value={propertyTitle}
                onChange={(e) => setPropertyTitle(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
                placeholder={t('agent.titlePlaceholder')}
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.location')}</label>
              <input
                value={propertyLocation}
                onChange={(e) => setPropertyLocation(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
                placeholder={t('agent.locationPlaceholder')}
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.address')}</label>
              <input
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
                placeholder={t('agent.addressPlaceholder')}
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.price')} ({t('common.perNight').replace('/', '').trim()})</label>
              <input
                type="number"
                min={1}
                value={propertyPrice}
                onChange={(e) => setPropertyPrice(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="md:col-span-2 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t('agent.dynamicPricingTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('agent.dynamicPricingHint')}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={dynamicPricingEnabled}
                    onChange={(e) => setDynamicPricingEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  {t('agent.enabled')}
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('agent.weekendMultiplier')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    value={weekendMultiplier}
                    onChange={(e) => setWeekendMultiplier(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('agent.minMultiplier')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    value={minMultiplier}
                    onChange={(e) => setMinMultiplier(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('agent.maxMultiplier')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    value={maxMultiplier}
                    onChange={(e) => setMaxMultiplier(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('agent.manualMultiplierOverride')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    value={manualMultiplierOverride}
                    onChange={(e) => setManualMultiplierOverride(e.target.value)}
                    placeholder={t('agent.optional')}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.square')} (m²)</label>
              <input
                type="number"
                min={1}
                value={propertySquare}
                onChange={(e) => setPropertySquare(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.beds')}</label>
              <input
                type="number"
                min={1}
                value={propertyBeds}
                onChange={(e) => setPropertyBeds(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.rooms')}</label>
              <input
                type="number"
                min={1}
                value={propertyRooms}
                onChange={(e) => setPropertyRooms(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-foreground mb-1.5 block">{t('common.amenities')}</label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map(([key, label]) => {
                  const isSelected = selectedAmenities.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleAmenity(key)}
                      className={`px-3 py-1.5 rounded-lg text-sm border gentle-animation ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      {amenityLabel(key)}
                    </button>
                  )
                })}
              </div>
              <p className={`text-xs mt-1 ${selectedAmenities.length > 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                {t('agent.selectedAmenities', { count: selectedAmenities.length })}
              </p>
            </div>

            {propertyType === 'SANATORIUM' && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border border-border rounded-xl p-4 bg-background/40">
                <div className="md:col-span-2">
                  <h4 className="text-sm font-semibold text-foreground">{t('agent.sanatoriumShowcase')}</h4>
                </div>

                <div>
                  <label className="text-sm text-foreground mb-1.5 block">{t('common.badge')}</label>
                  <input
                    value={sanatoriumBadge}
                    onChange={(e) => setSanatoriumBadge(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
                    placeholder={t('agent.badgePlaceholder')}
                  />
                </div>

                <div>
                  <label className="text-sm text-foreground mb-1.5 block">{t('common.quote')}</label>
                  <input
                    value={sanatoriumQuote}
                    onChange={(e) => setSanatoriumQuote(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
                    placeholder={t('agent.shortHighlight')}
                  />
                </div>

                {sanatoriumHighlights.map((item, index) => (
                  <div key={`sanatorium-${index}`} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={item.label}
                      onChange={(e) => updateSanatoriumHighlight(index, 'label', e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
                      placeholder={t('agent.cardTitle')}
                    />
                    <input
                      value={item.desc}
                      onChange={(e) => updateSanatoriumHighlight(index, 'desc', e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
                      placeholder={t('agent.cardSubtitle')}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="text-sm text-foreground mb-1.5 block">{t('agent.propertyImages')}</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
              />
              <p className={`text-xs mt-1 ${selectedFiles.length >= 5 ? 'text-black-600' : 'text-destructive'}`}>
                {t('agent.minimumRequiredImages', { min: 5, count: selectedFiles.length })}
              </p>

              {previewUrls.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-background cursor-pointer group">
                    <img
                      src={mainPreviewImage}
                      alt={`Main preview ${activePreviewIndex + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(activePreviewIndex)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {sidePreviewImages.map(({ image, index }) => (
                      <div
                        key={`${image.slice(0, 16)}-${index}`}
                        className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-background cursor-pointer group"
                        onClick={() => setActivePreviewIndex(index)}
                      >
                        <img
                          src={image}
                          alt={`Property ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleRemoveImage(index)
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewUrls.length > 5 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">{t('agent.allSelectedImages')}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {previewUrls.map((image, index) => (
                      <button
                        key={`all-preview-${index}`}
                        type="button"
                        onClick={() => setActivePreviewIndex(index)}
                        className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border gentle-animation ${
                          activePreviewIndex === index ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                        }`}
                      >
                        <img src={image} alt={`All preview ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-foreground mb-1.5 block">{t('common.description')}</label>
              <textarea
                value={propertyDesc}
                onChange={(e) => setPropertyDesc(e.target.value)}
                className="w-full min-h-24 bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={createLoading}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60 gentle-animation"
              >
                <Plus className="w-4 h-4" />
                {createLoading ? `${t('common.addListing')}...` : t('common.createListing')}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setIsAddOpen(false)
                }}
                className="border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted gentle-animation"
              >
                {t('common.cancel')}
              </button>
              <Link
                to={`/agent/units/${p.id}`}
                className="mt-2 flex w-full items-center justify-center rounded-xl border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
              >
                Xonalar / inventory boshqaruvi
              </Link>
            </div>

            {submitError && (
              <p className="md:col-span-2 text-sm text-destructive">{submitError}</p>
            )}

            {submitSuccess && (
              <p className="md:col-span-2 text-sm text-green-600">{submitSuccess}</p>
            )}
          </form>
        </div>
      )}

      {isEditOpen && editForm && (
        <div className="mb-8 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-foreground">{t('common.editListing')}</h3>
            <button
              type="button"
              onClick={closeEditForm}
              className="p-1.5 rounded-lg hover:bg-muted gentle-animation"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleUpdateListing} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.type')}</label>
              <select
                value={editForm.propertyType}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, propertyType: e.target.value as PropertyType } : prev))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                <option value="VILLA">{propertyTypeLabel('VILLA')}</option>
                <option value="HOTEL">{propertyTypeLabel('HOTEL')}</option>
                <option value="SANATORIUM">{propertyTypeLabel('SANATORIUM')}</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.status')}</label>
              <select
                value={editForm.propertyStatus}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, propertyStatus: e.target.value as PropertyStatus } : prev))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                <option value="DRAFT">{propertyStatusLabel('DRAFT')}</option>
                <option value="PENDING_REVIEW">{propertyStatusLabel('PENDING_REVIEW')}</option>
                <option value="ACTIVE">{propertyStatusLabel('ACTIVE')}</option>
                <option value="SUSPENDED">{propertyStatusLabel('SUSPENDED')}</option>
                <option value="ARCHIVED">{propertyStatusLabel('ARCHIVED')}</option>
                <option value="HOLD">{propertyStatusLabel('HOLD')}</option>
                <option value="DELETE">{propertyStatusLabel('DELETE')}</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.title')}</label>
              <input
                value={editForm.propertyTitle}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, propertyTitle: e.target.value } : prev))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.location')}</label>
              <input
                value={editForm.propertyLocation}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, propertyLocation: e.target.value } : prev))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.address')}</label>
              <input
                value={editForm.propertyAddress}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, propertyAddress: e.target.value } : prev))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.price')} ({t('common.perNight').replace('/', '').trim()})</label>
              <input
                type="number"
                min={1}
                value={editForm.propertyPrice}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, propertyPrice: e.target.value } : prev))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="md:col-span-2 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t('agent.dynamicPricingTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('agent.dynamicPricingHint')}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={editForm.dynamicPricingEnabled}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, dynamicPricingEnabled: e.target.checked } : prev))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  {t('agent.enabled')}
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('agent.weekendMultiplier')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    value={editForm.weekendMultiplier}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, weekendMultiplier: e.target.value } : prev))
                    }
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('agent.minMultiplier')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    value={editForm.minMultiplier}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, minMultiplier: e.target.value } : prev))
                    }
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('agent.maxMultiplier')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    value={editForm.maxMultiplier}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, maxMultiplier: e.target.value } : prev))
                    }
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('agent.manualMultiplierOverride')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    value={editForm.manualMultiplierOverride}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, manualMultiplierOverride: e.target.value } : prev))
                    }
                    placeholder={t('agent.optional')}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.square')} (m²)</label>
              <input
                type="number"
                min={1}
                value={editForm.propertySquare}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, propertySquare: e.target.value } : prev))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.beds')}</label>
              <input
                type="number"
                min={1}
                value={editForm.propertyBeds}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, propertyBeds: e.target.value } : prev))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1.5 block">{t('common.rooms')}</label>
              <input
                type="number"
                min={1}
                value={editForm.propertyRooms}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, propertyRooms: e.target.value } : prev))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-foreground mb-1.5 block">{t('common.amenities')}</label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map(([key, label]) => {
                  const isSelected = editSelectedAmenities.includes(key)
                  return (
                    <button
                      key={`edit-amenity-${key}`}
                      type="button"
                      onClick={() => toggleEditAmenity(key)}
                      className={`px-3 py-1.5 rounded-lg text-sm border gentle-animation ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      {amenityLabel(key)}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                {t('agent.selectedAmenities', { count: editSelectedAmenities.length })}
              </p>
            </div>

            {editForm.propertyType === 'SANATORIUM' && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border border-border rounded-xl p-4 bg-background/40">
                <div className="md:col-span-2">
                  <h4 className="text-sm font-semibold text-foreground">{t('agent.sanatoriumShowcase')}</h4>
                </div>

                <div>
                  <label className="text-sm text-foreground mb-1.5 block">{t('common.badge')}</label>
                  <input
                    value={editSanatoriumBadge}
                    onChange={(e) => setEditSanatoriumBadge(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
                    placeholder={t('agent.badgePlaceholder')}
                  />
                </div>

                <div>
                  <label className="text-sm text-foreground mb-1.5 block">{t('common.quote')}</label>
                  <input
                    value={editSanatoriumQuote}
                    onChange={(e) => setEditSanatoriumQuote(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
                    placeholder={t('agent.shortHighlight')}
                  />
                </div>

                {editSanatoriumHighlights.map((item, index) => (
                  <div key={`edit-sanatorium-${index}`} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={item.label}
                      onChange={(e) => updateEditSanatoriumHighlight(index, 'label', e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
                      placeholder={t('agent.cardTitle')}
                    />
                    <input
                      value={item.desc}
                      onChange={(e) => updateEditSanatoriumHighlight(index, 'desc', e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
                      placeholder={t('agent.cardSubtitle')}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="text-sm text-foreground mb-1.5 block">{t('common.description')}</label>
              <textarea
                value={editForm.propertyDesc}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, propertyDesc: e.target.value } : prev))}
                className="w-full min-h-24 bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-foreground mb-1.5 block">{t('common.edit')} {t('agent.propertyImages')}</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleEditImagesChange}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
              />
              <p className={`text-xs mt-1 ${(editImagePaths.length + editNewFiles.length) > 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                {t('agent.imageDraftCount', {
                  existing: editImagePaths.length,
                  new: editNewFiles.length,
                })}
              </p>

              {editImagePreviews.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-background cursor-pointer group">
                    <img
                      src={mainEditPreviewImage}
                      alt={`Edit preview ${editActivePreviewIndex + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEditImage(editActivePreviewIndex)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {sideEditPreviewImages.map(({ id, url, index, isNew }) => (
                      <div
                        key={id}
                        className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-background cursor-pointer group"
                        onClick={() => setEditActivePreviewIndex(index)}
                      >
                        <img
                          src={url}
                          alt={`Edit image ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                          {isNew ? t('common.new') : t('common.existing')}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleRemoveEditImage(index)
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editImagePreviews.length > 5 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">{t('agent.allListingImages')}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {editImagePreviews.map(({ id, url, isNew }, index) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setEditActivePreviewIndex(index)}
                        className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border gentle-animation ${
                          editActivePreviewIndex === index
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border'
                        }`}
                        >
                          <img src={url} alt={`Edit thumb ${index + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white">
                          {isNew ? t('common.new').charAt(0) : t('common.existing').charAt(0)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={editingPropertyId === editForm._id}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60 gentle-animation"
              >
                <Pencil className="w-4 h-4" />
                {editingPropertyId === editForm._id ? `${t('common.saveChanges')}...` : t('common.saveChanges')}
              </button>

              <button
                type="button"
                onClick={closeEditForm}
                className="border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted gentle-animation"
              >
                {t('common.cancel')}
              </button>
            </div>

            {submitError && (
              <p className="md:col-span-2 text-sm text-destructive">{submitError}</p>
            )}

            {submitSuccess && (
              <p className="md:col-span-2 text-sm text-green-600">{submitSuccess}</p>
            )}
          </form>
        </div>
      )}

      <div className="mb-5 bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">{t('common.type')}</label>
          <select
            value={selectedTypeFilter}
            onChange={(event) => setSelectedTypeFilter(event.target.value as 'ALL' | PropertyType)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="ALL">{t('common.all')}</option>
            <option value="HOTEL">{propertyTypeLabel('HOTEL')}</option>
            <option value="SANATORIUM">{propertyTypeLabel('SANATORIUM')}</option>
            <option value="VILLA">{propertyTypeLabel('VILLA')}</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('agent.showingOf', {
            from: pageStartItem,
            to: pageEndItem,
            total: filteredSortedProperties.length,
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {propertiesLoading && (
          <p className="text-sm text-muted-foreground">{t('agent.loadingYourProperties')}</p>
        )}

        {propertiesError && (
          <p className="text-sm text-destructive">{t('common.failedToLoadProperties', { message: propertiesError.message })}</p>
        )}

        {!propertiesLoading && !propertiesError && filteredSortedProperties.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('agent.noPropertiesYet')}</p>
        )}

        {paginatedProperties.map((p) => {
          const sourceProperty = sourcePropertiesById[p.id]

          return (
            <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="relative aspect-[16/9] overflow-hidden">
              <Link to={`/properties/${p.id}`} className="block h-full">
                <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
              </Link>
              <span className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium capitalize text-foreground">{propertyTypeLabel(p.propertyType)}</span>
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
                <span className="font-semibold text-foreground">{formatNumber(p.price)} UZS {t('common.perNight')}</span>
              </div>
              <button
                type="button"
                onClick={() => sourceProperty && openEditListing(sourceProperty)}
                disabled={!sourceProperty || editingPropertyId === p.id}
                className="mt-4 w-full flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted disabled:opacity-60 gentle-animation"
              >
                <Pencil className="w-4 h-4" />
                {editingPropertyId === p.id ? `${t('common.saveChanges')}...` : t('common.editListing')}
              </button>
            </div>
            </div>
          )
        })}
      </div>

      {!propertiesLoading && !propertiesError && filteredSortedProperties.length > AGENT_PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted disabled:opacity-50 gentle-animation"
          >
            {t('common.previous')}
          </button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button
              key={`agent-page-${page}`}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 rounded-lg border text-sm gentle-animation ${
                currentPage === page
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted disabled:opacity-50 gentle-animation"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  )
}
