import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { ArrowLeft, Archive, Plus, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { GET_BOOKABLE_UNITS, GET_PROPERTY } from '@/graphql/user/query'
import { ARCHIVE_BOOKABLE_UNIT, CREATE_BOOKABLE_UNIT } from '@/graphql/user/mutation'
import { useI18n } from '@/i18n'

type PropertyResponse = { getProperty: { propertyTitle: string; propertyType: string } }
type Unit = {
  _id: string
  name: string
  unitType: string
  inventoryCount: number
  basePrice: number
  rateModel: string
  maxGuests: number
  status: string
}
type UnitsResponse = { getBookableUnits: { list: Unit[] } }
type CreateVariables = { input: Record<string, unknown> }

export default function AgentUnits() {
  const { t, formatNumber } = useI18n()
  const { propertyId = '' } = useParams<{ propertyId: string }>()
  const [name, setName] = useState('')
  const [unitType, setUnitType] = useState('ROOM_TYPE')
  const [rateModel, setRateModel] = useState('UNIT_NIGHT')
  const [inventoryCount, setInventoryCount] = useState(1)
  const [maxGuests, setMaxGuests] = useState(2)
  const [basePrice, setBasePrice] = useState(0)
  const [packageNights, setPackageNights] = useState(1)
  const [packagePerPerson, setPackagePerPerson] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const { data: propertyData } = useQuery<PropertyResponse>(GET_PROPERTY, {
    variables: { propertyId },
    skip: !propertyId,
  })
  const { data: unitsData, refetch } = useQuery<UnitsResponse>(GET_BOOKABLE_UNITS, {
    variables: { propertyId },
    skip: !propertyId,
    fetchPolicy: 'network-only',
  })
  const [createUnit, { loading: creating }] = useMutation<unknown, CreateVariables>(CREATE_BOOKABLE_UNIT)
  const [archiveUnit] = useMutation(ARCHIVE_BOOKABLE_UNIT)

  const propertyType = propertyData?.getProperty?.propertyType?.toUpperCase() || 'HOTEL'
  const isSanatorium = propertyType === 'SANATORIUM'
  const units = useMemo(() => unitsData?.getBookableUnits?.list || [], [unitsData])

  const formatMoney = (value: number) => {
    const amount = value > 100_000 ? value : value * 12_500
    return `${formatNumber(Math.round(amount))} UZS`
  }

  const unitTypeLabel = (value: string) => {
    switch (value) {
      case 'ROOM_TYPE': return t('agent.roomType')
      case 'ROOM': return t('agent.specificRoom')
      case 'ENTIRE_UNIT': return t('agent.entireUnit')
      case 'CABIN': return t('agent.cabin')
      default: return value
    }
  }

  const rateModelLabel = (value: string) => {
    switch (value) {
      case 'UNIT_NIGHT': return t('agent.unitNight')
      case 'PERSON_NIGHT': return t('agent.personNight')
      case 'PACKAGE': return t('agent.package')
      default: return value
    }
  }

  useEffect(() => {
    if (isSanatorium && rateModel === 'UNIT_NIGHT') setRateModel('PERSON_NIGHT')
    if (isSanatorium) setPackagePerPerson(true)
  }, [isSanatorium, rateModel])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage('')
    try {
      await createUnit({
        variables: {
          input: {
            propertyId,
            name: name.trim(),
            unitType,
            rateModel,
            packageNights: rateModel === 'PACKAGE' ? packageNights : 1,
            packagePerPerson: rateModel === 'PACKAGE' ? packagePerPerson : false,
            inventoryCount: unitType === 'ENTIRE_UNIT' || unitType === 'ROOM' ? 1 : inventoryCount,
            maxGuests,
            includedGuests: maxGuests,
            basePrice,
            bedrooms: 1,
            beds: 1,
            bathrooms: 1,
          },
        },
      })
      setName('')
      setBasePrice(0)
      await refetch()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('agent.unitCreatedError'))
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/agent/properties" className="rounded-full border border-border p-2 hover:bg-muted"><ArrowLeft size={17} /></Link>
        <div>
          <p className="text-xs uppercase tracking-[.15em] text-muted-foreground">{t('agent.inventoryManagement')}</p>
          <h2 className="text-2xl font-bold text-foreground">{propertyData?.getProperty?.propertyTitle || t('agent.propertyUnits')}</h2>
          <p className="text-sm text-muted-foreground">{t('agent.unitsDescription')}</p>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><Plus size={17} /><h3 className="font-semibold">{t('agent.newUnit')}</h3></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1 text-sm"><span>{t('agent.name')}</span><input required value={name} onChange={(e) => setName(e.target.value)} placeholder={isSanatorium ? t('agent.standardTreatmentPackage') : t('agent.deluxeRoom')} className="h-10 rounded-lg border border-border px-3" /></label>
          <label className="grid gap-1 text-sm"><span>{t('agent.unitType')}</span><select value={unitType} onChange={(e) => setUnitType(e.target.value)} className="h-10 rounded-lg border border-border px-3"><option value="ROOM_TYPE">{t('agent.roomType')}</option><option value="ROOM">{t('agent.specificRoom')}</option><option value="ENTIRE_UNIT">{t('agent.entireUnit')}</option><option value="CABIN">{t('agent.cabin')}</option></select></label>
          <label className="grid gap-1 text-sm"><span>{t('agent.pricingModel')}</span><select value={rateModel} onChange={(e) => setRateModel(e.target.value)} className="h-10 rounded-lg border border-border px-3"><option value="UNIT_NIGHT">{t('agent.unitNight')}</option><option value="PERSON_NIGHT">{t('agent.personNight')}</option><option value="PACKAGE">{t('agent.package')}</option></select></label>
          <label className="grid gap-1 text-sm"><span>{t('agent.inventoryCount')}</span><input type="number" min={1} value={unitType === 'ENTIRE_UNIT' || unitType === 'ROOM' ? 1 : inventoryCount} disabled={unitType === 'ENTIRE_UNIT' || unitType === 'ROOM'} onChange={(e) => setInventoryCount(Math.max(1, Number(e.target.value) || 1))} className="h-10 rounded-lg border border-border px-3 disabled:bg-muted" /></label>
          <label className="grid gap-1 text-sm"><span>{t('agent.maxGuests')}</span><input type="number" min={1} value={maxGuests} onChange={(e) => setMaxGuests(Math.max(1, Number(e.target.value) || 1))} className="h-10 rounded-lg border border-border px-3" /></label>
          <label className="grid gap-1 text-sm"><span>{rateModel === 'PERSON_NIGHT' ? t('agent.personNight') : rateModel === 'PACKAGE' ? t('agent.packagePrice') : t('agent.unitNight')} (UZS)</span><input type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(Math.max(0, Number(e.target.value) || 0))} className="h-10 rounded-lg border border-border px-3" /></label>
          {rateModel === 'PACKAGE' && <>
            <label className="grid gap-1 text-sm"><span>{t('agent.packageNights')}</span><input type="number" min={1} value={packageNights} onChange={(e) => setPackageNights(Math.max(1, Number(e.target.value) || 1))} className="h-10 rounded-lg border border-border px-3" /></label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={packagePerPerson} onChange={(e) => setPackagePerPerson(e.target.checked)} /> {t('agent.packagePerPerson')}</label>
          </>}
        </div>
        {errorMessage && <p className="mt-3 text-sm text-destructive">{errorMessage}</p>}
        <button type="submit" disabled={creating} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Plus size={16} />{creating ? t('agent.saving') : t('agent.addUnit')}</button>
      </form>

      <section className="space-y-3">
        {units.map((unit) => (
          <div key={unit._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div><p className="font-semibold">{unit.name}</p><p className="mt-1 text-sm text-muted-foreground">{unitTypeLabel(unit.unitType)} · {rateModelLabel(unit.rateModel)} · {unit.inventoryCount} · <Users size={13} className="inline" /> {unit.maxGuests}</p></div>
            <div className="flex items-center gap-3"><strong>{formatMoney(unit.basePrice)}</strong><button type="button" onClick={async () => { await archiveUnit({ variables: { unitId: unit._id } }); await refetch() }} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><Archive size={14} /> {t('agent.archive')}</button></div>
          </div>
        ))}
      </section>
    </div>
  )
}
