'use client'

import { Component, useCallback, useEffect, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { MeshBasicMaterial } from 'three'
import { Button, GlobeSkeleton } from '@/components/birthday-ui'

class GlobeBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <div className="globe-fallback"><img src="/atlas.png" alt="World atlas with green land and ivory oceans" /><p>The interactive globe is unavailable. All birthday details are available in the lists below.</p></div> : this.props.children }
}
function Atlas({ points, onPointClick }) {
  const globe = useRef(), container = useRef(), readyRef = useRef(false)
  const [dimensions, setDimensions] = useState(null), [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(true), [failed, setFailed] = useState(false)
  const [material] = useState(() => new MeshBasicMaterial())
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width)
      setDimensions({ width, height: Math.round(Math.min(490, Math.max(285, width * 0.88))) })
    })
    observer.observe(container.current)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motionChanged = () => setPaused(media.matches)
    motionChanged(); media.addEventListener('change', motionChanged)
    return () => { observer.disconnect(); media.removeEventListener('change', motionChanged) }
  }, [])
  useEffect(() => { if (ready && globe.current) globe.current.controls().autoRotate = !paused }, [ready, paused])
  useEffect(() => {
    if (!ready || !globe.current) return
    const canvas = globe.current.renderer().domElement
    const lost = (event) => { event.preventDefault(); setFailed(true) }
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [ready])
  useEffect(() => {
    const timer = setTimeout(() => { if (!readyRef.current) setFailed(true) }, 20000)
    return () => clearTimeout(timer)
  }, [])
  const onReady = useCallback(() => {
    readyRef.current = true; setReady(true)
    const controls = globe.current.controls()
    controls.enableZoom = false; controls.enablePan = false; controls.autoRotateSpeed = 0.3
    globe.current.pointOfView({ lat: 15, lng: 30, altitude: 1.9 })
    globe.current.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    globe.current.renderer().domElement.style.touchAction = 'pan-y'
  }, [])
  return <div className="atlas-component"><div ref={container} className="globe-canvas-wrap" aria-label="Interactive birthday globe. The same birthdays are listed in text." style={dimensions ? { minHeight: dimensions.height } : undefined}>{failed ? <div className="globe-fallback"><img src="/atlas.png" alt="World atlas with approximate country locations" /><p>Explore the birthday list below. The 3D view isn&apos;t available in this browser.</p></div> : <>{!ready && <GlobeSkeleton />}{dimensions && <div className={ready ? 'globe-renderer' : 'globe-renderer globe-not-ready'} aria-hidden="true"><Globe ref={globe} {...dimensions} globeImageUrl="/atlas.png" globeMaterial={material} backgroundColor="rgba(0,0,0,0)" showAtmosphere={false} showGraticules={false} animateIn={false} onGlobeReady={onReady} pointsData={points} pointLat="lat" pointLng="lng" pointColor={(point) => point.today ? '#c94a28' : '#355d49'} pointRadius="r" pointAltitude="alt" pointLabel={(point) => { const label = document.createElement('span'); label.className = 'atlas-tooltip'; label.textContent = point.label; return label }} pointsMerge={false} onPointClick={onPointClick} /></div>}</>}</div><div className="atlas-controls"><span className="atlas-legend"><span className="legend-today">Today</span><span className="legend-other">Other birthdays</span></span><Button variant="ghost" size="sm" disabled={!ready || failed} onClick={() => setPaused((value) => !value)} aria-pressed={paused}>{paused ? 'Resume rotation' : 'Pause rotation'}</Button></div><p className="atlas-credit">Approximate locations · Map: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a></p></div>
}
export default function GlobeView({ points = [], onPointClick }) { return <GlobeBoundary><Atlas {...{ points, onPointClick }} /></GlobeBoundary> }
