import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { Star, MapPin, Pencil, Trash2, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GET_ALL_PROPERTIES_BY_ADMIN } from '@/graphql/user/query'
import { REMOVE_PROPERTY_BY_ADMIN, UPDATE_PROPERTY_BY_ADMIN } from '@/graphql/user/mutation'
import { useI18n } from '@/i18n'

type PropertyStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'HOLD'
  | 'DELETE'
  | 'BOOKED'

type AdminProperty = {
  _id: string
  propertyTitle: string
  propertyType: string
  propertyStatus: PropertyStatus
  propertyLocation: string
  propertyPrice: number
  propertyViews: number
  propertyLikes: number
  propertyComments: number
  propertyRank: number
  memberId: string
  createdAt: string
  updatedAt: string
}

type GetAllPropertiesByAdminResponse = {
  getAllPropertiesByAdmin: {
    list: AdminProperty[]
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

type UpdatePropertyByAdminResponse = {
  updatePropertyByAdmin: {
    _id: string
    propertyStatus: PropertyStatus
    updatedAt: string
  }
}

type UpdatePropertyByAdminVariables = {
  input: {
    _id: string
    propertyStatus?: PropertyStatus
    propertyTitle?: string
    propertyPrice?: number
  }
}

type RemovePropertyByAdminResponse = {
  removePropertyByAdmin: {
    _id: string
  }
}

type RemovePropertyByAdminVariables = {
  propertyId: string
}

const PAGE_SIZE = 20

function formatLocation(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

export default function AdminProperties() {
  const { t, formatNumber, propertyTypeLabel, propertyStatusLabel } = useI18n()
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | PropertyStatus>('ALL')
  const [updatingPropertyId, setUpdatingPropertyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const searchFilters: GetAllPropertiesByAdminVariables['input']['search'] =
    selectedStatus === 'ALL' ? {} : { propertyStatus: selectedStatus }

  const { data, loading, error, refetch } = useQuery<GetAllPropertiesByAdminResponse, GetAllPropertiesByAdminVariables>(
    GET_ALL_PROPERTIES_BY_ADMIN,
    {
      variables: {
        input: {
          page: 1,
          limit: PAGE_SIZE,
          sort: 'propertyRank',
          direction: 'DESC',
          search: searchFilters,
        },
      },
      fetchPolicy: 'network-only',
    },
  )

  const [updatePropertyByAdmin] = useMutation<UpdatePropertyByAdminResponse, UpdatePropertyByAdminVariables>(
    UPDATE_PROPERTY_BY_ADMIN,
  )
  const [removePropertyByAdmin] = useMutation<RemovePropertyByAdminResponse, RemovePropertyByAdminVariables>(
    REMOVE_PROPERTY_BY_ADMIN,
  )

  const properties = data?.getAllPropertiesByAdmin?.list ?? []
  const totalProperties = useMemo(() => {
    const total = data?.getAllPropertiesByAdmin?.metaCounter?.[0]?.total
    return typeof total === 'number' ? total : properties.length
  }, [data, properties.length])

  const togglePropertyStatus = async (property: AdminProperty) => {
    setActionError('')
    setActionSuccess('')
    setUpdatingPropertyId(property._id)

    try {
      if (!['ACTIVE', 'PENDING_REVIEW', 'SUSPENDED', 'HOLD'].includes(property.propertyStatus)) {
        setActionError(t('admin.onlyActiveHoldToggle'))
        return
      }

      const nextStatus: PropertyStatus = property.propertyStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
      await updatePropertyByAdmin({
        variables: {
          input: {
            _id: property._id,
            propertyStatus: nextStatus,
          },
        },
      })
      await refetch()
      setActionSuccess(t('admin.propertyStatusUpdated', { status: propertyStatusLabel(nextStatus) }))
    } catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : t('admin.propertyUpdateFailed')
      setActionError(message)
    } finally {
      setUpdatingPropertyId(null)
    }
  }

  const removeProperty = async (propertyId: string) => {
    setActionError('')
    setActionSuccess('')
    setUpdatingPropertyId(propertyId)

    try {
      await removePropertyByAdmin({
        variables: {
          propertyId,
        },
      })
      await refetch()
      setActionSuccess(t('admin.propertyRemoved'))
    } catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : t('admin.propertyRemovalFailed')
      setActionError(message)
    } finally {
      setUpdatingPropertyId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">{t('common.properties')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.totalListings', { count: totalProperties })}</p>
        </div>
        <button
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 gentle-animation"
          disabled
        >
          <Plus className="w-4 h-4" />
          {t('common.addProperty')}
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <select
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value as 'ALL' | PropertyStatus)}
          className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
        >
          <option value="ALL">{t('admin.allStatuses')}</option>
          <option value="DRAFT">{propertyStatusLabel('DRAFT')}</option>
          <option value="PENDING_REVIEW">{propertyStatusLabel('PENDING_REVIEW')}</option>
          <option value="ACTIVE">{propertyStatusLabel('ACTIVE')}</option>
          <option value="SUSPENDED">{propertyStatusLabel('SUSPENDED')}</option>
          <option value="ARCHIVED">{propertyStatusLabel('ARCHIVED')}</option>
          <option value="HOLD">{propertyStatusLabel('HOLD')}</option>
          <option value="DELETE">{propertyStatusLabel('DELETE')}</option>
        </select>
      </div>

      {actionError && <p className="text-sm text-destructive mb-3">{actionError}</p>}
      {actionSuccess && <p className="text-sm text-green-600 mb-3">{actionSuccess}</p>}
      {loading && <p className="text-sm text-muted-foreground mb-3">{t('common.loadingProperties')}</p>}
      {error && <p className="text-sm text-destructive mb-3">{t('common.failedToLoadProperties', { message: error.message })}</p>}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-6 py-4 font-medium text-muted-foreground">{t('common.property')}</th>
              <th className="px-6 py-4 font-medium text-muted-foreground hidden md:table-cell">{t('common.type')}</th>
              <th className="px-6 py-4 font-medium text-muted-foreground hidden sm:table-cell">{t('common.price')}</th>
              <th className="px-6 py-4 font-medium text-muted-foreground hidden lg:table-cell">{t('common.rating')}</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">{t('common.status')}</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => {
              const isUpdating = updatingPropertyId === property._id
              return (
                <tr key={property._id} className="border-b border-border/50 hover:bg-muted/30 gentle-animation">
                  <td className="px-6 py-4">
                    <div>
                      <Link to={`/properties/${property._id}`} className="font-medium text-foreground hover:text-primary">
                        {property.propertyTitle}
                      </Link>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {formatLocation(property.propertyLocation)}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="capitalize bg-muted px-2.5 py-1 rounded-full text-xs font-medium text-foreground">
                      {propertyTypeLabel(property.propertyType)}
                    </span>
                  </td>

                  <td className="px-6 py-4 hidden sm:table-cell font-medium text-foreground">
                    ${formatNumber(property.propertyPrice)}{t('common.perNight')}
                  </td>

                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                      <span className="text-foreground">{Number(property.propertyRank || 0).toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({property.propertyComments ?? 0})</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        property.propertyStatus === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : property.propertyStatus === 'HOLD'
                            ? 'bg-gold/20 text-gold-dark'
                            : property.propertyStatus === 'BOOKED'
                              ? 'bg-primary/10 text-foreground'
                              : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {propertyStatusLabel(property.propertyStatus)}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePropertyStatus(property)}
                        className="p-2 hover:bg-muted rounded-lg gentle-animation disabled:opacity-50"
                        disabled={isUpdating}
                        title={property.propertyStatus === 'ACTIVE' ? t('admin.moveToHold') : t('admin.activateProperty')}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>

                      <button
                        onClick={() => removeProperty(property._id)}
                        className="p-2 hover:bg-destructive/10 rounded-lg gentle-animation disabled:opacity-50"
                        disabled={isUpdating}
                        title={t('admin.removeProperty')}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {!loading && !error && properties.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  {t('admin.noPropertiesForFilters')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
