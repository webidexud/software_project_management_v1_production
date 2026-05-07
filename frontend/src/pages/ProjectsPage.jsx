// frontend/src/pages/ProjectsPage.jsx — v4.3
// MEJORA: Búsqueda integral por todos los campos del proyecto
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, RefreshCw, Search, Pencil, PowerOff, Power,
         Eye, GitBranch, X, Filter,
         ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { projectsService } from '../services/projects'
import StatusBadge from '../components/ui/StatusBadge'

const PAGE_OPTS = [5, 10, 20, 'Todos']

function TblBtn({ title, color, onClick, children }) {
  return (
    <button title={title} onClick={onClick}
      style={{ width:28, height:28, borderRadius:6, border:'1px solid', borderColor:`${color}33`, background:`${color}11`, color, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all .15s', fontFamily:'inherit' }}
      onMouseEnter={e=>{ e.currentTarget.style.background=`${color}22`; e.currentTarget.style.borderColor=`${color}66` }}
      onMouseLeave={e=>{ e.currentTarget.style.background=`${color}11`; e.currentTarget.style.borderColor=`${color}33` }}>
      {children}
    </button>
  )
}

// ── Highlight: resalta el término buscado en el texto ──────────────────
function Highlight({ text, query }) {
  if (!text) return <span>—</span>
  if (!query) return <span>{text}</span>
  const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background:'#FEF08A', color:'#713F12', borderRadius:2, padding:'0 1px' }}>{part}</mark>
          : part
      )}
    </span>
  )
}

// ── Función de búsqueda integral ───────────────────────────────────────
function matchesSearch(p, q) {
  if (!q) return true
  const terms = q.toLowerCase().trim().split(/\s+/)
  const haystack = [
    p.project_name,
    p.project_purpose,
    p.entity_name,
    p.department_name,
    p.status_name,
    p.modality_name,
    p.financing_name,
    p.official_name,
    p.type_name,
    p.external_project_number,
    p.main_email,
    p.administrative_act,
    p.accounting_code,
    p.observations,
    String(p.project_id),
    String(p.project_year),
    String(p.project_value || ''),
    p.start_date,
    p.end_date,
    p.subscription_date,
  ].filter(Boolean).map(s => String(s).toLowerCase()).join(' ')

  // Búsqueda por valor con símbolo $ o por rango
  if (q.startsWith('$')) {
    const num = q.replace(/[$.,]/g, '')
    return String(p.project_value || '').replace(/[.,]/g, '').includes(num)
  }

  // Todos los términos deben estar presentes (AND entre palabras)
  return terms.every(term => haystack.includes(term))
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [projects,     setProjects]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [pageSize,     setPageSize]     = useState(10)
  const [page,         setPage]         = useState(1)
  const [filterYear,   setFilterYear]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showFilters,  setShowFilters]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await projectsService.list(); setProjects(r.data) }
    catch { toast.error('Error al cargar proyectos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, showInactive, pageSize, filterYear, filterStatus])

  // Años disponibles para el filtro rápido
  const years = [...new Set(projects.map(p => p.project_year))].sort((a,b) => b-a)
  const statuses = [...new Map(projects.map(p => [p.project_status_id, { id:p.project_status_id, name:p.status_name, color:p.status_color }])).values()]

  const filtered = projects.filter(p => {
    const matchSrch   = matchesSearch(p, search)
    const matchYear   = !filterYear   || String(p.project_year) === filterYear
    const matchStatus = !filterStatus || String(p.project_status_id) === filterStatus
    const matchActive = showInactive  || p.is_active
    return matchSrch && matchYear && matchStatus && matchActive
  })

  const showAll = pageSize === 'Todos'
  const total   = Math.max(1, showAll ? 1 : Math.ceil(filtered.length / pageSize))
  const cur     = Math.min(page, total)
  const rows    = showAll ? filtered : filtered.slice((cur-1)*pageSize, cur*pageSize)
  const goTo    = p => setPage(Math.max(1, Math.min(p, total)))

  const handleToggle = async p => {
    try {
      await projectsService.toggle(p.project_id)
      toast.success(p.is_active ? 'Proyecto deshabilitado' : 'Proyecto habilitado')
      load()
    } catch { toast.error('Error al cambiar estado') }
  }

  const pages = () => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i+1)
    if (cur <= 4)   return [1,2,3,4,5,'...',total]
    if (cur >= total-3) return [1,'...',total-4,total-3,total-2,total-1,total]
    return [1,'...',cur-1,cur,cur+1,'...',total]
  }

  const hasActiveFilters = filterYear || filterStatus
  const clearAll = () => { setSearch(''); setFilterYear(''); setFilterStatus('') }

  // Formato moneda
  const fmtMoney = v => v ? `$${parseFloat(v).toLocaleString('es-CO')}` : '—'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:16 }}>

      {/* ── Cabecera ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:0 }}>Proyectos</h1>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
            Gestión de proyectos de extensión universitaria
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} title="Recargar"
            style={{ width:36, height:36, borderRadius:8, border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:'inherit' }}>
            <RefreshCw size={15}/>
          </button>
          <button onClick={() => navigate('/projects/new')} className="btn-primary">
            <Plus size={15}/> Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* ── Barra de búsqueda + filtros ── */}
      <div className="card" style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>

          {/* Input búsqueda */}
          <div style={{ position:'relative', flex:1, minWidth:220 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, objeto, entidad, dependencia, estado, valor, número, fechas, correo..."
              style={{ width:'100%', paddingLeft:32, paddingRight:search?32:12, paddingTop:8, paddingBottom:8, border:'1px solid var(--border-color)', borderRadius:8, background:'var(--bg-input)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
            />
            {search && (
              <button onClick={()=>setSearch('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:2 }}>
                <X size={13}/>
              </button>
            )}
          </div>

          {/* Filtro rápido año */}
          <select value={filterYear} onChange={e=>setFilterYear(e.target.value)}
            style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--border-color)', background:'var(--bg-input)', color:'var(--text-primary)', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
            <option value="">Todos los años</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Filtro rápido estado */}
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--border-color)', background:'var(--bg-input)', color:'var(--text-primary)', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
            <option value="">Todos los estados</option>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Inactivos */}
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', cursor:'pointer', whiteSpace:'nowrap' }}>
            <input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)} style={{ accentColor:'#0EA5E9' }}/>
            Mostrar inactivos
          </label>

          {/* Por página */}
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', marginLeft:'auto' }}>
            Por página:
            {PAGE_OPTS.map(n => (
              <button key={n} onClick={()=>setPageSize(n)}
                style={{ padding:'4px 8px', borderRadius:6, border:'1px solid', fontSize:12, fontFamily:'inherit', cursor:'pointer', fontWeight: pageSize===n?700:400, borderColor: pageSize===n?'#0EA5E9':'var(--border-color)', background: pageSize===n?'#0EA5E9':'transparent', color: pageSize===n?'#fff':'var(--text-muted)' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Resumen de filtros activos */}
        {(search || hasActiveFilters) && (
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>
              <strong style={{ color:'var(--text-primary)' }}>{filtered.length}</strong> resultado{filtered.length!==1?'s':''} encontrado{filtered.length!==1?'s':''}
            </span>
            {search && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(14,165,233,0.1)', color:'#0EA5E9', border:'1px solid rgba(14,165,233,0.25)' }}>
                "{search}"
                <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#0EA5E9', padding:0, display:'flex' }}><X size={10}/></button>
              </span>
            )}
            {filterYear && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(139,92,246,0.1)', color:'#8B5CF6', border:'1px solid rgba(139,92,246,0.25)' }}>
                Año: {filterYear}
                <button onClick={()=>setFilterYear('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#8B5CF6', padding:0, display:'flex' }}><X size={10}/></button>
              </span>
            )}
            {filterStatus && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(245,158,11,0.1)', color:'#F59E0B', border:'1px solid rgba(245,158,11,0.25)' }}>
                Estado: {statuses.find(s=>String(s.id)===filterStatus)?.name}
                <button onClick={()=>setFilterStatus('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#F59E0B', padding:0, display:'flex' }}><X size={10}/></button>
              </span>
            )}
            {(search || hasActiveFilters) && (
              <button onClick={clearAll} style={{ fontSize:11, color:'#EF4444', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:'2px 4px' }}>
                Limpiar todo
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className="card" style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', padding:0 }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'60px 0', color:'var(--text-muted)', fontSize:13 }}>
            Cargando proyectos...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-muted)', fontSize:13 }}>
            {search || hasActiveFilters
              ? <>Sin resultados · <button onClick={clearAll} style={{ background:'none', border:'none', color:'#0EA5E9', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>Limpiar filtros</button></>
              : <>No hay proyectos registrados · <button onClick={()=>navigate('/projects/new')} style={{ background:'none', border:'none', color:'#0EA5E9', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>Crear el primero</button></>
            }
          </div>
        ) : (
          <>
            <div style={{ overflowX:'auto', flex:1 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Año / #', 'Proyecto', 'Entidad', 'Dependencia', 'Valor', 'Fechas', 'Estado', ''].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, i) => (
                    <tr key={p.project_id} className="table-row" style={{ animationDelay:`${Math.min(i*20,200)}ms` }}>

                      {/* Año / # */}
                      <td className="table-cell" style={{ whiteSpace:'nowrap' }}>
                        <div style={{ fontFamily:'monospace', fontSize:11, color:'var(--text-muted)' }}>
                          <Highlight text={String(p.project_year)} query={search}/>
                        </div>
                        <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>
                          #<Highlight text={String(p.project_id)} query={search}/>
                        </div>
                        {p.external_project_number && (
                          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>
                            Ext: <Highlight text={p.external_project_number} query={search}/>
                          </div>
                        )}
                      </td>

                      {/* Proyecto */}
                      <td className="table-cell" style={{ maxWidth:260 }}>
                        <p style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13, lineHeight:1.35, margin:0 }}>
                          <Highlight text={p.project_name} query={search}/>
                        </p>
                        {p.project_purpose && (
                          <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, lineHeight:1.3 }}>
                            <Highlight text={p.project_purpose.substring(0,80)+(p.project_purpose.length>80?'…':'')} query={search}/>
                          </p>
                        )}
                      </td>

                      {/* Entidad */}
                      <td className="table-cell">
                        <span style={{ fontSize:12, color:'var(--text-secondary)' }}>
                          <Highlight text={p.entity_name} query={search}/>
                        </span>
                      </td>

                      {/* Dependencia */}
                      <td className="table-cell">
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                          <Highlight text={p.department_name} query={search}/>
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="table-cell" style={{ whiteSpace:'nowrap' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', fontFamily:'monospace' }}>
                          {fmtMoney(p.project_value)}
                        </span>
                      </td>

                      {/* Fechas */}
                      <td className="table-cell" style={{ whiteSpace:'nowrap', fontSize:11, color:'var(--text-muted)' }}>
                        <div>Inicio: <Highlight text={p.start_date} query={search}/></div>
                        <div>Fin: <Highlight text={p.end_date} query={search}/></div>
                      </td>

                      {/* Estado */}
                      <td className="table-cell">
                        <StatusBadge active={p.is_active} label={p.status_name} color={p.status_color}/>
                      </td>

                      {/* Acciones */}
                      <td className="table-cell">
                        <div style={{ display:'flex', gap:4 }}>
                          <TblBtn title="Ver proyecto" color="#0EA5E9" onClick={()=>navigate(`/projects/${p.project_id}/view`)}>
                            <Eye size={13}/>
                          </TblBtn>
                          <TblBtn title="Editar proyecto" color="#8B5CF6" onClick={()=>navigate(`/projects/${p.project_id}/edit`)}>
                            <Pencil size={13}/>
                          </TblBtn>
                          <TblBtn title="Modificaciones" color="#F59E0B" onClick={()=>navigate(`/projects/${p.project_id}/modifications`)}>
                            <GitBranch size={13}/>
                          </TblBtn>
                          <TblBtn title="Documentos" color="#6366F1" onClick={()=>navigate(`/projects/${p.project_id}/documents`)}>
                            <FolderOpen size={13}/>
                          </TblBtn>
                          <TblBtn title={p.is_active?'Deshabilitar':'Habilitar'} color={p.is_active?'#B91C3C':'#10B981'} onClick={()=>handleToggle(p)}>
                            {p.is_active ? <PowerOff size={13}/> : <Power size={13}/>}
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
              <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border-color)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-hover)', flexShrink:0 }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                  {showAll
                    ? <>Total: <strong style={{ color:'var(--text-secondary)' }}>{filtered.length}</strong> proyectos</>
                    : <>Mostrando <strong>{(cur-1)*pageSize+1}</strong>–<strong>{Math.min(cur*pageSize,filtered.length)}</strong> de <strong>{filtered.length}</strong></>
                  }
                </span>
                {!showAll && total > 1 && (
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    {[[<ChevronsLeft size={13}/>,()=>goTo(1),cur===1],[<ChevronLeft size={13}/>,()=>goTo(cur-1),cur===1]].map(([icon,fn,dis],i)=>(
                      <button key={i} onClick={fn} disabled={dis}
                        style={{ width:30,height:30,borderRadius:6,border:'1px solid var(--border-color)',background:'var(--bg-secondary)',color:dis?'var(--text-muted)':'var(--text-secondary)',cursor:dis?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit',opacity:dis?0.4:1 }}>
                        {icon}
                      </button>
                    ))}
                    {pages().map((pg,i)=>
                      pg==='...' ? <span key={`e${i}`} style={{ padding:'0 4px',color:'var(--text-muted)' }}>…</span>
                      : <button key={pg} onClick={()=>goTo(pg)}
                          style={{ width:30,height:30,borderRadius:6,fontSize:12,fontWeight:600,border:'1px solid',fontFamily:'inherit',cursor:'pointer',transition:'all .15s', borderColor:cur===pg?'#0EA5E9':'var(--border-color)', background:cur===pg?'#0EA5E9':'var(--bg-secondary)', color:cur===pg?'white':'var(--text-secondary)' }}>
                          {pg}
                        </button>
                    )}
                    {[[<ChevronRight size={13}/>,()=>goTo(cur+1),cur===total],[<ChevronsRight size={13}/>,()=>goTo(total),cur===total]].map(([icon,fn,dis],i)=>(
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
