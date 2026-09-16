import { geoEquirectangular, geoPath, geoGraticule10, geoArea } from '../node_modules/d3-geo/src/index.js'
import sharp from '../node_modules/sharp/lib/index.js'
const response = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson')
if (!response.ok) throw new Error('Natural Earth download failed')
const land = await response.json()
for (const feature of land.features) {
  if (geoArea(feature) > 2 * Math.PI) {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
    for (const rings of polygons) for (const ring of rings) ring.reverse()
  }
}
const path = geoPath(geoEquirectangular().scale(2048 / (2 * Math.PI)).translate([1024, 512]))
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1024"><rect width="2048" height="1024" fill="#f5f0e5"/><path d="${path(land)}" fill="#6c8776" stroke="#355d49" stroke-width=".6"/><path d="${path(geoGraticule10())}" fill="none" stroke="#355d49" stroke-opacity=".24" stroke-width=".6"/></svg>`
await sharp(Buffer.from(svg)).png().toFile(new URL('../public/atlas.png', import.meta.url).pathname)
console.log('Created atlas.png from public-domain Natural Earth geometry')
