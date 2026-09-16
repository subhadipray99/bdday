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
  Compass, ExternalLink, SlidersHorizontal, ShieldCheck, Bookmark,
  Navigation, Crosshair, Radio, Activity, Eye, EyeOff
} from 'lucide-react'

// Skeleton placeholder while 3D globe component is dynamically loaded
function GlobeSkeleton() {
  return (
    <div className="w-full h-[360px] sm:h-[460px] bg-[#F4F4F1] border border-[#E2E8F0] rounded flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full border border-dashed border-[#CBD5E1] animate-spin duration-1000" />
      <div className="absolute inset-0 skeleton-shimmer opacity-30" />
      <div className="z-10 mt-4 text-center">
        <p className="font-mono-code text-[10px] text-[#475569] uppercase tracking-widest">WGS-84 GEODETIC ENGINE</p>
        <p className="font-mono-code text-xs font-semibold text-[#0F172A] mt-1">INITIALIZING CARTOGRAPHIC ATLAS</p>
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
function untilLabel(n) { return n === 0 ? 'TODAY' : n === 1 ? 'TOMORROW' : `IN ${n} DAYS` }
function getDayOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now - start
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

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
    sm: 'px-2.5 py-1 text-[11px]',
    md: 'px-4 py-2 text-xs',
    lg: 'px-5 py-2.5 text-xs tracking-wider',
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
      className={`${size} shrink-0 rounded bg-[#131B2E] text-white font-mono-code font-bold flex items-center justify-center border border-[#0F172A] shadow-sm ${text}`}
    >
      {initial}
    </div>
  )
}

function IsoTag({ code, label, className = '' }) {
  return (
    <span className={`inline-flex items-center font-mono-code text-[10px] bg-[#F4F4F1] text-[#0F172A] border border-[#CBD5E1] px-1.5 py-0.5 rounded tracking-wider uppercase ${className}`}>
      [{code || 'GL'}] {label || ''}
    </span>
  )
}

function MilestoneBadge({ children, variant = 'emerald', className = '' }) {
  const styles = {
    emerald: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
    slate: 'bg-[#F4F4F1] text-[#0F172A] border-[#CBD5E1]',
    obsidian: 'bg-[#0F172A] text-white border-[#0F172A]',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono-code text-[10px] font-bold tracking-wider uppercase ${styles[variant]} ${className}`}>
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
          <Skeleton className="w-8 h-8 rounded" />
          <div className="space-y-1">
            <Skeleton className="w-40 h-4" />
            <Skeleton className="w-24 h-2.5" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-32 h-8 rounded" />
          <Skeleton className="w-24 h-8 rounded" />
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
              setProfile(prof); await refreshUserData(user.id); setScreen('app'); toast.success('Observatory coordinates calibrated')
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

/* ===== Landing Page (Cartographic Observatory Theme) ===== */
function Landing({ publicBirthdays, onStart }) {
  const now = new Date(); const tM = now.getMonth() + 1; const tD = now.getDate()
  const dayOfYear = getDayOfYear()
  const points = useMemo(() => buildGlobePoints(publicBirthdays, tM, tD), [publicBirthdays, tM, tD])
  const todays = publicBirthdays.filter((b) => b.birth_month === tM && b.birth_day === tD)
  const upcoming = publicBirthdays.filter((b) => { const d = daysUntil(b.birth_month, b.birth_day); return d > 0 && d <= 7 }).length

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Running Observatory Telemetry Bar */}
      <aside aria-label="Geodetic Telemetry" className="w-full bg-[#131B2E] text-[#94A3B8] border-b border-[#0F172A] px-4 py-1 flex items-center justify-between font-mono-code text-[10px] tracking-wider uppercase select-none z-50">
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 text-[#85F8C4] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#85F8C4] animate-ping" />
            WGS-84 GEODETIC DATUM
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-[#A7F3D0]">UTC LIVE SYNCHRONIZED</span>
          <span className="text-slate-600">/</span>
          <span className="hidden sm:inline text-slate-300">SOLAR SUBPOINT CALIBRATED</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[#85F8C4] font-semibold">ANNUAL CYCLE: DAY {dayOfYear}/365</span>
        </div>
      </aside>

      {/* Cartographic Header */}
      <header className="flex justify-between items-center w-full px-4 sm:px-8 h-16 border-b border-[#E2E8F0] bg-white z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-[#0F172A] flex items-center justify-center bg-[#FBFBFA] text-[#0F172A] shadow-sm">
            <Compass className="w-4 h-4 text-[#059669]" />
          </div>
          <div>
            <div className="font-editorial text-lg font-semibold tracking-tight text-[#0F172A] leading-tight">
              EPHEMERIS // OBSERVATORY
            </div>
            <div className="font-mono-code text-[9px] text-[#64748B] tracking-wider uppercase">
              CARTOGRAPHIC TEMPORAL ATLAS
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Global Celebrants Pill Ticker */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] font-mono-code text-[11px]">
            <span className="relative flex h-2 w-2">
              <span className="radar-beacon absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]" />
            </span>
            <span className="font-bold tracking-wider">{todays.length} CELEBRATIONS TODAY</span>
          </div>

          <Button variant="outline" size="sm" onClick={onStart}>SIGN IN</Button>
          <Button variant="secondary" size="sm" onClick={onStart}>LOG CELEBRATION</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 text-center">
        <div className="inline-flex items-center gap-2 font-mono-code text-[11px] text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 rounded mb-5 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
          GLOBAL TEMPORAL ATLAS // WGS-84 CALIBRATED
        </div>

        <h1 className="font-editorial text-4xl sm:text-6xl font-normal tracking-tight text-[#0F172A] leading-[1.12]">
          Global Birthday Atlas.
          <span className="block text-[#059669] italic font-editorial text-3xl sm:text-5xl mt-1">
            An Ephemeris for Human Milestones.
          </span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-[#475569] max-w-2xl mx-auto leading-relaxed font-sans-body">
          Treat birthdays as planetary phenomena. Pin coordinates to an illuminated daylight globe, observe solar returns across international meridians, and dispatch precision reminders before every milestone.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button variant="primary" size="lg" onClick={onStart}>
            RECORD SOLAR RETURN <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
          <Button variant="secondary" size="lg" onClick={onStart}>
            EXPLORE OBSERVATORY
          </Button>
        </div>
      </section>

      {/* Main Split Viewport */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Daylight Atlas Plate (7 cols) */}
          <div className="lg:col-span-7 archival-plate overflow-hidden bg-white">
            <div className="h-10 border-b border-[#E2E8F0] bg-[#F4F4F1] px-4 flex items-center justify-between font-mono-code text-[10px] text-[#475569]">
              <span className="font-semibold text-[#0F172A] flex items-center gap-1.5 uppercase">
                <span className="w-1.5 h-1.5 bg-[#059669] inline-block" />
                DAYLIGHT WGS-84 HORIZON
              </span>
              <span>{points.length} MAPPED COORDINATES</span>
            </div>

            <div className="p-4 graticule-canvas">
              <GlobeView points={points} />
            </div>

            <div className="h-10 border-t border-[#E2E8F0] bg-[#F4F4F1] px-4 flex items-center justify-between font-mono-code text-[10px] text-[#475569]">
              <span>DRAG TO ROTATE PLANETARY PROJECTION</span>
              <span className="text-[#059669] font-semibold">BOTANICAL PINS ACTIVE</span>
            </div>
          </div>

          {/* Right Column: Ephemeris Dossier (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
                <div>
                  <span className="font-mono-code text-[10px] text-[#059669] font-bold uppercase tracking-wider block">
                    DAILY EPHEMERIS DOSSIER
                  </span>
                  <h3 className="font-editorial text-xl font-medium text-[#0F172A] mt-0.5">
                    {todays.length} Active Solar Returns
                  </h3>
                </div>
                <MilestoneBadge variant="emerald">LIVE</MilestoneBadge>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {todays.length === 0 && (
                  <div className="py-8 text-center font-mono-code text-xs text-[#94A3B8]">
                    No active solar transits today.
                  </div>
                )}
                {todays.slice(0, 5).map((b) => {
                  const c = COUNTRY_MAP[b.country_code]
                  return (
                    <div key={b.id} className="p-3 bg-[#FBFBFA] border border-[#E2E8F0] rounded flex items-center justify-between hover:border-[#0F172A] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={b.display_name} />
                        <div>
                          <p className="font-semibold text-xs text-[#0F172A]">{b.display_name}</p>
                          <p className="font-mono-code text-[10px] text-[#64748B]">
                            [{b.country_code || 'GL'}] {c ? c.name : 'Earth'}
                          </p>
                        </div>
                      </div>
                      <MilestoneBadge variant="emerald">ACTIVE</MilestoneBadge>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="p-5 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
                <span className="font-mono-code text-[10px] text-[#0F172A] font-bold uppercase tracking-wider">
                  HORIZON MILESTONES (NEXT 7 DAYS)
                </span>
                <span className="font-mono-code text-[10px] text-[#64748B]">{upcoming} QUEUED</span>
              </div>
              <p className="text-xs text-[#64748B]">
                Precision email notifications dispatch automatically 3 days, 1 day, or the morning of each celestial transit.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Cartographic Footer */}
      <footer className="mt-auto border-t border-[#E2E8F0] bg-[#F4F4F1] py-4 px-4 sm:px-8 text-center sm:text-left text-[11px] font-mono-code text-[#64748B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>EPHEMERIS OBSERVATORY // ISO 8601 TEMPORAL STANDARDS // WGS-84 CALIBRATED</span>
          <span>CELESTIAL TRANSITS PRESERVED</span>
        </div>
      </footer>
    </div>
  )
}

/* ===== Auth (Archival Registry Form) ===== */
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
            toast.info('Account created. Check your inbox to confirm, then sign in.')
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
            <div className="w-10 h-10 rounded border border-[#0F172A] flex items-center justify-center bg-[#FBFBFA] mx-auto mb-3 text-[#0F172A] shadow-sm">
              <Compass className="w-5 h-5 text-[#059669]" />
            </div>
            <h2 className="font-editorial text-2xl font-medium text-[#0F172A]">
              {mode === 'signup' ? 'Observatory Enlistment' : 'Observatory Authorization'}
            </h2>
            <p className="font-mono-code text-[11px] text-[#64748B] mt-1 uppercase">
              {mode === 'signup' ? 'REGISTER RECORD IN GLOBAL DIRECTORY' : 'ENTER ACCESS CREDENTIALS'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase tracking-wider block mb-1">
                  CELEBRANT NAME
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Legal or Display Name"
                  required
                  className="observatory-input"
                />
              </div>
            )}

            <div>
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase tracking-wider block mb-1">
                TELEMETRY EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@domain.com"
                required
                className="observatory-input"
              />
            </div>

            <div>
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase tracking-wider block mb-1">
                SECURITY PASSPHRASE
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
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
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'signup' ? 'CONFIRM ENLISTMENT' : 'AUTHORIZE SESSION'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E2E8F0] text-center font-mono-code text-xs text-[#64748B]">
            {mode === 'signup' ? 'Existing operator? ' : 'Unregistered? '}
            <button
              className="font-bold text-[#059669] hover:underline"
              onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            >
              {mode === 'signup' ? 'SIGN IN' : 'ENLIST NEW'}
            </button>
          </div>

          <button
            className="mt-3 w-full text-center font-mono-code text-[11px] text-[#94A3B8] hover:text-[#0F172A]"
            onClick={onBack}
          >
            ← RETURN TO OBSERVATORY ATLAS
          </button>
        </Card>
      </motion.div>
    </div>
  )
}

/* ===== Onboarding ===== */
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
      toast.error('Name, date, and country coordinates are required')
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
            <MilestoneBadge variant="emerald" className="mb-2">PROFILE CALIBRATION</MilestoneBadge>
            <h2 className="font-editorial text-2xl font-medium text-[#0F172A]">Record Solar Coordinates</h2>
            <p className="font-mono-code text-[11px] text-[#64748B] mt-1 uppercase">ESTABLISH YOUR ORBITAL ANNIVERSARY</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Display Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="observatory-input"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Month</label>
                <Select value={month} onValueChange={(v) => { setMonth(v); setDay('') }}>
                  <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent className="bg-white border-[#CBD5E1]">
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Day</label>
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
                <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Year</label>
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
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Geographic Location</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Select ISO Location" /></SelectTrigger>
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
                <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">X Handle</label>
                <input value={x} onChange={(e) => setX(e.target.value)} placeholder="@handle" className="observatory-input" />
              </div>
              <div>
                <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Instagram</label>
                <input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="@handle" className="observatory-input" />
              </div>
            </div>

            <div className="p-3 bg-[#F4F4F1] border border-[#E2E8F0] rounded flex items-center justify-between">
              <div>
                <p className="font-semibold text-xs text-[#0F172A]">Public Cartographic Beacon</p>
                <p className="font-mono-code text-[10px] text-[#64748B]">Pins your solar return to the global 3D atlas</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} className="data-[state=checked]:bg-[#059669]" />
            </div>

            <Button onClick={save} variant="secondary" disabled={busy} className="w-full py-2.5 mt-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ENTER INTO ATLAS RECORD'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

/* ===== Dashboard ===== */
function Dashboard({ user, profile, setProfile, publicBirthdays, followedIds, personal, notifications, reload, onLogout }) {
  const [tab, setTab] = useState('globe')
  const [mode, setMode] = useState('global')
  const [selected, setSelected] = useState(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const unread = notifications.filter((n) => !n.read_at).length
  const now = new Date(); const tM = now.getMonth() + 1; const tD = now.getDate()
  const dayOfYear = getDayOfYear()

  async function follow(id) {
    if (id === user.id) { toast.info('That is your own profile'); return }
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, followed_id: id })
    if (error) { toast.error(error.message); return }
    toast.success('Subscribed to solar returns')
    reload()
  }

  async function unfollow(id) {
    const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('followed_id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Unsubscribed from profile')
    reload()
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', user.id).is('read_at', null)
    reload()
  }

  const tabDef = [
    { v: 'globe', label: 'Atlas Viewport', icon: Globe2 },
    { v: 'upcoming', label: 'Ephemeris Feed', icon: CalendarDays },
    { v: 'calendar', label: 'Solar Circles', icon: Calendar },
    { v: 'discover', label: 'Discovery Reticle', icon: Search },
    { v: 'personal', label: 'Sovereign Circles', icon: Users },
    { v: 'profile', label: 'Observatory Log', icon: User },
  ]

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col">
      {/* Geodetic Telemetry Bar */}
      <aside aria-label="Geodetic Telemetry" className="w-full bg-[#131B2E] text-[#94A3B8] border-b border-[#0F172A] px-4 py-1 flex items-center justify-between font-mono-code text-[10px] tracking-wider uppercase select-none z-50">
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 text-[#85F8C4] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#85F8C4] animate-ping" />
            OBSERVATORY ACTIVE
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-[#A7F3D0]">UTC LIVE</span>
          <span className="text-slate-600">/</span>
          <span className="hidden sm:inline">DAY {dayOfYear} OF 365</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-mono-code text-[10px]">{user?.email}</span>
        </div>
      </aside>

      {/* Main Observatory Navigation */}
      <header className="flex justify-between items-center w-full px-4 sm:px-6 h-16 border-b border-[#E2E8F0] bg-white z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-[#0F172A] flex items-center justify-center bg-[#FBFBFA] text-[#0F172A] shadow-sm">
            <Compass className="w-4 h-4 text-[#059669]" />
          </div>
          <div>
            <div className="font-editorial text-base font-semibold tracking-tight text-[#0F172A] leading-tight">
              EPHEMERIS // OBSERVATORY
            </div>
            <div className="font-mono-code text-[9px] text-[#64748B] tracking-wider uppercase">
              CARTOGRAPHIC DISPATCH
            </div>
          </div>
        </div>

        {/* Global vs Sovereign Circles Mode Pill */}
        <div className="inline-flex rounded border border-[#CBD5E1] bg-[#F4F4F1] p-0.5 shadow-sm font-mono-code text-[11px]">
          <button
            onClick={() => setMode('global')}
            className={`px-3 py-1 rounded transition-colors ${mode === 'global' ? 'bg-[#0F172A] text-white font-semibold' : 'text-[#64748B] hover:text-[#0F172A]'}`}
          >
            GLOBAL ATLAS
          </button>
          <button
            onClick={() => setMode('personal')}
            className={`px-3 py-1 rounded transition-colors ${mode === 'personal' ? 'bg-[#0F172A] text-white font-semibold' : 'text-[#64748B] hover:text-[#0F172A]'}`}
          >
            SOVEREIGN CIRCLES
          </button>
        </div>

        {/* Trailing Controls */}
        <div className="flex items-center gap-2">
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <button className="w-8 h-8 rounded border border-[#CBD5E1] flex items-center justify-center text-[#0F172A] hover:bg-[#F4F4F1] relative transition-colors">
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#059669]" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 rounded bg-white border border-[#CBD5E1] shadow-lg p-3 font-sans-body" align="end">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] mb-2 font-mono-code text-xs">
                <span className="font-bold text-[#0F172A]">TELEMETRY NOTIFICATIONS</span>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-[#059669] hover:underline font-semibold text-[10px]">
                    CLEAR UNREAD
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="py-6 text-center font-mono-code text-xs text-[#94A3B8]">No incoming alerts.</p>
                )}
                {notifications.map((n) => (
                  <div key={n.id} className={`p-2 rounded border text-xs ${n.read_at ? 'bg-white border-transparent' : 'bg-[#ECFDF5] border-[#A7F3D0]'}`}>
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
            className="w-8 h-8 rounded border border-[#CBD5E1] flex items-center justify-center text-[#0F172A] hover:bg-[#F4F4F1] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Cartographic Tab Navigation Bar */}
      <nav className="w-full px-4 sm:px-6 border-b border-[#E2E8F0] bg-[#F4F4F1] overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 py-1">
          {tabDef.map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono-code text-[11px] uppercase tracking-wider rounded transition-all whitespace-nowrap ${
                tab === t.v
                  ? 'bg-white text-[#0F172A] font-bold border border-[#CBD5E1] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <t.icon className={`w-3.5 h-3.5 ${tab === t.v ? 'text-[#059669]' : ''}`} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Viewport Content */}
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

      {/* Person Dossier Modal */}
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

/* ===== Globe Tab (Cartographic Observatory Split Layout) ===== */
function GlobeTab({ publicBirthdays, tM, tD, onSelect }) {
  const points = useMemo(() => buildGlobePoints(publicBirthdays, tM, tD), [publicBirthdays, tM, tD])
  const todays = publicBirthdays.filter((b) => b.birth_month === tM && b.birth_day === tD)
  const week = publicBirthdays.filter((b) => { const d = daysUntil(b.birth_month, b.birth_day); return d > 0 && d <= 7 })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 3D Atlas Viewport (7 cols) */}
      <div className="lg:col-span-7 archival-plate overflow-hidden bg-white">
        <div className="h-11 border-b border-[#E2E8F0] bg-[#F4F4F1] px-4 flex items-center justify-between font-mono-code text-[10px] text-[#475569]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#0F172A] uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#059669] inline-block" />
              WGS-84 DAYLIGHT HORIZON
            </span>
          </div>
          <span className="text-[#059669] font-semibold">{todays.length} ACTIVE TRANSITS</span>
        </div>

        <div className="p-3 graticule-canvas relative">
          <GlobeView points={points} onPointClick={(p) => onSelect(p.data)} />
        </div>

        <div className="h-10 border-t border-[#E2E8F0] bg-[#F4F4F1] px-4 flex items-center justify-between font-mono-code text-[10px] text-[#64748B]">
          <span>CLICK LOCATION PIN FOR DOSSIER</span>
          <span>BOTANICAL RADAR sweep active</span>
        </div>
      </div>

      {/* Daily Ephemeris Dossier (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="p-5 bg-white">
          <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0] mb-4">
            <div>
              <span className="font-mono-code text-[10px] text-[#059669] font-bold uppercase tracking-wider block">
                DAILY EPHEMERIS DOSSIER
              </span>
              <h2 className="font-editorial text-xl font-medium text-[#0F172A] mt-0.5">
                {MONTHS[tM - 1]} {tD} Celebrations
              </h2>
            </div>
            <MilestoneBadge variant="emerald">{todays.length} ACTIVE</MilestoneBadge>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto">
            {todays.length === 0 && (
              <div className="py-12 text-center font-mono-code text-xs text-[#94A3B8]">
                No public solar transits currently in meridian.
              </div>
            )}
            {todays.map((b) => {
              const c = COUNTRY_MAP[b.country_code]
              return (
                <article
                  key={b.id}
                  onClick={() => onSelect(b)}
                  className="p-3.5 bg-[#FBFBFA] border border-[#E2E8F0] rounded hover:border-[#0F172A] transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={b.display_name} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-[#0F172A] group-hover:text-[#059669] transition-colors">
                            {b.display_name}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                        </div>
                        <p className="font-mono-code text-[10px] text-[#64748B] mt-0.5">
                          [{b.country_code || 'GL'}] {c ? c.name : 'Global'}
                        </p>
                      </div>
                    </div>
                    <MilestoneBadge variant="emerald">SOLAR RETURN</MilestoneBadge>
                  </div>

                  {/* Solar day transit indicator bar */}
                  <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex items-center justify-between font-mono-code text-[10px] text-[#64748B]">
                    <span>SOLAR TRANSIT IN PROGRESS</span>
                    <span className="text-[#059669] font-bold">ACTIVE NOW →</span>
                  </div>
                </article>
              )
            })}
          </div>
        </Card>

        {/* Incoming Telemetry Feeds Skeleton (demonstrating real-time streaming) */}
        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between font-mono-code text-[10px] text-[#64748B] mb-2.5">
            <span className="font-bold text-[#0F172A] uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-ping" />
              UPCOMING HORIZON (NEXT 7 DAYS)
            </span>
            <span>{week.length} QUEUED</span>
          </div>
          <div className="space-y-2">
            {week.slice(0, 2).map((w, i) => (
              <div key={i} className="p-2 bg-[#F4F4F1] border border-[#E2E8F0] rounded flex items-center justify-between font-mono-code text-xs">
                <span className="font-semibold text-[#0F172A]">{w.display_name}</span>
                <span className="text-[#059669] font-bold">T-MINUS {daysUntil(w.birth_month, w.birth_day)}D</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
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
      name: `${profile.display_name || 'You'} (Self)`,
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

/* ===== Upcoming Tab (Ephemeris Feed) ===== */
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
          <span className="font-mono-code text-[10px] text-[#059669] font-bold uppercase tracking-wider block">
            ORBITAL HORIZON FORECAST
          </span>
          <h2 className="font-editorial text-2xl font-medium text-[#0F172A] mt-0.5">
            Approaching Transits ({upcoming.length})
          </h2>
        </div>
        <span className="font-mono-code text-xs text-[#64748B]">SCOPE: {mode.toUpperCase()}</span>
      </div>

      {upcoming.length === 0 && (
        <Card className="p-16 text-center bg-white">
          <CalendarDays className="w-8 h-8 mx-auto text-[#94A3B8] mb-2" />
          <p className="font-editorial text-lg text-[#0F172A]">No transits in the next 7 days</p>
          <p className="font-mono-code text-xs text-[#64748B] mt-1">
            Enlist private contacts in Sovereign Circles or subscribe to celebrants.
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
                  <div className="flex items-center gap-2">
                    <span className="font-mono-code text-[10px] font-bold text-[#64748B]">
                      {MONTH_ABBR[e.birth_month - 1]} {e.birth_day}
                    </span>
                  </div>
                  <MilestoneBadge variant={e.days === 0 ? 'emerald' : 'slate'}>
                    {untilLabel(e.days)}
                  </MilestoneBadge>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar name={e.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-[#0F172A] truncate">{e.name}</p>
                    <p className="font-mono-code text-[10px] text-[#64748B] mt-0.5 truncate">
                      {e.source === 'personal'
                        ? e.relationship || 'Confidential'
                        : c
                        ? `[${e.country_code}] ${c.name}`
                        : 'Sovereign Contact'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#F4F4F1] flex items-center justify-between font-mono-code text-[10px] text-[#64748B]">
                  <span>T-MINUS {e.days * 24}H 00M</span>
                  <span className="text-[#059669] font-bold">INSPECT →</span>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

/* ===== Calendar Tab (Solar Circles) ===== */
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
          <span className="font-mono-code text-[10px] text-[#059669] font-bold uppercase tracking-wider block">
            MONTHLY EPHEMERIS GRID
          </span>
          <h2 className="font-editorial text-2xl font-medium text-[#0F172A] mt-0.5">
            {MONTHS[viewMonth - 1]} 2025
          </h2>
        </div>
        <div className="flex items-center gap-1.5 font-mono-code text-xs">
          <Button variant="outline" size="sm" onClick={() => setViewMonth((m) => (m === 1 ? 12 : m - 1))}>
            PREV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMonth((m) => (m === 12 ? 1 : m + 1))}>
            NEXT
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2 text-center font-mono-code text-[10px] text-[#64748B] uppercase tracking-wider">
        {DOW.map((d) => (
          <div key={d} className="py-1 bg-[#F4F4F1] rounded font-bold">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[86px] bg-[#FBFBFA] border border-transparent rounded" />
          const list = byDay[d] || []
          const isToday = viewMonth === tM && d === tD

          return (
            <div
              key={i}
              className={`min-h-[86px] p-2 rounded border transition-colors ${
                isToday
                  ? 'bg-[#ECFDF5] border-[#059669] shadow-sm'
                  : 'bg-white border-[#E2E8F0] hover:border-[#0F172A]'
              }`}
            >
              <div className="flex items-center justify-between font-mono-code text-xs">
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
                    className="w-full truncate text-left font-mono-code text-[10px] px-1 py-0.5 rounded bg-[#F4F4F1] hover:bg-[#059669] hover:text-white text-[#0F172A] transition-colors block"
                  >
                    {e.name}
                  </button>
                ))}
                {list.length > 2 && (
                  <span className="font-mono-code text-[9px] text-[#64748B] block">
                    +{list.length - 2} MORE
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

/* ===== Discover Tab (Discovery Reticle) ===== */
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
          <span className="font-mono-code text-[10px] text-[#059669] font-bold uppercase tracking-wider block">
            RETICLE RECONNAISSANCE
          </span>
          <h2 className="font-editorial text-2xl font-medium text-[#0F172A] mt-0.5">
            Discover Global Operators
          </h2>
        </div>
        <span className="font-mono-code text-xs text-[#64748B]">WGS-84 DIRECTORY</span>
      </div>

      <div className="relative max-w-md">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search(q)}
          placeholder="Filter by celebrant name or ISO country [e.g. JP, CH, US]..."
          className="observatory-input pr-10"
        />
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
      </div>

      {busy && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 bg-white border border-[#E2E8F0] rounded space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded skeleton-shimmer" />
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
                  <div className="flex items-start justify-between">
                    <button onClick={() => onSelect(b)} className="flex items-center gap-3 text-left flex-1 min-w-0">
                      <Avatar name={b.display_name} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-[#0F172A] truncate">{b.display_name}</p>
                        <p className="font-mono-code text-[10px] text-[#64748B] mt-0.5">
                          {MONTH_ABBR[b.birth_month - 1]} {b.birth_day} · [{b.country_code || 'GL'}] {c ? c.name : ''}
                        </p>
                      </div>
                    </button>
                    {following ? (
                      <Button variant="outline" size="sm" onClick={() => unfollow(b.id)}>
                        UNFOLLOW
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => follow(b.id)}>
                        SUBSCRIBE
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

/* ===== Personal Tab (Sovereign Circles) ===== */
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
    toast.success('Recorded in Sovereign Circle')
    reload()
  }

  async function remove(id) {
    await supabase.from('personal_birthdays').delete().eq('id', id)
    toast.success('Record purged')
    reload()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add private record */}
      <Card className="p-6 bg-white">
        <div className="pb-3 border-b border-[#E2E8F0] mb-4">
          <span className="font-mono-code text-[10px] text-[#059669] font-bold uppercase tracking-wider block">
            CONFIDENTIAL REGISTRY
          </span>
          <h3 className="font-editorial text-xl font-medium text-[#0F172A] mt-0.5">
            Add to Sovereign Circle
          </h3>
          <p className="font-mono-code text-[11px] text-[#64748B] mt-0.5">
            PRIVATE TO YOUR ACCOUNT ONLY • OFF-GRID CONTACTS
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Celebrant Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Chen"
              className="observatory-input"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Month</label>
              <Select value={month} onValueChange={(v) => { setMonth(v); setDay('') }}>
                <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1]">
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Day</label>
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
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Year</label>
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
            <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Relationship Sector</label>
            <Select value={rel} onValueChange={setRel}>
              <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Select Sector" /></SelectTrigger>
              <SelectContent className="bg-white border-[#CBD5E1]">
                {['Inner Council','Family','Research Fellow','Partner','Colleague','Atelier','Other'].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={add} variant="secondary" disabled={busy} className="w-full py-2.5 mt-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'RECORD CONFIDENTIAL MILESTONE'}
          </Button>
        </div>
      </Card>

      {/* Right Column: Sovereign Circles List */}
      <div className="space-y-6">
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
            <span className="font-mono-code text-[10px] text-[#0F172A] font-bold uppercase tracking-wider">
              SOVEREIGN RECORDS ({personal.length})
            </span>
            <span className="font-mono-code text-[10px] text-[#64748B]">OFF-GRID</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {personal.length === 0 && (
              <p className="py-6 text-center font-mono-code text-xs text-[#94A3B8]">No confidential records established.</p>
            )}
            {personal.map((p) => (
              <div key={p.id} className="p-2.5 bg-[#FBFBFA] border border-[#E2E8F0] rounded flex items-center justify-between hover:border-[#0F172A] transition-colors">
                <div className="flex items-center gap-2.5">
                  <Avatar name={p.person_name} />
                  <div>
                    <p className="font-semibold text-xs text-[#0F172A]">{p.person_name}</p>
                    <p className="font-mono-code text-[10px] text-[#64748B]">
                      {MONTH_ABBR[p.birth_month - 1]} {p.birth_day} · {p.relationship || 'General Circle'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => remove(p.id)}
                  className="p-1 text-[#94A3B8] hover:text-red-600 transition-colors"
                  title="Purge record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
            <span className="font-mono-code text-[10px] text-[#0F172A] font-bold uppercase tracking-wider">
              SUBSCRIBED TELEMETRY ({subscribed.length})
            </span>
            <span className="font-mono-code text-[10px] text-[#059669]">SYNCED</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {subscribed.length === 0 && (
              <p className="py-6 text-center font-mono-code text-xs text-[#94A3B8]">No active global subscriptions.</p>
            )}
            {subscribed.map((b) => (
              <div key={b.id} className="p-2.5 bg-[#FBFBFA] border border-[#E2E8F0] rounded flex items-center justify-between hover:border-[#0F172A] transition-colors">
                <button onClick={() => onSelect(b)} className="flex items-center gap-2.5 text-left flex-1 min-w-0">
                  <Avatar name={b.display_name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-[#0F172A] truncate">{b.display_name}</p>
                    <p className="font-mono-code text-[10px] text-[#64748B]">
                      {MONTH_ABBR[b.birth_month - 1]} {b.birth_day}
                    </p>
                  </div>
                </button>
                <Button variant="outline" size="sm" onClick={() => unfollow(b.id)}>
                  REMOVE
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ===== Profile Tab (Observatory Log & Settings) ===== */
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
    toast.success('Observatory log updated')
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
      if (!res.ok) throw new Error(j.error || 'Failed to dispatch test reminder')
      toast.success(`Test telegram delivered to ${j.to}`)
    } catch (e) {
      toast.error(e.message || 'Could not dispatch test')
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
            <h2 className="font-editorial text-xl font-medium text-[#0F172A]">{name || 'Operator Profile'}</h2>
            <p className="font-mono-code text-[11px] text-[#64748B]">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Display Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="observatory-input" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Month</label>
              <Select value={month} onValueChange={(v) => { setMonth(v); setDay('') }}>
                <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1]">
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Day</label>
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
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Year</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Optional" className="observatory-input" />
            </div>
          </div>

          <div>
            <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Location Coordinates</label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="observatory-input h-auto"><SelectValue placeholder="Select Location" /></SelectTrigger>
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
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">X Handle</label>
              <input value={x} onChange={(e) => setX(e.target.value)} placeholder="@handle" className="observatory-input" />
            </div>
            <div>
              <label className="font-mono-code text-[10px] font-semibold text-[#475569] uppercase block mb-1">Instagram</label>
              <input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="@handle" className="observatory-input" />
            </div>
          </div>

          <Button onClick={save} variant="primary" disabled={busy} className="w-full py-2.5 mt-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SAVE OBSERVATORY SETTINGS'}
          </Button>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-6 bg-white space-y-3">
          <div className="pb-3 border-b border-[#E2E8F0]">
            <span className="font-mono-code text-[10px] text-[#0F172A] font-bold uppercase tracking-wider block">
              PRIVACY CRYPT
            </span>
          </div>
          <div className="p-3 bg-[#F4F4F1] border border-[#E2E8F0] rounded flex items-center justify-between">
            <div>
              <p className="font-semibold text-xs text-[#0F172A]">Public Cartographic Beacon</p>
              <p className="font-mono-code text-[10px] text-[#64748B]">Visible on 3D globe to all observers</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} className="data-[state=checked]:bg-[#059669]" />
          </div>
          <div className="p-3 bg-[#F4F4F1] border border-[#E2E8F0] rounded flex items-center justify-between">
            <div>
              <p className="font-semibold text-xs text-[#0F172A]">Display Birth Year</p>
              <p className="font-mono-code text-[10px] text-[#64748B]">Reveal solar cycle number</p>
            </div>
            <Switch checked={yearPublic} onCheckedChange={setYearPublic} disabled={!year} className="data-[state=checked]:bg-[#059669]" />
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <span className="font-mono-code text-[10px] text-[#0F172A] font-bold uppercase tracking-wider">
              PRECISION EMAIL TELEMETRY
            </span>
            <Switch checked={reminders} onCheckedChange={setReminders} className="data-[state=checked]:bg-[#059669]" />
          </div>

          <p className="font-mono-code text-[11px] text-[#64748B] mt-3 mb-4">
            RECEIVE DISPATCH BEFORE EACH SOLAR RETURN:
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { o: 3, l: '3 DAYS PRIOR' },
              { o: 1, l: '1 DAY PRIOR' },
              { o: 0, l: 'MORNING OF' },
            ].map(({ o, l }) => {
              const on = offsets.includes(o)
              return (
                <button
                  key={o}
                  type="button"
                  disabled={!reminders}
                  onClick={() => toggleOffset(o)}
                  className={`btn-grain px-3 py-1.5 text-[10px] rounded transition-all disabled:opacity-40 ${
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
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'DISPATCH TEST TELEGRAM'}
            </Button>
            <p className="font-mono-code text-[10px] text-[#94A3B8] text-center mt-2">
              Dispatches an immediate sample notification for nearest contact.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ===== Person Dossier Modal ===== */
function PersonDialog({ person, onClose, followedIds, follow, unfollow, meId }) {
  if (!person) return null
  const c = COUNTRY_MAP[person.country_code]
  const following = followedIds.includes(person.id)
  const isMe = person.id === meId
  const age = person.birth_year && person.birth_year_public ? new Date().getFullYear() - person.birth_year : null

  return (
    <Dialog open={!!person} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-lg bg-white border border-[#CBD5E1] shadow-2xl p-0 overflow-hidden max-w-sm font-sans-body">
        <div className="p-5 bg-[#0F172A] text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-[#1E293B] border border-[#334155] flex items-center justify-center font-mono-code text-lg font-bold text-[#10B981]">
                {(person.display_name || '?')[0]?.toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <DialogTitle className="font-editorial text-lg font-medium text-white truncate">
                  {person.display_name}
                </DialogTitle>
                <DialogDescription className="font-mono-code text-[#94A3B8] text-[10px] mt-0.5 uppercase flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#10B981]" />
                  [{person.country_code || 'GL'}] {c ? c.name : 'Global Atlas'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded">
            <span className="font-mono-code text-[10px] text-[#065F46] font-bold uppercase block">
              SOLAR CYCLE MILESTONE
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
                className="font-mono-code text-[10px] inline-flex items-center gap-1 bg-[#F4F4F1] border border-[#CBD5E1] px-2.5 py-1 rounded text-[#0F172A] hover:bg-[#E2E8F0]"
              >
                <Twitter className="w-3 h-3 text-slate-500" /> {person.x_handle}
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </a>
            )}
            {person.instagram_handle && (
              <a
                href={`https://instagram.com/${person.instagram_handle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono-code text-[10px] inline-flex items-center gap-1 bg-[#F4F4F1] border border-[#CBD5E1] px-2.5 py-1 rounded text-[#0F172A] hover:bg-[#E2E8F0]"
              >
                <Instagram className="w-3 h-3 text-slate-500" /> {person.instagram_handle}
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </a>
            )}
          </div>

          {!isMe && (
            <div className="pt-2">
              {following ? (
                <Button variant="outline" size="sm" onClick={() => { unfollow(person.id); onClose() }} className="w-full">
                  UNSUBSCRIBE TELEMETRY
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => { follow(person.id); onClose() }} className="w-full">
                  SUBSCRIBE TO SOLAR RETURN
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
      label: `[${b.country_code}] ${b.display_name} • ${c.name}${isToday ? ' (ACTIVE TRANSIT TODAY)' : soon ? ` (IN ${dU}D)` : ''}`,
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
