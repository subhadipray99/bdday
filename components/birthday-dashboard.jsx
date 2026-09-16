'use client'

import { useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button, AsyncButton, Wordmark, Footer, SectionTitle, EmptyState, PersonRow, PersonDialog, ErrorNotice } from '@/components/birthday-ui'
import { BirthdayGlobe } from '@/components/birthday-landing'
import BirthdayCalendar from '@/components/birthday-calendar'
import { Discover, PersonalPeople } from '@/components/birthday-people'
import { ProfileEditor } from '@/components/birthday-account'
import { buildEntries, buildGlobePoints, daysUntil, untilLabel, MONTHS, SOURCE_LABEL } from '@/lib/birthday'

export default function Dashboard({ user, profile, onProfileSaved, publicBirthdays, followedIds, personal, notifications, reload, onLogout, dataError, refreshing }) {
  const [tab, setTab] = useState('globe'), [mode, setMode] = useState('global'), [selected, setSelected] = useState(null)
  const unread = notifications.filter((notification) => !notification.read_at).length
  const now = new Date(), month = now.getMonth() + 1, day = now.getDate()
  const entries = useMemo(() => buildEntries(mode, publicBirthdays, followedIds, personal, profile), [mode, publicBirthdays, followedIds, personal, profile])
  const points = useMemo(() => buildGlobePoints(publicBirthdays, month, day), [publicBirthdays, month, day])
  const todays = publicBirthdays.filter((person) => person.birth_month === month && person.birth_day === day)
  const upcoming = entries.map((entry) => ({ ...entry, days: daysUntil(entry.birth_month, entry.birth_day) })).filter((entry) => entry.days <= 7).sort((a, b) => a.days - b.days)
  async function follow(id) {
    if (id === user.id) { toast.info('That is your birthday.'); return false }
    try {
      const { error } = await supabase.from('follows').insert({ follower_id: user.id, followed_id: id })
      if (error) throw error
      toast.success('Birthday followed.'); await reload(); return true
    } catch { toast.error('Could not follow this birthday. Please try again.'); return false }
  }
  async function unfollow(id) {
    try {
      const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('followed_id', id)
      if (error) throw error
      toast.success('Birthday unfollowed.'); await reload(); return true
    } catch { toast.error('Could not unfollow this birthday. Please try again.'); return false }
  }
  async function markAllRead() {
    try {
      const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', user.id).is('read_at', null)
      if (error) throw error
      await reload()
    } catch { toast.error('Could not mark notifications as read. Please try again.') }
  }
  return <><a className="skip-link" href="#dashboard-content">Skip to content</a><header className="masthead page-width"><Wordmark onClick={() => setTab('globe')} /><div className="masthead-actions"><Popover><PopoverTrigger asChild><Button variant="ghost" aria-label={`Notifications, ${unread} unread`}><Bell className="size-4" /><span className="notification-label">Notifications</span>{unread > 0 && <span className="notification-count">{unread}</span>}</Button></PopoverTrigger><PopoverContent align="end" className="notification-popover"><div className="notification-heading"><h2 className="font-serif">A little heads-up.</h2>{unread > 0 && <AsyncButton variant="ghost" onClick={markAllRead}>Mark all read</AsyncButton>}</div><div className="notification-list">{notifications.length ? notifications.map((notification) => <article className={`notification-item ${notification.read_at ? '' : 'notification-unread'}`} key={notification.id}><h3>{!notification.read_at && <span className="sr-only">Unread: </span>}{notification.title}</h3>{notification.body && <p className="muted">{notification.body}</p>}</article>) : <EmptyState title="All quiet for now.">Your birthday notifications will appear here.</EmptyState>}</div></PopoverContent></Popover><AsyncButton variant="ghost" onClick={onLogout}>Sign out</AsyncButton></div></header><main className="page-width dashboard-page"><div className="edition-line"><span>Welcome back, {profile.display_name || 'friend'}.</span><span>{MONTHS[month - 1]} {day}, {now.getFullYear()}</span></div><div className="dashboard-intro"><h1 className="font-serif text-balance">The world, one <em>birthday</em> at a time.</h1><p className="muted">A place for your people. A date for every one of them.</p></div><Tabs value={tab} onValueChange={setTab} className="dashboard-tabs"><div className="dashboard-toolbar"><div className="tabs-overflow"><TabsList aria-label="Birthday dashboard sections">{[{ id: 'globe', label: 'The globe' }, { id: 'upcoming', label: 'Coming up' }, { id: 'calendar', label: 'Calendar' }, { id: 'discover', label: 'Discover' }, { id: 'personal', label: 'My people' }, { id: 'profile', label: 'My profile' }].map((item) => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}</TabsList></div>{['upcoming', 'calendar'].includes(tab) && <div className="mode-switch" aria-label="Birthday calendar scope">{['global', 'personal'].map((scope) => <Button key={scope} size="sm" variant={mode === scope ? 'secondary' : 'ghost'} aria-pressed={mode === scope} onClick={() => setMode(scope)}>{scope === 'global' ? 'Global' : 'Personal'}</Button>)}</div>}</div><div id="dashboard-content" tabIndex={-1}><p className="refresh-status" role="status">{refreshing ? 'Updating your calendar…' : ''}</p>{dataError && <ErrorNotice retry={reload}>Some calendar information is unavailable. Your last loaded data is shown below.</ErrorNotice>}<TabsContent value="globe"><SectionTitle eyebrow="The birthday atlas" title="Somewhere, it’s their day." subtitle="A shared calendar for a not-so-big world." /><div className="dashboard-atlas-layout"><div className="dashboard-atlas"><BirthdayGlobe points={points} onPointClick={(point) => setSelected(point.data)} /></div><section className="today-sidebar"><p className="eyebrow">{MONTHS[month - 1]} {day} · Today</p><h3 className="font-serif">Make a little fuss.</h3>{todays.length ? todays.map((person) => <PersonRow key={person.id} person={person} onClick={() => setSelected(person)} />) : <EmptyState title="A quiet day on the globe.">No public birthdays today. There&apos;s always another celebration around the corner.</EmptyState>}<Button variant="outline" onClick={() => setTab('upcoming')}>See what&apos;s coming up <span aria-hidden="true">→</span></Button></section></div><details className="all-birthdays"><summary>Browse all public birthdays ({publicBirthdays.length})</summary>{publicBirthdays.length ? publicBirthdays.map((person) => <PersonRow key={person.id} person={person} onClick={() => setSelected(person)} />) : <p className="muted">No public birthdays have been shared yet.</p>}</details></TabsContent><TabsContent value="upcoming"><SectionTitle eyebrow={`${mode} calendar`} title="A good week for good wishes." subtitle={`${upcoming.length} birthdays in the next 7 days.`} />{upcoming.length ? <div className="upcoming-list">{upcoming.map((person) => <PersonRow key={`${person.source}-${person.id}`} person={person} onClick={['public', 'subscribed'].includes(person.source) ? () => setSelected(person) : undefined} action={<div className="upcoming-meta"><strong className={person.days === 0 ? 'text-primary' : ''}>{untilLabel(person.days)}</strong><span className="muted">{SOURCE_LABEL[person.source]}</span></div>} />)}</div> : <EmptyState title="A little breathing room.">No birthdays in the next week. {mode === 'personal' ? 'Add a private birthday or follow someone to fill your calendar.' : 'Explore the globe to find the next date worth remembering.'}<Button variant="outline" onClick={() => setTab(mode === 'personal' ? 'personal' : 'discover')}>{mode === 'personal' ? 'Add someone' : 'Discover people'}</Button></EmptyState>}</TabsContent><TabsContent value="calendar"><BirthdayCalendar {...{ entries, mode }} onSelect={setSelected} /></TabsContent><TabsContent value="discover"><Discover {...{ user, followedIds, follow, unfollow }} /></TabsContent><TabsContent value="personal"><PersonalPeople {...{ user, personal, reload, followedIds, publicBirthdays, unfollow }} onSelect={setSelected} /></TabsContent><TabsContent value="profile"><ProfileEditor {...{ user, profile }} onSaved={onProfileSaved} /></TabsContent></div></Tabs></main><Footer />{selected && <PersonDialog person={selected} onClose={() => setSelected(null)} {...{ followedIds, follow, unfollow }} meId={user.id} />}</>
}
