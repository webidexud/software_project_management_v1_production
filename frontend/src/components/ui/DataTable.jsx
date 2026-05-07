import { useState } from 'react'
import { Loader2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

function sortData(data, sortStack) {
  if (!sortStack.length) return data
  return [...data].sort((a, b) => {
    for (const { key, dir } of sortStack) {
      let va = a[key], vb = b[key]
      if (va === null || va === undefined) va = ''
      if (vb === null || vb === undefined) vb = ''
      let cmp = 0
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb
      } else if (typeof va === 'boolean') {
        cmp = va === vb ? 0 : va ? 1 : -1
      } else {
        cmp = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' })
      }
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

export default function DataTable({ columns, data, loading, emptyMessage = 'Sin registros' }) {
  // sortStack: [{ key, dir }] — orden de prioridad, índice 0 = mayor prioridad
  const [sortStack, setSortStack] = useState([])

  const handleSort = (col) => {
    if (col.sortable === false) return
    const key = col.sortKey || col.key
    if (!key) return

    setSortStack(prev => {
      const idx = prev.findIndex(s => s.key === key)
      if (idx === -1) {
        // Nueva columna: agregar al stack como asc
        return [...prev, { key, dir: 'asc' }]
      }
      const current = prev[idx]
      if (current.dir === 'asc') {
        // Cambiar a desc
        return prev.map((s, i) => i === idx ? { ...s, dir: 'desc' } : s)
      }
      // Era desc → quitar del stack
      return prev.filter((_, i) => i !== idx)
    })
  }

  const getSortInfo = (col) => {
    const key = col.sortKey || col.key
    const idx = sortStack.findIndex(s => s.key === key)
    if (idx === -1) return null
    return { dir: sortStack[idx].dir, priority: idx + 1 }
  }

  const sorted = sortData(data, sortStack)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10 }}>
        <Loader2 size={22} style={{ color: '#0EA5E9', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Indicador de ordenamientos activos */}
      {sortStack.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(14,165,233,0.04)',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Orden:
          </span>
          {sortStack.map(({ key, dir }, i) => {
            const col = columns.find(c => (c.sortKey || c.key) === key)
            return (
              <span key={key} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: 'rgba(14,165,233,0.12)', color: '#0EA5E9',
                border: '1px solid rgba(14,165,233,0.25)',
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#0EA5E9',
                  color: 'white', fontSize: 9, fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i + 1}
                </span>
                {col?.label}
                {dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                <button onClick={() => setSortStack(prev => prev.filter(s => s.key !== key))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0EA5E9', padding: 0, fontSize: 13, lineHeight: 1, fontFamily: 'inherit' }}>
                  ×
                </button>
              </span>
            )
          })}
          <button onClick={() => setSortStack([])}
            style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, fontFamily: 'inherit' }}>
            Limpiar todo
          </button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col) => {
              const isSortable = col.sortable !== false && (col.sortKey || col.key)
              const info = getSortInfo(col)
              return (
                <th key={col.key} className="table-header"
                  style={{
                    ...(col.width ? { width: col.width } : {}),
                    cursor: isSortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    transition: 'background 0.1s ease',
                    background: info ? 'rgba(14,165,233,0.06)' : undefined,
                  }}
                  onClick={() => isSortable && handleSort(col)}
                  onMouseEnter={e => { if (isSortable) e.currentTarget.style.background = 'var(--border-color)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = info ? 'rgba(14,165,233,0.06)' : 'var(--bg-hover)' }}
                  title={isSortable ? (info ? `Ordenado ${info.dir === 'asc' ? 'ascendente' : 'descendente'} (prioridad ${info.priority})` : 'Clic para ordenar') : ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>{col.label}</span>
                    {isSortable && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {info ? (
                          <>
                            {info.dir === 'asc'
                              ? <ChevronUp size={13} style={{ color: '#0EA5E9' }} />
                              : <ChevronDown size={13} style={{ color: '#0EA5E9' }} />
                            }
                            {sortStack.length > 1 && (
                              <span style={{
                                fontSize: 9, fontWeight: 800, color: 'white',
                                background: '#0EA5E9', borderRadius: '50%',
                                width: 14, height: 14,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {info.priority}
                              </span>
                            )}
                          </>
                        ) : (
                          <ChevronsUpDown size={13} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, idx) => (
              <tr key={idx} className="table-row animate-fade-in" style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}>
                {columns.map((col) => (
                  <td key={col.key} className="table-cell">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}