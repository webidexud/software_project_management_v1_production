import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Globe2, DollarSign, Layers, Filter, X, TrendingUp, ChevronRight } from 'lucide-react'
import api from '../services/api'

/* ─────────────────────────────────────────────────────────────────────
   Posiciones geográficas del centro de cada región natural de Colombia
───────────────────────────────────────────────────────────────────── */
const REGION_CENTERS = {
  CARIBE:     { lat: 10.4, lng: -74.8 },  // Barranquilla/Cartagena área
  ANDINA:     { lat: 4.6,  lng: -75.3 },  // Bogotá/Medellín área
  PACIFICA:   { lat: 4.0,  lng: -77.2 },  // Chocó/Buenaventura área
  ORINOQUIA:  { lat: 4.8,  lng: -70.5 },  // Villavicencio/Arauca área
  AMAZONIA:   { lat: -1.0, lng: -72.0 },  // Leticia/Florencia área
  INSULAR:    { lat: 12.55, lng: -81.72 }, // San Andrés
}

/* ─── Config ─────────────────────────────────────────────────────── */
const REGION_COLORS = {
  CARIBE:        '#0EA5E9',
  ANDINA:        '#8B5CF6',
  PACIFICA:      '#10B981',
  ORINOQUIA:     '#F59E0B',
  AMAZONIA:      '#22C55E',
  INSULAR:       '#EC4899',
  NACIONAL:      '#B91C3C',
  INTERNACIONAL: '#64748B',
}
const REGION_LABELS = {
  CARIBE:        'Caribe',
  ANDINA:        'Andina',
  PACIFICA:      'Pacífica',
  ORINOQUIA:     'Orinoquía',
  AMAZONIA:      'Amazonía',
  INSULAR:       'Insular',
  NACIONAL:      'Nacional',
  INTERNACIONAL: 'Internacional',
}
const GEO_REGIONS = ['CARIBE','ANDINA','PACIFICA','ORINOQUIA','AMAZONIA','INSULAR']

const fmtMoney = (v) => {
  const n = parseFloat(v)
  if (!v || isNaN(n)) return '—'
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n/1e6).toFixed(0)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n.toLocaleString('es-CO',{maximumFractionDigits:0})}`
}
const fmtDate = (d) => d
  ? new Date(d+'T00:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})
  : '—'

/* ═══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate = useNavigate()

  const [projects,       setProjects]       = useState([])
  const [statuses,       setStatuses]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [filterYear,     setFilterYear]     = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/projects/?active_only=false'),
      api.get('/project-statuses/'),
    ]).then(([proj, stat]) => {
      setProjects(proj.data)
      setStatuses(stat.data)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => projects.filter(p => {
    if (filterYear   && String(p.project_year)      !== filterYear)   return false
    if (filterStatus && String(p.project_status_id) !== filterStatus) return false
    return true
  }), [projects, filterYear, filterStatus])

  const regionCounts = useMemo(() => {
    const c = {}
    for (const p of filtered) { const r = p.execution_region||'_'; c[r]=(c[r]||0)+1 }
    return c
  }, [filtered])

  const regionProjects = useMemo(() =>
    selectedRegion ? filtered.filter(p => p.execution_region === selectedRegion) : []
  , [filtered, selectedRegion])

  const years = useMemo(() =>
    [...new Set(projects.map(p=>p.project_year))].sort((a,b)=>b-a)
  , [projects])

  const stats = useMemo(() => ({
    total:           filtered.length,
    valor:           filtered.reduce((s,p)=>s+parseFloat(p.project_value||0),0),
    nacionales:      filtered.filter(p=>p.execution_region==='NACIONAL').length,
    internacionales: filtered.filter(p=>p.execution_region==='INTERNACIONAL').length,
    conRegion:       filtered.filter(p=>GEO_REGIONS.includes(p.execution_region)).length,
    sinRegion:       filtered.filter(p=>!p.execution_region).length,
  }), [filtered])

  const maxCount  = Math.max(...GEO_REGIONS.map(r=>regionCounts[r]||0), 1)
  const toggleReg = useCallback((r) => setSelectedRegion(p=>p===r?null:r), [])

  /* Calcula radio del círculo basado en conteo de proyectos */
  const getRadius = useCallback((region) => {
    const cnt = regionCounts[region] || 0
    if (cnt === 0) return 18
    const normalized = cnt / maxCount
    return 18 + (normalized * 35) // min 18, max 53
  }, [regionCounts, maxCount])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <p style={{color:'var(--text-muted)',fontSize:14}}>Cargando dashboard…</p>
    </div>
  )

  return (
    <div className="animate-fade-in" style={{display:'flex',flexDirection:'column',gap:20}}>

      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
          <MapPin size={22} color="#B91C3C"/>
          <h1 style={{fontSize:22,fontWeight:800,color:'var(--text-primary)',margin:0}}>Dashboard</h1>
        </div>
        <p style={{fontSize:13,color:'var(--text-muted)'}}>Distribución geográfica y estado de los proyectos de extensión</p>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
        {[
          {label:'Total proyectos', value:stats.total,           color:'#0F2952', Icon:Layers,     key:null},
          {label:'Valor total',     value:fmtMoney(stats.valor), color:'#10B981', Icon:DollarSign, key:null},
          {label:'Nacionales',      value:stats.nacionales,      color:'#B91C3C', Icon:MapPin,     key:'NACIONAL'},
          {label:'Internacionales', value:stats.internacionales, color:'#64748B', Icon:Globe2,     key:'INTERNACIONAL'},
          {label:'Por región',      value:stats.conRegion,       color:'#8B5CF6', Icon:TrendingUp, key:null},
        ].map(({label,value,color,Icon,key})=>(
          <div key={label} onClick={()=>key&&toggleReg(key)} style={{
            padding:'16px 18px',borderRadius:12,background:'var(--bg-card)',
            border:`1px solid ${selectedRegion===key&&key?color:'var(--border-color)'}`,
            cursor:key?'pointer':'default',
            boxShadow:selectedRegion===key&&key?`0 0 0 3px ${color}25`:'none',
            transition:'all .15s',
          }}>
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
              <Icon size={14} color={color}/>
              <p style={{fontSize:11,color:'var(--text-muted)',margin:0}}>{label}</p>
            </div>
            <p style={{fontSize:22,fontWeight:800,color,margin:0,fontFamily:'monospace'}}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:12,alignItems:'center',padding:'12px 16px',background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border-color)'}}>
        <Filter size={14} color="var(--text-muted)"/>
        <select value={filterYear} onChange={e=>setFilterYear(e.target.value)} className="input-field" style={{width:150,padding:'7px 10px',fontSize:13}}>
          <option value="">Todos los años</option>
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="input-field" style={{width:200,padding:'7px 10px',fontSize:13}}>
          <option value="">Todos los estados</option>
          {statuses.map(s=><option key={s.status_id} value={s.status_id}>{s.status_name}</option>)}
        </select>
        {(filterYear||filterStatus)&&(
          <button onClick={()=>{setFilterYear('');setFilterStatus('')}}
            style={{display:'flex',alignItems:'center',gap:5,background:'none',border:'1px solid var(--border-color)',borderRadius:8,padding:'7px 12px',cursor:'pointer',fontSize:12,color:'var(--text-muted)',fontFamily:'inherit'}}>
            <X size={12}/> Limpiar
          </button>
        )}
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--text-muted)'}}>
          {filtered.length} proyecto{filtered.length!==1?'s':''}
        </span>
      </div>

      {/* Mapa + Panel */}
      <div style={{display:'grid',gridTemplateColumns:'400px 1fr',gap:20,alignItems:'start'}}>

        {/* MAPA */}
        <div style={{background:'var(--bg-card)',borderRadius:16,border:'1px solid var(--border-color)',padding:'18px',position:'sticky',top:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <p style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',margin:0}}>Mapa de regiones</p>
            {selectedRegion&&(
              <button onClick={()=>setSelectedRegion(null)}
                style={{display:'flex',alignItems:'center',gap:4,background:'none',border:'1px solid var(--border-color)',borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:11,color:'var(--text-muted)',fontFamily:'inherit'}}>
                <X size={10}/> Limpiar
              </button>
            )}
          </div>

          <div style={{borderRadius:10,overflow:'hidden',height:420,border:'1px solid var(--border-color)'}}>
            <MapContainer
              center={[4.0, -74.0]}
              zoom={5}
              minZoom={5}
              maxZoom={7}
              style={{height:'100%',width:'100%'}}
              scrollWheelZoom={false}
              zoomControl={true}
              attributionControl={false}>

              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"/>

              {/* Círculos por región */}
              {Object.entries(REGION_CENTERS).map(([region, pos]) => {
                const cnt    = regionCounts[region] || 0
                const color  = REGION_COLORS[region]
                const isSel  = selectedRegion === region
                const dimmed = selectedRegion && !isSel
                const radius = getRadius(region)
                const fillOp = dimmed ? 0.12 : isSel ? 0.85 : cnt === 0 ? 0.25 : 0.65

                return (
                  <CircleMarker
                    key={region}
                    center={[pos.lat, pos.lng]}
                    radius={radius}
                    pathOptions={{
                      fillColor:   color,
                      fillOpacity: fillOp,
                      color:       isSel ? color : color + 'BB',
                      weight:      isSel ? 3 : 2,
                    }}
                    eventHandlers={{
                      click:     () => toggleReg(region),
                      mouseover: (e) => e.target.setStyle({ fillOpacity:0.90, weight:3 }),
                      mouseout:  (e) => e.target.setStyle({ fillOpacity:fillOp, weight:isSel?3:2 }),
                    }}>
                    <Tooltip className="tooltip-siexud" direction="top" offset={[0, -radius-5]}>
                      <div style={{textAlign:'center',minWidth:100}}>
                        <div style={{fontSize:13,fontWeight:700,color,marginBottom:3}}>
                          {REGION_LABELS[region]}
                        </div>
                        <div style={{fontSize:12,color:'#64748b'}}>
                          {cnt} proyecto{cnt!==1?'s':''}
                        </div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                )
              })}

            </MapContainer>
          </div>

          {/* Leyenda */}
          <div style={{marginTop:14,borderTop:'1px solid var(--border-color)',paddingTop:12}}>
            <p style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8}}>Regiones geográficas</p>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              {GEO_REGIONS.map(region=>{
                const count=regionCounts[region]||0, isSel=selectedRegion===region
                return (
                  <div key={region} onClick={()=>toggleReg(region)} style={{
                    display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:7,cursor:'pointer',
                    background:isSel?`${REGION_COLORS[region]}12`:'transparent',
                    border:`1px solid ${isSel?REGION_COLORS[region]:'transparent'}`,transition:'all .15s',
                  }}>
                    <div style={{width:10,height:10,borderRadius:3,background:REGION_COLORS[region],flexShrink:0}}/>
                    <span style={{fontSize:12,flex:1,fontWeight:isSel?700:400,color:isSel?REGION_COLORS[region]:'var(--text-secondary)'}}>
                      {REGION_LABELS[region]}
                    </span>
                    {count>0&&<span style={{fontSize:11,fontWeight:800,color:REGION_COLORS[region],fontFamily:'monospace'}}>{count}</span>}
                  </div>
                )
              })}
            </div>
            <p style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',margin:'10px 0 8px'}}>Alcance</p>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              {['NACIONAL','INTERNACIONAL'].map(region=>{
                const count=regionCounts[region]||0, isSel=selectedRegion===region
                return (
                  <div key={region} onClick={()=>toggleReg(region)} style={{
                    display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:7,cursor:'pointer',
                    background:isSel?`${REGION_COLORS[region]}12`:'transparent',
                    border:`1px solid ${isSel?REGION_COLORS[region]:'transparent'}`,transition:'all .15s',
                  }}>
                    <div style={{width:10,height:10,borderRadius:3,background:REGION_COLORS[region],flexShrink:0}}/>
                    <span style={{fontSize:12,flex:1,fontWeight:isSel?700:400,color:isSel?REGION_COLORS[region]:'var(--text-secondary)'}}>
                      {REGION_LABELS[region]}
                    </span>
                    {count>0&&<span style={{fontSize:11,fontWeight:800,color:REGION_COLORS[region],fontFamily:'monospace'}}>{count}</span>}
                  </div>
                )
              })}
              {stats.sinRegion>0&&<p style={{fontSize:11,color:'var(--text-muted)',padding:'4px 8px',margin:0}}>Sin región: <strong>{stats.sinRegion}</strong></p>}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{padding:'16px 20px',background:'var(--bg-card)',borderRadius:12,border:`1px solid ${selectedRegion?REGION_COLORS[selectedRegion]:'var(--border-color)'}`}}>
            {selectedRegion?(
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:14,height:14,borderRadius:4,background:REGION_COLORS[selectedRegion],flexShrink:0}}/>
                <div>
                  <p style={{fontSize:16,fontWeight:800,color:'var(--text-primary)',margin:0}}>{REGION_LABELS[selectedRegion]}</p>
                  <p style={{fontSize:12,color:'var(--text-muted)',margin:0}}>{regionProjects.length} proyecto{regionProjects.length!==1?'s':''}</p>
                </div>
              </div>
            ):(
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <MapPin size={16} color="var(--text-muted)"/>
                <p style={{fontSize:13,color:'var(--text-muted)',margin:0}}>Haz clic en una región del mapa para ver sus proyectos</p>
              </div>
            )}
          </div>

          {!selectedRegion&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {[...GEO_REGIONS,'NACIONAL','INTERNACIONAL'].map(region=>{
                const count=regionCounts[region]||0
                return (
                  <div key={region} onClick={()=>toggleReg(region)} style={{padding:'14px 16px',borderRadius:10,background:'var(--bg-card)',border:'1px solid var(--border-color)',cursor:'pointer',transition:'all .15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                      <div style={{width:8,height:8,borderRadius:2,background:REGION_COLORS[region]}}/>
                      <p style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',margin:0}}>{REGION_LABELS[region]}</p>
                    </div>
                    <p style={{fontSize:28,fontWeight:800,color:count>0?REGION_COLORS[region]:'var(--text-muted)',margin:0,fontFamily:'monospace'}}>{count}</p>
                    <p style={{fontSize:11,color:'var(--text-muted)',margin:'2px 0 0'}}>proyecto{count!==1?'s':''}</p>
                  </div>
                )
              })}
            </div>
          )}

          {selectedRegion&&regionProjects.length===0&&(
            <div style={{padding:'48px 24px',textAlign:'center',background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border-color)'}}>
              <MapPin size={32} color="var(--text-muted)" style={{marginBottom:12,opacity:0.4}}/>
              <p style={{color:'var(--text-muted)',fontSize:13,margin:0}}>No hay proyectos en esta región con los filtros aplicados</p>
            </div>
          )}

          {selectedRegion&&regionProjects.map(p=>(
            <div key={p.project_id} onClick={()=>navigate(`/projects/${p.project_id}/view`)} style={{padding:'16px 20px',background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border-color)',cursor:'pointer',transition:'border-color .15s'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                    <span style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',fontFamily:'monospace'}}>
                      {p.project_year}{p.external_project_number?` #${p.external_project_number}`:''} · #{p.project_id}
                    </span>
                    {p.status_name&&(
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:p.status_color?`${p.status_color}15`:'var(--bg-hover)',color:p.status_color||'var(--text-muted)',border:`1px solid ${p.status_color?`${p.status_color}30`:'var(--border-color)'}`}}>
                        {p.status_name}
                      </span>
                    )}
                  </div>
                  <p style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',margin:'0 0 5px',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                    {p.project_name}
                  </p>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <p style={{fontSize:11,color:'var(--text-muted)',margin:0}}>{p.entity_name}</p>
                    <p style={{fontSize:11,color:'var(--text-muted)',margin:0}}>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</p>
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                  <p style={{fontSize:14,fontWeight:800,color:'#10B981',fontFamily:'monospace',margin:0}}>{fmtMoney(p.project_value)}</p>
                  <ChevronRight size={14} color="var(--text-muted)"/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .tooltip-siexud {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 7px 11px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
          font-size: 12px !important;
          font-family: inherit !important;
        }
        .tooltip-siexud::before { display: none !important; }
      `}</style>
    </div>
  )
}