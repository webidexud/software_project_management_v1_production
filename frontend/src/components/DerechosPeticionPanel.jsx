// frontend/src/components/DerechosPeticionPanel.jsx
// Panel para generar respuesta a Derechos de Petición
import { useState, useRef } from 'react'
import {
  FileText, Upload, Loader, Download, CheckCircle2,
  AlertCircle, X, ChevronDown, ChevronUp, Archive,
  User, Calendar, Building2, Mail, Hash
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

const IS = {
  width: '100%', padding: '7px 10px', borderRadius: 8,
  border: '1px solid var(--border-color)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit',
  boxSizing: 'border-box',
}

function Field({ label, icon: Icon, children, required }) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        {Icon && <Icon size={11} />} {label}{required && <span style={{ color: '#B91C3C' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function StepBadge({ n, active, done }) {
  const bg = done ? '#10B981' : active ? '#0EA5E9' : 'var(--bg-hover)'
  const color = done || active ? '#fff' : 'var(--text-muted)'
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
      {done ? <CheckCircle2 size={14} /> : n}
    </div>
  )
}

export default function DerechosPeticionPanel() {
  const fileRef = useRef(null)
  const [step, setStep] = useState(1) // 1=subir, 2=revisar, 3=listo
  const [file, setFile] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [generando,  setGenerando]  = useState(false)
  const [datosDP, setDatosDP] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [expandido, setExpandido] = useState(true)

  // Formulario editable
  const [form, setForm] = useState({
    radicado: '', fecha_radicado: '', destinatario_nombre: '',
    destinatario_cargo: '', destinatario_entidad: '',
    destinatario_correo: '', asunto: '', ciudad: 'Bogotá, Colombia',
    firmante_nombre: 'GIOVANNY MAURICIO TARAZONA BERMÚDEZ',
    firmante_cargo: 'Rector', year_desde: 2023, year_hasta: 2026,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = async (f) => {
    if (!f || !f.name.endsWith('.pdf')) {
      toast.error('Solo se aceptan archivos PDF')
      return
    }
    setFile(f)
    setAnalizando(true)
    setStep(1)

    try {
      const fd = new FormData()
      fd.append('archivo', f)
      const r = await api.post('/derechos-peticion/analizar/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const d = r.data
      setDatosDP(d)
      // Pre-llenar formulario con datos extraídos
      setForm(prev => ({
        ...prev,
        radicado:             d.radicado || '',
        fecha_radicado:       d.fecha || '',
        destinatario_nombre:  d.remitente_nombre || '',
        destinatario_cargo:   d.remitente_cargo || '',
        destinatario_entidad: d.entidad_remitente || '',
        destinatario_correo:  d.correo_notificacion || '',
        asunto:               d.asunto || 'Respuesta a Derecho de Petición',
        year_desde:           d.filtros_sugeridos?.year_desde || 2023,
        year_hasta:           d.filtros_sugeridos?.year_hasta || 2026,
      }))
      setStep(2)
      toast.success(`PDF analizado ✓ — ${d.preguntas?.length || 0} preguntas detectadas`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error analizando el PDF')
      setFile(null)
    } finally {
      setAnalizando(false)
    }
  }

  const handleGenerar = async () => {
    if (!form.radicado || !form.destinatario_nombre) {
      toast.error('Radicado y nombre del destinatario son obligatorios')
      return
    }
    setGenerando(true)
    try {
      const payload = {
        ...form,
        year_desde: parseInt(form.year_desde),
        year_hasta: parseInt(form.year_hasta),
        preguntas:  datosDP?.preguntas || [],
      }
      const r = await api.post('/derechos-peticion/generar/', payload)
      setResultado(r.data)
      setStep(3)
      toast.success(`Respuesta generada ✓ — ${r.data.convenios_count} convenios incluidos`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error generando la respuesta')
    } finally {
      setGenerando(false)
    }
  }

  const handleDownload = () => {
    if (!resultado?.download_url) return
    const a = document.createElement('a')
    a.href = resultado.download_url
    a.click()
    toast.success('Descargando ZIP con Word y Excel ✓')
  }

  const reset = () => {
    setStep(1); setFile(null); setDatosDP(null); setResultado(null)
    setForm({
      radicado: '', fecha_radicado: '', destinatario_nombre: '',
      destinatario_cargo: '', destinatario_entidad: '',
      destinatario_correo: '', asunto: '', ciudad: 'Bogotá, Colombia',
      firmante_nombre: 'GIOVANNY MAURICIO TARAZONA BERMÚDEZ',
      firmante_cargo: 'Rector', year_desde: 2023, year_hasta: 2026,
    })
  }

  const YEARS = Array.from({ length: 10 }, (_, i) => 2026 - i)

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

      {/* Header colapsable */}
      <div
        onClick={() => setExpandido(e => !e)}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: expandido ? '1px solid var(--border-color)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(185,28,60,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} color="#B91C3C" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Responder Derecho de Petición</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Sube el PDF → IA extrae las preguntas → genera Word + Excel con membrete UD</p>
          </div>
        </div>
        {expandido ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </div>

      {expandido && (
        <div style={{ padding: '20px 24px' }}>

          {/* Steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            {[
              { n: 1, label: 'Subir PDF' },
              { n: 2, label: 'Revisar datos' },
              { n: 3, label: 'Descargar' },
            ].map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StepBadge n={s.n} active={step === s.n} done={step > s.n} />
                <span style={{ fontSize: 12, fontWeight: step === s.n ? 700 : 500, color: step === s.n ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</span>
                {i < 2 && <div style={{ width: 32, height: 1, background: 'var(--border-color)' }} />}
              </div>
            ))}
          </div>

          {/* ── PASO 1: Subir PDF ── */}
          {step === 1 && (
            <div>
              <div
                onClick={() => fileRef.current?.click()}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
                onDragOver={e => e.preventDefault()}
                style={{ border: '2px dashed var(--border-color)', borderRadius: 12, padding: '32px 24px', textAlign: 'center', cursor: analizando ? 'wait' : 'pointer', background: 'var(--bg-hover)', transition: 'all .2s' }}>
                {analizando ? (
                  <>
                    <Loader size={28} color="#0EA5E9" style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Analizando PDF con IA...</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Claude está leyendo las preguntas del derecho de petición</p>
                  </>
                ) : (
                  <>
                    <Upload size={28} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Arrastra el PDF del Derecho de Petición aquí</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>o haz clic para seleccionar · Solo PDF</p>
                    <div style={{ marginTop: 12, display: 'inline-flex', padding: '6px 14px', borderRadius: 20, background: 'rgba(185,28,60,0.08)', border: '1px solid rgba(185,28,60,0.2)', fontSize: 11, color: '#B91C3C', fontWeight: 600 }}>
                      Claude extrae radicado, remitente y preguntas automáticamente
                    </div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }} />
            </div>
          )}

          {/* ── PASO 2: Revisar y completar datos ── */}
          {step === 2 && (
            <div>
              {/* Preguntas detectadas */}
              {datosDP?.preguntas?.length > 0 && (
                <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#10B981', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={13} /> {datosDP.preguntas.length} preguntas detectadas automáticamente
                  </p>
                  {datosDP.preguntas.map((q, i) => (
                    <p key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      <strong>{q.numero}.</strong> {q.texto?.substring(0, 100)}...
                    </p>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Radicado" icon={Hash} required>
                  <input style={IS} value={form.radicado} onChange={e => set('radicado', e.target.value)} placeholder="Ej: 2025EE20816" />
                </Field>
                <Field label="Fecha del documento" icon={Calendar}>
                  <input style={IS} value={form.fecha_radicado} onChange={e => set('fecha_radicado', e.target.value)} placeholder="Ej: 12/11/2025" />
                </Field>
                <Field label="Nombre del remitente" icon={User} required>
                  <input style={IS} value={form.destinatario_nombre} onChange={e => set('destinatario_nombre', e.target.value)} placeholder="Nombre completo" />
                </Field>
                <Field label="Cargo del remitente">
                  <input style={IS} value={form.destinatario_cargo} onChange={e => set('destinatario_cargo', e.target.value)} placeholder="Ej: Concejal de Bogotá" />
                </Field>
                <Field label="Entidad del remitente" icon={Building2}>
                  <input style={IS} value={form.destinatario_entidad} onChange={e => set('destinatario_entidad', e.target.value)} placeholder="Ej: Concejo de Bogotá" />
                </Field>
                <Field label="Correo de notificación" icon={Mail}>
                  <input style={IS} type="email" value={form.destinatario_correo} onChange={e => set('destinatario_correo', e.target.value)} placeholder="correo@entidad.gov.co" />
                </Field>
                <div style={{ gridColumn: 'span 2' }}>
                  <Field label="Asunto">
                    <input style={IS} value={form.asunto} onChange={e => set('asunto', e.target.value)} />
                  </Field>
                </div>
                <Field label="Firmante (Rector/Funcionario)" icon={User}>
                  <input style={IS} value={form.firmante_nombre} onChange={e => set('firmante_nombre', e.target.value)} />
                </Field>
                <Field label="Cargo del firmante">
                  <input style={IS} value={form.firmante_cargo} onChange={e => set('firmante_cargo', e.target.value)} />
                </Field>
                <Field label="Período desde (año)">
                  <select style={IS} value={form.year_desde} onChange={e => set('year_desde', e.target.value)}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>
                <Field label="Período hasta (año)">
                  <select style={IS} value={form.year_hasta} onChange={e => set('year_hasta', e.target.value)}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                <button onClick={reset} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button onClick={handleGenerar} disabled={generando}
                  style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#B91C3C', color: '#fff', cursor: generando ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: generando ? 0.7 : 1 }}>
                  {generando ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Archive size={15} />}
                  {generando ? 'Generando Word y Excel...' : 'Generar Respuesta Completa'}
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 3: Listo para descargar ── */}
          {step === 3 && resultado && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={28} color="#10B981" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>¡Respuesta generada!</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                {resultado.convenios_count} convenios · {resultado.mods_count} modificaciones incluidas
              </p>

              <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'var(--bg-hover)', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>ARCHIVOS EN EL ZIP:</p>
                {resultado.archivos?.map((a, i) => (
                  <p key={i} style={{ fontSize: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.endsWith('.docx') ? '#0EA5E9' : '#10B981', flexShrink: 0 }} />
                    {a}
                  </p>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={reset} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'inherit' }}>
                  Nueva respuesta
                </button>
                <button onClick={handleDownload}
                  style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#B91C3C', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Download size={15} />
                  Descargar ZIP (Word + Excel)
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
