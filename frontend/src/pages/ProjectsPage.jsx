// frontend/src/pages/ProjectsPage.jsx — Responsive
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Search, Plus, RefreshCw, X, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Eye, Pencil, GitBranch,
  FolderOpen, Filter, ChevronDown, ChevronUp,
} from 'lucide-react'
import { projectsService } from '../services/projects'
import useBreakpoint from '../hooks/useBreakpoint'

const PAGE_OPTS = [10, 20, 50, 'Todos']

/* ─── Highlight texto buscado ──────────────────────────────────── */
function Highlight({ text, query }) {
  if (!query || !text) return <>{text || ''}</>
  const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'))
  return (
    <span>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background:'#FEF08A', color:'#713F12', borderRadius:2, padding:'0 1px' }}>{p}</mark>
          : p
      )}
    </span>
  )
}

/* ─── Badge de estado ──────────────────────────────────────────── */
function StatusBadge({ active, label, color }) {
  if (label && color) {
    return (
      <span style={{
        display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px',
        borderRadius:999, fontSize:11, fontWeight:700,
        background:`${color}18`, color, border:`1px solid ${color}30`,
      }}>
        <span style={{ width:5, height:5, borderRadius:'50%', background:color }}/>
        {label}
      </span>
    )
  }
  return active
    ? <span className="badge badge-active"><span style={{ width:6,height:6,borderRadius:'50%',background:'#15803D',display:'inline-block' }}/>Activo</span>
    : <span className="badge badge-inactive"><span style={{ width:6,height:6,borderRadius:'50%',background:'#64748B',display:'inline-block' }}/>Inactivo</span>
}

/* ─── Botón de acción en tabla ─────────────────────────────────── */
function TblBtn({ title, color, onClick, children }) {
  return (
    <button title={title} onClick={onClick} style={{
      width:28, height:28, borderRadius:6, border:`1px solid ${color}30`,
      background:`${color}10`, color, cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center',
      transition:'all .15s', fontFamily:'inherit',
    }}>
      {children}
    </button>
  )
}

/* ─── Función de búsqueda ──────────────────────────────────────── */
function matchesSearch(p, q) {
  if (!q) return true
  const terms = q.toLowerCase().trim().split(/\s+/)
  const haystack = [
    p.project_name, p.project_purpose, p.entity_name, p.department_name,
    p.status_name, p.modality_name, p.financing_name, p.official_name,
    p.external_project_number, p.main_email, p.administrative_act,
    String(p.project_id), String(p.project_year), String(p.project_value || ''),
    p.start_date, p.end_date,
  ].filter(Boolean).map(s => String(s).toLowerCase()).join(' ')

  if (q.startsWith('$')) {
    const num = q.replace(/[$.,]/g, '')
    return String(p.project_value || '').replace(/[.,]/g, '').includes(num)
  }
  return terms.every(t => haystack.includes(t))
}

/* ═══════════════════════════════════════════════════════════════ */
export default function ProjectsPage() {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useBreakpoint()

  const [projects,     setProjects]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filtersOpen,  setFiltersOpen]  = useState(false)
  const [sortConfig,   setSortConfig]   = useState({ field: null, dir: 'asc' })

  // Restaurar filtros desde sessionStorage al montar
  const savedFilters = (() => {
    try { return JSON.parse(sessionStorage.getItem('siexud_pf') || '{}') } catch { return {} }
  })()
  const [search,       setSearch]       = useState(savedFilters.search       || '')
  const [pageSize,     setPageSize]     = useState(savedFilters.pageSize     || 10)
  const [page,         setPage]         = useState(savedFilters.page         || 1)
  const [filterYear,   setFilterYear]   = useState(savedFilters.filterYear   || '')
  const [filterStatus, setFilterStatus] = useState(savedFilters.filterStatus || '')

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await projectsService.list({ active_only: true }); setProjects(r.data) }
    catch { toast.error('Error al cargar proyectos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, pageSize, filterYear, filterStatus])

  // Guardar filtros en sessionStorage para persistencia al volver
  useEffect(() => {
    sessionStorage.setItem('siexud_pf', JSON.stringify(
      { search, pageSize, page, filterYear, filterStatus }
    ))
  }, [search, pageSize, page, filterYear, filterStatus])

  const years    = [...new Set(projects.map(p => p.project_year))].sort((a, b) => b - a)
  const statuses = [...new Map(projects.map(p => [p.project_status_id, { id: p.project_status_id, name: p.status_name, color: p.status_color }])).values()]

  const filtered = projects.filter(p => {
    const matchSrch   = matchesSearch(p, search)
    const matchYear   = !filterYear   || String(p.project_year)      === filterYear
    const matchStatus = !filterStatus || String(p.project_status_id) === filterStatus
    return matchSrch && matchYear && matchStatus
  })

  // Ordenamiento por columna
  const handleSort = field => {
    setSortConfig(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
    setPage(1)
  }
  const SortIcon = ({ field }) => {
    if (sortConfig.field !== field) return <span style={{ opacity: 0.3, fontSize: 10 }}>↕</span>
    return <span style={{ color: '#0EA5E9', fontSize: 10 }}>{sortConfig.dir === 'asc' ? '↑' : '↓'}</span>
  }

  const sorted = [...filtered].sort((a, b) => {
    const { field, dir } = sortConfig
    if (!field) return 0
    const mul = dir === 'asc' ? 1 : -1
    const numFields = ['project_value', 'project_year', 'project_id']
    if (numFields.includes(field)) {
      return mul * ((parseFloat(a[field]) || 0) - (parseFloat(b[field]) || 0))
    }
    const av = (a[field] || '').toString().toLowerCase()
    const bv = (b[field] || '').toString().toLowerCase()
    return mul * av.localeCompare(bv, 'es')
  })

  const showAll = pageSize === 'Todos'
  const total   = Math.max(1, showAll ? 1 : Math.ceil(sorted.length / pageSize))
  const cur     = Math.min(page, total)
  const rows    = showAll ? sorted : sorted.slice((cur - 1) * pageSize, cur * pageSize)
  const goTo    = p => setPage(Math.max(1, Math.min(p, total)))

  const handleToggle = async p => {
    try {
      await projectsService.toggle(p.project_id)
      toast.success(p.is_active ? 'Proyecto deshabilitado' : 'Proyecto habilitado')
      load()
    } catch { toast.error('Error al cambiar estado') }
  }

  const pages = () => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (cur <= 4)   return [1, 2, 3, 4, 5, '...', total]
    if (cur >= total - 3) return [1, '...', total-4, total-3, total-2, total-1, total]
    return [1, '...', cur-1, cur, cur+1, '...', total]
  }

  const hasActiveFilters = filterYear || filterStatus
  const clearAll = () => { setSearch(''); setFilterYear(''); setFilterStatus('') }
  // Valor completo en pesos colombianos
  const fmtMoney = v => {
    if (!v && v !== 0) return '—'
    const n = parseFloat(v)
    if (isNaN(n)) return '—'
    return `$\u00A0${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
  }

  /* Columnas a mostrar según breakpoint */
  const showEntidad     = !isMobile
  const showDependencia = !isMobile && !isTablet
  const showFechas      = !isMobile
  // Todos los botones de acción siempre visibles — tabla tiene scroll horizontal

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Cabecera ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:10,
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight:800, color:'var(--text-primary)', margin:0 }}>
            Proyectos
          </h1>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
            Gestión de proyectos de extensión universitaria
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <button onClick={load} title="Recargar"
            style={{ width:36, height:36, borderRadius:8, border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:'inherit' }}>
            <RefreshCw size={15}/>
          </button>
          <button onClick={() => navigate('/projects/new')} className="btn-primary">
            <Plus size={15}/>
            {!isMobile && ' Nuevo Proyecto'}
          </button>
        </div>
      </div>

      {/* ── Barra de búsqueda + filtros ── */}
      <div className="card" style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10, flexShrink:0 }}>

        {/* Fila principal: búsqueda + botón filtros */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ position:'relative', flex:1, minWidth:0 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={isMobile ? 'Buscar proyectos...' : 'Buscar por nombre, entidad, objeto, valor, número...'}
              style={{
                width:'100%', paddingLeft:32, paddingRight: search ? 32 : 12,
                paddingTop:8, paddingBottom:8,
                border:'1px solid var(--border-color)', borderRadius:8,
                background:'var(--bg-input)', color:'var(--text-primary)',
                fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:2 }}>
                <X size={13}/>
              </button>
            )}
          </div>

          {/* Toggle filtros en mobile */}
          {isMobile ? (
            <button onClick={() => setFiltersOpen(o => !o)}
              style={{
                display:'flex', alignItems:'center', gap:5, height:36, padding:'0 12px',
                borderRadius:8, border:`1px solid ${hasActiveFilters ? '#B91C3C' : 'var(--border-color)'}`,
                background: hasActiveFilters ? 'rgba(185,28,60,0.06)' : 'var(--bg-hover)',
                color: hasActiveFilters ? '#B91C3C' : 'var(--text-muted)',
                cursor:'pointer', fontSize:12, fontFamily:'inherit', flexShrink:0,
              }}>
              <Filter size={13}/>
              {hasActiveFilters && <span style={{ fontSize:10, fontWeight:700 }}>●</span>}
              {filtersOpen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            </button>
          ) : (
            /* Filtros inline en desktop */
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border-color)', background:'var(--bg-input)', color:'var(--text-primary)', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
                <option value="">Todos los años</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border-color)', background:'var(--bg-input)', color:'var(--text-primary)', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
                <option value="">Todos los estados</option>
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                <span>Pág:</span>
                {PAGE_OPTS.map(n => (
                  <button key={n} onClick={() => setPageSize(n)}
                    style={{ padding:'3px 7px', borderRadius:6, border:'1px solid', fontSize:11, fontFamily:'inherit', cursor:'pointer', fontWeight:pageSize===n?700:400, borderColor:pageSize===n?'#0EA5E9':'var(--border-color)', background:pageSize===n?'#0EA5E9':'transparent', color:pageSize===n?'#fff':'var(--text-muted)' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel de filtros expandible en mobile */}
        {isMobile && filtersOpen && (
          <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:8, borderTop:'1px solid var(--border-color)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--border-color)', background:'var(--bg-input)', color:'var(--text-primary)', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
                <option value="">Todos los años</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--border-color)', background:'var(--bg-input)', color:'var(--text-primary)', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
                <option value="">Todos los estados</option>
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>

              {hasActiveFilters && (
                <button onClick={clearAll} style={{ fontSize:12, color:'#EF4444', fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}

        {/* Chips de filtros activos */}
        {(search || hasActiveFilters) && (
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>
              <strong style={{ color:'var(--text-primary)' }}>{filtered.length}</strong> resultado{filtered.length !== 1 ? 's' : ''}
            </span>
            {search && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(14,165,233,0.1)', color:'#0EA5E9', border:'1px solid rgba(14,165,233,0.25)' }}>
                "{search.substring(0, 20)}{search.length > 20 ? '…' : ''}"
                <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#0EA5E9', padding:0, display:'flex' }}><X size={10}/></button>
              </span>
            )}
            {filterYear && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(139,92,246,0.1)', color:'#8B5CF6', border:'1px solid rgba(139,92,246,0.25)' }}>
                Año: {filterYear}
                <button onClick={() => setFilterYear('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#8B5CF6', padding:0, display:'flex' }}><X size={10}/></button>
              </span>
            )}
            {filterStatus && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(245,158,11,0.1)', color:'#F59E0B', border:'1px solid rgba(245,158,11,0.25)' }}>
                {statuses.find(s => String(s.id) === filterStatus)?.name}
                <button onClick={() => setFilterStatus('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#F59E0B', padding:0, display:'flex' }}><X size={10}/></button>
              </span>
            )}
            {!isMobile && (search || hasActiveFilters) && (
              <button onClick={clearAll} style={{ fontSize:11, color:'#EF4444', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:'2px 4px' }}>
                Limpiar todo
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className="card" style={{ overflow:'hidden', display:'flex', flexDirection:'column', padding:0 }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'60px 0', color:'var(--text-muted)', fontSize:13 }}>
            Cargando proyectos...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-muted)', fontSize:13 }}>
            {search || hasActiveFilters
              ? <>Sin resultados · <button onClick={clearAll} style={{ background:'none', border:'none', color:'#0EA5E9', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>Limpiar filtros</button></>
              : <>No hay proyectos · <button onClick={() => navigate('/projects/new')} style={{ background:'none', border:'none', color:'#0EA5E9', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>Crear el primero</button></>
            }
          </div>
        ) : (
          <>
            {/* Tabla con scroll horizontal */}
            <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', flex:1 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth: isMobile ? 680 : 900 }}>
                <thead>
                  <tr>
                    {[
                      { label: 'Año / #',     field: 'project_year',  always: true },
                      { label: 'Proyecto',    field: 'project_name',  always: true },
                      { label: 'Entidad',     field: 'entity_name',   show: showEntidad },
                      { label: 'Dependencia', field: 'department_name', show: showDependencia },
                      { label: 'Valor',       field: 'project_value', always: true },
                      { label: 'Fechas',      field: 'start_date',    show: showFechas },
                      { label: 'Estado',      field: 'status_name',   always: true },
                    ].filter(h => h.always || h.show).map(h => (
                      <th key={h.field} className="table-header"
                        onClick={() => handleSort(h.field)}
                        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                        {h.label} <SortIcon field={h.field} />
                      </th>
                    ))}
                    <th className="table-header" style={{ width: isMobile ? 60 : 140 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, i) => (
                    <tr key={p.project_id} className="table-row" style={{ animationDelay:`${Math.min(i*20,200)}ms` }}>

                      {/* Año / # */}
                      <td className="table-cell" style={{ whiteSpace:'nowrap' }}>
                        <div style={{ fontFamily:'monospace', fontSize:10, color:'var(--text-muted)' }}>
                          <Highlight text={String(p.project_year)} query={search}/>
                        </div>
                        <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>
                          #<Highlight text={String(p.project_id)} query={search}/>
                        </div>
                        {p.external_project_number && (
                          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>
                            <Highlight text={p.external_project_number} query={search}/>
                          </div>
                        )}
                      </td>

                      {/* Proyecto */}
                      <td className="table-cell" style={{ maxWidth: isMobile ? 180 : 260 }}>
                        <p style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13, lineHeight:1.35, margin:0, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                          <Highlight text={p.project_name} query={search}/>
                        </p>
                        {p.project_purpose && !isMobile && (
                          <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical' }}>
                            <Highlight text={p.project_purpose.substring(0, 80)} query={search}/>
                          </p>
                        )}
                      </td>

                      {/* Entidad */}
                      {showEntidad && (
                        <td className="table-cell">
                          <span style={{ fontSize:12, color:'var(--text-secondary)' }}>
                            <Highlight text={p.entity_name} query={search}/>
                          </span>
                        </td>
                      )}

                      {/* Dependencia */}
                      {showDependencia && (
                        <td className="table-cell">
                          <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                            <Highlight text={p.department_name} query={search}/>
                          </span>
                        </td>
                      )}

                      {/* Valor */}
                      <td className="table-cell" style={{ whiteSpace:'nowrap' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', fontFamily:'monospace' }}>
                          {fmtMoney(p.project_value)}
                        </span>
                      </td>

                      {/* Fechas */}
                      {showFechas && (
                        <td className="table-cell" style={{ whiteSpace:'nowrap', fontSize:11, color:'var(--text-muted)' }}>
                          <div>Inicio: {p.start_date || '—'}</div>
                          <div>Fin: {p.end_date || '—'}</div>
                        </td>
                      )}

                      {/* Estado */}
                      <td className="table-cell">
                        <StatusBadge active={p.is_active} label={p.status_name} color={p.status_color}/>
                      </td>

                      {/* Acciones */}
                      <td className="table-cell">
                        <div style={{ display:'flex', gap:4, flexWrap:'nowrap' }}>
                          <TblBtn title="Ver" color="#0EA5E9" onClick={() => navigate(`/projects/${p.project_id}/view`)}>
                            <Eye size={13}/>
                          </TblBtn>
                          <TblBtn title="Editar" color="#8B5CF6" onClick={() => navigate(`/projects/${p.project_id}/edit`)}>
                            <Pencil size={13}/>
                          </TblBtn>
                          <TblBtn title="Modificaciones" color="#F59E0B" onClick={() => navigate(`/projects/${p.project_id}/modifications`)}>
                            <GitBranch size={13}/>
                          </TblBtn>
                          <TblBtn title="Documentos" color="#6366F1" onClick={() => navigate(`/projects/${p.project_id}/documents`)}>
                            <FolderOpen size={13}/>
                          </TblBtn>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {!loading && filtered.length > 0 && (
              <div style={{
                padding:'10px 14px', borderTop:'1px solid var(--border-color)',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'var(--bg-hover)', flexShrink:0, flexWrap:'wrap', gap:8,
              }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                  {showAll
                    ? <><strong style={{ color:'var(--text-secondary)' }}>{sorted.length}</strong> proyectos</>
                    : <>Mostrando <strong>{(cur-1)*pageSize+1}</strong>–<strong>{Math.min(cur*pageSize,sorted.length)}</strong> de <strong>{filtered.length}</strong></>
                  }
                </span>
                {!showAll && total > 1 && (
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    {[
                      [<ChevronsLeft size={13}/>, () => goTo(1),      cur === 1],
                      [<ChevronLeft  size={13}/>, () => goTo(cur-1),  cur === 1],
                    ].map(([icon, fn, dis], i) => (
                      <button key={i} onClick={fn} disabled={dis}
                        style={{ width:30,height:30,borderRadius:6,border:'1px solid var(--border-color)',background:'var(--bg-secondary)',color:dis?'var(--text-muted)':'var(--text-secondary)',cursor:dis?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit',opacity:dis?0.4:1 }}>
                        {icon}
                      </button>
                    ))}

                    {/* Números de página — ocultar en mobile si hay muchos */}
                    {!isMobile && pages().map((pg, i) =>
                      pg === '...' ? <span key={`e${i}`} style={{ padding:'0 4px', color:'var(--text-muted)' }}>…</span>
                      : (
                        <button key={pg} onClick={() => goTo(pg)}
                          style={{ width:30,height:30,borderRadius:6,fontSize:12,fontWeight:600,border:'1px solid',fontFamily:'inherit',cursor:'pointer',transition:'all .15s', borderColor:cur===pg?'#0EA5E9':'var(--border-color)', background:cur===pg?'#0EA5E9':'var(--bg-secondary)', color:cur===pg?'white':'var(--text-secondary)' }}>
                          {pg}
                        </button>
                      )
                    )}
                    {isMobile && (
                      <span style={{ padding:'0 8px', fontSize:12, color:'var(--text-muted)' }}>{cur}/{total}</span>
                    )}

                    {[
                      [<ChevronRight  size={13}/>, () => goTo(cur+1), cur === total],
                      [<ChevronsRight size={13}/>, () => goTo(total), cur === total],
                    ].map(([icon, fn, dis], i) => (
                      <button key={i+10} onClick={fn} disabled={dis}
                        style={{ width:30,height:30,borderRadius:6,border:'1px solid var(--border-color)',background:'var(--bg-secondary)',color:dis?'var(--text-muted)':'var(--text-secondary)',cursor:dis?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit',opacity:dis?0.4:1 }}>
                        {icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}