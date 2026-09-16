'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { COUNTRIES, COUNTRY_MAP } from '@/lib/countries'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Globe2, Bell, LogOut, Calendar, Search, Users, UserPlus, UserMinus,
  Twitter, Instagram, MapPin, ChevronLeft, ChevronRight, Loader2, Plus, Trash2,
  CalendarDays, Clock, ArrowRight, Check, Mail, Lock, User, Share2,
  Compass, ExternalLink, SlidersHorizontal, ShieldCheck, Bookmark,
} from 'lucide-react'

// Skeleton placeholder while 3D globe component is dynamically loaded
function GlobeSkeleton() {
  return (
    <div className="w-full h-[340px] sm:h-[440px] rounded-2xl bg-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full border-2 border-slate-200 border-dashed animate-spin duration-1000" />
      <div className="absolute inset-0 skeleton-shimmer opacity-40" />
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 z-10 mt-4">Rendering Interactive Atlas</p>
    </div>
  )
}

const GlobeView = dynamic(() => import('@/components/GlobeView'), {
  ssr: false,
  loading: () => <GlobeSkeleton />,
})

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function daysInMonth(month, year = 2025) { return new Date(year, month, 0).getDate() }
function ordinal(d) { const s=['th','st','nd','rd'], v=d%100; return d+(s[(v-20)%10]||s[v]||s[0]) }
function daysUntil(month, day) {
  const now = new Date(); const y = now.getFullYear()
  const today = new Date(y, now.getMonth(), now.getDate())
  let next = new Date(y, month - 1, day)
  if (next < today) next = new Date(y + 1, month - 1, day)
  return Math.round((next - today) / 86400000)
}
function untilLabel(n) { return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n} days` }

/* ===== Motion transitions ===== */
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
}
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

/* ===== Bespoke UI Primitives ===== */
function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const base = 'btn-grain gap-2 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  }
  const variants = {
    primary: 'btn-grain-primary',
    secondary: 'btn-grain-secondary', // Lush Green Secondary
    'green-soft': 'btn-grain-green-soft',
    outline: 'btn-grain-outline',
    ghost: 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-none border-0',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

function IconButton({ className = '', children, ...props }) {
  return (
    <button
      {...props}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-150 active:scale-95 ${className}`}
    >
      {children}
    </button>
  )
}

function Card({ className = '', children, hover = false, ...props }) {
  return (
    <div
      className={`editorial-card ${hover ? 'editorial-card-lift cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

function Avatar({ name, size = 'w-10 h-10', text = 'text-sm' }) {
  const initial = (name || '?')[0]?.toUpperCase()
  return (
    <div
      className={`${size} shrink-0 rounded-full bg-slate-900 text-white font-semibold flex items-center justify-center border border-slate-700/40 shadow-sm ${text}`}
    >
      {initial}
    </div>
  )
}

function Badge({ variant = 'slate', children, className = '' }) {
  const styles = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80 font-medium',
    slate: 'bg-slate-50 text-slate-700 border-slate-200 font-medium',
    primary: 'bg-slate-900 text-white border-slate-800 font-medium',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs border ${styles[variant] || styles.slate} ${className}`}>
      {children}
    </span>
  )
}

function SectionTitle({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 shadow-sm text-slate-800">
            <Icon className="w-5 h-5 text-emerald-600" />
          </div>
        )}
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/* ===== Full Page Skeleton Loader (Replacing emoji bouncing cake) ===== */
function AppBootstrapSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top bar skeleton */}
      <header className="h-16 rounded-2xl bg-white border border-slate-200/80 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-32 h-5 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-36 h-9 rounded-full" />
          <Skeleton className="w-9 h-9 rounded-full" />
        </div>
      </header>

      {/* Tabs bar skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="w-24 h-9 rounded-full shrink-0" />
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 editorial-card p-6 bg-white min-h-[460px] flex flex-col justify-between">
          <div className="space-y-2">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-48 h-6" />
          </div>
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="w-56 h-56 rounded-full" />
          </div>
          <Skeleton className="w-full h-8" />
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="editorial-card p-5 bg-white space-y-2">
              <Skeleton className="w-10 h-8" />
              <Skeleton className="w-20 h-4" />
            </div>
            <div className="editorial-card p-5 bg-white space-y-2">
              <Skeleton className="w-10 h-8" />
              <Skeleton className="w-20 h-4" />
            </div>
          </div>
          <div className="editorial-card p-5 bg-white space-y-3">
            <Skeleton className="w-36 h-5" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="w-28 h-4" />
                  <Skeleton className="w-20 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('landing')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const user = session?.user || null

  const [publicBirthdays, setPublicBirthdays] = useState([])
  const [followedIds, setFollowedIds] = useState([])
  const [personal, setPersonal] = useState([])
  const [notifications, setNotifications] = useState([])

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    return data
  }, [])

  const loadPublic = useCallback(async () => {
    const { data } = await supabase.from('profiles')
      .select('id,display_name,country,country_code,x_handle,instagram_handle,birth_month,birth_day,birth_year,birth_year_public,is_public')
      .eq('is_public', true).not('birth_month', 'is', null)
    setPublicBirthdays(data || [])
  }, [])

  const loadFollows = useCallback(async (uid) => {
    const { data } = await supabase.from('follows').select('followed_id').eq('follower_id', uid)
    setFollowedIds((data || []).map((f) => f.followed_id))
  }, [])

  const loadPersonal = useCallback(async (uid) => {
    const { data } = await supabase.from('personal_birthdays').select('*').eq('owner_id', uid).order('birth_month')
    setPersonal(data || [])
  }, [])

  const loadNotifications = useCallback(async (uid) => {
    const { data } = await supabase.from('notifications').select('*').eq('recipient_id', uid).order('created_at', { ascending: false }).limit(50)
    setNotifications(data || [])
  }, [])

  const refreshUserData = useCallback(async (uid) => {
    await Promise.all([loadPublic(), loadFollows(uid), loadPersonal(uid), loadNotifications(uid)])
  }, [loadPublic, loadFollows, loadPersonal, loadNotifications])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      await loadPublic()
      const { data } = await supabase.auth.getSession()
      const sess = data?.session || null
      if (!mounted) return
      setSession(sess)
      if (sess?.user) {
        const prof = await loadProfile(sess.user.id)
        setProfile(prof)
        await refreshUserData(sess.user.id)
        setScreen(prof && prof.onboarded ? 'app' : 'onboarding')
      } else {
        setScreen('landing')
      }
      setLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, sess) => {
      setSession(sess)
      if (event === 'SIGNED_OUT' || !sess?.user) {
        setProfile(null)
        setScreen('landing')
      }
    })
    return () => { mounted = false; sub?.subscription?.unsubscribe() }
  }, [loadPublic, loadProfile, refreshUserData])

  if (loading) {
    return <AppBootstrapSkeleton />
  }

  return (
    <div className="min-h-screen relative text-slate-900">
      <AnimatePresence mode="wait">
        {screen === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Landing publicBirthdays={publicBirthdays} onStart={() => setScreen('auth')} />
          </motion.div>
        )}
        {screen === 'auth' && (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Auth onBack={() => setScreen('landing')} onAuthed={async (sess) => {
              setSession(sess)
              const prof = await loadProfile(sess.user.id); setProfile(prof)
              await refreshUserData(sess.user.id)
              setScreen(prof && prof.onboarded ? 'app' : 'onboarding')
            }} />
          </motion.div>
        )}
        {screen === 'onboarding' && user && (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Onboarding user={user} initial={profile} onDone={async (prof) => {
              setProfile(prof); await refreshUserData(user.id); setScreen('app'); toast.success('Profile created successfully')
            }} />
          </motion.div>
        )}
        {screen === 'app' && user && (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dashboard
              user={user}
              profile={profile}
              setProfile={setProfile}
              publicBirthdays={publicBirthdays}
              followedIds={followedIds}
              personal={personal}
              notifications={notifications}
              reload={() => refreshUserData(user.id)}
              onLogout={async () => { await supabase.auth.signOut(); setScreen('landing') }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ===== Landing Page (Clean Bright Architectural Design) ===== */
function Landing({ publicBirthdays, onStart }) {
  const now = new Date(); const tM = now.getMonth() + 1; const tD = now.getDate()
  const points = useMemo(() => buildGlobePoints(publicBirthdays, tM, tD), [publicBirthdays, tM, tD])
  const todays = publicBirthdays.filter((b) => b.birth_month === tM && b.birth_day === tD)
  const upcoming = publicBirthdays.filter((b) => { const d = daysUntil(b.birth_month, b.birth_day); return d > 0 && d <= 7 }).length

  const features = [
    {
      icon: Clock,
      title: 'Precision Reminders',
      desc: 'Never forget someone who matters. Get thoughtfully scheduled email updates 3 days, 1 day, or the morning of.',
    },
    {
      icon: Users,
      title: 'Global Subscriptions',
      desc: 'Follow collaborators, friends, and creators worldwide. Keep track of international timezones seamlessly.',
    },
    {
      icon: Lock,
      title: 'Private by Default',
      desc: 'Record private birthdays for family that only you can see, completely isolated from the public atlas.',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <Compass className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900 tracking-tight">Birthday Atlas</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" onClick={onStart}>Sign In</Button>
            <Button variant="primary" onClick={onStart}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot-green" />
          Global Birthday Atlas · Live
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]"
        >
          Never miss a birthday.<br />
          <span className="text-emerald-600">Anywhere in the world.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
        >
          Pin your birthday to an interactive 3D globe, track family and friends across all continents, and receive reliably timed reminder alerts right to your inbox.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mt-8 flex items-center justify-center gap-3.5 flex-wrap"
        >
          <Button variant="primary" size="lg" onClick={onStart}>
            Add your birthday <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="lg" onClick={onStart}>
            <Compass className="w-4 h-4" /> Explore Atlas
          </Button>
        </motion.div>
      </section>

      {/* Bento Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Globe Container */}
          <Card className="lg:col-span-2 p-6 sm:p-8 flex flex-col justify-between overflow-hidden bg-white">
            <div className="flex items-start justify-between z-10">
              <div>
                <Badge variant="green" className="mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" /> Real-time Atlas
                </Badge>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900">Celebrating Today</h3>
              </div>
              <div className="text-right">
                <span className="font-display text-4xl sm:text-5xl font-bold text-emerald-600">{todays.length}</span>
                <p className="text-xs text-slate-500 font-medium mt-0.5">people across Earth</p>
              </div>
            </div>
            <div className="py-4">
              <GlobeView points={points} />
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Drag to rotate · Scroll to zoom</span>
              <span className="text-emerald-700 font-medium">Green pins indicate celebrations</span>
            </div>
          </Card>

          {/* Right Column Features */}
          <div className="flex flex-col gap-5">
            {/* Upcoming stat card */}
            <Card className="p-6 flex items-center justify-between bg-white" hover>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Coming Up</p>
                <p className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mt-1">{upcoming}</p>
                <p className="text-sm text-slate-500 mt-0.5">birthdays in the next 7 days</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <CalendarDays className="w-6 h-6" />
              </div>
            </Card>

            {features.map((f, i) => (
              <Card key={i} className="p-6 bg-white flex-1 flex flex-col justify-between" hover>
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
                  <f.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="mt-4">
                  <p className="font-semibold text-base text-slate-900">{f.title}</p>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Birthday Atlas</span>
          </div>
          <p>© 2025 Birthday Atlas. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

/* ===== Auth (Clean Bright Editorial Card) ===== */
function Auth({ onBack, onAuthed }) {
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        })
        if (error) throw error
        if (!data.session) {
          const { data: si, error: se } = await supabase.auth.signInWithPassword({ email, password })
          if (se) {
            toast.info('Account created. Check your email to confirm, then sign in.')
            setMode('login')
            setBusy(false)
            return
          }
          onAuthed(si.session)
          return
        }
        onAuthed(data.session)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuthed(data.session)
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#F8F9FA]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 bg-white">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Compass className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'signup' ? 'Join the global birthday directory' : 'Sign in to access your atlas'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Your Name</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="editorial-input pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                  className="editorial-input pl-10"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                  className="editorial-input pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant={mode === 'signup' ? 'secondary' : 'primary'}
              disabled={busy}
              className="w-full py-3 mt-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
            {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
            <button
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            >
              {mode === 'signup' ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

          <button
            className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
            onClick={onBack}
          >
            ← Return to homepage
          </button>
        </Card>
      </motion.div>
    </div>
  )
}

/* ===== Onboarding (Clean Bright Form) ===== */
function Onboarding({ user, initial, onDone }) {
  const [name, setName] = useState(initial?.display_name || user.user_metadata?.display_name || '')
  const [month, setMonth] = useState(initial?.birth_month ? String(initial.birth_month) : '')
  const [day, setDay] = useState(initial?.birth_day ? String(initial.birth_day) : '')
  const [year, setYear] = useState(initial?.birth_year ? String(initial.birth_year) : '')
  const [yearPublic, setYearPublic] = useState(initial?.birth_year_public ?? false)
  const [country, setCountry] = useState(initial?.country_code || '')
  const [x, setX] = useState(initial?.x_handle || '')
  const [ig, setIg] = useState(initial?.instagram_handle || '')
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true)
  const [busy, setBusy] = useState(false)
  const dayCount = month ? daysInMonth(Number(month)) : 31

  async function save() {
    if (!name || !month || !day || !country) {
      toast.error('Please complete your name, birthday and country')
      return
    }
    setBusy(true)
    const c = COUNTRY_MAP[country]
    const payload = {
      id: user.id,
      email: user.email,
      display_name: name,
      birth_month: Number(month),
      birth_day: Number(day),
      birth_year: year ? Number(year) : null,
      birth_year_public: yearPublic,
      country: c?.name || null,
      country_code: country,
      x_handle: x || null,
      instagram_handle: ig || null,
      is_public: isPublic,
      reminders_enabled: true,
      reminder_offsets: [1],
      onboarded: true,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('profiles').upsert(payload).select().maybeSingle()
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    onDone(data)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#F8F9FA]">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Card className="p-8 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="green">Profile Setup</Badge>
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Add Your Birthday</h2>
          <p className="text-sm text-slate-500 mb-6">Create your personal point on the global atlas.</p>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Display Name</Label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="editorial-input"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Month</Label>
                <Select value={month} onValueChange={(v) => { setMonth(v); setDay('') }}>
                  <SelectTrigger className="editorial-input h-auto"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Day</Label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger className="editorial-input h-auto"><SelectValue placeholder="Day" /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 max-h-60">
                    {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Year</Label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Optional"
                  className="editorial-input"
                />
              </div>
            </div>

            <ToggleRow
              title="Display birth year"
              desc="If turned off, your exact age remains confidential"
              checked={yearPublic}
              onChange={setYearPublic}
              disabled={!year}
            />

            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="editorial-input h-auto"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent className="bg-white border-slate-200 max-h-60">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-mono text-xs text-slate-400 mr-2">[{c.code}]</span> {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Twitter className="w-3 h-3 text-slate-400" /> X Handle
                </Label>
                <input
                  value={x}
                  onChange={(e) => setX(e.target.value)}
                  placeholder="@handle"
                  className="editorial-input"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Instagram className="w-3 h-3 text-slate-400" /> Instagram
                </Label>
                <input
                  value={ig}
                  onChange={(e) => setIg(e.target.value)}
                  placeholder="@handle"
                  className="editorial-input"
                />
              </div>
            </div>

            <ToggleRow
              title="Publish to Global Atlas"
              desc="Allows friends and people worldwide to find you and send wishes"
              checked={isPublic}
              onChange={setIsPublic}
            />

            <Button
              onClick={save}
              variant="secondary"
              disabled={busy}
              className="w-full py-3.5 text-sm mt-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Join Global Atlas <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

/* ===== Dashboard (Refined Bright Editorial Architecture) ===== */
function Dashboard({ user, profile, setProfile, publicBirthdays, followedIds, personal, notifications, reload, onLogout }) {
  const [tab, setTab] = useState('globe')
  const [mode, setMode] = useState('global')
  const [selected, setSelected] = useState(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const unread = notifications.filter((n) => !n.read_at).length
  const now = new Date(); const tM = now.getMonth() + 1; const tD = now.getDate()

  async function follow(id) {
    if (id === user.id) { toast.info('That is your own profile'); return }
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, followed_id: id })
    if (error) { toast.error(error.message); return }
    toast.success('Subscribed to reminders')
    reload()
  }

  async function unfollow(id) {
    const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('followed_id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Unsubscribed')
    reload()
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', user.id).is('read_at', null)
    reload()
  }

  const tabDef = [
    { v: 'globe', icon: Globe2, label: 'Atlas' },
    { v: 'upcoming', icon: CalendarDays, label: 'Upcoming' },
    { v: 'calendar', icon: Calendar, label: 'Calendar' },
    { v: 'discover', icon: Search, label: 'Discover' },
    { v: 'personal', icon: Users, label: 'My Circle' },
    { v: 'profile', icon: User, label: 'Settings' },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-16">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <Compass className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <span className="hidden sm:inline font-display font-bold text-lg text-slate-900 tracking-tight">Birthday Atlas</span>
          </div>

          {/* Mode switch */}
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 border border-slate-200/80">
            {[
              { v: 'global', label: 'Global', icon: Globe2 },
              { v: 'personal', label: 'Personal', icon: Lock },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setMode(o.v)}
                className={`relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  mode === o.v
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <o.icon className="w-3.5 h-3.5" /> {o.label}
              </button>
            ))}
          </div>

          {/* User actions */}
          <div className="flex items-center gap-1.5">
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <IconButton className="relative">
                  <Bell className="w-4.5 h-4.5 text-slate-700" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </IconButton>
              </PopoverTrigger>
              <PopoverContent className="w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-3" align="end">
                <div className="flex items-center justify-between mb-2.5 px-2">
                  <span className="font-semibold text-sm text-slate-900">Notifications</span>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs font-medium text-emerald-600 hover:underline">
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <div className="py-8 text-center text-slate-400">
                      <Bell className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                      <p className="text-xs">No alerts yet</p>
                    </div>
                  )}
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        n.read_at ? 'bg-white border-transparent' : 'bg-emerald-50/50 border-emerald-100'
                      }`}
                    >
                      <p className="font-medium text-xs text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" /> {n.title}
                      </p>
                      {n.body && <p className="text-xs text-slate-500 mt-1">{n.body}</p>}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <IconButton onClick={onLogout} title="Sign Out">
              <LogOut className="w-4.5 h-4.5 text-slate-700" />
            </IconButton>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Responsive Tabs Navigation */}
        <div className="mb-6 overflow-x-auto pb-1 scrollbar-none">
          <div className="inline-flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-full border border-slate-300/60">
            {tabDef.map((t) => (
              <button
                key={t.v}
                onClick={() => setTab(t.v)}
                className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                  tab === t.v ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === t.v && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-full bg-white shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <t.icon className={`w-3.5 h-3.5 ${tab === t.v ? 'text-emerald-600' : ''}`} />
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Body */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'globe' && <GlobeTab publicBirthdays={publicBirthdays} tM={tM} tD={tD} onSelect={setSelected} />}
            {tab === 'upcoming' && <UpcomingTab mode={mode} publicBirthdays={publicBirthdays} followedIds={followedIds} personal={personal} profile={profile} onSelect={setSelected} />}
            {tab === 'calendar' && <CalendarTab mode={mode} publicBirthdays={publicBirthdays} followedIds={followedIds} personal={personal} profile={profile} onSelect={setSelected} tM={tM} tD={tD} />}
            {tab === 'discover' && <DiscoverTab user={user} followedIds={followedIds} follow={follow} unfollow={unfollow} onSelect={setSelected} />}
            {tab === 'personal' && <PersonalTab user={user} personal={personal} reload={reload} followedIds={followedIds} publicBirthdays={publicBirthdays} unfollow={unfollow} onSelect={setSelected} />}
            {tab === 'profile' && <ProfileTab user={user} profile={profile} setProfile={setProfile} reload={reload} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Person Details Dialog */}
      <PersonDialog
        person={selected}
        onClose={() => setSelected(null)}
        followedIds={followedIds}
        follow={follow}
        unfollow={unfollow}
        meId={user.id}
      />
    </div>
  )
}

/* ===== Globe Tab (Bright Split Layout) ===== */
function GlobeTab({ publicBirthdays, tM, tD, onSelect }) {
  const points = useMemo(() => buildGlobePoints(publicBirthdays, tM, tD), [publicBirthdays, tM, tD])
  const todays = publicBirthdays.filter((b) => b.birth_month === tM && b.birth_day === tD)
  const week = publicBirthdays.filter((b) => { const d = daysUntil(b.birth_month, b.birth_day); return d > 0 && d <= 7 })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 3D Atlas */}
      <Card className="lg:col-span-2 p-6 flex flex-col justify-between bg-white overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div>
            <Badge variant="green" className="mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" /> Live Atlas
            </Badge>
            <h3 className="font-display font-bold text-lg text-slate-900">Global Celebrations</h3>
          </div>
          <span className="text-xs text-slate-500">Green pins indicate celebrations today</span>
        </div>
        <div className="py-2">
          <GlobeView points={points} onPointClick={(p) => onSelect(p.data)} />
        </div>
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Click any pin to inspect profile</span>
          <span>{points.length} total mapped coordinates</span>
        </div>
      </Card>

      {/* Right Column Feed */}
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5 bg-white" hover>
            <p className="font-display text-3xl font-bold text-emerald-600">{todays.length}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Today</p>
          </Card>
          <Card className="p-5 bg-white" hover>
            <p className="font-display text-3xl font-bold text-amber-600">{week.length}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Next 7 Days</p>
          </Card>
        </div>

        {/* Today's Celebrants */}
        <Card className="p-5 bg-white">
          <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot-green" />
              <span className="font-semibold text-sm text-slate-900">Today · {MONTH_ABBR[tM - 1]} {tD}</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">{todays.length} active</span>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {todays.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-500">No public birthdays today</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Explore the Discover tab to follow users</p>
              </div>
            )}
            {todays.map((b) => (
              <PersonRow key={b.id} b={b} onClick={() => onSelect(b)} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function PersonRow({ b, onClick }) {
  const c = COUNTRY_MAP[b.country_code]
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all duration-150 group"
    >
      <Avatar name={b.display_name} size="w-9 h-9" text="text-xs" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
          {b.display_name}
        </p>
        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-slate-400" />
          {c ? `${b.country_code} · ${c.name}` : 'Global'}
        </p>
      </div>
      <Badge variant="green" className="text-[11px] shrink-0">Today</Badge>
    </button>
  )
}

/* ===== Helper to build combined entries ===== */
function buildEntries(mode, publicBirthdays, followedIds, personal, profile) {
  if (mode === 'global') {
    return publicBirthdays.map((b) => ({ ...b, name: b.display_name, source: 'public' }))
  }
  const list = []
  if (profile?.birth_month) {
    list.push({
      id: 'me',
      name: `${profile.display_name || 'You'} (You)`,
      birth_month: profile.birth_month,
      birth_day: profile.birth_day,
      source: 'self',
    })
  }
  personal.forEach((p) => {
    list.push({
      id: p.id,
      name: p.person_name,
      birth_month: p.birth_month,
      birth_day: p.birth_day,
      relationship: p.relationship,
      source: 'personal',
    })
  })
  publicBirthdays
    .filter((b) => followedIds.includes(b.id))
    .forEach((b) => {
      list.push({ ...b, name: b.display_name, source: 'subscribed' })
    })
  return list
}

/* ===== Upcoming Tab (Clean Chronological Grid) ===== */
function UpcomingTab({ mode, publicBirthdays, followedIds, personal, profile, onSelect }) {
  const entries = useMemo(
    () => buildEntries(mode, publicBirthdays, followedIds, personal, profile),
    [mode, publicBirthdays, followedIds, personal, profile]
  )
  const upcoming = useMemo(() => {
    return entries
      .map((e) => ({ ...e, days: daysUntil(e.birth_month, e.birth_day) }))
      .filter((e) => e.days <= 7)
      .sort((a, b) => a.days - b.days)
  }, [entries])

  return (
    <div>
      <SectionTitle
        icon={CalendarDays}
        title="Next 7 Days"
        subtitle={`${upcoming.length} celebrations scheduled across your ${mode} view`}
      />

      {upcoming.length === 0 && (
        <Card className="p-16 text-center bg-white">
          <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-base text-slate-800">No celebrations in the next week</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {mode === 'global'
              ? 'Invite colleagues or explore the discover tab to follow more people.'
              : 'Add private records under "My Circle" or subscribe to profiles.'}
          </p>
        </Card>
      )}

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {upcoming.map((e, i) => {
          const c = COUNTRY_MAP[e.country_code]
          const clickable = e.source === 'public' || e.source === 'subscribed'
          return (
            <motion.div key={i} variants={fadeUp}>
              <Card
                className="p-5 bg-white"
                hover={clickable}
                onClick={() => clickable && onSelect(e)}
              >
                <div className="flex items-center justify-between mb-3.5">
                  <Badge variant={e.days === 0 ? 'green' : e.days <= 2 ? 'amber' : 'slate'}>
                    {e.days === 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />}
                    {untilLabel(e.days)}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-500">
                    {MONTH_ABBR[e.birth_month - 1]} {e.birth_day}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar name={e.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-900 truncate">{e.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {e.source === 'personal'
                        ? e.relationship || 'Private Record'
                        : c
                        ? `${e.country_code} · ${c.name}`
                        : e.source === 'self'
                        ? 'Your birthday'
                        : 'Global'}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

/* ===== Calendar Tab (Clean Editorial Month Grid) ===== */
function CalendarTab({ mode, publicBirthdays, followedIds, personal, profile, onSelect, tM, tD }) {
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)
  const entries = useMemo(
    () => buildEntries(mode, publicBirthdays, followedIds, personal, profile),
    [mode, publicBirthdays, followedIds, personal, profile]
  )
  const byDay = useMemo(() => {
    const map = {}
    entries
      .filter((e) => e.birth_month === viewMonth)
      .forEach((e) => {
        ;(map[e.birth_day] = map[e.birth_day] || []).push(e)
      })
    return map
  }, [entries, viewMonth])

  const firstDow = new Date(2025, viewMonth - 1, 1).getDay()
  const totalDays = daysInMonth(viewMonth, 2025)
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">{MONTHS[viewMonth - 1]}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {mode === 'global' ? 'Displaying public birthdays worldwide' : 'Displaying personal & followed contacts'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <IconButton onClick={() => setViewMonth((m) => (m === 1 ? 12 : m - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </IconButton>
          <IconButton onClick={() => setViewMonth((m) => (m === 12 ? 1 : m + 1))}>
            <ChevronRight className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {DOW.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[88px] bg-slate-50/50 rounded-xl border border-transparent" />
          const list = byDay[d] || []
          const isToday = viewMonth === tM && d === tD

          return (
            <div
              key={i}
              className={`min-h-[88px] rounded-xl p-2 transition-colors border ${
                isToday
                  ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-white border-slate-200/70 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isToday ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {d}
                </span>
                {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </div>

              <div className="space-y-1 mt-1.5">
                {list.slice(0, 2).map((e, idx) => (
                  <button
                    key={idx}
                    onClick={() => (e.source === 'public' || e.source === 'subscribed') && onSelect(e)}
                    className="w-full truncate text-left text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 transition-colors"
                  >
                    {e.name}
                  </button>
                ))}
                {list.length > 2 && (
                  <div className="text-[10px] text-slate-400 font-medium px-1">
                    +{list.length - 2} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ===== Discover Tab (With Skeleton State) ===== */
function DiscoverTab({ user, followedIds, follow, unfollow, onSelect }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)

  const search = useCallback(async (term) => {
    setBusy(true)
    let query = supabase
      .from('profiles')
      .select('id,display_name,country,country_code,x_handle,instagram_handle,birth_month,birth_day,birth_year,birth_year_public,is_public')
      .eq('is_public', true)
      .not('birth_month', 'is', null)
      .limit(40)

    if (term) {
      query = query.ilike('display_name', `%${term}%`)
    }
    const { data } = await query
    setResults((data || []).filter((r) => r.id !== user.id))
    setBusy(false)
  }, [user.id])

  useEffect(() => {
    search('')
  }, [search])

  return (
    <div>
      <SectionTitle
        icon={Search}
        title="Discover People"
        subtitle="Search and subscribe to colleagues, friends, and creators"
      />

      <div className="relative max-w-md mb-6">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search(q)}
          placeholder="Search by name..."
          className="editorial-input pl-10"
        />
      </div>

      {busy && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 bg-white flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-16 h-3" />
              </div>
              <Skeleton className="w-16 h-8 rounded-full" />
            </Card>
          ))}
        </div>
      )}

      {!busy && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {results.map((b) => {
            const c = COUNTRY_MAP[b.country_code]
            const following = followedIds.includes(b.id)
            return (
              <motion.div key={b.id} variants={fadeUp}>
                <Card className="p-4 flex items-center gap-3 bg-white" hover>
                  <button onClick={() => onSelect(b)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <Avatar name={b.display_name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-900 truncate">{b.display_name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {MONTH_ABBR[b.birth_month - 1]} {b.birth_day} · {c ? `${b.country_code} · ${c.name}` : 'Global'}
                      </p>
                    </div>
                  </button>
                  {following ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unfollow(b.id)}
                      title="Unsubscribe"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => follow(b.id)}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {!busy && results.length === 0 && (
        <Card className="p-12 text-center bg-white">
          <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">No public profiles matched your search</p>
          <p className="text-xs text-slate-400 mt-1">Try searching for a different name</p>
        </Card>
      )}
    </div>
  )
}

/* ===== Personal Tab (Clean Dual-Column Layout) ===== */
function PersonalTab({ user, personal, reload, followedIds, publicBirthdays, unfollow, onSelect }) {
  const [name, setName] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')
  const [rel, setRel] = useState('')
  const [busy, setBusy] = useState(false)
  const subscribed = publicBirthdays.filter((b) => followedIds.includes(b.id))
  const dayCount = month ? daysInMonth(Number(month)) : 31

  async function add() {
    if (!name || !month || !day) {
      toast.error('Name, month and day are required')
      return
    }
    setBusy(true)
    const { error } = await supabase.from('personal_birthdays').insert({
      owner_id: user.id,
      person_name: name,
      birth_month: Number(month),
      birth_day: Number(day),
      birth_year: year ? Number(year) : null,
      relationship: rel || null,
    })
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setName('')
    setMonth('')
    setDay('')
    setYear('')
    setRel('')
    toast.success('Added to your private circle')
    reload()
  }

  async function remove(id) {
    await supabase.from('personal_birthdays').delete().eq('id', id)
    toast.success('Entry removed')
    reload()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add private record form */}
      <Card className="p-6 bg-white">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Plus className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-900">Add Private Birthday</h3>
        </div>
        <p className="text-xs text-slate-500 mb-5 ml-10">
          Only you can see these entries. Perfect for offline contacts, family, and personal friends.
        </p>

        <div className="space-y-3.5">
          <div>
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Person Name</Label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Miller"
              className="editorial-input"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Month</Label>
              <Select value={month} onValueChange={(v) => { setMonth(v); setDay('') }}>
                <SelectTrigger className="editorial-input h-auto"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="editorial-input h-auto"><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent className="bg-white border-slate-200 max-h-60">
                  {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Year</Label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Optional"
                className="editorial-input"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Relationship</Label>
            <Select value={rel} onValueChange={setRel}>
              <SelectTrigger className="editorial-input h-auto"><SelectValue placeholder="Select relationship tag" /></SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {['Family','Friend','Partner','Colleague','Other'].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={add} variant="secondary" disabled={busy} className="w-full py-3 mt-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save to Private Circle <Plus className="w-4 h-4" /></>}
          </Button>
        </div>
      </Card>

      {/* Right Column: Private Records & Subscriptions */}
      <div className="space-y-6">
        {/* Private Records */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              Private Records ({personal.length})
            </h3>
            <span className="text-xs text-slate-400">Confidential</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {personal.length === 0 && (
              <div className="py-8 text-center text-slate-400">
                <Users className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                <p className="text-xs">No private birthdays added yet</p>
              </div>
            )}
            {personal.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors group"
              >
                <Avatar name={p.person_name} size="w-9 h-9" text="text-xs" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{p.person_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {MONTH_ABBR[p.birth_month - 1]} {p.birth_day}
                    {p.relationship ? ` · ${p.relationship}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => remove(p.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Subscriptions */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-emerald-600" />
              Subscriptions ({subscribed.length})
            </h3>
            <span className="text-xs text-slate-400">Synced Reminders</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {subscribed.length === 0 && (
              <div className="py-8 text-center text-slate-400">
                <Bookmark className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                <p className="text-xs">No followed profiles</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Subscribe to contacts from Discover</p>
              </div>
            )}
            {subscribed.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors group"
              >
                <button onClick={() => onSelect(b)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <Avatar name={b.display_name} size="w-9 h-9" text="text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-slate-900 truncate">{b.display_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {MONTH_ABBR[b.birth_month - 1]} {b.birth_day}
                    </p>
                  </div>
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unfollow(b.id)}
                  title="Unfollow"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ===== Profile Tab (Settings, Reminders & Privacy) ===== */
function ProfileTab({ user, profile, setProfile, reload }) {
  const [name, setName] = useState(profile?.display_name || '')
  const [month, setMonth] = useState(profile?.birth_month ? String(profile.birth_month) : '')
  const [day, setDay] = useState(profile?.birth_day ? String(profile.birth_day) : '')
  const [year, setYear] = useState(profile?.birth_year ? String(profile.birth_year) : '')
  const [yearPublic, setYearPublic] = useState(profile?.birth_year_public ?? false)
  const [country, setCountry] = useState(profile?.country_code || '')
  const [x, setX] = useState(profile?.x_handle || '')
  const [ig, setIg] = useState(profile?.instagram_handle || '')
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true)
  const [reminders, setReminders] = useState(profile?.reminders_enabled ?? true)
  const [offsets, setOffsets] = useState(Array.isArray(profile?.reminder_offsets) ? profile.reminder_offsets : [1])
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const dayCount = month ? daysInMonth(Number(month)) : 31

  const toggleOffset = (o) => {
    setOffsets((prev) => (prev.includes(o) ? prev.filter((v) => v !== o) : [...prev, o].sort((a, b) => b - a)))
  }

  async function save() {
    setBusy(true)
    const c = COUNTRY_MAP[country]
    const payload = {
      id: user.id,
      email: user.email,
      display_name: name,
      birth_month: month ? Number(month) : null,
      birth_day: day ? Number(day) : null,
      birth_year: year ? Number(year) : null,
      birth_year_public: yearPublic,
      country: c?.name || null,
      country_code: country || null,
      x_handle: x || null,
      instagram_handle: ig || null,
      is_public: isPublic,
      reminders_enabled: reminders,
      reminder_offsets: offsets.length ? offsets : [1],
      onboarded: true,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('profiles').upsert(payload).select().maybeSingle()
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setProfile(data)
    toast.success('Settings updated')
    reload()
  }

  async function testReminder() {
    setTesting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/reminders/self-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: '{}',
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to trigger test reminder')
      toast.success(`Test reminder delivered to ${j.to}`)
    } catch (e) {
      toast.error(e.message || 'Could not send test')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Profile Form */}
      <Card className="p-6 bg-white">
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100">
          <Avatar name={name || user.email} size="w-12 h-12" text="text-base" />
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">{name || 'Your Account'}</h2>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Display Name</Label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="editorial-input"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Month</Label>
              <Select value={month} onValueChange={(v) => { setMonth(v); setDay('') }}>
                <SelectTrigger className="editorial-input h-auto"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="editorial-input h-auto"><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent className="bg-white border-slate-200 max-h-60">
                  {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Year</Label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Optional"
                className="editorial-input"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Location</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="editorial-input h-auto"><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent className="bg-white border-slate-200 max-h-60">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="font-mono text-xs text-slate-400 mr-2">[{c.code}]</span> {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Twitter className="w-3 h-3 text-slate-400" /> X Handle
              </Label>
              <input
                value={x}
                onChange={(e) => setX(e.target.value)}
                placeholder="@handle"
                className="editorial-input"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Instagram className="w-3 h-3 text-slate-400" /> Instagram
              </Label>
              <input
                value={ig}
                onChange={(e) => setIg(e.target.value)}
                placeholder="@handle"
                className="editorial-input"
              />
            </div>
          </div>

          <Button
            onClick={save}
            variant="secondary"
            disabled={busy}
            className="w-full py-3 mt-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save Changes <Check className="w-4 h-4" /></>}
          </Button>
        </div>
      </Card>

      {/* Right Column: Privacy & Reminder Settings */}
      <div className="space-y-6">
        {/* Privacy */}
        <Card className="p-6 bg-white space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm text-slate-900">Privacy & Visibility</h3>
          </div>
          <ToggleRow
            title="Public Birthday Profile"
            desc="Visible on the 3D globe and searchable by friends"
            checked={isPublic}
            onChange={setIsPublic}
          />
          <ToggleRow
            title="Display Birth Year"
            desc="Shows your full age rather than just calendar day"
            checked={yearPublic}
            onChange={setYearPublic}
            disabled={!year}
          />
        </Card>

        {/* Reminders */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-sm text-slate-900">Email Reminders</h3>
            </div>
            <Switch
              checked={reminders}
              onCheckedChange={setReminders}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          <p className="text-xs text-slate-500 mt-3 mb-4">
            Select schedule milestones to receive notification emails before upcoming birthdays:
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { o: 3, l: '3 days prior' },
              { o: 1, l: '1 day prior' },
              { o: 0, l: 'Morning of' },
            ].map(({ o, l }) => {
              const on = offsets.includes(o)
              return (
                <button
                  key={o}
                  type="button"
                  disabled={!reminders}
                  onClick={() => toggleOffset(o)}
                  className={`btn-grain px-3.5 py-2 text-xs font-semibold rounded-full transition-all duration-150 disabled:opacity-40 ${
                    on
                      ? 'btn-grain-secondary'
                      : 'btn-grain-outline'
                  }`}
                >
                  {on && <Check className="w-3.5 h-3.5 mr-1" />}
                  {l}
                </button>
              )
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Button
              onClick={testReminder}
              variant="outline"
              size="sm"
              disabled={testing}
              className="w-full py-2.5"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Send Test Reminder Email</>}
            </Button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Sends an immediate preview email for your nearest birthday contact.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function ToggleRow({ title, desc, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50/80 border border-slate-200/80 px-4 py-3">
      <div className="pr-4">
        <p className="font-medium text-xs text-slate-900">{title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[state=checked]:bg-emerald-600"
      />
    </div>
  )
}

/* ===== Person Details Dialog (Clean Editorial Modal) ===== */
function PersonDialog({ person, onClose, followedIds, follow, unfollow, meId }) {
  if (!person) return null
  const c = COUNTRY_MAP[person.country_code]
  const following = followedIds.includes(person.id)
  const isMe = person.id === meId
  const age = person.birth_year && person.birth_year_public ? new Date().getFullYear() - person.birth_year : null

  return (
    <Dialog open={!!person} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl bg-white border border-slate-200 shadow-2xl p-0 overflow-hidden max-w-sm">
        <div className="p-6 bg-slate-900 text-white relative">
          <DialogHeader>
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-emerald-400 shadow-inner">
                {(person.display_name || '?')[0]?.toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <DialogTitle className="text-lg font-bold font-display text-white truncate">
                  {person.display_name}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {c ? `${person.country_code} · ${c.name}` : 'Global Atlas'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-800">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
            {MONTHS[person.birth_month - 1]} {ordinal(person.birth_day)}
            {age ? ` · Turning ${age + 1}` : ''}
          </div>

          <div className="flex flex-wrap gap-2">
            {person.x_handle && (
              <a
                href={`https://x.com/${person.x_handle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Twitter className="w-3.5 h-3.5 text-slate-500" /> {person.x_handle}
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </a>
            )}
            {person.instagram_handle && (
              <a
                href={`https://instagram.com/${person.instagram_handle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Instagram className="w-3.5 h-3.5 text-slate-500" /> {person.instagram_handle}
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </a>
            )}
          </div>

          {!person.x_handle && !person.instagram_handle && (
            <p className="text-xs text-slate-400">No social profiles attached.</p>
          )}

          {!isMe && (
            <div className="pt-2">
              {following ? (
                <Button
                  variant="outline"
                  onClick={() => { unfollow(person.id); onClose() }}
                  className="w-full py-2.5 text-xs"
                >
                  <UserMinus className="w-3.5 h-3.5 mr-1" /> Unsubscribe from reminders
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => { follow(person.id); onClose() }}
                  className="w-full py-2.5 text-xs"
                >
                  <Bookmark className="w-3.5 h-3.5 mr-1" /> Subscribe to birthday
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ===== Globe Marker Points Calculation ===== */
function buildGlobePoints(publicBirthdays, tM, tD) {
  const pts = []
  for (const b of publicBirthdays) {
    const c = COUNTRY_MAP[b.country_code]
    if (!c) continue
    const isToday = b.birth_month === tM && b.birth_day === tD
    const dU = daysUntil(b.birth_month, b.birth_day)
    const soon = dU > 0 && dU <= 7
    const jLat = ((hashCode(b.id) % 100) / 100 - 0.5) * 3
    const jLng = ((hashCode(b.id + 'x') % 100) / 100 - 0.5) * 3

    pts.push({
      lat: c.lat + jLat,
      lng: c.lng + jLng,
      // Emerald green for today and upcoming celebrations
      color: isToday ? '#10B981' : soon ? '#34D399' : '#0284C7',
      r: isToday ? 0.9 : soon ? 0.55 : 0.3,
      alt: isToday ? 0.12 : soon ? 0.05 : 0.015,
      label: `${b.display_name} · ${c.name}${isToday ? ' (Celebrating Today)' : soon ? ` (in ${dU} days)` : ''}`,
      data: b,
    })
  }
  return pts
}

function hashCode(str) {
  let h = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}
