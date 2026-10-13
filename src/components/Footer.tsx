import { Link } from 'react-router-dom'
import { useState } from 'react'
import { ChevronDown, Globe2 } from 'lucide-react'
import { languageOptions, useI18n } from '@/i18n'

export function Footer() {
  const { language, setLanguage, t } = useI18n()
  const [languageOpen, setLanguageOpen] = useState(false)

  const exploreLinks = [
    { label: t('categories.villasTitle'), to: '/properties?category=villa' },
    { label: t('categories.hotelsTitle'), to: '/properties?category=hotel' },
    { label: t('categories.sanatoriumsTitle'), to: '/properties?category=sanatorium' },
    { label: t('footer.allProperties'), to: '/properties' },
  ]

  const companyLinks = [
    { label: t('footer.aboutRoomi'), to: '/' },
    { label: t('hero.createAccount'), to: '/sign-up' },
    { label: t('common.signIn'), to: '/sign-in' },
    { label: t('common.myAccount'), to: '/my-page' },
  ]

  const socialLinks = [
    { label: 'Instagram', href: '#' },
    { label: 'Telegram', href: '#' },
    { label: 'Facebook', href: '#' },
  ]

  return (
    <footer className="border-t border-[#ebebeb] bg-white text-[#222]">
      <div className="mx-auto max-w-[1440px] px-6 py-10 sm:px-10 lg:px-12 lg:py-12">
        <div className="grid gap-10 border-b border-[#ebebeb] pb-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-16">
          <div className="max-w-sm">
            <Link to="/properties" className="inline-flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.06em] text-[#ff385c]" aria-label="ROOMi home">
              <span className="grid h-8 w-8 rotate-[-12deg] place-items-center rounded-[50%_50%_50%_12%] bg-[#ff385c] font-serif text-[21px] font-bold leading-none text-white">r</span>
              <span className="rotate-[-1deg]">ROOMi</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[#717171]">{t('footer.description')}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#717171]">{t('footer.eyebrow')}</p>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-[#222]">{t('footer.explore')}</h4>
            <nav className="mt-4 grid gap-3 text-sm text-[#717171]" aria-label={t('footer.explore')}>
              {exploreLinks.map((link) => (
                <Link key={link.label} to={link.to} className="w-fit transition-colors hover:text-[#222] hover:underline hover:underline-offset-4">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-[#222]">{t('footer.account')}</h4>
            <nav className="mt-4 grid gap-3 text-sm text-[#717171]" aria-label={t('footer.account')}>
              {companyLinks.map((link) => (
                <Link key={link.label} to={link.to} className="w-fit transition-colors hover:text-[#222] hover:underline hover:underline-offset-4">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-5 pt-6 text-xs text-[#717171] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ROOMi · {t('footer.crafted')}</p>

          <div className="flex flex-wrap items-center gap-5">
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-2 font-semibold text-[#222] hover:underline hover:underline-offset-4"
                onClick={() => setLanguageOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={languageOpen}
                aria-label={t('common.language')}
              >
                <Globe2 size={15} />
                {languageOptions.find((option) => option.code === language)?.labels[language]}
                <ChevronDown size={14} />
              </button>
              {languageOpen && (
                <div className="absolute bottom-full right-0 z-20 mb-3 min-w-40 rounded-xl border border-[#dddddd] bg-white p-1.5 text-sm shadow-[0_8px_24px_rgba(0,0,0,.14)]" role="menu">
                  {languageOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      role="menuitem"
                      className={`block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#f7f7f7] ${language === option.code ? 'font-bold text-[#ff385c]' : 'text-[#222]'}`}
                      onClick={() => {
                        setLanguage(option.code)
                        setLanguageOpen(false)
                      }}
                    >
                      {option.labels[language]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {socialLinks.map((link) => (
              <a key={link.label} href={link.href} className="font-semibold text-[#222] transition-colors hover:text-[#ff385c] hover:underline hover:underline-offset-4">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
