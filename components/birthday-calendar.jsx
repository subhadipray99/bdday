'use client'

import { useMemo, useState } from 'react'
import { Button, SectionTitle, EmptyState, PersonRow } from '@/components/birthday-ui'
import { MONTHS, daysInMonth } from '@/lib/birthday'
import { cn } from '@/lib/utils'

export default function BirthdayCalendar({ entries, mode, onSelect }) {
  const today = new Date()
  const [view, setView] = useState({ month: today.getMonth() + 1, year: today.getFullYear() })
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [rovingDay, setRovingDay] = useState(today.getDate())
  const firstDow = new Date(view.year, view.month - 1, 1).getDay()
  const count = daysInMonth(view.month, view.year)
  const byDay = useMemo(() => { const days = {}; entries.filter((entry) => entry.birth_month === view.month).forEach((entry) => { (days[entry.birth_day] ||= []).push(entry) }); return days }, [entries, view.month])
  function navigate(offset) {
    const next = new Date(view.year, view.month - 1 + offset, 1)
    setView({ year: next.getFullYear(), month: next.getMonth() + 1 }); setSelectedDay(1); setRovingDay(1)
  }
  function moveFocus(event, day) {
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    let next = day + (offsets[event.key] || 0)
    if (event.key === 'Home') next = 1
    else if (event.key === 'End') next = count
    else if (!Object.hasOwn(offsets, event.key)) return
    event.preventDefault(); next = Math.min(count, Math.max(1, next)); setRovingDay(next)
    document.getElementById(`calendar-day-${next}`)?.focus()
  }
  return <section><SectionTitle eyebrow={`${mode} calendar`} title={`${MONTHS[view.month - 1]} ${view.year}`} subtitle="Choose a date to see every birthday on that day." action={<div className="calendar-navigation"><Button variant="outline" aria-label="Previous month" onClick={() => navigate(-1)}>←</Button><Button variant="ghost" onClick={() => { setView({ month: today.getMonth() + 1, year: today.getFullYear() }); setSelectedDay(today.getDate()); setRovingDay(today.getDate()) }}>Today</Button><Button variant="outline" aria-label="Next month" onClick={() => navigate(1)}>→</Button></div>} /><div className="calendar-week" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid" role="group" aria-label={`${MONTHS[view.month - 1]} ${view.year} birthday dates`}>{Array.from({ length: firstDow }, (_, index) => <div key={`blank-${index}`} className="calendar-blank" />)}{Array.from({ length: count }, (_, index) => {
    const day = index + 1, people = byDay[day] || []
    const isToday = view.year === today.getFullYear() && view.month === today.getMonth() + 1 && day === today.getDate()
    return <button type="button" key={day} id={`calendar-day-${day}`} tabIndex={day === rovingDay ? 0 : -1} aria-pressed={day === selectedDay} aria-current={isToday ? 'date' : undefined} aria-label={`${MONTHS[view.month - 1]} ${day}, ${view.year}${isToday ? ', today' : ''}, ${people.length} birthdays`} onKeyDown={(event) => moveFocus(event, day)} onClick={() => { setSelectedDay(day); setRovingDay(day) }} className={cn('calendar-cell', isToday && 'calendar-today', selectedDay === day && 'calendar-selected')}><span className="calendar-number">{day}</span><span className="calendar-names">{people.slice(0, 2).map((person) => <span key={`${person.source}-${person.id}`}>{person.name}</span>)}{people.length > 2 && <span>+{people.length - 2} more</span>}</span>{people.length > 0 && <span className="calendar-mobile-count">{people.length}<span className="sr-only"> birthdays</span></span>}</button>
  })}</div><div className="day-agenda" aria-live="polite"><SectionTitle eyebrow="The birthday list" title={`${MONTHS[view.month - 1]} ${selectedDay}`} subtitle={`${(byDay[selectedDay] || []).length} birthdays · ${view.year}`} />{(byDay[selectedDay] || []).length ? byDay[selectedDay].map((entry) => <PersonRow key={`${entry.source}-${entry.id}`} person={entry} onClick={['public', 'subscribed'].includes(entry.source) ? () => onSelect(entry) : undefined} />) : <EmptyState title="A little room in the calendar.">No birthdays on this date. Choose another day to keep exploring.</EmptyState>}</div></section>
}
