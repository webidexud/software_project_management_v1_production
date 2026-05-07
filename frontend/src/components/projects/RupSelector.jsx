import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, X, Star, ChevronRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { rupService } from '../../services/projects'

/**
 * Selector de códigos RUP en cascada: Segmento → Familia → Clase → Producto
 * Props:
 *   selectedCodes: [{ rup_code_id, rup_code, product_name, segment_name, family_name, class_name, is_main_code }]
 *   onChange: (codes) => void
 */
export default function RupSelector({ selectedCodes = [], onChange }) {
  const [segments,  setSegments]  = useState([])
  const [families,  setFamilies]  = useState([])
  const [classes,   setClasses]   = useState([])
  const [products,  setProducts]  = useState([])

  const [selSeg,    setSelSeg]    = useState(null)
  const [selFam,    setSelFam]    = useState(null)
  const [selClass,  setSelClass]  = useState(null)

  const [searchQ,   setSearchQ]   = useState('')
  const [searchRes, setSearchRes] = useState([])
  const [searching, setSearching] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')

  // Cargar segmentos al montar
  useEffect(() => {
    rupService.segments().then(r => setSegments(r.data)).catch(() => toast.error('Error cargando segmentos RUP'))
  }, [])

  // Cascada: segmento → familias
  const selectSegment = async (seg) => {
    setSelSeg(seg); setSelFam(null); setSelClass(null); setFamilies([]); setClasses([]); setProducts([])
    setLoadingStep('families')
    try { const r = await rupService.families(seg.segment_code); setFamilies(r.data) }
    catch { toast.error('Error cargando familias') }
    finally { setLoadingStep('') }
  }

  // Cascada: familia → clases
  const selectFamily = async (fam) => {
    setSelFam(fam); setSelClass(null); setClasses([]); setProducts([])
    setLoadingStep('classes')
    try { const r = await rupService.classes(fam.family_code); setClasses(r.data) }
    catch { toast.error('Error cargando clases') }
    finally { setLoadingStep('') }
  }

  // Cascada: clase → productos
  const selectClass = async (cls) => {
    setSelClass(cls); setProducts([])
    setLoadingStep('products')
    try { const r = await rupService.products(cls.class_code); setProducts(r.data) }
    catch { toast.error('Error cargando productos') }
    finally { setLoadingStep('') }
  }

  // Búsqueda libre
  useEffect(() => {
    if (searchQ.length < 3) { setSearchRes([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try { const r = await rupService.search(searchQ); setSearchRes(r.data) }
      catch { setSearchRes([]) }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQ])

  const isSelected = (id) => selectedCodes.some(c => c.rup_code_id === id)

  const addCode = (product) => {
    if (isSelected(product.rup_code_id)) { toast.error('Este código ya está agregado'); return }
    const isFirst = selectedCodes.length === 0
    const newCode = {
      rup_code_id:  product.rup_code_id,
      rup_code:     product.rup_code,
      product_name: product.product_name,
      segment_name: product.segment_name,
      family_name:  product.family_name,
      class_name:   product.class_name,
      is_main_code: isFirst,
    }
    onChange([...selectedCodes, newCode])
    toast.success(`Código ${product.rup_code} agregado`)
  }

  const removeCode = (id) => {
    const updated = selectedCodes.filter(c => c.rup_code_id !== id)
    // Si se elimina el principal y quedan otros, el primero pasa a ser principal
    if (updated.length > 0 && !updated.some(c => c.is_main_code))
      updated[0] = { ...updated[0], is_main_code: true }
    onChange(updated)
  }

  const toggleMain = (id) => {
    onChange(selectedCodes.map(c => ({ ...c, is_main_code: c.rup_code_id === id })))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Códigos ya seleccionados */}
      {selectedCodes.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
            Códigos asignados ({selectedCodes.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedCodes.map(c => (
              <div key={c.rup_code_id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: c.is_main_code ? 'rgba(14,165,233,0.07)' : 'var(--bg-secondary)',
                border: `1px solid ${c.is_main_code ? 'rgba(14,165,233,0.3)' : 'var(--border-color)'}`,
              }}>
                <button title={c.is_main_code ? 'Código principal' : 'Marcar como principal'}
                  onClick={() => toggleMain(c.rup_code_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}>
                  <Star size={16} fill={c.is_main_code ? '#F59E0B' : 'none'} color={c.is_main_code ? '#F59E0B' : 'var(--text-muted)'} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#0EA5E9' }}>{c.rup_code}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{c.product_name}</span>
                    {c.is_main_code && <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)' }}>PRINCIPAL</span>}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {[c.segment_name, c.family_name, c.class_name].filter(Boolean).join(' › ')}
                  </p>
                </div>
                <button onClick={() => removeCode(c.rup_code_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 6, flexShrink: 0 }}>
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel de búsqueda y cascada */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>

        {/* Búsqueda rápida */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Búsqueda rápida por nombre o código</p>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-field" style={{ paddingLeft: 32 }}
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Ej: consultoría, 80101501, servicios profesionales..." />
            {searching && <Loader2 size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          </div>
          {searchRes.length > 0 && (
            <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-card)' }}>
              {searchRes.map(p => (
                <SearchResult key={p.rup_code_id} p={p} isSelected={isSelected(p.rup_code_id)} onAdd={() => addCode(p)} />
              ))}
            </div>
          )}
          {searchQ.length >= 3 && searchRes.length === 0 && !searching && (
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>Sin resultados para "{searchQ}"</p>
          )}
        </div>

        {/* Cascada: Segmento → Familia → Clase → Productos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', minHeight: 280 }}>
          {/* Segmentos */}
          <CascadeCol title="Segmento" loading={loadingStep === 'segments'}>
            {segments.map(s => (
              <CascadeItem key={s.segment_code} code={s.segment_code} label={s.segment_name}
                active={selSeg?.segment_code === s.segment_code} hasChildren
                onClick={() => selectSegment(s)} />
            ))}
          </CascadeCol>

          {/* Familias */}
          <CascadeCol title="Familia" loading={loadingStep === 'families'} empty={selSeg && families.length === 0 && loadingStep !== 'families'}>
            {families.map(f => (
              <CascadeItem key={f.family_code} code={f.family_code} label={f.family_name}
                active={selFam?.family_code === f.family_code} hasChildren
                onClick={() => selectFamily(f)} />
            ))}
          </CascadeCol>

          {/* Clases */}
          <CascadeCol title="Clase" loading={loadingStep === 'classes'} empty={selFam && classes.length === 0 && loadingStep !== 'classes'}>
            {classes.map(c => (
              <CascadeItem key={c.class_code} code={c.class_code} label={c.class_name}
                active={selClass?.class_code === c.class_code} hasChildren
                onClick={() => selectClass(c)} />
            ))}
          </CascadeCol>

          {/* Productos */}
          <CascadeCol title="Producto" loading={loadingStep === 'products'} isLast empty={selClass && products.length === 0 && loadingStep !== 'products'}>
            {products.map(p => (
              <ProductItem key={p.rup_code_id} p={p} isSelected={isSelected(p.rup_code_id)} onAdd={() => addCode(p)} />
            ))}
          </CascadeCol>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg) } }`}</style>
    </div>
  )
}

function CascadeCol({ title, children, loading, isLast, empty }) {
  return (
    <div style={{ borderRight: isLast ? 'none' : '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', margin: 0 }}>{title}</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 260 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Loader2 size={16} style={{ color: '#0EA5E9', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : empty ? (
          <p style={{ padding: '12px 10px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Sin resultados</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function CascadeItem({ code, label, active, hasChildren, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 6,
      background: active ? 'rgba(14,165,233,0.10)' : 'transparent',
      borderLeft: `3px solid ${active ? '#0EA5E9' : 'transparent'}`,
      transition: 'all .1s',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontFamily: 'monospace', color: active ? '#0EA5E9' : 'var(--text-muted)', margin: 0 }}>{code}</p>
        <p style={{ fontSize: 12, color: active ? '#0EA5E9' : 'var(--text-secondary)', fontWeight: active ? 600 : 400, margin: 0, lineHeight: 1.3, wordBreak: 'break-word' }}>{label}</p>
      </div>
      {hasChildren && <ChevronRight size={12} style={{ color: active ? '#0EA5E9' : 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />}
    </div>
  )
}

function ProductItem({ p, isSelected, onAdd }) {
  return (
    <div style={{
      padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: 6,
      background: isSelected ? 'rgba(16,185,129,0.07)' : 'transparent',
      borderLeft: `3px solid ${isSelected ? '#10B981' : 'transparent'}`,
    }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'rgba(16,185,129,0.07)' : 'transparent' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontFamily: 'monospace', color: isSelected ? '#10B981' : 'var(--text-muted)', margin: 0 }}>{p.rup_code}</p>
        <p style={{ fontSize: 12, color: isSelected ? '#10B981' : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 400, margin: 0, lineHeight: 1.3, wordBreak: 'break-word' }}>{p.product_name}</p>
      </div>
      <button onClick={onAdd} disabled={isSelected} title={isSelected ? 'Ya agregado' : 'Agregar'} style={{
        flexShrink: 0, width: 22, height: 22, borderRadius: 6, border: '1px solid',
        borderColor: isSelected ? '#10B981' : 'var(--border-color)',
        background: isSelected ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)',
        color: isSelected ? '#10B981' : 'var(--text-muted)',
        cursor: isSelected ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .15s',
      }}>
        {isSelected ? <span style={{ fontSize: 11 }}>✓</span> : <Plus size={12} />}
      </button>
    </div>
  )
}

function SearchResult({ p, isSelected, onAdd }) {
  return (
    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0EA5E9', flexShrink: 0 }}>{p.rup_code}</span>
          <span style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product_name}</span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          {[p.segment_name, p.family_name, p.class_name].filter(Boolean).join(' › ')}
        </p>
      </div>
      <button onClick={onAdd} disabled={isSelected} style={{
        padding: '4px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, fontFamily: 'inherit', cursor: isSelected ? 'default' : 'pointer',
        borderColor: isSelected ? '#10B981' : '#0EA5E9',
        background: isSelected ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.1)',
        color: isSelected ? '#10B981' : '#0EA5E9', fontWeight: 600, flexShrink: 0,
      }}>
        {isSelected ? '✓ Agregado' : '+ Agregar'}
      </button>
    </div>
  )
}
