'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { COUNTRIES, COUNTRY_MAP } from '@/lib/countries'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Globe2, Bell, LogOut, Calendar, Search, Users, UserPlus, UserMinus,
  Twitter, Instagram, MapPin, ChevronLeft, ChevronRight, Loader2, Plus, Trash2,
  CalendarDays, Clock, ArrowRight, Check, Mail, Lock, User, Share2,
  Compass, ExternalLink, ShieldCheck, Bookmark, Heart
} from 'lucide-react'

// Skeleton placeholder while 3D globe component is dynamically loaded
function GlobeSkeleton() {
  return (
    <div className="w-full h-[360px] sm:h-[460px] bg-[#F4F4F1] border border-[#E2E8F0] rounded-xl flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-dashed border-[#CBD5E1] animate-spin duration-1000" />
      <div className="absolute inset-0 skeleton-shimmer opacity-30" />
      <div className="z-10 mt-4 text-center">
        <p className="font-mono-code text-[11px] text-[#475569] uppercase tracking-wider">3D Globe</p>
        <p className="font-sans-body text-xs font-semibold text-[#0F172A] mt-0.5">Loading world map...</p>
      </div>
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
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
}
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

/* ===== Bespoke UI Primitives ===== */
function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const base = 'btn-grain transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs',
    lg: 'px-6 py-2.5 text-sm',
  }
  const variants = {
    primary: 'btn-grain-primary',
    secondary: 'btn-grain-secondary', // Botanical Emerald Green
    'green-soft': 'btn-grain-green-soft',
    outline: 'btn-grain-outline',
    ghost: 'bg-transparent text-slate-700 hover:text-black hover:bg-slate-100 shadow-none border-0 normal-case font-medium',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

function Card({ className = '', children, hover = false, ...props }) {
  return (
    <div
      className={`archival-plate ${hover ? 'archival-plate-hover cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

function Avatar({ name, size = 'w-9 h-9', text = 'text-xs' }) {
  const initial = (name || '?')[0]?.toUpperCase()
  return (
    <div
      className={`${size} shrink-0 rounded-lg bg-[#131B2E] text-white font-mono-code font-bold flex items-center justify-center border border-[#0F172A] shadow-sm ${text}`}
    >
      {initial}
    </div>
  )
}

function Badge({ children, variant = 'emerald', className = '' }) {
  const styles = {
    emerald: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
    slate: 'bg-[#F4F4F1] text-[#0F172A] border-[#CBD5E1]',
    obsidian: 'bg-[#0F172A] text-white border-[#0F172A]',
    amber: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-sans-body text-xs font-semibold ${styles[variant]} ${className}`}>
      {children}
    </span>
  )
}

/* ===== Full Page Skeleton Loader ===== */
function AppBootstrapSkeleton() {
  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col font-sans-body">
      <div className="w-full bg-[#131B2E] h-7 px-4 flex items-center justify-between border-b border-[#0F172A]">
        <Skeleton className="w-48 h-3.5 bg-slate-800" />
        <Skeleton className="w-36 h-3.5 bg-slate-800" />
      </div>
      <header className="h-16 border-b border-[#E2E8F0] px-6 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="w-36 h-4" />
            <Skeleton className="w-24 h-2.5" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-28 h-8 rounded-md" />
          <Skeleton className="w-24 h-8 rounded-md" />
        </div>
      </header>
      <div className="p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 archival-plate p-6 space-y-4">
          <Skeleton className="w-48 h-5" />
          <Skeleton className="w-full h-80" />
          <Skeleton className="w-full h-4" />
        </div>
        <div className="archival-plate p-6 space-y-4">
          <Skeleton className="w-36 h-5" />
          <Skeleton className="w-full h-16" />
          <Skeleton className="w-full h-16" />
          <Skeleton className="w-full h-16" />
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
    <div className="min-h-screen relative bg-[#FBFBFA] text-[#0F172A] font-sans-body antialiased">
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
              setProfile(prof); await refreshUserData(user.id); setScreen('app'); toast.success('Welcome to Birthday Globe!')
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

/* ===== Landing Page (Clean, Normal English) ===== */
function Landing({ publicBirthdays, onStart }) {
  const now = new Date(); const tM = now.getMonth() + 1; const tD = now.getDate()
  const points = useMemo(() => buildGlobePoints(publicBirthdays, tM, tD), [publicBirthdays, tM, tD])
  const todays = publicBirthdays.filter((b) => b.birth_month === tM && b.birth_day === tD)
  const upcoming = publicBirthdays.filter((b) => { const d = daysUntil(b.birth_month, b.birth_day); return d > 0 && d <= 7 }).length

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Status Bar */}
      <aside className="w-full bg-[#131B2E] text-[#94A3B8] border-b border-[#0F172A] px-4 py-1.5 flex items-center justify-between font-sans-body text-xs select-none z-50">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 text-[#85F8C4] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            Live Birthday Calendar
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">Tracking celebrations worldwide</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-medium text-[#85F8C4]">
          <span>{todays.length} celebrating today</span>
        </div>
      </aside>

      {/* Main Header */}
      <header className="flex justify-between items-center w-full px-4 sm:px-8 h-16 border-b border-[#E2E8F0] bg-white z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-[#0F172A] flex items-center justify-center bg-[#FBFBFA] text-[#0F172A] shadow-sm">
            <Compass className="w-5 h-5 text-[#059669]" />
          </div>
          <div>
            <div className="font-editorial text-lg font-bold text-[#0F172A] leading-tight">
              Birthday Globe
            </div>
            <div className="text-[11px] text-[#64748B]">
              Worldwide celebration calendar
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Birthdays Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
            <span>{todays.length} birthdays today</span>
          </div>

          <Button variant="outline" size="sm" onClick={onStart}>Sign In</Button>
          <Button variant="secondary" size="sm" onClick={onStart}>Get Started</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 rounded-full mb-5">
          <span className="w-2 h-2 rounded-full bg-[#059669]" />
          Worldwide Birthday Calendar • Live
        </div>

        <h1 className="font-editorial text-4xl sm:text-6xl font-normal tracking-tight text-[#0F172A] leading-[1.12]">
          Never miss a birthday.
          <span className="block text-[#059669] italic font-editorial text-3xl sm:text-5xl mt-1">
            Anywhere in the world.
          </span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-[#475569] max-w-xl mx-auto leading-relaxed">
          Add your birthday to the interactive 3D globe, follow friends across time zones, and get friendly email reminders right on time.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button variant="primary" size="lg" onClick={onStart}>
            Add your birthday <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <Button variant="secondary" size="lg" onClick={onStart}>
            Explore the globe
          </Button>
        </div>
      </section>

      {/* Main Split Viewport */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 3D Globe Plate (7 cols) */}
          <div className="lg:col-span-7 archival-plate overflow-hidden bg-white">
            <div className="h-11 border-b border-[#E2E8F0] bg-[#F4F4F1] px-4 flex items-center justify-between text-xs text-[#475569]">
              <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#059669] rounded-full inline-block" />
                Live 3D Globe
              </span>
              <span className="font-mono-code text-[11px]">{points.length} birthdays on map</span>
            </div>

            <div className="p-4 graticule-canvas">
              <GlobeView points={points} />
            </div>

            <div className="h-10 border-t border-[#E2E8F0] bg-[#F4F4F1] px-4 flex items-center justify-between text-xs text-[#64748B]">
              <span>Drag to rotate • Scroll to zoom</span>
              <span className="text-[#059669] font-medium">Green pins celebrate today</span>
            </div>
          </div>

          {/* Right Column: Today & Upcoming (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
                <div>
                  <span className="text-xs text-[#059669] font-bold uppercase tracking-wider block">
                    Today&apos;s Birthdays
                  </span>
                  <h3 className="font-editorial text-xl font-medium text-[#0F172A] mt-0.5">
                    Celebrating Today
                  </h3>
                </div>
                <Badge variant="emerald">{todays.length} today</Badge>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {todays.length === 0 && (
                  <div className="py-8 text-center text-xs text-[#94A3B8]">
                    No public birthdays today. Add yours to be the first!
                  </div>
                )}
                {todays.slice(0, 5).map((b) => {
                  const c = COUNTRY_MAP[b.country_code]
                  return (
                    <div key={b.id} className="p-3 bg-[#FBFBFA] border border-[#E2E8F0] rounded-lg flex items-center justify-between hover:border-[#0F172A] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={b.display_name} />
                        <div>
                          <p className="font-semibold text-xs text-[#0F172A]">{b.display_name}</p>
                          <p className="text-[11px] text-[#64748B]">
                            {c ? c.name : 'Worldwide'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="emerald">Birthday Today</Badge>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="p-5 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
                <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
                  Upcoming Birthdays (Next 7 Days)
                </span>
                <Badge variant="amber">{upcoming} coming up</Badge>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Receive friendly email reminders 3 days before, 1 day before, or the morning of any birthday. Never scramble for a last-minute wish.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E2E8F0] bg-[#F4F4F1] py-4 px-4 sm:px-8 text-center sm:text-left text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Birthday Globe — Never miss a birthday, anywhere on Earth.</span>
          <span>Free and open worldwide.</span>
        </div>
      </footer>
    </div>
  )
}

/* ===== Auth (Clean, Normal English) ===== */
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
      toast.error(err.message || 'Authentication error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#FBFBFA]">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-8 bg-white border border-[#CBD5E1]">
          <div className="text-center mb-6">
            <div className="w-10 h-10 rounded-lg border border-[#0F172A] flex items-center justify-center bg-[#FBFBFA] mx-auto mb-3 text-[#0F172A] shadow-sm">
              <Compass className="w-5 h-5 text-[#059669]" />
            </div>
            <h2 className="font-editorial text-2xl font-medium text-[#0F172A]">
              {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              {mode === 'signup' ? 'Join the worldwide birthday calendar' : 'Sign in to your Birthday Globe account'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-semibold text-[#475569] block mb-1">
                  Your Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  required
                  className="observatory-input"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="observatory-input"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
                className="observatory-input"
              />
            </div>

            <Button
              type="submit"
              variant={mode === 'signup' ? 'secondary' : 'primary'}
              disabled={busy}
              className="w-full py-2.5 mt-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'signup' ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
            {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
            <button
              className="font-bold text-[#059669] hover:underline"
              onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            >
              {mode === 'signup' ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

          <button
            className="mt-3 w-full text-center text-xs text-[#94A3B8] hover:text-[#0F172A]"
            onClick={onBack}
          >
            ← Back to home
          </button>
        </Card>
      </motion.div>
    </div>
  )
}

/* ===== Onboarding (Clean, Normal English) ===== */
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
      toast.error('Please enter your name, birthday and country')
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#FBFBFA]">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Card className="p-8 bg-white border border-[#CBD5E1]">
          <div className="mb-6 pb-4 border-b border-[#E2E8F0]">
            <Badge variant="emerald" className="mb-2">Profile Setup</Badge>
            <h2 className="font-editorial text-2xl font-medium text-[#0F172A]">Add Your Birthday</h2>
            <p className="text-xs text-[#64748B] mt-1">
              Put your pin on the world map so friends can celebrate you.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">Your Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="observatory-input"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-[#475569] block mb-1">Month</label>
                <Select value={month} onValueChange={(v) => { setMonth(v); setDay('') }}>
                  <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent className="bg-white border-[#CBD5E1]">
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] block mb-1">Day</label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Day" /></SelectTrigger>
                  <SelectContent className="bg-white border-[#CBD5E1] max-h-56">
                    {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] block mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Optional"
                  className="observatory-input"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">Country</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Select Country" /></SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] max-h-56">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-mono-code text-[10px] text-[#64748B] mr-2">[{c.code}]</span> {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#475569] block mb-1">X (Twitter)</label>
                <input value={x} onChange={(e) => setX(e.target.value)} placeholder="@handle" className="observatory-input" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] block mb-1">Instagram</label>
                <input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="@handle" className="observatory-input" />
              </div>
            </div>

            <div className="p-3 bg-[#F4F4F1] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-xs text-[#0F172A]">Public Birthday</p>
                <p className="text-[11px] text-[#64748B]">Show on the public globe so friends can find you</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} className="data-[state=checked]:bg-[#059669]" />
            </div>

            <Button onClick={save} variant="secondary" disabled={busy} className="w-full py-2.5 mt-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join the Globe'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

/* ===== Dashboard (Clean, Normal English) ===== */
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
    toast.success('Subscribed! You will get reminders')
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
    { v: 'globe', label: 'Globe', icon: Globe2 },
    { v: 'upcoming', label: 'Upcoming', icon: CalendarDays },
    { v: 'calendar', label: 'Calendar', icon: Calendar },
    { v: 'discover', label: 'Discover', icon: Search },
    { v: 'personal', label: 'My People', icon: Users },
    { v: 'profile', label: 'Settings', icon: User },
  ]

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col">
      {/* Top Bar */}
      <header className="flex justify-between items-center w-full px-4 sm:px-6 h-16 border-b border-[#E2E8F0] bg-white z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-[#0F172A] flex items-center justify-center bg-[#FBFBFA] text-[#0F172A] shadow-sm">
            <Compass className="w-5 h-5 text-[#059669]" />
          </div>
          <div>
            <div className="font-editorial text-base font-bold text-[#0F172A] leading-tight">
              Birthday Globe
            </div>
            <div className="text-[11px] text-[#64748B]">
              Worldwide celebration calendar
            </div>
          </div>
        </div>

        {/* Global vs Personal Mode Switch */}
        <div className="inline-flex rounded-lg border border-[#CBD5E1] bg-[#F4F4F1] p-0.5 shadow-sm text-xs">
          <button
            onClick={() => setMode('global')}
            className={`px-3 py-1 rounded-md transition-colors ${mode === 'global' ? 'bg-[#0F172A] text-white font-semibold' : 'text-[#64748B] hover:text-[#0F172A]'}`}
          >
            Global
          </button>
          <button
            onClick={() => setMode('personal')}
            className={`px-3 py-1 rounded-md transition-colors ${mode === 'personal' ? 'bg-[#0F172A] text-white font-semibold' : 'text-[#64748B] hover:text-[#0F172A]'}`}
          >
            Personal
          </button>
        </div>

        {/* Trailing Controls */}
        <div className="flex items-center gap-2">
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <button className="w-9 h-9 rounded-lg border border-[#CBD5E1] flex items-center justify-center text-[#0F172A] hover:bg-[#F4F4F1] relative transition-colors">
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#059669]" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 rounded-xl bg-white border border-[#CBD5E1] shadow-lg p-3 font-sans-body" align="end">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] mb-2 text-xs">
                <span className="font-bold text-[#0F172A]">Notifications</span>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-[#059669] hover:underline font-semibold text-[11px]">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="py-6 text-center text-xs text-[#94A3B8]">No notifications yet.</p>
                )}
                {notifications.map((n) => (
                  <div key={n.id} className={`p-2 rounded-md border text-xs ${n.read_at ? 'bg-white border-transparent' : 'bg-[#ECFDF5] border-[#A7F3D0]'}`}>
                    <p className="font-semibold text-[#0F172A]">{n.title}</p>
                    {n.body && <p className="text-[11px] text-[#64748B] mt-0.5">{n.body}</p>}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <button
            onClick={onLogout}
            title="Sign Out"
            className="w-9 h-9 rounded-lg border border-[#CBD5E1] flex items-center justify-center text-[#0F172A] hover:bg-[#F4F4F1] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tabs Navigation Bar */}
      <nav className="w-full px-4 sm:px-6 border-b border-[#E2E8F0] bg-[#F4F4F1] overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 py-1.5">
          {tabDef.map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                tab === t.v
                  ? 'bg-white text-[#0F172A] border border-[#CBD5E1] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <t.icon className={`w-3.5 h-3.5 ${tab === t.v ? 'text-[#059669]' : ''}`} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
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

      {/* Person Details Modal */}
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

/* ===== Globe Tab (Clean, Normal English) ===== */
function GlobeTab({ publicBirthdays, tM, tD, onSelect }) {
  const points = useMemo(() => buildGlobePoints(publicBirthdays, tM, tD), [publicBirthdays, tM, tD])
  const todays = publicBirthdays.filter((b) => b.birth_month === tM && b.birth_day === tD)
  const week = publicBirthdays.filter((b) => { const d = daysUntil(b.birth_month, b.birth_day); return d > 0 && d <= 7 })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 3D Globe Card (7 cols) */}
      <div className="lg:col-span-7 archival-plate overflow-hidden bg-white">
        <div className="h-11 border-b border-[#E2E8F0] bg-[#F4F4F1] px-4 flex items-center justify-between text-xs text-[#475569]">
          <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#059669] rounded-full inline-block" />
            Interactive 3D Globe
          </span>
          <span className="text-[#059669] font-semibold">{todays.length} celebrating today</span>
        </div>

        <div className="p-3 graticule-canvas relative">
          <GlobeView points={points} onPointClick={(p) => onSelect(p.data)} />
        </div>

        <div className="h-10 border-t border-[#E2E8F0] bg-[#F4F4F1] px-4 flex items-center justify-between text-xs text-[#64748B]">
          <span>Click any pin to view details</span>
          <span>Green pins celebrate today</span>
        </div>
      </div>

      {/* Right Column: Today's Celebrations (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="p-5 bg-white">
          <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0] mb-4">
            <div>
              <span className="text-xs text-[#059669] font-bold uppercase tracking-wider block">
                Today&apos;s Birthdays
              </span>
              <h2 className="font-editorial text-xl font-medium text-[#0F172A] mt-0.5">
                {MONTHS[tM - 1]} {tD}
              </h2>
            </div>
            <Badge variant="emerald">{todays.length} active</Badge>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto">
            {todays.length === 0 && (
              <div className="py-10 text-center text-xs text-[#94A3B8]">
                No public birthdays today.
              </div>
            )}
            {todays.map((b) => {
              const c = COUNTRY_MAP[b.country_code]
              return (
                <article
                  key={b.id}
                  onClick={() => onSelect(b)}
                  className="p-3 bg-[#FBFBFA] border border-[#E2E8F0] rounded-lg hover:border-[#0F172A] transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={b.display_name} />
                      <div>
                        <span className="font-semibold text-xs text-[#0F172A] group-hover:text-[#059669] transition-colors">
                          {b.display_name}
                        </span>
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          {c ? c.name : 'Worldwide'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="emerald">Birthday Today</Badge>
                  </div>
                </article>
              )
            })}
          </div>
        </Card>

        {/* Next 7 Days Summary */}
        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between text-xs text-[#64748B] mb-2.5">
            <span className="font-bold text-[#0F172A] uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              In the Next 7 Days
            </span>
            <Badge variant="amber">{week.length} upcoming</Badge>
          </div>
          <div className="space-y-1.5">
            {week.slice(0, 3).map((w, i) => (
              <div key={i} className="p-2 bg-[#F4F4F1] border border-[#E2E8F0] rounded-md flex items-center justify-between text-xs">
                <span className="font-medium text-[#0F172A]">{w.display_name}</span>
                <span className="text-[#059669] font-bold">in {daysUntil(w.birth_month, w.birth_day)} days</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ===== Upcoming Tab (Clean, Normal English) ===== */
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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 border-b border-[#E2E8F0]">
        <div>
          <span className="text-xs text-[#059669] font-bold uppercase tracking-wider block">
            Upcoming Birthdays
          </span>
          <h2 className="font-editorial text-2xl font-medium text-[#0F172A] mt-0.5">
            Next 7 Days ({upcoming.length})
          </h2>
        </div>
        <span className="text-xs text-[#64748B]">Showing: {mode === 'global' ? 'Global' : 'Personal'}</span>
      </div>

      {upcoming.length === 0 && (
        <Card className="p-16 text-center bg-white">
          <CalendarDays className="w-8 h-8 mx-auto text-[#94A3B8] mb-2" />
          <p className="font-editorial text-lg text-[#0F172A]">No birthdays in the next 7 days</p>
          <p className="text-xs text-[#64748B] mt-1">
            Add private birthdays under &ldquo;My People&rdquo; or follow someone in Discover.
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
                className="p-4 bg-white"
                hover={clickable}
                onClick={() => clickable && onSelect(e)}
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
                  <span className="font-mono-code text-xs font-bold text-[#64748B]">
                    {MONTH_ABBR[e.birth_month - 1]} {e.birth_day}
                  </span>
                  <Badge variant={e.days === 0 ? 'emerald' : 'slate'}>
                    {untilLabel(e.days)}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar name={e.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-[#0F172A] truncate">{e.name}</p>
                    <p className="text-xs text-[#64748B] mt-0.5 truncate">
                      {e.source === 'personal'
                        ? e.relationship || 'Private'
                        : c
                        ? c.name
                        : 'Friend'}
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

/* ===== Calendar Tab (Clean, Normal English) ===== */
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
        map[e.birth_day] = map[e.birth_day] || []
        map[e.birth_day].push(e)
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
      <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-5">
        <div>
          <span className="text-xs text-[#059669] font-bold uppercase tracking-wider block">
            Calendar View
          </span>
          <h2 className="font-editorial text-2xl font-medium text-[#0F172A] mt-0.5">
            {MONTHS[viewMonth - 1]} 2025
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Button variant="outline" size="sm" onClick={() => setViewMonth((m) => (m === 1 ? 12 : m - 1))}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMonth((m) => (m === 12 ? 1 : m + 1))}>
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-xs font-semibold text-[#64748B]">
        {DOW.map((d) => (
          <div key={d} className="py-1 bg-[#F4F4F1] rounded">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[86px] bg-[#FBFBFA] border border-transparent rounded" />
          const list = byDay[d] || []
          const isToday = viewMonth === tM && d === tD

          return (
            <div
              key={i}
              className={`min-h-[86px] p-2 rounded-lg border transition-colors ${
                isToday
                  ? 'bg-[#ECFDF5] border-[#059669] shadow-sm'
                  : 'bg-white border-[#E2E8F0] hover:border-[#0F172A]'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${isToday ? 'text-[#059669]' : 'text-[#0F172A]'}`}>
                  {d}
                </span>
                {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />}
              </div>

              <div className="space-y-1 mt-1.5">
                {list.slice(0, 2).map((e, idx) => (
                  <button
                    key={idx}
                    onClick={() => (e.source === 'public' || e.source === 'subscribed') && onSelect(e)}
                    className="w-full truncate text-left text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#F4F4F1] hover:bg-[#059669] hover:text-white text-[#0F172A] transition-colors block"
                  >
                    {e.name}
                  </button>
                ))}
                {list.length > 2 && (
                  <span className="text-[10px] text-[#64748B] block">
                    +{list.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ===== Discover Tab (Clean, Normal English) ===== */
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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 border-b border-[#E2E8F0]">
        <div>
          <span className="text-xs text-[#059669] font-bold uppercase tracking-wider block">
            Discover
          </span>
          <h2 className="font-editorial text-2xl font-medium text-[#0F172A] mt-0.5">
            Find Friends to Follow
          </h2>
        </div>
        <span className="text-xs text-[#64748B]">Public birthdays worldwide</span>
      </div>

      <div className="relative max-w-md">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search(q)}
          placeholder="Search by name or country..."
          className="observatory-input pr-10"
        />
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
      </div>

      {busy && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 bg-white border border-[#E2E8F0] rounded-lg space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg skeleton-shimmer" />
                <div className="space-y-1 flex-1">
                  <div className="h-3.5 w-28 skeleton-shimmer" />
                  <div className="h-2.5 w-20 skeleton-shimmer" />
                </div>
              </div>
            </div>
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
                <Card className="p-4 bg-white" hover>
                  <div className="flex items-center justify-between">
                    <button onClick={() => onSelect(b)} className="flex items-center gap-3 text-left flex-1 min-w-0">
                      <Avatar name={b.display_name} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-[#0F172A] truncate">{b.display_name}</p>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {MONTH_ABBR[b.birth_month - 1]} {b.birth_day} · {c ? c.name : 'Worldwide'}
                        </p>
                      </div>
                    </button>
                    {following ? (
                      <Button variant="outline" size="sm" onClick={() => unfollow(b.id)}>
                        Unfollow
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => follow(b.id)}>
                        Follow
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}

/* ===== Personal Tab (Clean, Normal English) ===== */
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
      toast.error('Name, month, and day are required')
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
    setName(''); setMonth(''); setDay(''); setYear(''); setRel('')
    toast.success('Private birthday added')
    reload()
  }

  async function remove(id) {
    await supabase.from('personal_birthdays').delete().eq('id', id)
    toast.success('Birthday removed')
    reload()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add private record */}
      <Card className="p-6 bg-white">
        <div className="pb-3 border-b border-[#E2E8F0] mb-4">
          <span className="text-xs text-[#059669] font-bold uppercase tracking-wider block">
            Private Birthdays
          </span>
          <h3 className="font-editorial text-xl font-medium text-[#0F172A] mt-0.5">
            Add a Private Birthday
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Only you can see these birthdays. Great for family, friends, or anyone not on the app.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#475569] block mb-1">Person&apos;s Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Chen"
              className="observatory-input"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">Month</label>
              <Select value={month} onValueChange={(v) => { setMonth(v); setDay('') }}>
                <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1]">
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">Day</label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] max-h-56">
                  {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Optional"
                className="observatory-input"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#475569] block mb-1">Relationship (Optional)</label>
            <Select value={rel} onValueChange={setRel}>
              <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Select Relationship" /></SelectTrigger>
              <SelectContent className="bg-white border-[#CBD5E1]">
                {['Family','Friend','Partner','Colleague','Other'].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={add} variant="secondary" disabled={busy} className="w-full py-2.5 mt-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Birthday'}
          </Button>
        </div>
      </Card>

      {/* Right Column: Private Records List */}
      <div className="space-y-6">
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
            <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
              Private Birthdays ({personal.length})
            </span>
            <Badge variant="slate">Only visible to you</Badge>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {personal.length === 0 && (
              <p className="py-6 text-center text-xs text-[#94A3B8]">No private birthdays added yet.</p>
            )}
            {personal.map((p) => (
              <div key={p.id} className="p-2.5 bg-[#FBFBFA] border border-[#E2E8F0] rounded-lg flex items-center justify-between hover:border-[#0F172A] transition-colors">
                <div className="flex items-center gap-2.5">
                  <Avatar name={p.person_name} />
                  <div>
                    <p className="font-semibold text-xs text-[#0F172A]">{p.person_name}</p>
                    <p className="text-xs text-[#64748B]">
                      {MONTH_ABBR[p.birth_month - 1]} {p.birth_day} · {p.relationship || 'General'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => remove(p.id)}
                  className="p-1 text-[#94A3B8] hover:text-red-600 transition-colors"
                  title="Remove birthday"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
            <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
              Following ({subscribed.length})
            </span>
            <Badge variant="emerald">Active Reminders</Badge>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {subscribed.length === 0 && (
              <p className="py-6 text-center text-xs text-[#94A3B8]">You haven&apos;t followed anyone yet.</p>
            )}
            {subscribed.map((b) => (
              <div key={b.id} className="p-2.5 bg-[#FBFBFA] border border-[#E2E8F0] rounded-lg flex items-center justify-between hover:border-[#0F172A] transition-colors">
                <button onClick={() => onSelect(b)} className="flex items-center gap-2.5 text-left flex-1 min-w-0">
                  <Avatar name={b.display_name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-[#0F172A] truncate">{b.display_name}</p>
                    <p className="text-xs text-[#64748B]">
                      {MONTH_ABBR[b.birth_month - 1]} {b.birth_day}
                    </p>
                  </div>
                </button>
                <Button variant="outline" size="sm" onClick={() => unfollow(b.id)}>
                  Unfollow
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ===== Profile / Settings Tab (Clean, Normal English) ===== */
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
    toast.success('Settings saved')
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
      if (!res.ok) throw new Error(j.error || 'Failed to send test reminder')
      toast.success(`Test email sent to ${j.to}`)
    } catch (e) {
      toast.error(e.message || 'Could not send test')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card className="p-6 bg-white">
        <div className="flex items-center gap-3.5 pb-4 border-b border-[#E2E8F0] mb-5">
          <Avatar name={name || user.email} size="w-12 h-12" text="text-base" />
          <div>
            <h2 className="font-editorial text-xl font-medium text-[#0F172A]">{name || 'Your Account'}</h2>
            <p className="text-xs text-[#64748B]">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#475569] block mb-1">Display Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="observatory-input" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">Month</label>
              <Select value={month} onValueChange={(v) => { setMonth(v); setDay('') }}>
                <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1]">
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">Day</label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] max-h-56">
                  {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">Year</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Optional" className="observatory-input" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#475569] block mb-1">Country</label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Select Country" /></SelectTrigger>
              <SelectContent className="bg-white border-[#CBD5E1] max-h-56">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="font-mono-code text-[10px] text-[#64748B] mr-2">[{c.code}]</span> {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">X (Twitter)</label>
              <input value={x} onChange={(e) => setX(e.target.value)} placeholder="@handle" className="observatory-input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">Instagram</label>
              <input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="@handle" className="observatory-input" />
            </div>
          </div>

          <Button onClick={save} variant="primary" disabled={busy} className="w-full py-2.5 mt-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Settings'}
          </Button>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-6 bg-white space-y-3">
          <div className="pb-3 border-b border-[#E2E8F0]">
            <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider block">
              Privacy Settings
            </span>
          </div>
          <div className="p-3 bg-[#F4F4F1] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
            <div>
              <p className="font-semibold text-xs text-[#0F172A]">Show on Public Globe</p>
              <p className="text-[11px] text-[#64748B]">Visible to friends and visitors worldwide</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} className="data-[state=checked]:bg-[#059669]" />
          </div>
          <div className="p-3 bg-[#F4F4F1] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
            <div>
              <p className="font-semibold text-xs text-[#0F172A]">Show Birth Year (Age)</p>
              <p className="text-[11px] text-[#64748B]">Turn off to keep your age private</p>
            </div>
            <Switch checked={yearPublic} onCheckedChange={setYearPublic} disabled={!year} className="data-[state=checked]:bg-[#059669]" />
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <span className="text-xs text-[#0F172A] font-bold uppercase tracking-wider">
              Email Reminders
            </span>
            <Switch checked={reminders} onCheckedChange={setReminders} className="data-[state=checked]:bg-[#059669]" />
          </div>

          <p className="text-xs text-[#64748B] mt-3 mb-4">
            When should we email you before a birthday?
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { o: 3, l: '3 days before' },
              { o: 1, l: '1 day before' },
              { o: 0, l: 'Morning of' },
            ].map(({ o, l }) => {
              const on = offsets.includes(o)
              return (
                <button
                  key={o}
                  type="button"
                  disabled={!reminders}
                  onClick={() => toggleOffset(o)}
                  className={`btn-grain px-3 py-1.5 text-xs rounded-md transition-all disabled:opacity-40 normal-case font-medium ${
                    on ? 'btn-grain-secondary' : 'btn-grain-outline'
                  }`}
                >
                  {on && <Check className="w-3 h-3 mr-1" />}
                  {l}
                </button>
              )
            })}
          </div>

          <div className="mt-5 pt-3 border-t border-[#E2E8F0]">
            <Button onClick={testReminder} variant="outline" size="sm" disabled={testing} className="w-full">
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send me a test email'}
            </Button>
            <p className="text-[11px] text-[#94A3B8] text-center mt-2">
              Sends an immediate preview email for your nearest birthday.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ===== Person Details Dialog (Clean, Normal English) ===== */
function PersonDialog({ person, onClose, followedIds, follow, unfollow, meId }) {
  if (!person) return null
  const c = COUNTRY_MAP[person.country_code]
  const following = followedIds.includes(person.id)
  const isMe = person.id === meId
  const age = person.birth_year && person.birth_year_public ? new Date().getFullYear() - person.birth_year : null

  return (
    <Dialog open={!!person} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-xl bg-white border border-[#CBD5E1] shadow-2xl p-0 overflow-hidden max-w-sm font-sans-body">
        <div className="p-5 bg-[#0F172A] text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center font-mono-code text-lg font-bold text-[#10B981]">
                {(person.display_name || '?')[0]?.toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <DialogTitle className="font-editorial text-lg font-medium text-white truncate">
                  {person.display_name}
                </DialogTitle>
                <DialogDescription className="text-[#94A3B8] text-xs mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#10B981]" />
                  {c ? c.name : 'Worldwide'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg">
            <span className="text-xs text-[#065F46] font-bold uppercase block">
              Birthday
            </span>
            <p className="font-editorial text-base text-[#065F46] font-medium mt-0.5">
              {MONTHS[person.birth_month - 1]} {ordinal(person.birth_day)}
              {age ? ` • Turning ${age + 1}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {person.x_handle && (
              <a
                href={`https://x.com/${person.x_handle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs inline-flex items-center gap-1.5 bg-[#F4F4F1] border border-[#CBD5E1] px-3 py-1.5 rounded-md text-[#0F172A] hover:bg-[#E2E8F0]"
              >
                <Twitter className="w-3.5 h-3.5 text-slate-500" /> {person.x_handle}
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
            {person.instagram_handle && (
              <a
                href={`https://instagram.com/${person.instagram_handle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs inline-flex items-center gap-1.5 bg-[#F4F4F1] border border-[#CBD5E1] px-3 py-1.5 rounded-md text-[#0F172A] hover:bg-[#E2E8F0]"
              >
                <Instagram className="w-3.5 h-3.5 text-slate-500" /> {person.instagram_handle}
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
          </div>

          {!isMe && (
            <div className="pt-2">
              {following ? (
                <Button variant="outline" size="sm" onClick={() => { unfollow(person.id); onClose() }} className="w-full">
                  Unfollow
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => { follow(person.id); onClose() }} className="w-full">
                  Follow for reminders
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
      color: isToday ? '#059669' : soon ? '#10B981' : '#64748B',
      r: isToday ? 0.95 : soon ? 0.6 : 0.32,
      alt: isToday ? 0.14 : soon ? 0.06 : 0.015,
      label: `${b.display_name} • ${c.name}${isToday ? ' (Celebrating Today)' : soon ? ` (in ${dU} days)` : ''}`,
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
