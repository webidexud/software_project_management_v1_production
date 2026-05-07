import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function CrudModal({ isOpen, onClose, title, size = 'md', children }) {
  const [mounted, setMounted] = useState(false)

  // Garantizar que el DOM esté listo antes de usar createPortal
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isOpen) return
    const fn = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', fn)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', fn)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  const w = { sm: 440, md: 560, lg: 720, xl: 900 }[size] || 560

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
      }} />

      {/* Caja del modal */}
      <div className="card" style={{
        position: 'relative',
        width: '100%',
        maxWidth: w,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        animation: 'fadeIn .15s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 20px',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
          background: 'var(--bg-card)',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div style={{ overflowY: 'auto', padding: 20, flex: 1 }}>
          {children}
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(.97) } to { opacity:1; transform:scale(1) } }`}</style>
    </div>,
    document.body
  )
}

/* ── Helpers de formulario ─────────────────────────────────────────── */
export function FormGrid({ cols = 2, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
      {children}
    </div>
  )
}

export function Field({ label, required, span, children }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600,
        color: 'var(--text-secondary)', marginBottom: 5,
      }}>
        {label}{required && <span style={{ color: '#B91C3C' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

export function FormActions({ onCancel, saving, isEdit }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', gap: 10,
      paddingTop: 16, marginTop: 8,
      borderTop: '1px solid var(--border-color)',
    }}>
      <button type="button" onClick={onCancel} className="btn-secondary">
        Cancelar
      </button>
      <button type="submit" disabled={saving} className="btn-primary" style={{ minWidth: 150 }}>
        {saving ? 'Guardando...' : isEdit ? '💾 Guardar cambios' : '✚ Crear registro'}
      </button>
    </div>
  )
}