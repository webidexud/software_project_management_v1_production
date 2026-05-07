import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, X, Check } from 'lucide-react'

/**
 * Reemplaza <select> nativos con filtro de búsqueda integrado.
 * Props:
 *   value, onChange, options=[{value, label, sub}], placeholder, disabled
 */
export default function SearchableSelect({ value, onChange, options = [], placeholder = '— Seleccionar —', disabled }) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const ref    = useRef(null)
  const inputRef = useRef(null)

  const selected = options.find(o => String(o.value) === String(value))

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || (o.sub || '').toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const select = (opt) => {
    onChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
          border: `1px solid ${open ? 'var(--sky)' : 'var(--border-input)'}`,
          background: disabled ? 'var(--bg-hover)' : 'var(--bg-input)',
          boxShadow: open ? '0 0 0 3px rgba(14,165,233,0.12)' : 'none',
          transition: 'all .15s', minHeight: 38,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {selected ? (
            <div>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected.label}
              </span>
              {selected.sub && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>{selected.sub}</span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{placeholder}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {selected && !disabled && (
            <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2, borderRadius: 4 }}>
              <X size={13} />
            </button>
          )}
          <ChevronDown size={15} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 500,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}>
          {/* Search box */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Escriba para filtrar..."
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%', fontFamily: 'inherit' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p style={{ padding: '14px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Sin resultados</p>
            ) : (
              filtered.map(opt => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <div key={opt.value} onClick={() => select(opt)} style={{
                    padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    background: isSelected ? 'rgba(14,165,233,0.08)' : 'transparent',
                    transition: 'background .1s',
                  }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ fontSize: 13, color: isSelected ? '#0EA5E9' : 'var(--text-primary)', fontWeight: isSelected ? 600 : 400, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {opt.label}
                      </p>
                      {opt.sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{opt.sub}</p>}
                    </div>
                    {isSelected && <Check size={14} style={{ color: '#0EA5E9', flexShrink: 0 }} />}
                  </div>
                )
              })
            )}
          </div>
          <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-muted)' }}>
            {filtered.length} de {options.length} opciones
          </div>
        </div>
      )}
    </div>
  )
}
