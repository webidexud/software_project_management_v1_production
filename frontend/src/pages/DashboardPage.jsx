// frontend/src/pages/DashboardPage.jsx — v2.1 Responsive FINAL
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LTooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ComposedChart, Bar, Line, BarChart, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, Area,
} from 'recharts'
import {
  MapPin, Globe2, DollarSign, Layers, Filter, X, TrendingUp,
  Search, BarChart3, Activity, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Percent, Calendar,
} from 'lucide-react'
import api from '../services/api'
import useBreakpoint from '../hooks/useBreakpoint'

/* ─── Constantes ─────────────────────────────────────────────────── */
const REGION_CENTERS = {
  CARIBE:    { lat: 10.4,  lng: -74.8  },
  ANDINA:    { lat: 4.6,   lng: -75.3  },
  PACIFICA:  { lat: 4.0,   lng: -77.2  },
  ORINOQUIA: { lat: 4.8,   lng: -70.5  },
  AMAZONIA:  { lat: -1.0,  lng: -72.0  },
  INSULAR:   { lat: 12.55, lng: -81.72 },
}
const REGION_COLORS = {
  CARIBE: '#0EA5E9', ANDINA: '#8B5CF6', PACIFICA: '#10B981',
  ORINOQUIA: '#F59E0B', AMAZONIA: '#22C55E', INSULAR: '#EC4899',
  NACIONAL: '#B91C3C', INTERNACIONAL: '#64748B',
}
const REGION_LABELS = {
  CARIBE: 'Caribe', ANDINA: 'Andina', PACIFICA: 'Pacífica',
  ORINOQUIA: 'Orinoquía', AMAZONIA: 'Amazonía', INSULAR: 'Insular',
  NACIONAL: 'Nacional', INTERNACIONAL: 'Internacional',
}
const GEO_REGIONS = ['CARIBE', 'ANDINA', 'PACIFICA', 'ORINOQUIA', 'AMAZONIA', 'INSULAR']
const ALL_REGIONS  = [...GEO_REGIONS, 'NACIONAL', 'INTERNACIONAL']

/* ─── Helpers ────────────────────────────────────────────────────── */
const fmtMoney = v => {
  const n = parseFloat(v)
  if (!v || isNaN(n)) return '—'
  // Escala colombiana: billón = 10^12, mil millones = 10^9
  if (n >= 1e12) return `$${(n / 1e12).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} bill.`
  if (n >= 1e9)  return `$${(n / 1e9).toLocaleString('es-CO',  { minimumFractionDigits: 0, maximumFractionDigits: 1 })} mil mill.`
  if (n >= 1e6)  return `$${(n / 1e6).toLocaleString('es-CO',  { minimumFractionDigits: 0, maximumFractionDigits: 1 })} mill.`
  return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}
const fmtMoneyFull = v => {
  const n = parseFloat(v)
  if (!v || isNaN(n)) return '$0'
  return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}
const fmtDate = d => d
  ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'

/* ─── ChartCard ──────────────────────────────────────────────────── */
function ChartCard({ title, subtitle, children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 14,
      border: '1px solid var(--border-color)', padding: '18px 20px', ...style,
    }}>
      {title && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

/* ─── Tooltip Recharts ───────────────────────────────────────────── */
function CTooltip({ active, payload, label, valueFmt }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: 9, padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.13)', fontSize: 12, fontFamily: 'inherit',
    }}>
      {label && <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{p.name}:</span>
          <span style={{ color: p.color, fontWeight: 700 }}>
            {valueFmt ? valueFmt(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── KPI Card ───────────────────────────────────────────────────── */
function KPICard({ label, value, sub, color, Icon, onClick, active }) {
  return (
    <div onClick={onClick} style={{
      padding: '14px 16px', borderRadius: 12, background: 'var(--bg-card)',
      border: `1px solid ${active ? color : 'var(--border-color)'}`,
      cursor: onClick ? 'pointer' : 'default',
      boxShadow: active ? `0 0 0 3px ${color}22` : 'none',
      transition: 'all .15s', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', right: -10, top: -10, width: 60, height: 60,
        borderRadius: '50%', background: `${color}10`, pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <Icon size={13} color={color} />
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.2 }}>{label}</p>
      </div>
      <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.3 }}>{sub}</p>}
    </div>
  )
}

/* ─── FilterBar ──────────────────────────────────────────────────── */
function FilterBar({ filters, onChange, years, statuses, types, count, total, isMobile }) {
  const IS = {
    height: 34, padding: '0 10px', borderRadius: 8,
    border: '1px solid var(--border-color)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
  }
  const set    = (k, v) => onChange({ ...filters, [k]: v })
  const hasAny = Object.values(filters).some(v => v && v !== '')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      padding: '12px 14px', background: 'var(--bg-card)',
      borderRadius: 12, border: '1px solid var(--border-color)',
    }}>
      <Filter size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />

      <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
        <Search size={12} color="var(--text-muted)"
          style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={filters.search || ''}
          onChange={e => set('search', e.target.value)}
          placeholder={isMobile ? 'Buscar...' : 'Buscar por nombre, N° o entidad...'}
          style={{ ...IS, width: '100%', paddingLeft: 28, boxSizing: 'border-box' }}
        />
      </div>

      <select value={filters.year || ''} onChange={e => set('year', e.target.value)}
        style={{ ...IS, minWidth: isMobile ? 'calc(50% - 20px)' : 120, flex: isMobile ? '1 1 auto' : 'none' }}>
        <option value="">Todos los años</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      <select value={filters.status || ''} onChange={e => set('status', e.target.value)}
        style={{ ...IS, minWidth: isMobile ? 'calc(50% - 20px)' : 155, flex: isMobile ? '1 1 auto' : 'none' }}>
        <option value="">Todos los estados</option>
        {statuses.map(s => <option key={s.status_id} value={s.status_id}>{s.status_name}</option>)}
      </select>

      {/* Tipo de proyecto — siempre visible */}
      <select value={filters.type || ''} onChange={e => set('type', e.target.value)}
        style={{ ...IS, minWidth: isMobile ? 'calc(50% - 20px)' : 160, flex: isMobile ? '1 1 auto' : 'none' }}>
        <option value="">Todos los tipos</option>
        {types.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
      </select>

      {!isMobile && (
        <>
          <select value={filters.region || ''} onChange={e => set('region', e.target.value)}
            style={{ ...IS, minWidth: 145 }}>
            <option value="">Todas las regiones</option>
            {ALL_REGIONS.map(r => <option key={r} value={r}>{REGION_LABELS[r]}</option>)}
          </select>
          <select value={filters.supervisor || ''} onChange={e => set('supervisor', e.target.value)}
            style={{ ...IS, minWidth: 155 }}>
            <option value="">Todos los supervisores</option>
            <option value="JEFE_EXTENSION">Jefe Extensión</option>
            <option value="RECTOR">Rector</option>
          </select>
        </>
      )}

      {hasAny && (
        <button onClick={() => onChange({})} style={{
          display: 'flex', alignItems: 'center', gap: 5, background: 'none',
          border: '1px solid var(--border-color)', borderRadius: 8,
          padding: '0 12px', height: 34, cursor: 'pointer',
          fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit', flexShrink: 0,
        }}>
          <X size={12} />{!isMobile && ' Limpiar'}
        </button>
      )}

      <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
        <span style={{
          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: 'rgba(185,28,60,0.08)', color: '#B91C3C',
          border: '1px solid rgba(185,28,60,0.15)', whiteSpace: 'nowrap',
        }}>
          {count}/{total}
        </span>
      </div>
    </div>
  )
}

/* ─── Mapa ───────────────────────────────────────────────────────── */
function MapPanel({ filtered, regionCounts, selectedRegion, onToggleRegion, isMobile }) {
  const getRadius = () => 14  // radio fijo igual para todas las regiones

  const { regionValues, regionTopEntity } = useMemo(() => {
    const vals = {}, tops = {}
    for (const p of filtered) {
      const r = p.execution_region
      if (r && REGION_CENTERS[r]) {
        vals[r] = (vals[r] || 0) + parseFloat(p.project_value || 0)
        if (!tops[r]) tops[r] = {}
        const en = p.entity_name || '—'
        tops[r][en] = (tops[r][en] || 0) + 1
      }
    }
    const topEnt = {}
    for (const r of GEO_REGIONS) {
      const t = tops[r] || {}
      topEnt[r] = Object.entries(t).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    }
    return { regionValues: vals, regionTopEntity: topEnt }
  }, [filtered])

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-color)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Distribución Regional</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {isMobile ? 'Toca un círculo para filtrar' : 'Clic en un círculo · Tamaño proporcional a proyectos'}
          </p>
        </div>
        {selectedRegion && (
          <button onClick={() => onToggleRegion(null)} style={{
            display: 'flex', alignItems: 'center', gap: 4, background: 'none',
            border: '1px solid var(--border-color)', borderRadius: 6,
            padding: '4px 9px', cursor: 'pointer', fontSize: 11,
            color: 'var(--text-muted)', fontFamily: 'inherit', flexShrink: 0,
          }}>
            <X size={10} /> {!isMobile && 'Quitar filtro'}
          </button>
        )}
      </div>

      <div style={{ borderRadius: 10, overflow: 'hidden', height: isMobile ? 260 : 380, border: '1px solid var(--border-color)' }}>
        <MapContainer
          center={[4.5, -74.5]} zoom={isMobile ? 4 : 5} minZoom={4} maxZoom={8}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false} zoomControl attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

          {Object.entries(REGION_CENTERS).map(([region, pos]) => {
            const cnt    = regionCounts[region] || 0
            const color  = REGION_COLORS[region]
            const isSel  = selectedRegion === region
            const dimmed = selectedRegion && !isSel
            const radius = getRadius(region)
            const fillOp = dimmed ? 0.1 : isSel ? 0.9 : cnt === 0 ? 0.2 : 0.65

            return (
              <CircleMarker key={region} center={[pos.lat, pos.lng]} radius={radius}
                pathOptions={{ fillColor: color, fillOpacity: fillOp, color: isSel ? color : `${color}AA`, weight: isSel ? 3 : 1.5 }}
                eventHandlers={{
                  click:     () => onToggleRegion(region),
                  mouseover: e => e.target.setStyle({ fillOpacity: 0.9, weight: 3 }),
                  mouseout:  e => e.target.setStyle({ fillOpacity: fillOp, weight: isSel ? 3 : 1.5 }),
                }}>
                <Popup maxWidth={220}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans,sans-serif', padding: '4px 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
                      <strong style={{ fontSize: 14, color: '#1e293b' }}>{REGION_LABELS[region]}</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div style={{ padding: '6px 10px', borderRadius: 8, background: '#f8fafc', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'monospace' }}>{cnt}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>proyectos</div>
                      </div>
                      <div style={{ padding: '6px 10px', borderRadius: 8, background: '#f8fafc', textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>{fmtMoney(regionValues[region] || 0)}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>valor total</div>
                      </div>
                    </div>
                    {regionTopEntity[region] && regionTopEntity[region] !== '—' && (
                      <div style={{ fontSize: 10, color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                        <strong>Top entidad: </strong>
                        <span style={{ color: '#475569' }}>{regionTopEntity[region].substring(0, 40)}</span>
                      </div>
                    )}
                  </div>
                </Popup>
                <LTooltip className="tooltip-siexud" direction="top" offset={[0, -radius - 4]}>
                  <div style={{ textAlign: 'center', minWidth: 90 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>{REGION_LABELS[region]}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{cnt} proyecto{cnt !== 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>{fmtMoney(regionValues[region] || 0)}</div>
                  </div>
                </LTooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {ALL_REGIONS.map(r => {
          const cnt   = regionCounts[r] || 0
          const isSel = selectedRegion === r
          return (
            <div key={r} onClick={() => onToggleRegion(r)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px',
              borderRadius: 20, cursor: 'pointer', transition: 'all .15s',
              background: isSel ? `${REGION_COLORS[r]}15` : 'transparent',
              border: `1px solid ${isSel ? REGION_COLORS[r] : 'var(--border-color)'}`,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: REGION_COLORS[r], flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: isSel ? 700 : 400, color: isSel ? REGION_COLORS[r] : 'var(--text-secondary)' }}>
                {REGION_LABELS[r]}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: REGION_COLORS[r], fontFamily: 'monospace' }}>{cnt}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Donut Estados ──────────────────────────────────────────────── */
function EstadosDonut({ filtered, statuses }) {
  const data = useMemo(() => {
    const map = {}
    for (const p of filtered) {
      const sid = p.project_status_id
      if (!map[sid]) {
        const st = statuses.find(s => s.status_id === sid)
        map[sid] = { name: st?.status_name || `Estado ${sid}`, value: 0, color: st?.status_color || '#94a3b8' }
      }
      map[sid].value++
    }
    return Object.values(map).sort((a, b) => b.value - a.value)
  }, [filtered, statuses])

  const total = filtered.length

  return (
    <ChartCard title="Por Estado" subtitle={`${total} proyectos`}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flexShrink: 0 }}>
          <ResponsiveContainer width={150} height={150}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={44} outerRadius={68}
                paddingAngle={2} dataKey="value" stroke="none">
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <RTooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontFamily: 'inherit' }}>
                    <p style={{ fontWeight: 700, color: d.color, margin: '0 0 2px' }}>{d.name}</p>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{d.value} ({total ? Math.round(d.value / total * 100) : 0}%)</p>
                  </div>
                )
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {data.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.name}>{d.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: d.color, fontFamily: 'monospace', flexShrink: 0 }}>{d.value}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 28, textAlign: 'right', flexShrink: 0 }}>
                {total ? `${Math.round(d.value / total * 100)}%` : '0%'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}

/* ─── Supervisor Pie ─────────────────────────────────────────────── */
function SupervisorPie({ filtered }) {
  const data = useMemo(() => {
    let r = 0, j = 0, o = 0
    for (const p of filtered) {
      if (p.supervisor_type === 'RECTOR') r++
      else if (p.supervisor_type === 'JEFE_EXTENSION') j++
      else o++
    }
    return [
      { name: 'Jefe Extensión', value: j, color: '#B91C3C' },
      { name: 'Rector',         value: r, color: '#8B5CF6' },
      ...(o > 0 ? [{ name: 'Sin definir', value: o, color: '#94a3b8' }] : []),
    ].filter(d => d.value > 0)
  }, [filtered])

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ChartCard title="Tipo de Supervisor" subtitle="Ordenador del gasto">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ flexShrink: 0 }}>
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={48} innerRadius={26}
                paddingAngle={2} dataKey="value" stroke="none">
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <RTooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                    <p style={{ fontWeight: 700, color: d.color, margin: 0 }}>{d.name}</p>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{d.value} ({total ? Math.round(d.value / total * 100) : 0}%)</p>
                  </div>
                )
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {data.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, flex: 1, color: 'var(--text-secondary)' }}>{d.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: d.color, fontFamily: 'monospace' }}>{d.value}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>
                {total ? `${Math.round(d.value / total * 100)}%` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}

/* ─── Proyectos + Valor por Año ──────────────────────────────────── */
function ProyectosAnioChart({ filtered }) {
  const data = useMemo(() => {
    const m = {}
    for (const p of filtered) {
      const y = p.project_year
      if (!m[y]) m[y] = { year: String(y), count: 0, valor: 0 }
      m[y].count++
      m[y].valor += parseFloat(p.project_value || 0)
    }
    return Object.values(m).sort((a, b) => Number(a.year) - Number(b.year))
  }, [filtered])

  return (
    <ChartCard title="Proyectos y Valor por Año" subtitle="Barras = cantidad · Línea = valor total">
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="l" width={25} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="r" orientation="right" width={52}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickFormatter={v => fmtMoney(v)} axisLine={false} tickLine={false} />
          <RTooltip content={<CTooltip valueFmt={(v, n) => n === 'Valor' ? fmtMoney(v) : v} />} />
          <Bar yAxisId="l" dataKey="count" name="Proyectos" fill="#B91C3C"
            radius={[5, 5, 0, 0]} maxBarSize={40} opacity={0.85} />
          <Line yAxisId="r" type="monotone" dataKey="valor" name="Valor"
            stroke="#10B981" strokeWidth={2.5}
            dot={{ fill: '#10B981', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/* ─── Top 10 Entidades ───────────────────────────────────────────── */
function TopEntidadesChart({ filtered, isMobile }) {
  const data = useMemo(() => {
    const m = {}
    for (const p of filtered) {
      const name = (p.entity_name || 'Sin entidad').substring(0, isMobile ? 25 : 38)
      if (!m[name]) m[name] = { name, count: 0, valor: 0 }
      m[name].count++
      m[name].valor += parseFloat(p.project_value || 0)
    }
    return Object.values(m).sort((a, b) => b.count - a.count).slice(0, 8).reverse()
  }, [filtered, isMobile])

  return (
    <ChartCard title="Top Entidades Contratantes" subtitle="Por número de proyectos">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name"
            width={isMobile ? 110 : 155}
            tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
          <RTooltip content={<CTooltip valueFmt={(v, n) => n === 'Valor' ? fmtMoney(v) : `${v} proy.`} />} />
          <Bar dataKey="count" name="Proyectos" fill="#8B5CF6"
            radius={[0, 5, 5, 0]} maxBarSize={16}
            label={{ position: 'right', fontSize: 9, fill: 'var(--text-muted)', formatter: v => v }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/* ─── Evolución portafolio ───────────────────────────────────────── */
function EvolucionChart({ filtered }) {
  const data = useMemo(() => {
    const m = {}
    for (const p of filtered) {
      const y = p.project_year
      m[y] = (m[y] || 0) + parseFloat(p.project_value || 0)
    }
    let acc = 0
    return Object.entries(m)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, valor]) => { acc += valor; return { year: String(year), valor, acumulado: acc } })
  }, [filtered])

  return (
    <ChartCard title="Evolución del Portafolio" subtitle="Área = valor anual · Línea = acumulado histórico">
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="gradValorDB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#0EA5E9" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis width={52} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickFormatter={v => fmtMoney(v)} axisLine={false} tickLine={false} />
          <RTooltip content={<CTooltip valueFmt={v => fmtMoney(v)} />} />
          <Area type="monotone" dataKey="valor" name="Valor año"
            stroke="#0EA5E9" fill="url(#gradValorDB)" strokeWidth={2.5} />
          <Line type="monotone" dataKey="acumulado" name="Acumulado"
            stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="5 3" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/* ─── Regiones ───────────────────────────────────────────────────── */
function RegionesChart({ filtered }) {
  const data = useMemo(() =>
    ALL_REGIONS
      .map(r => ({
        region: REGION_LABELS[r],
        count:  filtered.filter(p => p.execution_region === r).length,
        color:  REGION_COLORS[r],
      }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
  , [filtered])

  return (
    <ChartCard title="Proyectos por Región" subtitle="Conteo total por región de ejecución">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 28, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="region" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
            angle={-25} textAnchor="end" axisLine={false} tickLine={false} />
          <YAxis width={22} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <RTooltip content={<CTooltip />} />
          <Bar dataKey="count" name="Proyectos" radius={[5, 5, 0, 0]} maxBarSize={45}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/* ─── Tabla completa ─────────────────────────────────────────────── */
function ProjectsTable({ projects, statuses, navigate, isMobile }) {
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)
  const [sortConfig, setSortConfig] = useState({ field: null, dir: 'asc' })
  const PAGE_SIZE = 15

  const handleSort = field => {
    setSortConfig(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
    setPage(1)
  }

  const SortArrow = ({ field }) => {
    const active = sortConfig.field === field
    return (
      <span style={{ display:'inline-flex', flexDirection:'column', gap:1, marginLeft:4, verticalAlign:'middle', flexShrink:0 }}>
        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
          <path d="M3.5 0L7 5H0L3.5 0Z"
            fill={active && sortConfig.dir==='asc' ? '#0EA5E9' : '#94a3b8'}
            opacity={active && sortConfig.dir==='asc' ? 1 : 0.35}/>
        </svg>
        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
          <path d="M3.5 5L0 0H7L3.5 5Z"
            fill={active && sortConfig.dir==='desc' ? '#0EA5E9' : '#94a3b8'}
            opacity={active && sortConfig.dir==='desc' ? 1 : 0.35}/>
        </svg>
      </span>
    )
  }

  const rows = useMemo(() => {
    if (!search.trim()) return projects
    const q = search.toLowerCase()
    return projects.filter(p =>
      (p.project_name || '').toLowerCase().includes(q) ||
      (p.external_project_number || '').toLowerCase().includes(q) ||
      (p.entity_name || '').toLowerCase().includes(q) ||
      String(p.project_year).includes(q)
    )
  }, [projects, search])

  useEffect(() => setPage(1), [search, projects, sortConfig])

  const sorted = [...rows].sort((a, b) => {
    const { field, dir } = sortConfig
    if (!field) return 0
    const mul = dir === 'asc' ? 1 : -1
    if (['project_value','project_year','project_id'].includes(field))
      return mul * ((parseFloat(a[field])||0) - (parseFloat(b[field])||0))
    return mul * (a[field]||'').toString().localeCompare((b[field]||'').toString(), 'es')
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const getStatus  = sid => statuses.find(s => s.status_id === sid)

  const TH = ({ children, w }) => (
    <th style={{
      padding: '9px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10,
      color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)',
      whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.06em',
      background: 'var(--bg-hover)',
      ...(w ? { width: w } : {}),
    }}>{children}</th>
  )

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(185,28,60,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={17} color="#B91C3C" />
          </div>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Tabla de Proyectos</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{sorted.length} registros · pág. {safePage}/{totalPages}</p>
          </div>
        </div>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 340 }}>
          <Search size={13} color="var(--text-muted)"
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar tabla..."
            style={{
              width: '100%', height: 34, paddingLeft: 28, paddingRight: 10, borderRadius: 8,
              border: '1px solid var(--border-color)', background: 'var(--bg-input)',
              color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box',
            }} />
        </div>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: isMobile ? 700 : 900 }}>
          <thead>
            <tr>
              {[
                { label:'Año',       field:'project_year',   w:50  },
                { label:'N° Externo',field:'external_project_number', w:100 },
                { label:'Nombre',    field:'project_name',   w:null },
                { label:'Entidad',   field:'entity_name',    w:190 },
                { label:'Estado',    field:'project_status_id', w:130 },
                { label:'Valor',     field:'project_value',  w:100 },
                { label:'Inicio',    field:'start_date',     w:100 },
                { label:'Fin',       field:'end_date',       w:100 },
                { label:'Región',    field:'execution_region', w:100 },
                ...(!isMobile ? [{ label:'Supervisor', field:'supervisor_type', w:100 }] : []),
              ].map(({ label, field, w }) => (
                <th key={field}
                  onClick={() => handleSort(field)}
                  style={{
                    padding:'9px 12px', textAlign:'left', fontWeight:700, fontSize:10,
                    color:'var(--text-muted)', borderBottom:'1px solid var(--border-color)',
                    whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:'.06em',
                    background:'var(--bg-hover)', cursor:'pointer', userSelect:'none',
                    transition:'background .15s',
                    ...(w ? { width:w } : {}),
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
                    {label}<SortArrow field={field}/>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={isMobile ? 9 : 10}
                  style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Sin resultados
                </td>
              </tr>
            ) : pageRows.map((p, i) => {
              const st     = getStatus(p.project_status_id)
              const isEven = i % 2 === 0
              return (
                <tr key={p.project_id}
                  onClick={() => navigate(`/projects/${p.project_id}/view`)}
                  style={{
                    background: isEven ? 'transparent' : 'var(--bg-hover)',
                    cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background .1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(185,28,60,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = isEven ? 'transparent' : 'var(--bg-hover)'}>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{p.project_year}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.external_project_number || '—'}</td>
                  <td style={{ padding: '9px 12px', color: 'var(--text-primary)', maxWidth: 260 }}>
                    <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }} title={p.project_name}>{p.project_name}</p>
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', maxWidth: 190 }}>
                    <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }} title={p.entity_name}>{p.entity_name || '—'}</p>
                  </td>
                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                    {st ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                        background: `${st.status_color}15`, color: st.status_color,
                        border: `1px solid ${st.status_color}25`,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.status_color }} />
                        {st.status_name}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '9px 12px', fontFamily: 'inherit', fontWeight: 600, color: '#10B981', whiteSpace: 'nowrap' }}>{fmtMoneyFull(p.project_value)}</td>
                  <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 11 }}>{fmtDate(p.start_date)}</td>
                  <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 11 }}>{fmtDate(p.end_date)}</td>
                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                    {p.execution_region ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 7px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                        background: `${REGION_COLORS[p.execution_region] || '#94a3b8'}15`,
                        color: REGION_COLORS[p.execution_region] || '#94a3b8',
                      }}>{REGION_LABELS[p.execution_region] || p.execution_region}</span>
                    ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  {!isMobile && (
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-hover)',
                        padding: '2px 7px', borderRadius: 6, border: '1px solid var(--border-color)',
                      }}>
                        {p.supervisor_type === 'RECTOR' ? 'Rector' : p.supervisor_type === 'JEFE_EXTENSION' ? 'Jefe Ext.' : '—'}
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} de {sorted.length}
          </p>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { Icon: ChevronsLeft,  fn: () => setPage(1),          dis: safePage === 1 },
              { Icon: ChevronLeft,   fn: () => setPage(p => p - 1), dis: safePage === 1 },
              { Icon: ChevronRight,  fn: () => setPage(p => p + 1), dis: safePage === totalPages },
              { Icon: ChevronsRight, fn: () => setPage(totalPages), dis: safePage === totalPages },
            ].map(({ Icon, fn, dis }, i) => (
              <button key={i} onClick={fn} disabled={dis} style={{
                width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-color)',
                background: 'none', cursor: dis ? 'not-allowed' : 'pointer',
                color: dis ? 'var(--text-muted)' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
              }}>
                <Icon size={13} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate = useNavigate()
  const { isMobile, isDesktop } = useBreakpoint()

  const [projects, setProjects] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filters,  setFilters]  = useState({})

  useEffect(() => {
    Promise.all([
      api.get('/projects/?active_only=true'),
      api.get('/project-statuses/'),
    ]).then(([proj, stat]) => {
      setProjects(proj.data)
      setStatuses(stat.data)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => projects.filter(p => {
    if (filters.year       && String(p.project_year)      !== filters.year)       return false
    if (filters.status     && String(p.project_status_id) !== filters.status)     return false
    if (filters.type      && String(p.project_type_id)    !== filters.type)      return false
    if (filters.region     && p.execution_region          !== filters.region)     return false
    if (filters.supervisor && p.supervisor_type           !== filters.supervisor) return false
    if (filters.search) {
      const q  = filters.search.toLowerCase()
      const ok = (p.project_name || '').toLowerCase().includes(q) ||
                 (p.external_project_number || '').toLowerCase().includes(q) ||
                 (p.entity_name || '').toLowerCase().includes(q)
      if (!ok) return false
    }
    return true
  }), [projects, filters])

  const years = useMemo(() =>
    [...new Set(projects.map(p => p.project_year))].sort((a, b) => b - a)
  , [projects])

  const types = useMemo(() =>
    [...new Map(projects
      .filter(p => p.project_type_id)
      .map(p => [p.project_type_id, { id: p.project_type_id, name: p.type_name || `Tipo ${p.project_type_id}` }])
    ).values()]
    .sort((a, b) => a.name.localeCompare(b.name))
  , [projects])

  const regionCounts = useMemo(() => {
    const c = {}
    for (const p of filtered) { const r = p.execution_region || '_'; c[r] = (c[r] || 0) + 1 }
    return c
  }, [filtered])

  const kpis = useMemo(() => {
    const total     = filtered.length
    const valor     = filtered.reduce((s, p) => s + parseFloat(p.project_value || 0), 0)
    const activos   = filtered.filter(p => p.is_active).length
    const beneficio = filtered.reduce((s, p) => s + parseFloat(p.institutional_benefit_value || 0), 0)
    const nacionals = filtered.filter(p => p.execution_region === 'NACIONAL').length
    const internac  = filtered.filter(p => p.execution_region === 'INTERNACIONAL').length
    const curYear   = new Date().getFullYear()
    const thisYear  = filtered.filter(p => p.project_year === curYear).length
    return { total, valor, activos, beneficio, nacionals, internac, thisYear, curYear }
  }, [filtered])

  const toggleRegion = useCallback(r => {
    setFilters(f => ({ ...f, region: f.region === r ? '' : (r || '') }))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 36, height: 36, border: '3px solid var(--border-color)',
          borderTopColor: '#B91C3C', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Cargando dashboard…</p>
      </div>
    </div>
  )

  const gap = isMobile ? 14 : 20

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <BarChart3 size={isMobile ? 18 : 22} color="#B91C3C" />
            <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Dashboard</h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            {isMobile
              ? `${projects.length} proyectos registrados`
              : `Análisis del portafolio · ${projects.length} proyectos registrados`}
          </p>
        </div>
        {!isMobile && (
          <div style={{
            fontSize: 11, color: 'var(--text-muted)', padding: '6px 13px',
            borderRadius: 8, border: '1px solid var(--border-color)',
            background: 'var(--bg-card)', whiteSpace: 'nowrap',
          }}>
            {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* FilterBar */}
      <FilterBar
        filters={filters} onChange={setFilters}
        years={years} statuses={statuses} types={types}
        count={filtered.length} total={projects.length}
        isMobile={isMobile}
      />

      {/* KPIs: 2 cols mobile / 4 cols desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 10 : 12 }}>
        <KPICard label="Total proyectos"       value={kpis.total}                                      color="#B91C3C" Icon={Layers}    sub={`${kpis.activos} activos`} />
        <KPICard label="Valor portafolio"      value={fmtMoney(kpis.valor)}                             color="#10B981" Icon={DollarSign} sub={!isMobile ? fmtMoneyFull(kpis.valor) : undefined} />
        <KPICard label="Beneficio UD"          value={fmtMoney(kpis.beneficio)}                         color="#8B5CF6" Icon={Percent}   sub={!isMobile ? 'Retribución UD' : undefined} />
        <KPICard label={`Año ${kpis.curYear}`} value={kpis.thisYear}                                    color="#F59E0B" Icon={Calendar}  sub="Año en curso" />
        <KPICard label="Proyectos activos"     value={kpis.activos}                                     color="#0EA5E9" Icon={Activity}  sub={`${kpis.total ? Math.round(kpis.activos / kpis.total * 100) : 0}%`} />
        <KPICard label="Valor promedio"        value={fmtMoney(kpis.total ? kpis.valor / kpis.total : 0)} color="#64748B" Icon={TrendingUp} sub={!isMobile ? 'Por proyecto' : undefined} />
        <KPICard label="Nacional"              value={kpis.nacionals}  color="#EF4444" Icon={MapPin}   onClick={() => toggleRegion('NACIONAL')}      active={filters.region === 'NACIONAL'}      sub={!isMobile ? 'Clic para filtrar' : undefined} />
        <KPICard label="Internacional"         value={kpis.internac}   color="#64748B" Icon={Globe2}   onClick={() => toggleRegion('INTERNACIONAL')} active={filters.region === 'INTERNACIONAL'}  sub={!isMobile ? 'Clic para filtrar' : undefined} />
      </div>

      {/* Mapa + Donuts */}
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 380px' : '1fr', gap }}>
        <MapPanel
          filtered={filtered} regionCounts={regionCounts}
          selectedRegion={filters.region || null}
          onToggleRegion={toggleRegion}
          isMobile={isMobile}
        />
        <div style={{ display: 'flex', flexDirection: isDesktop ? 'column' : 'row', gap, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px', minWidth: 0 }}>
            <EstadosDonut filtered={filtered} statuses={statuses} />
          </div>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <SupervisorPie filtered={filtered} />
          </div>
        </div>
      </div>

      {/* Gráficas fila 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap }}>
        <ProyectosAnioChart filtered={filtered} />
        <TopEntidadesChart  filtered={filtered} isMobile={isMobile} />
      </div>

      {/* Gráficas fila 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap }}>
        <EvolucionChart filtered={filtered} />
        <RegionesChart  filtered={filtered} />
      </div>

      {/* Tabla */}
      <ProjectsTable projects={filtered} statuses={statuses} navigate={navigate} isMobile={isMobile} />

      <style>{`
        .tooltip-siexud {
          background: white !important; border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important; padding: 7px 11px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
          font-size: 12px !important; font-family: inherit !important;
        }
        .tooltip-siexud::before { display: none !important; }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important; box-shadow: 0 6px 24px rgba(0,0,0,0.16) !important;
          font-family: 'Plus Jakarta Sans', sans-serif !important; border: 1px solid #e2e8f0 !important;
        }
        .leaflet-popup-content { margin: 12px 16px !important; }
        .leaflet-popup-tip-container { display: none !important; }
        .leaflet-popup-close-button { color: #94a3b8 !important; top: 8px !important; right: 10px !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}