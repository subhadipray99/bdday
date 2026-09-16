'use client'

import { useRef, useEffect, useState } from 'react'
import Globe from 'react-globe.gl'

export default function GlobeView({ points = [], onPointClick }) {
  const globeEl = useRef()
  const wrapRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 600, height: 440 })
  const [globeReady, setGlobeReady] = useState(false)

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        const h = w < 480 ? 320 : w < 768 ? 380 : 450
        setDimensions({ width: Math.max(280, Math.floor(w)), height: h })
      }
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (globeEl.current) {
      const controls = globeEl.current.controls()
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.5
      controls.enableZoom = true
      controls.zoomSpeed = 0.6
      globeEl.current.pointOfView({ altitude: 2.2 })
    }
  }, [globeReady])

  return (
    <div ref={wrapRef} className="w-full relative flex justify-center items-center select-none overflow-hidden rounded-2xl">
      {!globeReady && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 z-0"
          style={{ height: dimensions.height }}
        >
          <div className="w-32 h-32 rounded-full border-2 border-emerald-500/20 border-t-emerald-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mt-4">Loading Atlas</p>
        </div>
      )}
      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(248, 249, 250, 0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        atmosphereColor="#10B981"
        atmosphereAltitude={0.14}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d) => d.color}
        pointRadius={(d) => d.r}
        pointAltitude={(d) => d.alt}
        pointLabel={(d) => d.label}
        pointsMerge={false}
        onPointClick={onPointClick}
        onGlobeReady={() => setGlobeReady(true)}
      />
    </div>
  )
}
