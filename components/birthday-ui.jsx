'use client'

import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { MONTHS, MONTH_ABBR, daysInMonth, countryName, daysUntil, untilLabel } from '@/lib/birthday'
import { cn } from '@/lib/utils'
export { Button }

export function Wordmark({ onClick }) {
  return <button type="button" className="wordmark font-serif" onClick={onClick} aria-label="Birthday Globe home">Birthday<span className="wordmark-dot">·</span>Globe<span className="wordmark-caption font-sans">EVERYONE HAS A DAY.</span></button>
}
export function Footer() {
  return <footer className="site-footer page-width"><span className="font-serif">A little remembering goes a long way.</span><span>Birthday Globe · Made for the people in your world.</span></footer>
}
export function SectionTitle({ eyebrow, title, subtitle, action }) {
  return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2 className="font-serif text-balance">{title}</h2>{subtitle && <p className="muted">{subtitle}</p>}</div>{action}</div>
}
export function EmptyState({ title, children, action }) {
  return <section className="empty-state"><h3 className="font-serif">{title}</h3><p className="muted">{children}</p>{action}</section>
}
export function ErrorNotice({ retry, children = 'We could not load this information. Please try again.' }) {
  return <Alert variant="destructive"><AlertTitle>Something needs another try</AlertTitle><AlertDescription>{children}</AlertDescription>{retry && <Button variant="outline" onClick={retry}>Try again</Button>}</Alert>
}
export function ListSkeleton({ rows = 3 }) {
  return <div role="status" aria-busy="true"><span className="sr-only">Loading birthdays</span><div aria-hidden="true" className="field-group">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton-row"><Skeleton className="size-12" /><div className="flex flex-1 flex-col gap-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/3" /></div></div>)}</div></div>
}
export function GlobeSkeleton() {
  return <div className="globe-placeholder" role="status" aria-busy="true"><Skeleton className="globe-skeleton" aria-hidden="true" /><span>Preparing the atlas…</span></div>
}
export function AppSkeleton() {
  return <main className="page-width loading-page" aria-busy="true"><Wordmark /><div className="hero-layout"><div className="field-group"><Skeleton className="h-5 w-48" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-3/4" /><Skeleton className="h-12 w-2/3" /><ListSkeleton rows={2} /></div><GlobeSkeleton /></div><span className="sr-only" role="status">Loading your birthday calendar</span></main>
}
export function FieldGroup({ children, className }) { return <div className={cn('field-group', className)}>{children}</div> }
export function Field({ label, children, hint, id }) {
  return <div className="field"><Label htmlFor={id}>{label}</Label>{children}{hint && <p className="field-hint">{hint}</p>}</div>
}
export function TextField({ label, hint, ...props }) {
  const id = useId()
  return <Field label={label} id={id} hint={hint}><Input id={id} {...props} /></Field>
}
export function SelectField({ label, children, onChange, ...props }) {
  const id = useId()
  return <Field label={label} id={id}><select id={id} className="native-select" onChange={(event) => onChange(event.target.value)} {...props}>{children}</select></Field>
}
export function BirthdayFields({ month, day, year, setMonth, setDay, setYear }) {
  return <fieldset className="birthday-fields"><legend className="sr-only">Birthday</legend><SelectField label="Month" value={month} onChange={(value) => { setMonth(value); setDay('') }} required><option value="">Month</option>{MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</SelectField><SelectField label="Day" value={day} onChange={setDay} required><option value="">Day</option>{Array.from({ length: month ? daysInMonth(Number(month), year ? Number(year) : 2000) : 31 }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</SelectField><TextField label="Year" type="number" min="1900" max={new Date().getFullYear()} value={year} onChange={(event) => { setYear(event.target.value); if (day && Number(day) > daysInMonth(Number(month), Number(event.target.value) || 2000)) setDay('') }} placeholder="Optional" /></fieldset>
}
export function ToggleRow({ title, desc, checked, onChange, disabled }) {
  const id = useId()
  return <div className="toggle-row"><div><Label htmlFor={id}>{title}</Label><p id={`${id}-description`} className="muted">{desc}</p></div><Switch id={id} aria-describedby={`${id}-description`} checked={checked} onCheckedChange={onChange} disabled={disabled} /></div>
}
export function DateTile({ month, day, large = false }) {
  return <span className={cn('date-tile', large && 'date-tile-large')}><span className="font-serif">{String(day).padStart(2, '0')}</span><span>{MONTH_ABBR[month - 1]}</span></span>
}
export function PersonRow({ person, onClick, action }) {
  const content = <><DateTile month={person.birth_month} day={person.birth_day} /><span className="person-copy"><strong>{person.display_name || person.person_name || person.name}</strong><span className="muted">{person.relationship || countryName(person)}</span></span></>
  return <div className="person-row">{onClick ? <button className="person-link" onClick={onClick}>{content}</button> : <div className="person-link">{content}</div>}{action}</div>
}
export function AsyncButton({ onClick, pendingText = 'Please wait…', children, ...props }) {
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  return <Button {...props} disabled={busy || props.disabled} aria-busy={busy} onClick={async () => { if (inFlight.current) return; inFlight.current = true; setBusy(true); try { await onClick() } finally { inFlight.current = false; setBusy(false) } }}>{busy ? pendingText : children}</Button>
}
export function ConfirmAction({ label = 'Remove', title, description, onConfirm }) {
  const [open, setOpen] = useState(false)
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost">{label}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><div className="action-row"><Button variant="outline" onClick={() => setOpen(false)}>Keep it</Button><AsyncButton variant="destructive" onClick={async () => { if (await onConfirm()) setOpen(false) }} pendingText="Removing…">Confirm removal</AsyncButton></div></DialogContent></Dialog>
}
export function PersonDialog({ person, onClose, followedIds = [], follow, unfollow, meId, onStart }) {
  const restoreFocus = useRef(typeof document !== 'undefined' ? document.activeElement : null)
  const following = followedIds.includes(person.id)
  const days = daysUntil(person.birth_month, person.birth_day)
  const nextYear = new Date().getFullYear() + ((person.birth_month < new Date().getMonth() + 1 || (person.birth_month === new Date().getMonth() + 1 && person.birth_day < new Date().getDate())) ? 1 : 0)
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus.current?.focus() }}><DialogHeader><p className="eyebrow">A day worth remembering</p><DialogTitle>{person.display_name}</DialogTitle><DialogDescription>{countryName(person)}</DialogDescription></DialogHeader><div className="person-date"><DateTile month={person.birth_month} day={person.birth_day} large /><div><p className="font-serif">{untilLabel(days)}</p>{person.birth_year_public && person.birth_year && <p className="muted">{days === 0 ? 'Turning' : 'Turns'} {nextYear - person.birth_year}</p>}</div></div><div className="action-row">{person.x_handle && <Button asChild variant="outline"><a href={`https://x.com/${encodeURIComponent(person.x_handle.replace(/^@/, ''))}`} target="_blank" rel="noreferrer">X · {person.x_handle}</a></Button>}{person.instagram_handle && <Button asChild variant="outline"><a href={`https://instagram.com/${encodeURIComponent(person.instagram_handle.replace(/^@/, ''))}`} target="_blank" rel="noreferrer">Instagram</a></Button>}</div>{onStart ? <Button onClick={onStart}>Join to remember this birthday</Button> : person.id !== meId && (following ? <ConfirmAction label="Following · Unfollow" title="Stop following this birthday?" description="This person will be removed from your subscriptions." onConfirm={() => unfollow(person.id)} /> : <AsyncButton onClick={() => follow(person.id)} pendingText="Following…">Follow this birthday</AsyncButton>)}</DialogContent></Dialog>
}
