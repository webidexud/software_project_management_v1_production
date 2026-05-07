// frontend/src/pages/ReportesPage.jsx — v3.0
// Filtros avanzados: multi-estado, rango fechas inicio/fin, rango valor, entidad
import { useState, useEffect, useRef } from 'react'
import {
  FileSpreadsheet, Bot, Send, Loader, Download, BarChart3,
  AlertCircle, Sparkles, FileText, FileType, Trash2, X,
  ChevronDown, ChevronUp, Filter, Calendar, DollarSign,
  Building2, Activity, Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import DerechosPeticionPanel from '../components/DerechosPeticionPanel'

/* ── Helpers ──────────────────────────────────────────────────────── */
const fmtMoney = v => v ? `$${parseFloat(v).toLocaleString('es-CO')}` : '—'
const YEARS = Array.from({ length: 20 }, (_, i) => 2026 - i)

/* ── Multi-select de estados con colores ─────────────────────────── */
function MultiEstadoSelect({ estados, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id) => {
    const sid = String(id)
    onChange(selected.includes(sid) ? selected.filter(s => s !== sid) : [...selected, sid])
  }

  const selectedNames = estados
    .filter(s => selected.includes(String(s.status_id)))
    .map(s => s.status_name)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border-color)',
          background: 'var(--bg-input)', cursor: 'pointer', fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          minHeight: 36, color: 'var(--text-primary)',
        }}>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {selected.length === 0
            ? <span style={{ color: 'var(--text-muted)' }}>Todos los estados</span>
            : selectedNames.map((n, i) => {
                const st = estados.find(s => s.status_name === n)
                return (
                  <span key={i} style={{
                    padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: `${st?.status_color || '#94A3B8'}20`,
                    color: st?.status_color || '#94A3B8',
                    border: `1px solid ${st?.status_color || '#94A3B8'}40`,
                  }}>{n}</span>
                )
              })
          }
        </div>
        <ChevronDown size={13} color="var(--text-muted)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          marginTop: 4, maxHeight: 240, overflowY: 'auto',
        }}>
          {/* Opción todos */}
          <div
            onClick={() => { onChange([]); setOpen(false) }}
            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: '1px solid var(--border-color)', background: selected.length === 0 ? '#0EA5E9' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selected.length === 0 && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
            </div>
            Todos los estados
          </div>
          {estados.map(s => {
            const isSelected = selected.includes(String(s.status_id))
            return (
              <div key={s.status_id}
                onClick={() => toggle(s.status_id)}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, background: isSelected ? `${s.status_color}08` : 'transparent' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${s.status_color}`, background: isSelected ? s.status_color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isSelected && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.status_color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: isSelected ? 600 : 400 }}>{s.status_name}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Chip de filtro activo ────────────────────────────────────────── */
function FilterChip({ label, color = '#0EA5E9', onRemove }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}15`, color, border: `1px solid ${color}30` }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, display: 'flex' }}>
        <X size={11} />
      </button>
    </span>
  )
}

/* ── Sección colapsable de filtros ───────────────────────────────── */
function SeccionFiltro({ icon: Icon, color, title, children }) {
  return (
    <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={12} color={color} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

/* ── Panel de filtros avanzados ──────────────────────────────────── */
function FiltrosPanel({ filters, setFilters, estados, entidades, stats, loadingStats, onDownload, downloading }) {
  const [expanded, setExpanded] = useState(true)

  const IS = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  // Chips activos
  const chips = []
  if (filters.year)                chips.push({ label: `Año: ${filters.year}`,              color: '#8B5CF6', key: 'year' })
  if (filters.selectedStatuses?.length) chips.push({ label: `${filters.selectedStatuses.length} estado(s)`, color: '#0EA5E9', key: 'selectedStatuses' })
  if (filters.valor_min)           chips.push({ label: `Mín: ${fmtMoney(filters.valor_min)}`, color: '#10B981', key: 'valor_min' })
  if (filters.valor_max)           chips.push({ label: `Máx: ${fmtMoney(filters.valor_max)}`, color: '#10B981', key: 'valor_max' })
  if (filters.fecha_inicio_desde)  chips.push({ label: `Inicio desde: ${filters.fecha_inicio_desde}`, color: '#F59E0B', key: 'fecha_inicio_desde' })
  if (filters.fecha_inicio_hasta)  chips.push({ label: `Inicio hasta: ${filters.fecha_inicio_hasta}`, color: '#F59E0B', key: 'fecha_inicio_hasta' })
  if (filters.fecha_fin_desde)     chips.push({ label: `Fin desde: ${filters.fecha_fin_desde}`, color: '#EF4444', key: 'fecha_fin_desde' })
  if (filters.fecha_fin_hasta)     chips.push({ label: `Fin hasta: ${filters.fecha_fin_hasta}`,  color: '#EF4444', key: 'fecha_fin_hasta' })
  if (filters.entidad_id)          chips.push({ label: `Entidad: ${entidades.find(e => String(e.entity_id) === String(filters.entidad_id))?.entity_name?.substring(0,25) || filters.entidad_id}`, color: '#0EA5E9', key: 'entidad_id' })

  const clearAll = () => setFilters({ selectedStatuses: [] })

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileSpreadsheet size={18} color="#10B981" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Reporte Global · Excel</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              {chips.length > 0 ? `${chips.length} filtro(s) activo(s)` : 'Sin filtros — descarga todos los proyectos'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setExpanded(e => !e)}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {expanded ? <ChevronUp size={15} /> : <Filter size={15} />}
          </button>
          <button onClick={onDownload} disabled={downloading || loadingStats}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#10B981', color: '#fff', border: 'none', cursor: downloading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', padding: '9px 20px', borderRadius: 10, opacity: downloading ? 0.7 : 1 }}>
            {downloading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />}
            {downloading ? 'Generando...' : 'Descargar Excel'}
          </button>
        </div>
      </div>

      {/* Stats siempre visibles */}
      {stats && (
        <div style={{ padding: '0 20px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'Proyectos',           value: stats.total_proyectos,       color: '#0EA5E9' },
            { label: 'Valor total',          value: fmtMoney(stats.valor_total), color: '#10B981' },
            { label: 'Beneficio',            value: fmtMoney(stats.beneficio_total), color: '#8B5CF6' },
            { label: 'Con modificaciones',   value: stats.con_modificaciones,   color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '8px 10px', borderRadius: 8, background: `${s.color}08`, border: `1px solid ${s.color}18` }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: s.color, margin: 0 }}>{loadingStats ? '…' : s.value}</p>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chips de filtros activos */}
      {chips.length > 0 && (
        <div style={{ padding: '0 20px 12px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Filtros:</span>
          {chips.map(c => (
            <FilterChip key={c.key} label={c.label} color={c.color}
              onRemove={() => {
                if (c.key === 'selectedStatuses') set('selectedStatuses', [])
                else set(c.key, '')
              }} />
          ))}
          <button onClick={clearAll} style={{ fontSize: 11, color: '#EF4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
            Limpiar todo
          </button>
        </div>
      )}

      {/* Filtros expandibles */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>

          {/* Año */}
          <SeccionFiltro icon={Filter} color="#8B5CF6" title="Año">
            <select style={IS} value={filters.year || ''} onChange={e => set('year', e.target.value)}>
              <option value="">Todos los años</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </SeccionFiltro>

          {/* Estados múltiples */}
          <SeccionFiltro icon={Activity} color="#0EA5E9" title="Estado (selección múltiple)">
            <MultiEstadoSelect
              estados={estados}
              selected={filters.selectedStatuses || []}
              onChange={v => set('selectedStatuses', v)}
            />
          </SeccionFiltro>

          {/* Entidad */}
          <SeccionFiltro icon={Building2} color="#0EA5E9" title="Entidad">
            <select style={IS} value={filters.entidad_id || ''} onChange={e => set('entidad_id', e.target.value)}>
              <option value="">Todas las entidades</option>
              {entidades.slice(0, 100).map(e => (
                <option key={e.entity_id} value={e.entity_id}>{e.entity_name?.substring(0, 60)}</option>
              ))}
            </select>
          </SeccionFiltro>

          {/* Rango valor */}
          <SeccionFiltro icon={DollarSign} color="#10B981" title="Rango de valor (COP)">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Mínimo</p>
                <input style={IS} type="number" placeholder="0" value={filters.valor_min || ''} onChange={e => set('valor_min', e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Máximo</p>
                <input style={IS} type="number" placeholder="Sin límite" value={filters.valor_max || ''} onChange={e => set('valor_max', e.target.value)} />
              </div>
            </div>
          </SeccionFiltro>

          {/* Rango fecha inicio */}
          <SeccionFiltro icon={Calendar} color="#F59E0B" title="Rango fecha de inicio">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Desde</p>
                <input style={IS} type="date" value={filters.fecha_inicio_desde || ''} onChange={e => set('fecha_inicio_desde', e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Hasta</p>
                <input style={IS} type="date" value={filters.fecha_inicio_hasta || ''} onChange={e => set('fecha_inicio_hasta', e.target.value)} />
              </div>
            </div>
          </SeccionFiltro>

          {/* Rango fecha fin */}
          <SeccionFiltro icon={Calendar} color="#EF4444" title="Rango fecha de vencimiento">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Desde</p>
                <input style={IS} type="date" value={filters.fecha_fin_desde || ''} onChange={e => set('fecha_fin_desde', e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Hasta</p>
                <input style={IS} type="date" value={filters.fecha_fin_hasta || ''} onChange={e => set('fecha_fin_hasta', e.target.value)} />
              </div>
            </div>
          </SeccionFiltro>

        </div>
      )}
    </div>
  )
}

/* ── Chat IA (igual que v2) ──────────────────────────────────────── */
function parseAssistantMessage(content) {
  const match = content.match(/\[DESCARGA\]:(\S+)/)
  if (match) return { text: content.replace(/\[DESCARGA\]:\S+/g, '').trim(), downloadUrl: match[1] }
  return { text: content, downloadUrl: null }
}

function DownloadButton({ url, fileType, count }) {
  const [downloading, setDownloading] = useState(false)
  const labels = { excel: 'Descargar Excel', pdf: 'Descargar PDF', word: 'Descargar Word' }
  const exts   = { excel: '.xlsx', pdf: '.pdf', word: '.docx' }
  const mimes  = { excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pdf: 'application/pdf', word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
  const colors = { excel: '#10B981', pdf: '#EF4444', word: '#0EA5E9' }
  const color  = colors[fileType] || '#0EA5E9'

  const handleDownload = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      // Sanitizar URL: quitar /api si viene incluido (Axios ya lo agrega via baseURL)
      const cleanUrl = url.replace(/^\/api\//, '/')
      const r = await api.get(cleanUrl, { responseType: 'blob' })
      const blob = new Blob([r.data], { type: mimes[fileType] || 'application/octet-stream' })
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = `SIEXUD_reporte_${new Date().toISOString().split('T')[0]}${exts[fileType] || ''}`
      a.click()
      URL.revokeObjectURL(href)
      toast.success('Archivo descargado ✓')
    } catch (err) {
      toast.error('Error al descargar — el archivo puede haber expirado')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={handleDownload} disabled={downloading}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, border: `1px solid ${color}40`, background: `${color}10`, color, cursor: downloading ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: downloading ? 0.7 : 1 }}>
        {downloading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }}/> : <Download size={14} />}
        {downloading ? 'Descargando...' : (labels[fileType] || 'Descargar')}
        {count && <span style={{ padding: '1px 7px', borderRadius: 20, background: `${color}20`, fontSize: 10 }}>{count} proyectos</span>}
      </button>
    </div>
  )
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'
  const { text, downloadUrl } = msg.role === 'assistant' ? parseAssistantMessage(msg.content || '') : { text: msg.content, downloadUrl: null }
  const url = downloadUrl || msg.download_url
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      {!isUser && (
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #B91C3C, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <Sparkles size={13} color="#fff" />
        </div>
      )}
      <div style={{ maxWidth: '80%' }}>
        <div style={{ padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px', background: isUser ? '#0EA5E9' : 'var(--bg-hover)', color: isUser ? '#fff' : 'var(--text-primary)', fontSize: 13, lineHeight: 1.6, border: isUser ? 'none' : '1px solid var(--border-color)', whiteSpace: 'pre-wrap' }}>
          {text}
          {msg.error && <div style={{ marginTop: 6, fontSize: 11, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={11} /> {msg.error}</div>}
        </div>
        {url && <DownloadButton url={url} fileType={msg.file_type} count={msg.projects_count} />}
      </div>
    </div>
  )
}

function ChatIA({ stats, filters }) {
  const INIT = [{ role: 'assistant', content: '¡Hola! Soy el asistente IA de SIEXUD. Puedo responder preguntas y generar reportes.\n\nEjemplos:\n• "Dame un PDF con los proyectos del 2026 en ejecución"\n• "Genera un Excel con todos los proyectos activos, columnas: año, número y objeto"\n• "¿Cuántos proyectos hay por estado?"\n• "¿Cuál es el valor total de contratos del 2025?"' }]
  const [messages, setMessages] = useState(INIT)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const history = messages.slice(1).map(m => ({ role: m.role, content: String(m.content || '') }))
      const r = await api.post('/reportes/chat/', { message: text, context: { stats, filters }, history })
      const { response, download_url, file_type, projects_count } = r.data
      setMessages(prev => [...prev, { role: 'assistant', content: response, download_url, file_type, projects_count }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, ocurrió un error.', error: err.response?.data?.detail || 'Error IA' }])
    } finally { setLoading(false) }
  }

  const SUGERENCIAS = ['Dame un PDF con los proyectos del 2026 en ejecución', 'Genera un Excel de todos los proyectos activos', '¿Cuántos proyectos hay por estado?', 'Reporte Word: año, número y objeto del 2025']

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: 520 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #B91C3C20, #8B5CF620)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={18} color="#8B5CF6" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Asistente IA · SIEXUD</h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Consultas en lenguaje natural · Genera Excel, PDF y Word</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981' }}>Claude Haiku</span>
          </div>
          <button onClick={() => setMessages(INIT)} title="Limpiar"
            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {messages.map((m, i) => <ChatMessage key={i} msg={m} />)}
        {loading && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #B91C3C, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={13} color="#fff" />
            </div>
            <div style={{ padding: '10px 14px', borderRadius: '4px 14px 14px 14px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader size={13} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Procesando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {messages.length === 1 && (
        <div style={{ padding: '0 20px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUGERENCIAS.map(s => (
            <button key={s} onClick={() => { setInput(s); setTimeout(() => textareaRef.current?.focus(), 50) }}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
        <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Pide un reporte o haz una pregunta... (Enter para enviar)"
          rows={1} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
        <button onClick={send} disabled={!input.trim() || loading}
          style={{ width: 42, height: 42, borderRadius: 10, border: 'none', background: input.trim() && !loading ? '#0EA5E9' : 'var(--bg-hover)', color: input.trim() && !loading ? '#fff' : 'var(--text-muted)', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
export default function ReportesPage() {
  const [filters,      setFilters]      = useState({ selectedStatuses: [] })
  const [estados,      setEstados]      = useState([])
  const [entidades,    setEntidades]    = useState([])
  const [stats,        setStats]        = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [downloading,  setDownloading]  = useState(false)

  // Cargar catálogos
  useEffect(() => {
    api.get('/project-statuses/?active_only=false').then(r => setEstados(r.data)).catch(() => {})
    api.get('/entities/?active_only=false').then(r => setEntidades(r.data)).catch(() => {})
  }, [])

  // Construir params desde filters
  const buildParams = (f) => {
    const p = {}
    if (f.year)                        p.year               = f.year
    if (f.selectedStatuses?.length)    p.status_ids         = f.selectedStatuses.join(',')
    if (f.valor_min)                   p.valor_min          = f.valor_min
    if (f.valor_max)                   p.valor_max          = f.valor_max
    if (f.fecha_inicio_desde)          p.fecha_inicio_desde = f.fecha_inicio_desde
    if (f.fecha_inicio_hasta)          p.fecha_inicio_hasta = f.fecha_inicio_hasta
    if (f.fecha_fin_desde)             p.fecha_fin_desde    = f.fecha_fin_desde
    if (f.fecha_fin_hasta)             p.fecha_fin_hasta    = f.fecha_fin_hasta
    if (f.entidad_id)                  p.entidad_id         = f.entidad_id
    return p
  }

  // Stats con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setLoadingStats(true)
      api.get('/reportes/stats/', { params: buildParams(filters) })
        .then(r => setStats(r.data)).catch(() => setStats(null))
        .finally(() => setLoadingStats(false))
    }, 400)
    return () => clearTimeout(t)
  }, [filters])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const r = await api.get('/reportes/excel/', { params: buildParams(filters), responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `SIEXUD_Reporte_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Reporte descargado ✓')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error generando el reporte')
    } finally { setDownloading(false) }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <BarChart3 size={22} color="#B91C3C" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Reportes</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Reportes Excel con filtros avanzados · Asistente IA · Respuestas a Derechos de Petición
        </p>
      </div>

      <FiltrosPanel
        filters={filters} setFilters={setFilters}
        estados={estados} entidades={entidades}
        stats={stats} loadingStats={loadingStats}
        onDownload={handleDownload} downloading={downloading}
      />

      <ChatIA stats={stats} filters={filters} />

      <DerechosPeticionPanel />
    </div>
  )
}
