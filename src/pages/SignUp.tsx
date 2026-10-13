import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Phone, Lock, User, Building2 } from 'lucide-react'
import { useMutation } from '@apollo/client/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Footer } from '@/components/Footer'
import { SIGN_UP } from '@/graphql/user/mutation'
import { useI18n } from '@/i18n'

type SignUpResponse = {
  signup: {
    _id: string
    memberNick: string
  }
}

type SignUpVariables = {
  input: {
    memberPhone: string
    memberNick: string
    memberPassword: string
    memberFullName: string
    memberType: 'USER' | 'AGENT'
  }
}

type SignUpMemberType = SignUpVariables['input']['memberType']

export default function SignUp() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [memberNick, setMemberNick] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [memberType, setMemberType] = useState<SignUpMemberType>('USER')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [formError, setFormError] = useState('')

  const [signUpMember, { loading: signUpLoading }] = useMutation<SignUpResponse, SignUpVariables>(SIGN_UP)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const trimmedNick = memberNick.trim()
    const trimmedPhone = phoneNumber.trim()
    const trimmedFullName = fullName.trim()

    try {
      const { data } = await signUpMember({
        variables: {
          input: {
            memberPhone: trimmedPhone,
            memberNick: trimmedNick,
            memberPassword: password,
            memberFullName: trimmedFullName,
            memberType,
          },
        },
      })

      if (!data?.signup?._id) {
        setFormError(t('auth.signUpFailed'))
        return
      }

      navigate('/sign-in')
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.signUpError')
      setFormError(message)
    }
  }

  return (
    <>
    <div className="min-h-screen bg-background flex">
      {/* Left — Imagery */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="/assets/category-hotel.jpg"
          alt={t('categories.hotelsTitle')}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <Link to="/" className="absolute top-8 left-8">
            <span className="font-display text-3xl font-bold tracking-tight text-white">
              ROOM<span className="text-gold">i</span>
            </span>
          </Link>
          <h2 className="text-white text-4xl font-display font-bold leading-tight mb-4">
            {t('auth.signUpHeroTitle')}
          </h2>
          <p className="text-white/70 text-lg max-w-md">
            {t('auth.signUpHeroDescription')}
          </p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex justify-center mb-10">
            <span className="font-display text-3xl font-bold tracking-tight text-foreground">
              ROOM<span className="text-gold">i</span>
            </span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              {t('auth.signUpTitle')}
            </h1>
            <p className="text-muted-foreground">
              {t('auth.signUpDescription')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium leading-none">
                {t('common.accountType')}
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    value: 'USER' as const,
                    icon: User,
                    title: t('auth.user'),
                    description: t('auth.userDesc'),
                  },
                  {
                    value: 'AGENT' as const,
                    icon: Building2,
                    title: t('auth.agent'),
                    description: t('auth.agentDesc'),
                  },
                ]).map((option) => {
                  const Icon = option.icon
                  const selected = memberType === option.value

                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 gentle-animation ${
                        selected
                          ? 'border-gold bg-gold/10 ring-1 ring-gold'
                          : 'border-border bg-card hover:border-gold/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="memberType"
                        value={option.value}
                        checked={selected}
                        onChange={() => setMemberType(option.value)}
                        className="sr-only"
                      />
                      <Icon className={`h-5 w-5 shrink-0 ${selected ? 'text-gold-dark' : 'text-muted-foreground'}`} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">{option.title}</span>
                        <span className="block text-xs text-muted-foreground">{option.description}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="fullName">{t('common.fullName')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 h-12 bg-card border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberNick">{t('common.nickname')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="memberNick"
                  type="text"
                  placeholder={t('auth.nicknamePlaceholder')}
                  value={memberNick}
                  onChange={(e) => setMemberNick(e.target.value)}
                  className="pl-10 h-12 bg-card border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t('common.phoneNumber')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder={t('auth.phonePlaceholder')}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10 h-12 bg-card border-border"
                  autoComplete="tel"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('common.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-card border-border"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground gentle-animation"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('auth.passwordHint')}
              </p>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-snug">
                {t('auth.termsAgreement')}
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={!agreedToTerms || signUpLoading}
            >
              {signUpLoading ? t('auth.signingUp') : t('common.createAccount')}
            </Button>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">or sign up with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12" type="button">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
            <Button variant="outline" className="h-12" type="button">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/sign-in" className="text-gold font-medium hover:text-gold-dark gentle-animation">
              {t('auth.signInInstead')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
    <Footer />
    </>
  )
}
