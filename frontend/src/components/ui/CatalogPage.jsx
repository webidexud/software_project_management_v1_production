import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import DataTable from './DataTable'

const PAGE_OPTS = [5, 10, 15, 20, 'Todos']

export default function CatalogPage({
  title, icon: Icon, iconBg, iconColor,
  service, columns, searchKeys, emptyMessage = 'Sin registros',
  renderModal,
}) {
  const [data, setData]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [pageSize, setPageSize]   = useState(10)
  const [page, setPage]           = useState(1)
  const [modal, setModal]         = useState(null) // null | { mode:'new' } | { mode:'edit', record }

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await service.list(); setData(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [service])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, showInactive, pageSize])

  const filtered = data.filter(r => {
    const ok = !search || (searchKeys || []).some(k => String(r[k] || '').toLowerCase().includes(search.toLowerCase()))
    return ok && (showInactive || r.is_active)
  })

  const showAll = pageSize === 'Todos'
  const total   = Math.max(1, showAll ? 1 : Math.ceil(filtered.length / pageSize))
  const cur     = Math.min(page, total)
  const rows    = showAll ? filtered : filtered.slice((cur - 1) * pageSize, cur * pageSize)
  const goTo    = p => setPage(Math.max(1, Math.min(p, total)))

  const pages = () => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const d = 2, r = []
    for (let i = Math.max(2, cur - d); i <= Math.min(total - 1, cur + d); i++) r.push(i)
    if (cur - d > 2) r.unshift('...')
    if (cur + d < total - 1) r.push('...')
    return [1, ...r, total]
  }

  const openNew    = () => setModal({ mode: 'new' })
  const openEdit   = (record) => setModal({ mode: 'edit', record })
  const closeModal = () => setModal(null)
  const afterSave  = () => { closeModal(); load() }

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={22} color={iconColor} />
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)' }}>{title}</h1>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {loading ? 'Cargando...' : `${filtered.length} de ${data.length} registros`}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={load} className="btn-secondary"><RefreshCw size={14}/>Actualizar</button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/>Nuevo</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input className="input-field" style={{ paddingLeft:36 }}
              placeholder={`Buscar en ${title.toLowerCase()}...`}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-secondary)', cursor:'pointer', whiteSpace:'nowrap' }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ accentColor:'#0EA5E9' }}/>
            Mostrar inactivos
          </label>
          <div style={{ display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>Mostrar</span>
            {PAGE_OPTS.map(o => (
              <button key={o} onClick={() => setPageSize(o)} style={{
                padding:'4px 9px', borderRadius:6, fontSize:12, fontWeight:600, border:'1px solid', fontFamily:'inherit', cursor:'pointer', transition:'all .15s',
                borderColor: pageSize===o ? '#0EA5E9' : 'var(--border-color)',
                background:  pageSize===o ? 'rgba(14,165,233,.12)' : 'var(--bg-secondary)',
                color:       pageSize===o ? '#0EA5E9' : 'var(--text-muted)',
              }}>{o}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflow:'hidden' }}>
        <DataTable columns={columns({ openEdit, reload: load, service })} data={rows} loading={loading} emptyMessage={emptyMessage}/>
        {!loading && filtered.length > 0 && (
          <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border-color)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-hover)' }}>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>
              {showAll
                ? <>Total: <strong style={{ color:'var(--text-secondary)' }}>{filtered.length}</strong> registros</>
                : <>Mostrando <strong style={{ color:'var(--text-secondary)' }}>{(cur-1)*pageSize+1}</strong>–<strong style={{ color:'var(--text-secondary)' }}>{Math.min(cur*pageSize,filtered.length)}</strong> de <strong style={{ color:'var(--text-secondary)' }}>{filtered.length}</strong></>
              }
            </span>
            {!showAll && total > 1 && (
              <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                {[
                  [<ChevronsLeft size={13}/>, () => goTo(1), cur===1],
                  [<ChevronLeft  size={13}/>, () => goTo(cur-1), cur===1],
                ].map(([icon, fn, dis], i) => <PgBtn key={i} onClick={fn} disabled={dis}>{icon}</PgBtn>)}
                {pages().map((p,i) =>
                  p==='...' ? <span key={`e${i}`} style={{ padding:'0 4px', color:'var(--text-muted)' }}>…</span>
                  : <button key={p} onClick={()=>goTo(p)} style={{
                      width:30, height:30, borderRadius:6, fontSize:12, fontWeight:600, border:'1px solid', fontFamily:'inherit', cursor:'pointer', transition:'all .15s',
                      borderColor: cur===p ? '#0EA5E9' : 'var(--border-color)',
                      background:  cur===p ? '#0EA5E9' : 'var(--bg-secondary)',
                      color:       cur===p ? 'white'   : 'var(--text-secondary)',
                    }}>{p}</button>
                )}
                {[
                  [<ChevronRight  size={13}/>, () => goTo(cur+1), cur===total],
                  [<ChevronsRight size={13}/>, () => goTo(total),  cur===total],
                ].map(([icon, fn, dis], i) => <PgBtn key={i+10} onClick={fn} disabled={dis}>{icon}</PgBtn>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal (renderizado por la página hija) */}
      {modal && renderModal && renderModal({ modal, closeModal, afterSave })}
    </div>
  )
}

function PgBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:30, height:30, borderRadius:6, border:'1px solid var(--border-color)',
      background:'var(--bg-secondary)', color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
      display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s', fontFamily:'inherit',
    }}>{children}</button>
  )
}
