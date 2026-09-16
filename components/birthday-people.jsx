'use client'

import { useState, useRef } from 'react'
import useSWR from 'swr'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { SectionTitle, FieldGroup, TextField, SelectField, BirthdayFields, Button, PersonRow, ConfirmAction, AsyncButton, EmptyState, ErrorNotice, ListSkeleton } from '@/components/birthday-ui'

export function Discover({ user, followedIds, follow, unfollow }) {
  const [query, setQuery] = useState(''), [term, setTerm] = useState('')
  const { data: results, error, isLoading, isValidating, mutate } = useSWR(['birthday-discover', user.id, term], async ([, uid, searchTerm]) => {
    let request = supabase.from('profiles').select('id,display_name,country,country_code,x_handle,instagram_handle,birth_month,birth_day,birth_year,birth_year_public,is_public').eq('is_public', true).not('birth_month', 'is', null).limit(40)
    if (searchTerm) request = request.ilike('display_name', `%${searchTerm}%`)
    const { data, error: requestError } = await request
    if (requestError) throw requestError
    return (data || []).filter((person) => person.id !== uid)
  }, { revalidateOnFocus: false, shouldRetryOnError: false })
  return <section><SectionTitle eyebrow="Good company" title="A world of people." subtitle="Find someone you know. Remember their day." /><form className="search-form" onSubmit={(event) => { event.preventDefault(); if (term === query.trim()) mutate(); else setTerm(query.trim()) }} onKeyDown={(event) => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault() }}><TextField label="Search public profiles" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter a name" maxLength={100} /><Button type="submit" disabled={isValidating}>{isValidating ? 'Searching…' : 'Search'}</Button></form><div aria-busy={isValidating}>{isLoading ? <ListSkeleton /> : error ? <ErrorNotice retry={() => mutate()} /> : results?.length ? <><p className="eyebrow results-heading">{results.length} profiles{results.length === 40 ? ' · Refine your search for more' : ''}</p><div className="discover-list">{results.map((person) => <PersonRow key={person.id} person={person} action={followedIds.includes(person.id) ? <ConfirmAction label="Following · Unfollow" title={`Stop following ${person.display_name}?`} description="Their birthday will be removed from your subscriptions." onConfirm={() => unfollow(person.id)} /> : <AsyncButton variant="outline" onClick={() => follow(person.id)} pendingText="Following…">Follow</AsyncButton>} />)}</div></> : <EmptyState title={term ? 'No one by that name, yet.' : 'The globe is still growing.'}>{term ? 'Try another name or clear your search to see public profiles.' : 'Public profiles will appear here when people share their birthdays.'}{term && <Button variant="outline" onClick={() => { setQuery(''); setTerm('') }}>Clear search</Button>}</EmptyState>}</div></section>
}

export function PersonalPeople({ user, personal, reload, followedIds, publicBirthdays, unfollow, onSelect }) {
  const [name, setName] = useState(''), [month, setMonth] = useState(''), [day, setDay] = useState('')
  const [year, setYear] = useState(''), [rel, setRel] = useState(''), [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const subscribed = publicBirthdays.filter((birthday) => followedIds.includes(birthday.id))
  async function add(event) {
    event.preventDefault()
    if (inFlight.current) return
    if (!name.trim() || !month || !day) { toast.error('Name, month and day are required.'); return }
    inFlight.current = true; setBusy(true)
    try {
      const { error } = await supabase.from('personal_birthdays').insert({ owner_id: user.id, person_name: name.trim(), birth_month: Number(month), birth_day: Number(day), birth_year: year ? Number(year) : null, relationship: rel || null })
      if (error) throw error
      setName(''); setMonth(''); setDay(''); setYear(''); setRel('')
      toast.success('Added to your private calendar.'); await reload()
    } catch { toast.error('This birthday could not be added. Please try again.') }
    finally { inFlight.current = false; setBusy(false) }
  }
  async function remove(id) {
    try {
      const { error } = await supabase.from('personal_birthdays').delete().eq('id', id)
      if (error) throw error
      toast.success('Birthday removed.'); await reload(); return true
    } catch { toast.error('The birthday could not be removed. Please try again.'); return false }
  }
  return <section><SectionTitle eyebrow="Your inner circle" title="The people in your world." subtitle="A private place for the dates you never want to forget." /><div className="people-layout"><form className="form-paper" onSubmit={add} aria-busy={busy}><FieldGroup><h3 className="font-serif">Add a private birthday.</h3><p className="muted">For family, friends, and people not on the globe. Only you can see these.</p><TextField label="Their name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Someone worth remembering" required maxLength={100} /><BirthdayFields {...{ month, day, year, setMonth, setDay, setYear }} /><SelectField label="Relationship (optional)" value={rel} onChange={setRel}><option value="">Choose a relationship</option>{['Family', 'Friend', 'Partner', 'Colleague', 'Other'].map((relationship) => <option key={relationship}>{relationship}</option>)}</SelectField><Button variant="secondary" type="submit" size="lg" disabled={busy}>{busy ? 'Adding birthday…' : 'Add to my calendar'} <span aria-hidden="true">+</span></Button></FieldGroup></form><div className="people-ledgers"><section><h3 className="ledger-title font-serif">Private birthdays <span className="font-sans">({personal.length})</span></h3>{personal.length ? personal.map((person) => <PersonRow key={person.id} person={person} action={<ConfirmAction title={`Remove ${person.person_name}'s birthday?`} description="This removes the date from your private calendar and reminders." onConfirm={() => remove(person.id)} />} />) : <EmptyState title="Save your first date.">Add someone using the form. This little list is just for you.</EmptyState>}</section><section><h3 className="ledger-title font-serif">Following <span className="font-sans">({subscribed.length})</span></h3>{subscribed.length ? subscribed.map((person) => <PersonRow key={person.id} person={person} onClick={() => onSelect(person)} action={<ConfirmAction label="Unfollow" title={`Stop following ${person.display_name}?`} description="Their birthday will be removed from your subscriptions." onConfirm={() => unfollow(person.id)} />} />) : <EmptyState title="Keep your people close.">Open Discover to find and follow public birthdays.</EmptyState>}</section></div></div></section>
}
