'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button, Wordmark, Footer, GlobeSkeleton, PersonRow, PersonDialog, DateTile, EmptyState, ListSkeleton, ErrorNotice } from '@/components/birthday-ui'
import { buildGlobePoints, MONTHS, daysUntil } from '@/lib/birthday'

export const BirthdayGlobe = dynamic(() => import('@/components/GlobeView'), { ssr: false, loading: GlobeSkeleton })

export default function Landing({ publicBirthdays, onStart, loading, error, retry }) {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const points = useMemo(() => buildGlobePoints(publicBirthdays, month, day), [publicBirthdays, month, day])
  const todays = publicBirthdays.filter((birthday) => birthday.birth_month === month && birthday.birth_day === day)
  const week = publicBirthdays.filter((birthday) => { const days = daysUntil(birthday.birth_month, birthday.birth_day); return days > 0 && days <= 7 })
  const [selected, setSelected] = useState(null)
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="masthead page-width"><Wordmark onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} /><nav aria-label="Main navigation" className="masthead-actions"><a className="text-link explore-nav" href="#atlas">The globe</a><Button variant="ghost" onClick={() => onStart('login')}>Sign in</Button><Button onClick={() => onStart('signup')}>Get started <span aria-hidden="true">→</span></Button></nav></header>
    <main id="main" className="page-width">
      <div className="edition-line"><span>A global birthday almanac</span><time dateTime={`${now.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`}>{MONTHS[month - 1]} {day}, {now.getFullYear()}</time></div>
      <section className="hero-layout">
        <div className="hero-copy"><p className="eyebrow">Good people. Important dates.</p><h1 className="font-serif text-balance">Never miss<br />their <em>big day.</em></h1><p className="hero-description">A whole world of birthdays. One place to remember the people who make yours better.</p><div className="hero-actions"><Button size="lg" onClick={() => onStart('signup')}>Add your birthday <span aria-hidden="true">→</span></Button><a href="#atlas" className="text-link">Take a look around <span aria-hidden="true">↓</span></a></div><p className="hero-footnote">Your people. Your calendar. A little more connected.</p></div>
        <div className="hero-atlas" id="atlas" tabIndex={-1}><div className="atlas-heading"><span className="eyebrow">Somewhere, it&apos;s someone&apos;s day.</span><span className="atlas-edition">EST. EVERY DAY</span></div><BirthdayGlobe points={points} onPointClick={(point) => setSelected(point.data)} /><div className="atlas-caption"><span>One planet. Countless reasons to celebrate.</span><span className="font-serif">The birthday atlas</span></div></div>
      </section>
      <section className="today-ledger" aria-labelledby="today-title" aria-busy={loading}>
        <div className="ledger-date"><DateTile month={month} day={day} large /><div><p className="eyebrow">The daily roll call</p><h2 id="today-title" className="font-serif">Born to be<br />celebrated.</h2><p className="muted">Today, around the world.</p></div></div>
        <div className="ledger-people">{loading ? <ListSkeleton rows={2} /> : error ? <ErrorNotice retry={retry} /> : todays.length ? <div className="birthday-list">{todays.map((birthday) => <PersonRow key={birthday.id} person={birthday} onClick={() => setSelected(birthday)} />)}</div> : <EmptyState title="A quiet day on the globe.">No public birthdays today. Yours could be the next date worth remembering.</EmptyState>}</div>
        <div className="ledger-next"><p className="eyebrow">Just around the corner</p>{loading ? <ListSkeleton rows={1} /> : error ? <p className="muted">Upcoming dates are unavailable.</p> : <><p className="ledger-count font-serif">{String(week.length).padStart(2, '0')}</p><p>birthdays in the next 7 days</p></>}<button className="text-link" onClick={() => onStart('signup')}>Start your calendar <span aria-hidden="true">→</span></button></div>
      </section>
      {!loading && !error && <details className="all-birthdays"><summary>Browse all public birthdays ({publicBirthdays.length})</summary>{publicBirthdays.length ? publicBirthdays.map((person) => <PersonRow key={person.id} person={person} onClick={() => setSelected(person)} />) : <p className="muted">No public birthdays have been shared yet.</p>}</details>}
      <section className="how-section" aria-labelledby="how-title"><div className="how-heading"><p className="eyebrow">Less forgetting. More celebrating.</p><h2 className="font-serif" id="how-title">Small gestures.<br />A world of difference.</h2></div><ol className="how-steps"><li><span className="step-number font-serif">1.</span><div><h3>Put your day on the map.</h3><p className="muted">Share your birthday with the world, or keep it between you and your calendar.</p></div></li><li><span className="step-number font-serif">2.</span><div><h3>Bring your people closer.</h3><p className="muted">Follow friends across the globe. Add private birthdays for everyone else you love.</p></div></li><li><span className="step-number font-serif">3.</span><div><h3>Be the one who remembers.</h3><p className="muted">Choose email reminders for three days before, the day before, or the morning of.</p></div></li></ol></section>
    </main><Footer />{selected && <PersonDialog person={selected} onClose={() => setSelected(null)} onStart={() => onStart('signup')} />}
  </>
}
