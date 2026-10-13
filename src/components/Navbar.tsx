import { useMutation } from '@apollo/client/react'
import { Globe2, Menu, Search, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LOGOUT } from '@/graphql/user/mutation'
import { GuestPicker, totalGuests, type GuestCounts } from '@/components/GuestPicker'
import {
  clearAccessToken,
  getAccountDashboardPath,
  getAuthChangedEventName,
  isAuthenticated,
} from '@/lib/auth'
import { languageOptions, useI18n } from '@/i18n'

interface NavbarProps {
  forceSolid?: boolean
}

function guestCountsFromParams(params: URLSearchParams): GuestCounts {
  const total = Math.max(1, Number(params.get('guests')) || 1)
  return {
    adults: Math.max(1, Number(params.get('adults')) || total),
    children: Math.max(0, Number(params.get('children')) || 0),
    infants: Math.max(0, Number(params.get('infants')) || 0),
    pets: Math.max(0, Number(params.get('pets')) || 0),
  }
}

/** Shared Airbnb-style marketplace header for every public screen. */
export function Navbar({ forceSolid: _forceSolid = true }: NavbarProps) {
  const { language, setLanguage, t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const [query, setQuery] = useState(params.get('location') || '')
  const [guestCounts, setGuestCounts] = useState<GuestCounts>(() => guestCountsFromParams(params))
  const [checkIn, setCheckIn] = useState(params.get('checkIn') || '')
  const [checkOut, setCheckOut] = useState(params.get('checkOut') || '')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [hasAuthSession, setHasAuthSession] = useState(isAuthenticated())
  const profileRef = useRef<HTMLDivElement>(null)
  const languageRef = useRef<HTMLDivElement>(null)
  const [logout] = useMutation(LOGOUT)

  useEffect(() => {
    const syncAuth = () => setHasAuthSession(isAuthenticated())
    const eventName = getAuthChangedEventName()
    window.addEventListener(eventName, syncAuth)
    window.addEventListener('storage', syncAuth)
    return () => {
      window.removeEventListener(eventName, syncAuth)
      window.removeEventListener('storage', syncAuth)
    }
  }, [])

  useEffect(() => {
    setProfileOpen(false)
    setLanguageOpen(false)
    setMobileOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!profileOpen && !languageOpen) return undefined

    const closeMenusOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (profileOpen && !profileRef.current?.contains(target)) setProfileOpen(false)
      if (languageOpen && !languageRef.current?.contains(target)) setLanguageOpen(false)
    }

    document.addEventListener('mousedown', closeMenusOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeMenusOnOutsideClick)
  }, [profileOpen, languageOpen])

  const runSearch = () => {
    const next = new URLSearchParams()
    const guests = totalGuests(guestCounts)
    if (query.trim()) next.set('location', query.trim())
    if (checkIn) next.set('checkIn', checkIn)
    if (checkOut) next.set('checkOut', checkOut)
    if (guests > 1) next.set('guests', String(guests))
    if (guestCounts.adults > 1) next.set('adults', String(guestCounts.adults))
    if (guestCounts.children > 0) next.set('children', String(guestCounts.children))
    if (guestCounts.infants > 0) next.set('infants', String(guestCounts.infants))
    if (guestCounts.pets > 0) next.set('pets', String(guestCounts.pets))
    navigate(`/properties${next.toString() ? `?${next.toString()}` : ''}`)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Local state is still cleared if the API is unavailable.
    }
    clearAccessToken()
    navigate('/properties')
  }

  return (
    <header className="roomi-header">
      <div className="roomi-header__top">
        <Link to="/properties" className="roomi-brand" aria-label="ROOMi home">
          <span className="roomi-brand__mark">r</span>
          <span className="roomi-brand__word">ROOMi</span>
        </Link>

        <form
          className="roomi-search"
          onSubmit={(event) => {
            event.preventDefault()
            runSearch()
          }}
        >
          <label className="roomi-search__field roomi-search__field--where">
            <span>{t('common.destination')}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('hero.destinationPlaceholder')}
              aria-label={t('common.destination')}
            />
          </label>
          <span className="roomi-search__divider" />
          <label className="roomi-search__field">
            <span>{t('common.checkIn')}</span>
            <input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} aria-label={t('common.checkIn')} />
          </label>
          <span className="roomi-search__divider" />
          <label className="roomi-search__field">
            <span>{t('common.checkOut')}</span>
            <input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} aria-label={t('common.checkOut')} />
          </label>
          <span className="roomi-search__divider" />
          <GuestPicker
            value={guestCounts}
            onChange={setGuestCounts}
            compact
            className="roomi-search__guest-picker"
          />
          <span className="roomi-search__divider roomi-search__guest-divider" />
          <button type="submit" className="roomi-search__button" aria-label={t('common.search')}>
            <Search size={18} strokeWidth={2.5} />
          </button>
        </form>

        <div className="roomi-header__actions">
          <div ref={languageRef} className="roomi-language">
            <button
              type="button"
              className="roomi-icon-button roomi-icon-button--language"
              onClick={() => setLanguageOpen((open) => !open)}
              aria-label={t('common.language')}
            >
              <Globe2 size={18} />
              <span>{language.toUpperCase()}</span>
            </button>
            {languageOpen && (
              <div className="roomi-popover roomi-language__menu">
                {languageOptions.map((option) => (
                  <button
                    type="button"
                    key={option.code}
                    onClick={() => {
                      setLanguage(option.code)
                      setLanguageOpen(false)
                    }}
                    className={language === option.code ? 'is-active' : ''}
                  >
                    {option.labels[language]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div ref={profileRef} className="roomi-profile-menu-wrap">
            <button
              type="button"
              className="roomi-profile-trigger"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
              aria-label={t('common.myAccount')}
            >
              <Menu size={17} />
              <UserRound size={19} fill="currentColor" />
            </button>
            {profileOpen && (
              <div className="roomi-popover roomi-profile-menu">
                {hasAuthSession ? (
                  <>
                    <Link to={getAccountDashboardPath()}>{t('common.profile')}</Link>
                    <Link to="/my-page/bookings">{t('common.bookings')}</Link>
                    <button type="button" onClick={handleLogout}>{t('common.logout')}</button>
                  </>
                ) : (
                  <>
                    <Link to="/sign-up" className="roomi-popover__strong">{t('common.signUp')}</Link>
                    <Link to="/sign-in">{t('common.signIn')}</Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="roomi-header__bottom">
        <Link to="/properties" className="roomi-header__mobile-search">
          <Search size={17} />
          <span>{query || t('common.destination')}</span>
        </Link>
        <button type="button" className="roomi-mobile-menu" onClick={() => setMobileOpen((open) => !open)}>
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="roomi-mobile-panel">
          <Link to="/properties">{t('common.all')}</Link>
          <Link to="/properties?category=villa">{t('categories.villasTitle')}</Link>
          <Link to="/properties?category=hotel">{t('categories.hotelsTitle')}</Link>
          <Link to="/properties?category=sanatorium">{t('categories.sanatoriumsTitle')}</Link>
          <Link to="/properties?category=apartment">{t('categories.apartmentsTitle')}</Link>
          <div className="roomi-mobile-language">
            <span><Globe2 size={16} /> {t('common.language')}</span>
            <div>
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={language === option.code ? 'is-active' : ''}
                  onClick={() => setLanguage(option.code)}
                >
                  {option.labels[language]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
