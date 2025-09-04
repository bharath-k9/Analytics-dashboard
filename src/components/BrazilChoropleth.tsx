import React, { useEffect, useMemo, useState } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps'
import { geoCentroid } from 'd3-geo' // Fixed import - using specific named import
import { scaleSequential } from 'd3-scale'
import { interpolateYlOrRd } from 'd3-scale-chromatic'

export type StateRow = {
  state?: string
  customers?: number
  revenue?: number
  topProductName?: string
  topProductRevenue?: number
}

interface Props {
  data: StateRow[]
  width?: number
  height?: number
  showTopProductInLabel?: boolean
  showAllLabels?: boolean
  labelThreshold?: number
}

function extractStateCodeFromFeature(f: any): string {
  const props = f?.properties ?? {}
  const candidates = [
    'sigla', 'SIGLA', 'abbr', 'ABBREV', 'st', 'UF', 'uf', 'code', 'CD_GEOCODU', 'ISO_UF', 'sigla_uf', 'name', 'NAME_1'
  ]
  for (const k of candidates) {
    if (props[k]) return String(props[k]).trim().toUpperCase()
  }
  if (props.nome) return String(props.nome).trim().toUpperCase()
  if (props.name) return String(props.name).trim().toUpperCase()
  return ''
}

const nameToCodeMap: Record<string, string> = {
  'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPÁ': 'AP', 'AMAPA': 'AP', 'AMAZONAS': 'AM', 'BAHIA': 'BA',
  'CEARÁ': 'CE', 'CEARA': 'CE', 'DISTRITO FEDERAL': 'DF', 'ESPÍRITO SANTO': 'ES', 'ESPIRITO SANTO': 'ES',
  'GOIÁS': 'GO', 'GOIAS': 'GO', 'MARANHÃO': 'MA', 'MARANHAO': 'MA', 'MATO GROSSO': 'MT',
  'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG', 'PARÁ': 'PA', 'PARA': 'PA',
  'PARAÍBA': 'PB', 'PARAIBA': 'PB', 'PARANÁ': 'PR', 'PARANA': 'PR', 'PERNAMBUCO': 'PE',
  'PIAUÍ': 'PI', 'PIAUI': 'PI', 'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN',
  'RIO GRANDE DO SUL': 'RS', 'RONDÔNIA': 'RO', 'RONDONIA': 'RO', 'RORAIMA': 'RR', 'SANTA CATARINA': 'SC',
  'SÃO PAULO': 'SP', 'SAO PAULO': 'SP', 'SERGIPE': 'SE', 'TOCANTINS': 'TO'
}

const BrazilChoropleth: React.FC<Props> = ({
  data = [],
  width = 900,
  height = 560,
  showTopProductInLabel = true,
  showAllLabels = false,
  labelThreshold = 1000
}) => {
  const [geo, setGeo] = useState<any | null>(null)
  const [hover, setHover] = useState<{ id?: string; label?: string; value?: number } | null>(null)

  useEffect(() => {
    const url = (import.meta.env.BASE_URL ?? '/') + 'brazil-states.json'
    fetch(url)
      .then(async (res) => {
        const text = await res.text()
        try {
          const json = JSON.parse(text)
          setGeo(json)
        } catch (err) {
          console.error('Failed to parse brazil-states.json', err)
        }
      })
      .catch(err => console.error('fetch error', err))
  }, [])

  // data lookup by state code
  const lookup = useMemo(() => {
    const m = new Map<string, StateRow>()
    data.forEach(d => {
      const code = String(d.state ?? '').trim().toUpperCase()
      if (!code) return
      const prev = m.get(code) ?? { state: code, customers: 0, revenue: 0 }
      prev.customers = (prev.customers || 0) + (Number(d.customers ?? 0) || 0)
      prev.revenue = (prev.revenue || 0) + (Number(d.revenue ?? 0) || 0)
      if (d.topProductName) prev.topProductName = d.topProductName
      if (typeof d.topProductRevenue === 'number') prev.topProductRevenue = d.topProductRevenue
      m.set(code, prev)
    })
    return m
  }, [data])

  // min/max for color scale
  const [min, max] = useMemo(() => {
    const vals = Array.from(lookup.values()).map(v => v.customers ?? 0)
    if (!vals.length) return [0, 0]
    return [Math.min(...vals), Math.max(...vals)]
  }, [lookup])

  const colorScale = useMemo(() => {
    if (max <= 0) return (_: number) => '#e6eef6'
    const scale = scaleSequential(interpolateYlOrRd).domain([min, max])
    return (v: number) => scale(v)
  }, [min, max])

  if (!geo) return <div className="p-6 text-muted-foreground">Loading map...</div>

  const truncate = (s?: string, n = 26) => {
    if (!s) return ''
    return s.length > n ? s.slice(0, n - 1) + '…' : s
  }

  return (
    <div className="choropleth-container" style={{ width: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 className="text-lg font-semibold">Brazil — Customers & Top Product by State</h3>
          <div className="text-xs text-muted-foreground">Hover a state for details</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12 }} className="text-muted-foreground">Legend</div>
          <div
            style={{
              width: 140,
              height: 10,
              borderRadius: 6,
              background: `linear-gradient(90deg, ${colorScale(min)}, ${colorScale((min + max) / 2)}, ${colorScale(max)})`
            }}
          />
        </div>
      </div>

      <div style={{ background: 'linear-gradient(180deg,#ffffff, #f6f8fb)', padding: 14, borderRadius: 10 }}>
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 700 }} width={width} height={height}>
          <ZoomableGroup center={[-54, -14]} zoom={1}>
            <Geographies geography={geo}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geoFeat: any) => {
                  const rawCode = extractStateCodeFromFeature(geoFeat)
                  let code = rawCode
                  if (code.length > 2) {
                    const mapped = nameToCodeMap[code.toUpperCase()]
                    if (mapped) code = mapped
                  }
                  const dataRow = lookup.get(String(code).toUpperCase())
                  const customers = dataRow?.customers ?? 0
                  const fill = customers ? colorScale(customers) : '#e6eef6'
                  const nameLabel = (geoFeat.properties?.name || geoFeat.properties?.nome || rawCode || '').toString()

                  // centroid for label placement
                  let centroid: [number, number] = [0, 0]
                  try {
                    centroid = geoCentroid(geoFeat as any) // Fixed usage - direct function call
                  } catch {
                    centroid = [0, 0]
                  }

                  const showLabel = showAllLabels || customers >= labelThreshold

                  return (
                    <React.Fragment key={geoFeat.rsmKey}>
                      <Geography
                        geography={geoFeat}
                        fill={fill}
                        onMouseEnter={() => setHover({ id: rawCode, label: nameLabel, value: customers })}
                        onMouseLeave={() => setHover(null)}
                        style={{
                          default: { stroke: '#cbd5e1', strokeWidth: 0.5, outline: 'none' },
                          hover: { stroke: '#222', strokeWidth: 1.2, outline: 'none', cursor: 'pointer' },
                          pressed: { outline: 'none' }
                        }}
                      />

                      {showLabel && centroid && centroid.length > 0 && ( // Fixed comparison
                        <Marker coordinates={centroid} key={`${geoFeat.rsmKey}-label`}>
                          <g transform="translate(-40, -26)">
                            <rect
                              rx={8}
                              width={88}
                              height={44}
                              fill="rgba(255,255,255,0.98)"
                              stroke="rgba(0,0,0,0.06)"
                            />
                          </g>

                          <text
                            textAnchor="middle"
                            y={-8}
                            style={{
                              fontFamily: 'Inter, Arial, sans-serif',
                              fontSize: 11,
                              fontWeight: 800,
                              fill: '#0b1220',
                              pointerEvents: 'none'
                            }}
                          >
                            {truncate(nameLabel, 10)} · {customers.toLocaleString()} 🧑‍🤝‍🧑
                          </text>

                          {showTopProductInLabel && (
                            <text
                              textAnchor="middle"
                              y={10}
                              style={{
                                fontFamily: 'Inter, Arial, sans-serif',
                                fontSize: 10,
                                fontWeight: 600,
                                fill: '#0b1220',
                                pointerEvents: 'none'
                              }}
                            >
                              {dataRow?.topProductName
                                ? `${truncate(dataRow.topProductName, 26)} · $${Number(
                                    dataRow.topProductRevenue ?? 0
                                  ).toLocaleString()}`
                                : '—'}
                            </text>
                          )}
                        </Marker>
                      )}
                    </React.Fragment>
                  )
                })
              }
            </Geographies>

            {/* Optional: point markers if data has lat/lon */}
            {data
              .filter(d => typeof (d as any).lat === 'number' && typeof (d as any).lon === 'number')
              .map((pt, i) => (
                <Marker key={`pt-${i}`} coordinates={[(pt as any).lon, (pt as any).lat]}>
                  <g transform="translate(-6, -12)">
                    <circle r={6} fill="#ff7f0e" stroke="#ffffff" strokeWidth={1} />
                  </g>
                </Marker>
              ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      <div style={{ marginTop: 12 }}>
        {hover ? (
          <div style={{ color: '#0b1220' }}>
            <strong>{hover.label}</strong>: {(hover.value ?? 0).toLocaleString()} customers
          </div>
        ) : (
          <div className="text-muted-foreground">Move your mouse over a state to see customer counts</div>
        )}
      </div>
    </div>
  )
}

export default BrazilChoropleth