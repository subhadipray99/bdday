'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { COUNTRIES, COUNTRY_MAP } from '@/lib/countries'
import { toast } from 'sonner'
import { Button, Wordmark, Footer, TextField, SelectField, FieldGroup, BirthdayFields, ToggleRow, SectionTitle } from '@/components/birthday-ui'

export function Auth({ initialMode = 'signup', onBack, onAuthed }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState('')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const inFlight = useRef(false)
  async function submit(event) {
    event.preventDefault()
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setMessage('')
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
        if (error) throw error
        if (!data.session) { setMessage('Check your email to confirm your account, then sign in.'); setMode('login'); return }
        await onAuthed(data.session)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        await onAuthed(data.session)
      }
    } catch (error) {
      if (error.code === 'email_not_confirmed') setMessage('Please confirm your email before signing in.')
      else if (error.status === 429 || error.code?.includes('rate_limit')) setMessage('Too many attempts. Please wait a little and try again.')
      else if (error.code === 'weak_password') setMessage('Choose a stronger password with at least six characters.')
      else if (error.code === 'invalid_credentials') setMessage('The email or password is incorrect. Please try again.')
      else if (error.status >= 500 || !error.status) setMessage('We could not connect right now. Please try again.')
      else setMessage('We could not complete this request. Check your details or try signing in.')
    } finally { inFlight.current = false; setBusy(false) }
  }
  return <><header className="masthead page-width"><Wordmark onClick={onBack} /><Button variant="ghost" onClick={onBack}>← Back to the globe</Button></header><main className="account-layout page-width"><aside className="account-story"><p className="eyebrow">Your people, remembered.</p><h1 className="font-serif text-balance">Make room<br />{' '}for the days<br />{' '}that <em>matter.</em></h1><p>A birthday is a small thing to remember.<br />And a lovely thing to be remembered for.</p><div className="account-note"><span className="font-serif">A note on privacy</span><p>You decide what the world sees. Private birthdays stay in your own calendar. Your birth year is yours to share, or not.</p></div></aside><section className="account-form"><p className="eyebrow">Birthday Globe</p><h2 className="font-serif">{mode === 'signup' ? 'Your calendar starts here.' : 'Good to have you back.'}</h2><p className="muted">{mode === 'signup' ? 'Create an account. Bring your people along.' : 'Sign in to pick up where you left off.'}</p><form onSubmit={submit} onKeyDown={(event) => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault() }} aria-busy={busy}><FieldGroup>{mode === 'signup' && <TextField label="Your name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="How should we call you?" required maxLength={100} />}<TextField label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /><TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} required />{message && <p role="status" className="form-message">{message}</p>}<Button size="lg" type="submit" disabled={busy}>{busy ? (mode === 'signup' ? 'Creating your account…' : 'Signing in…') : (mode === 'signup' ? 'Create my account' : 'Sign in')}<span aria-hidden="true">→</span></Button></FieldGroup></form><p className="account-switch">{mode === 'signup' ? 'Already part of the globe?' : 'Not on the map yet?'} <button className="text-link" disabled={busy} onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMessage('') }}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p></section></main><Footer /></>
}

export function ProfileEditor({ user, profile, onSaved, onboarding = false }) {
  const [name, setName] = useState(profile?.display_name || user.user_metadata?.display_name || '')
  const [month, setMonth] = useState(profile?.birth_month ? String(profile.birth_month) : '')
  const [day, setDay] = useState(profile?.birth_day ? String(profile.birth_day) : '')
  const [year, setYear] = useState(profile?.birth_year ? String(profile.birth_year) : '')
  const [yearPublic, setYearPublic] = useState(profile?.birth_year_public ?? false)
  const [country, setCountry] = useState(profile?.country_code || '')
  const [x, setX] = useState(profile?.x_handle || ''), [ig, setIg] = useState(profile?.instagram_handle || '')
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true)
  const [reminders, setReminders] = useState(profile?.reminders_enabled ?? true)
  const [offsets, setOffsets] = useState(Array.isArray(profile?.reminder_offsets) ? profile.reminder_offsets : [1])
  const [busy, setBusy] = useState(false), [testing, setTesting] = useState(false)
  const inFlight = useRef(false)
  async function save(event) {
    event.preventDefault()
    if (inFlight.current) return
    if (!name.trim() || !month || !day || !country) { toast.error('Please fill in your name, birthday and country.'); return }
    inFlight.current = true; setBusy(true)
    try {
      const c = COUNTRY_MAP[country]
      const payload = { id: user.id, email: user.email, display_name: name.trim(), birth_month: Number(month), birth_day: Number(day), birth_year: year ? Number(year) : null, birth_year_public: yearPublic, country: c?.name || null, country_code: country, x_handle: x || null, instagram_handle: ig || null, is_public: isPublic, reminders_enabled: reminders, reminder_offsets: offsets.length ? offsets : [1], onboarded: true, updated_at: new Date().toISOString() }
      const { data, error } = await supabase.from('profiles').upsert(payload).select().maybeSingle()
      if (error) throw error
      await onSaved(data)
      toast.success(onboarding ? 'Your birthday is on the calendar.' : 'Profile saved.')
    } catch { toast.error('Your profile could not be saved. Please try again.') }
    finally { inFlight.current = false; setBusy(false) }
  }
  async function testReminder() {
    if (testing) return
    setTesting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/reminders/self-test', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: '{}' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to send')
      toast.success(`Test reminder sent to ${j.to}. Check your inbox!`)
    } catch (error) { toast.error(error.message || 'Could not send test') } finally { setTesting(false) }
  }
  return <form onSubmit={save} aria-busy={busy}><SectionTitle eyebrow={onboarding ? 'A place on the map' : 'Your account'} title={onboarding ? 'Tell us about your day.' : 'A little about you.'} subtitle={onboarding ? 'Just the essentials. You decide how much to share.' : user.email} /><div className="profile-layout"><section className="form-paper"><FieldGroup><h3 className="font-serif">The essentials</h3><TextField label="Display name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={100} /><BirthdayFields {...{ month, day, year, setMonth, setDay, setYear }} /><SelectField label="Country" value={country} onChange={setCountry} required><option value="">Select your country</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</SelectField><p className="field-hint">Your pin shows an approximate country location, never your address.</p><div className="social-fields"><TextField label="X handle" value={x} onChange={(event) => setX(event.target.value)} placeholder="@handle (optional)" /><TextField label="Instagram handle" value={ig} onChange={(event) => setIg(event.target.value)} placeholder="@handle (optional)" /></div></FieldGroup></section><div className="settings-sections"><section className="settings-section"><h3 className="font-serif">On your terms.</h3><p className="muted">A birthday to share, not your whole life.</p><ToggleRow title="Public birthday" desc="Let your day appear on the globe and global calendar." checked={isPublic} onChange={setIsPublic} /><ToggleRow title="Show birth year" desc="Your age stays private unless you turn this on." checked={yearPublic} onChange={setYearPublic} disabled={!year} /></section><section className="settings-section"><h3 className="font-serif">A timely little nudge.</h3><ToggleRow title="Email reminders" desc="A heads-up for birthdays in your personal calendar." checked={reminders} onChange={setReminders} /><fieldset className="reminder-options" disabled={!reminders}><legend>Remind me</legend>{[{ value: 3, label: '3 days before' }, { value: 1, label: '1 day before' }, { value: 0, label: 'Morning of' }].map(({ value, label }) => <label key={value}><input type="checkbox" checked={offsets.includes(value)} onChange={() => setOffsets((previous) => previous.includes(value) ? previous.filter((offset) => offset !== value) : [...previous, value])} />{label}</label>)}</fieldset><p className="field-hint">If none are selected, we&apos;ll remind you one day before.</p>{!onboarding && <><Button variant="outline" type="button" onClick={testReminder} disabled={testing}>{testing ? 'Sending test reminder…' : 'Send me a test reminder'}</Button><p className="field-hint">Uses your saved settings and nearest upcoming birthday.</p></>}</section></div></div><div className="save-bar"><p className="muted">{onboarding ? 'You can change any of this later.' : 'Remember to save your privacy and reminder preferences.'}</p><Button type="submit" size="lg" disabled={busy}>{busy ? 'Saving your profile…' : onboarding ? 'Start my calendar' : 'Save all changes'} <span aria-hidden="true">→</span></Button></div></form>
}

export function Onboarding({ user, profile, onSaved, onLogout }) {
  return <><header className="masthead page-width"><Wordmark /><Button variant="ghost" onClick={onLogout}>Sign out</Button></header><main className="page-width onboarding-page"><ProfileEditor {...{ user, profile, onSaved }} onboarding /></main><Footer /></>
}
