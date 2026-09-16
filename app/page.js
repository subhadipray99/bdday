'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { supabase, supabaseConfigurationError } from '@/lib/supabaseClient'
import Landing from '@/components/birthday-landing'
import { Auth, Onboarding } from '@/components/birthday-account'
import Dashboard from '@/components/birthday-dashboard'
import { AppSkeleton, ErrorNotice, Button, Wordmark } from '@/components/birthday-ui'

const EMPTY = []
const options = { revalidateOnFocus: false, shouldRetryOnError: false }
async function checked(request) {
  const { data, error } = await request
  if (error) throw error
  return data
}

export default function App() {
  const [screen, setScreen] = useState('landing')
  const sessionQuery = useSWR(supabase ? 'birthday-session' : null, async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  }, options)
  const user = sessionQuery.data?.user
  const publicQuery = useSWR(supabase ? 'public-birthdays' : null, () => checked(supabase.from('profiles')
    .select('id,display_name,country,country_code,x_handle,instagram_handle,birth_month,birth_day,birth_year,birth_year_public,is_public')
    .eq('is_public', true).not('birth_month', 'is', null)), options)
  const profileQuery = useSWR(user ? ['birthday-profile', user.id] : null,
    ([, uid]) => checked(supabase.from('profiles').select('*').eq('id', uid).maybeSingle()), options)
  const followsQuery = useSWR(user ? ['birthday-follows', user.id] : null,
    ([, uid]) => checked(supabase.from('follows').select('followed_id').eq('follower_id', uid)), options)
  const personalQuery = useSWR(user ? ['private-birthdays', user.id] : null,
    ([, uid]) => checked(supabase.from('personal_birthdays').select('*').eq('owner_id', uid).order('birth_month')), options)
  const notificationsQuery = useSWR(user ? ['birthday-notifications', user.id] : null,
    ([, uid]) => checked(supabase.from('notifications').select('*').eq('recipient_id', uid).order('created_at', { ascending: false }).limit(50)), options)

  const mutateSession = sessionQuery.mutate
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      mutateSession(session, false)
      if (event === 'SIGNED_OUT') setScreen('landing')
    })
    return () => data.subscription.unsubscribe()
  }, [mutateSession])

  async function reload() {
    await Promise.all([publicQuery.mutate(), followsQuery.mutate(), personalQuery.mutate(), notificationsQuery.mutate()])
  }
  async function logout() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setScreen('landing'); await mutateSession(null, false)
    } catch { toast.error('Sign out failed. Please try again.') }
  }
  async function onProfileSaved(profile) { await profileQuery.mutate(profile, false); await reload() }

  if (supabaseConfigurationError) return <main className="page-width loading-page"><Wordmark /><ErrorNotice>{supabaseConfigurationError}</ErrorNotice></main>
  if (sessionQuery.isLoading || (user && profileQuery.isLoading)) return <AppSkeleton />
  if (sessionQuery.error || (user && profileQuery.error)) return <main className="page-width loading-page"><Wordmark /><ErrorNotice retry={() => { sessionQuery.mutate(); if (user) profileQuery.mutate() }} />{user && <Button onClick={logout}>Sign out</Button>}</main>
  if (user) {
    if (!profileQuery.data?.onboarded) return <Onboarding {...{ user }} profile={profileQuery.data} onSaved={onProfileSaved} onLogout={logout} />
    if ([publicQuery, followsQuery, personalQuery, notificationsQuery].some((query) => query.isLoading)) return <AppSkeleton />
    return <Dashboard key={user.id} {...{ user, reload }} profile={profileQuery.data} onProfileSaved={onProfileSaved} publicBirthdays={publicQuery.data || EMPTY} followedIds={(followsQuery.data || EMPTY).map((item) => item.followed_id)} personal={personalQuery.data || EMPTY} notifications={notificationsQuery.data || EMPTY} onLogout={logout} dataError={[publicQuery, followsQuery, personalQuery, notificationsQuery].some((query) => query.error)} refreshing={[publicQuery, followsQuery, personalQuery, notificationsQuery].some((query) => query.isValidating)} />
  }
  if (screen !== 'landing') return <Auth key={screen} initialMode={screen} onBack={() => setScreen('landing')} onAuthed={async (session) => { await mutateSession(session, false); setScreen('landing') }} />
  return <Landing publicBirthdays={publicQuery.data || EMPTY} loading={publicQuery.isLoading} error={publicQuery.error} retry={() => publicQuery.mutate()} onStart={setScreen} />
}
