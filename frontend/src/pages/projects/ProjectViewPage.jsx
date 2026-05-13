// frontend/src/pages/projects/ProjectViewPage.jsx — v4.3
// CORRECCIONES:
//  - Enlace SECOP clickeable (abre en nueva pestaña)
//  - Trazabilidad: diasProrrogados = diferencia entre fechaFinVigente y end_date original
//  - Adiciones: bloque visible solo cuando hay adiciones activas (con total y valor vigente)
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Pencil, GitBranch, FolderOpen,
  FileText, Settings, DollarSign, Calendar, Users, Tag,
  ChevronDown, ChevronUp, Lock, Clock, Shield, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { projectsService, modificationsService, rupService, emailsService } from '../../services/projects'

/* ─── Helpers ────────────────────────────────────────────────────── */
function fmtDate(d) { return d ? String(d).split('T')[0] : '—' }
function fmtMoney(v) {
  const n = parseFloat(v)
  if (!v || isNaN(n)) return '—'
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
}
function fmtPct(v) { return v != null ? `${parseFloat(v).toFixed(2)}%` : '—' }
function diffDays(a, b) {
  if (!a || !b) return null
  const diff = Math.round((new Date(b) - new Date(a)) / 86400000)
  return diff > 0 ? diff : null
}

const TYPE_META = {
  ADDITION:          { label: 'Adición',               color: '#10B981' },
  EXTENSION:         { label: 'Prórroga',              color: '#0EA5E9' },
  BOTH:              { label: 'Adición + Prórroga',    color: '#8B5CF6' },
  CONTRACTUAL:       { label: 'Modif. Contractual',    color: '#F59E0B' },
  SUSPENSION:        { label: 'Suspensión',            color: '#EF4444' },
  RESTART:           { label: 'Reinicio',              color: '#06B6D4' },
  CESION_CESIONARIA: { label: 'Cesión (Cesionaria)',   color: '#8B5CF6' },
  CESION_CEDENTE:    { label: 'Cesión (Cedente)',      color: '#8B5CF6' },
  LIQUIDATION:       { label: 'Liquidación',           color: '#64748B' },
}

/* ─── UI primitivos ──────────────────────────────────────────────── */
function Field({ label, value, mono, span }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 13, color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: value ? 500 : 400, fontStyle: value ? 'normal' : 'italic' }}>
        {value || '—'}
      </p>
    </div>
  )
}
function Grid({ cols = 2, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '14px 24px', marginBottom: 16 }}>
      {children}
    </div>
  )
}
function Section({ icon: Icon, color = '#0F2952', title, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '20px 22px', marginBottom: 18, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color={color} />
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

/* ─── Detalle modificación ───────────────────────────────────────── */
function DField({ label, value, mono, color }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 12, color: color || 'var(--text-primary)', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: 500, wordBreak: 'break-word' }}>{String(value)}</p>
    </div>
  )
}
function DGrid({ cols = 2, children }) {
  const valid = (Array.isArray(children) ? children : [children]).filter(Boolean)
  if (!valid.length) return null
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '8px 18px', marginBottom: 12 }}>{children}</div>
}
function DSub({ title, color, children }) {
  const valid = (Array.isArray(children) ? children : [children]).filter(Boolean)
  if (!valid.length) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '.07em' }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: `${color}30` }} />
      </div>
      {children}
    </div>
  )
}
function TypeBadge({ type }) {
  const m = TYPE_META[type] || { label: type, color: '#94A3B8' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 20, background: `${m.color}18`, color: m.color, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color }} />{m.label}
    </span>
  )
}

function ModDetail({ m }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border-color)', marginTop: 10 }}>
      <DSub title="Datos Generales" color="#F59E0B">
        <DGrid cols={3}>
          <DField label="Acto administrativo" value={m.administrative_act} />
          <DField label="Fecha de aprobación" value={fmtDate(m.approval_date)} />
          <DField label="Estado" value={m.is_active ? 'Activa' : 'Inactiva'} color={m.is_active ? '#10B981' : '#94A3B8'} />
        </DGrid>
        {m.justification && <DField label="Justificación" value={m.justification} />}
      </DSub>

      {(m.addition_value || m.new_total_value) && (
        <DSub title="Adición Presupuestal" color="#10B981">
          <DGrid cols={2}>
            <DField label="Valor total de la adición" value={fmtMoney(m.addition_value)} color="#10B981" mono />
            <DField label="Nuevo valor total contrato" value={fmtMoney(m.new_total_value)} mono />
          </DGrid>
          {(m.entity_contribution_addition || m.university_contribution_addition) && (
            <DGrid cols={2}>
              <DField label="Aporte entidad en adición" value={fmtMoney(m.entity_contribution_addition)} mono />
              <DField label="Aporte universidad en adición" value={fmtMoney(m.university_contribution_addition)} mono />
            </DGrid>
          )}
          {m.calculated_benefit_value && (
            <div style={{ marginTop:8, padding:'10px 14px', borderRadius:8, background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.25)' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#065F46', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>
                Beneficio institucional vigente tras esta adición
              </p>
              <p style={{ fontSize:15, fontWeight:800, color:'#059669', fontFamily:'monospace' }}>
                {fmtMoney(m.calculated_benefit_value)}
              </p>
              <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                Fórmula: (Aporte entidad acumulado × 12%) ÷ 112%
              </p>
            </div>
          )}
          {m.payment_method_modification && <DField label="Modificación forma de pago" value={m.payment_method_modification} />}
        </DSub>
      )}

      {m.new_end_date && (
        <DSub title="Prórroga de Plazo" color="#0EA5E9">
          <DGrid cols={3}>
            <DField label="Nueva fecha de fin" value={fmtDate(m.new_end_date)} color="#0EA5E9" />
            <DField label="Días" value={m.extension_days ? `${m.extension_days} días` : null} />
            <DField label="En letras" value={m.extension_period_text} />
          </DGrid>
        </DSub>
      )}

      {m.suspension && (
        <DSub title="Suspensión" color="#EF4444">
          <DGrid cols={3}>
            <DField label="Inicio" value={fmtDate(m.suspension.suspension_start_date)} />
            <DField label="Fin" value={fmtDate(m.suspension.suspension_end_date)} />
            <DField label="Reinicio programado" value={fmtDate(m.suspension.planned_restart_date)} />
          </DGrid>
          <DGrid cols={2}>
            <DField label="Justif. contratista" value={m.suspension.contractor_justification} />
            <DField label="Justif. supervisor" value={m.suspension.supervisor_justification} />
          </DGrid>
          <DField label="Estado suspensión" value={m.suspension.suspension_status} />
        </DSub>
      )}

      {m.restart && (
        <DSub title="Reinicio" color="#06B6D4">
          <DGrid cols={2}>
            <DField label="Fecha real de reinicio" value={fmtDate(m.restart.actual_restart_date)} color="#06B6D4" />
            <DField label="Período suspendido" value={`${fmtDate(m.restart.suspension_start_date)} → ${fmtDate(m.restart.suspension_end_date)}`} />
          </DGrid>
        </DSub>
      )}

      {m.clause && (
        <DSub title="Modificación Contractual" color="#F59E0B">
          <DField label="Descripción" value={m.clause.modification_description} />
          {m.clause.requires_resource_liberation && (
            <DGrid cols={3}>
              <DField label="CDP a liberar" value={m.clause.cdp_to_release} mono />
              <DField label="RP a liberar" value={m.clause.rp_to_release} mono />
              <DField label="Valor a liberar" value={fmtMoney(m.clause.liberation_amount)} color="#EF4444" mono />
            </DGrid>
          )}
        </DSub>
      )}

      {m.assignment && (
        <DSub title="Cesión" color="#8B5CF6">
          <DGrid cols={2}>
            <DField label="Cedente" value={`${m.assignment.assignor_name} · ${m.assignment.assignor_id_type} ${m.assignment.assignor_id}`} />
            <DField label="Cesionario" value={`${m.assignment.assignee_name} · ${m.assignment.assignee_id_type} ${m.assignment.assignee_id}`} />
          </DGrid>
          <DGrid cols={3}>
            <DField label="Fecha cesión" value={fmtDate(m.assignment.assignment_date)} />
            <DField label="Valor a ceder" value={fmtMoney(m.assignment.value_to_assign)} mono />
            <DField label="Valor pendiente cedente" value={fmtMoney(m.assignment.value_pending_to_assignor)} mono />
          </DGrid>
        </DSub>
      )}

      {m.liquidation && (
        <DSub title="Liquidación" color="#64748B">
          <DGrid cols={3}>
            <DField label="Tipo" value={m.liquidation.liquidation_type === 'BILATERAL' ? 'Bilateral' : 'Unilateral'} />
            <DField label="% Ejecución" value={`${m.liquidation.execution_percentage}%`} />
            <DField label="Fecha" value={fmtDate(m.liquidation.liquidation_date)} />
          </DGrid>
          <DGrid cols={3}>
            <DField label="Valor inicial" value={fmtMoney(m.liquidation.initial_contract_value)} mono />
            <DField label="Valor final + adiciones" value={fmtMoney(m.liquidation.final_value_with_additions)} mono />
            <DField label="Valor ejecutado" value={fmtMoney(m.liquidation.executed_value)} color="#10B981" mono />
          </DGrid>
          <DGrid cols={2}>
            <DField label="Valor pendiente de pago" value={fmtMoney(m.liquidation.pending_payment_value)} mono />
            <DField label="Valor a liberar" value={fmtMoney(m.liquidation.value_to_release)} color="#EF4444" mono />
          </DGrid>
        </DSub>
      )}
    </div>
  )
}

/* ─── Trazabilidad de plazos ─────────────────────────────────────── */
function PlazosTrazabilidad({ p, mods }) {
  const COLOR_ORIG  = '#F59E0B'
  const COLOR_PROX  = '#0EA5E9'
  const COLOR_FINAL = '#10B981'

  const prorrogas = (mods || [])
    .filter(m => ['EXTENSION', 'BOTH'].includes(m.modification_type) && m.is_active && m.new_end_date)
    .sort((a, b) => a.modification_number - b.modification_number)

  const hasProrrogas = prorrogas.length > 0

  // ✅ CORRECCIÓN: fecha vigente = last new_end_date de prórrogas activas
  const fechaFinVigente = hasProrrogas
    ? prorrogas[prorrogas.length - 1].new_end_date
    : p.end_date

  const diasOriginales = diffDays(p.start_date, p.end_date)
  const diasVigentes   = diffDays(p.start_date, fechaFinVigente)

  // ✅ CORRECCIÓN: días prorrogados = diferencia entre fecha vigente y fecha original
  const diasProrrogados = hasProrrogas
    ? Math.max(0, Math.round((new Date(fechaFinVigente) - new Date(p.end_date)) / 86400000))
    : 0

  return (
    <Section icon={Calendar} color={COLOR_ORIG} title="Plazos del Contrato">
      <Grid cols={3}>
        <Field label="Fecha de suscripción"  value={fmtDate(p.subscription_date)} />
        <Field label="Fecha de inicio"       value={fmtDate(p.start_date)} />
        <Field label="Fecha de fin original" value={fmtDate(p.end_date)} />
      </Grid>

      {diasOriginales && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            [`${diasOriginales} días`,                     'Duración original',  COLOR_ORIG],
            [`≈ ${Math.round(diasOriginales / 30)} meses`, 'Aproximados',        '#8B5CF6'],
            [`${(diasOriginales / 365).toFixed(1)} años`,  'En años',            '#64748B'],
          ].map(([val, lbl, color]) => (
            <div key={lbl} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}22` }}>
              <p style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'monospace', margin: 0 }}>{val}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{lbl}</p>
            </div>
          ))}
        </div>
      )}

      {hasProrrogas && (
        <>
          <div style={{ height: 1, background: 'var(--border-color)', margin: '0 0 18px' }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>
            Trazabilidad de prórrogas
          </p>

          <div style={{ position: 'relative', paddingLeft: 30 }}>
            {/* Nodo origen */}
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -30, top: 5, width: 14, height: 14, borderRadius: '50%', background: COLOR_ORIG, border: `2px solid ${COLOR_ORIG}`, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: `${COLOR_ORIG}08`, border: `1px solid ${COLOR_ORIG}25` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: COLOR_ORIG }}>Contrato original</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: COLOR_ORIG }}>Fin: {fmtDate(p.end_date)}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {diasOriginales} días · {Math.round(diasOriginales / 30)} meses aprox.
                </p>
              </div>
            </div>

            {/* Línea vertical */}
            <div style={{ position: 'absolute', left: -23, top: 20, width: 2, height: `calc(100% - 40px)`, background: 'var(--border-color)' }} />

            {/* Nodos prórrogas */}
            {prorrogas.map((m, i) => {
              const isFinal = i === prorrogas.length - 1
              const color   = isFinal ? COLOR_FINAL : COLOR_PROX
              const prevFin = i === 0 ? p.end_date : prorrogas[i - 1].new_end_date
              return (
                <div key={m.modification_id} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -30, top: 5, width: 14, height: 14, borderRadius: '50%', background: color, border: `2px solid ${color}`, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}25` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>
                          Prórroga #{i + 1}
                        </span>
                        {m.modification_type === 'BOTH' && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#10B98120', color: '#10B981', fontWeight: 700 }}>+Adición</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 11 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Anterior: {fmtDate(prevFin)}</span>
                        <br/>
                        <strong style={{ color }}>→ {fmtDate(m.new_end_date)}</strong>
                        <span style={{ color, marginLeft: 6 }}>+{m.extension_days}d</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Acto: {m.administrative_act || '—'} · {fmtDate(m.approval_date)}
                      {m.extension_period_text && ` · "${m.extension_period_text}"`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Resumen final */}
          <div style={{ marginTop: 8, padding: '16px 18px', borderRadius: 12, background: `${COLOR_FINAL}08`, border: `1.5px solid ${COLOR_FINAL}30` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Fecha de finalización vigente</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: COLOR_FINAL, fontFamily: 'monospace', margin: 0 }}>{fmtDate(fechaFinVigente)}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Incluye {prorrogas.length} prórroga{prorrogas.length !== 1 ? 's' : ''} · <strong style={{ color: COLOR_PROX }}>+{diasProrrogados} días adicionales</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ textAlign: 'center', padding: '10px 16px', borderRadius: 8, background: `${COLOR_FINAL}12`, border: `1px solid ${COLOR_FINAL}25` }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: COLOR_FINAL, fontFamily: 'monospace', margin: 0 }}>{diasVigentes} días</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>Duración total vigente</p>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 16px', borderRadius: 8, background: `${COLOR_PROX}12`, border: `1px solid ${COLOR_PROX}25` }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: COLOR_PROX, fontFamily: 'monospace', margin: 0 }}>+{diasProrrogados} días</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>Total prorrogado</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!hasProrrogas && (
        <div style={{ marginTop: 4, padding: '10px 14px', borderRadius: 8, background: 'rgba(100,116,139,0.06)', border: '1px solid rgba(100,116,139,0.15)', fontSize: 12, color: 'var(--text-muted)' }}>
          ℹ️ Este contrato no tiene prórrogas registradas. La fecha de fin original es la vigente.
        </div>
      )}

      {p.supervisor_type && (
        <>
          <div style={{ height: 1, background: 'var(--border-color)', margin: '18px 0 14px' }} />
          <Grid cols={2}>
            <Field label="Tipo de supervisor" value={p.supervisor_type === 'JEFE_EXTENSION' ? 'Jefe de Extensión' : 'Rector'} />
          </Grid>
        </>
      )}
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   PÁGINA
═══════════════════════════════════════════════════════════════════ */
export default function ProjectViewPage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const [project,  setProject]  = useState(null)
  const [rupCodes, setRupCodes] = useState([])
  const [emails,   setEmails]   = useState([])
  const [mods,     setMods]     = useState([])
  const [expanded, setExpanded] = useState({})
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      projectsService.get(id),
      rupService.getProjectRup(id),
      emailsService.list(id),
      modificationsService.list(id),
    ])
      .then(([pr, rr, em, mo]) => {
        setProject(pr.data)
        setRupCodes(rr.data)
        setEmails(em.data)
        setMods(Array.isArray(mo.data) ? mo.data : [])
      })
      .catch(() => toast.error('Error cargando proyecto'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cargando proyecto…</p>
    </div>
  )
  if (!project) return null

  const p = project
  const toggleExpand = (mId) => setExpanded(prev => ({ ...prev, [mId]: !prev[mId] }))

  // ✅ Adiciones activas para sección financiera
  const adicionesActivas = mods
    .filter(m => ['ADDITION','BOTH'].includes(m.modification_type) && m.is_active && m.addition_value)
    .reduce((s, m) => s + (parseFloat(m.addition_value) || 0), 0)

  // Beneficio institucional vigente: tomar el calculated_benefit_value
  // de la última adición activa (es el acumulado más reciente)
  const beneficioVigente = (() => {
    const adiciones = mods
      .filter(m => ['ADDITION','BOTH'].includes(m.modification_type) && m.is_active && m.calculated_benefit_value)
      .sort((a, b) => a.modification_number - b.modification_number)
    return adiciones.length > 0
      ? parseFloat(adiciones[adiciones.length - 1].calculated_benefit_value)
      : null
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Topbar ── */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/projects')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'inherit', padding: '7px 12px', borderRadius: 8 }}>
            <ArrowLeft size={15} /> Volver
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--border-color)' }} />
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {p.project_year}{p.external_project_number ? ` #${p.external_project_number}` : ''} · #{p.project_id}
            </h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{p.project_name?.substring(0, 80)}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate(`/projects/${id}/modifications`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border-color)', color: '#F59E0B', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: '7px 14px', borderRadius: 8, fontWeight: 600 }}>
            <GitBranch size={14} /> Modificaciones
          </button>
          <button onClick={() => navigate(`/projects/${id}/documents`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border-color)', color: '#10B981', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: '7px 14px', borderRadius: 8, fontWeight: 600 }}>
            <FolderOpen size={14} /> Documentos
          </button>
          <button onClick={() => navigate(`/projects/${id}/edit`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border-color)', color: '#0EA5E9', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: '7px 14px', borderRadius: 8, fontWeight: 600 }}>
            <Pencil size={14} /> Editar
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)', padding: '28px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Identificación */}
          <Section icon={FileText} color="#0F2952" title="Identificación">
            <Grid cols={3}>
              <Field label="Año" value={p.project_year} mono />
              <Field label="ID del proyecto" value={`#${p.project_id}`} mono />
              <Field label="N° externo" value={p.external_project_number} mono />
            </Grid>
            <Grid cols={1}>
              <Field label="Nombre del proyecto" value={p.project_name} span={1} />
            </Grid>
            <Grid cols={1}>
              <Field label="Objeto del proyecto" value={p.project_purpose} span={1} />
            </Grid>
            <Grid cols={3}>
              <Field label="Tipo de sesión" value={p.session_type} />
              <Field label="Fecha del acta" value={fmtDate(p.minutes_date)} />
              <Field label="N° del acta" value={p.minutes_number} />
            </Grid>
          </Section>

          {/* Clasificación */}
          <Section icon={Settings} color="#8B5CF6" title="Clasificación">
            <Grid cols={2}>
              <Field label="Estado" value={p.status_name} />
              <Field label="Tipo de proyecto" value={p.type_name} />
              <Field label="Tipo de financiación" value={p.financing_name} />
              <Field label="Modalidad de ejecución" value={p.modality_name} />
              <Field label="Lugar de ejecución" value={
                p.execution_region
                  ? { NACIONAL:'Nacional', INTERNACIONAL:'Internacional', AMAZONIA:'Amazonía',
                      ANDINA:'Andina', CARIBE:'Caribe', INSULAR:'Insular',
                      PACIFICA:'Pacífica', ORINOQUIA:'Orinoquía' }[p.execution_region] ?? p.execution_region
                  : null
              } />
            </Grid>
          </Section>

          {/* Financiero */}
          <Section icon={DollarSign} color="#10B981" title="Información Financiera">
            <Grid cols={2}>
              <Field label="Valor total del proyecto" value={fmtMoney(p.project_value)} mono />
              <Field label="Código contable" value={p.accounting_code} mono />
              <Field label="Aporte Universidad" value={fmtMoney(p.university_contribution)} mono />
              <Field label="Aporte Entidad" value={fmtMoney(p.entity_contribution)} mono />
              <Field label="% Beneficio institucional" value={fmtPct(p.institutional_benefit_percentage)} />
              <Field label="Valor beneficio institucional" value={fmtMoney(p.institutional_benefit_value)} mono />
            </Grid>
            {p.beneficiaries_count && <Grid cols={2}><Field label="Número de beneficiarios" value={p.beneficiaries_count} /></Grid>}

            {/* ✅ Adiciones activas: solo si existen */}
            {adicionesActivas > 0 && (
              <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                  Adiciones al contrato
                </p>
                <Grid cols={2}>
                  <Field label="Total adicionado" value={fmtMoney(adicionesActivas)} mono />
                  <Field label="Valor total vigente" value={fmtMoney(parseFloat(p.project_value || 0) + adicionesActivas)} mono />
                </Grid>

                {/* Aportes acumulados totales */}
                {(() => {
                  const adicionesList = mods.filter(m => ['ADDITION','BOTH'].includes(m.modification_type) && m.is_active)
                  const totalEntidadAdiciones    = adicionesList.reduce((s,m) => s + (parseFloat(m.entity_contribution_addition)    || 0), 0)
                  const totalUnivAdiciones       = adicionesList.reduce((s,m) => s + (parseFloat(m.university_contribution_addition) || 0), 0)
                  const hayDesglose = totalEntidadAdiciones > 0 || totalUnivAdiciones > 0
                  if (!hayDesglose) return null
                  return (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(16,185,129,0.2)' }}>
                      <Grid cols={2}>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                            Aporte total entidad
                          </p>
                          <p style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {fmtMoney(parseFloat(p.entity_contribution || 0) + totalEntidadAdiciones)}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                            Original {fmtMoney(p.entity_contribution)} + adiciones {fmtMoney(totalEntidadAdiciones)}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                            Aporte total universidad
                          </p>
                          <p style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {fmtMoney(parseFloat(p.university_contribution || 0) + totalUnivAdiciones)}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                            Original {fmtMoney(p.university_contribution)} + adiciones {fmtMoney(totalUnivAdiciones)}
                          </p>
                        </div>
                      </Grid>
                    </div>
                  )
                })()}
                {beneficioVigente && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(16,185,129,0.2)' }}>
                    <Grid cols={2}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                          Beneficio institucional original
                        </p>
                        <p style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {fmtMoney(p.institutional_benefit_value)}
                        </p>
                      </div>
                      <div style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: 8, padding: '10px 14px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                          Nuevo beneficio institucional vigente
                        </p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#059669', fontFamily: 'monospace', margin: 0 }}>
                          {fmtMoney(beneficioVigente)}
                        </p>
                        <p style={{ fontSize: 10, color: '#065F46', marginTop: 3 }}>
                          ((Entidad acumulada × 12%) ÷ 112%)
                        </p>
                      </div>
                    </Grid>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Plazos con trazabilidad */}
          <PlazosTrazabilidad p={p} mods={mods} />

          {/* Actores */}
          <Section icon={Users} color="#0EA5E9" title="Actores del Contrato">
            <Grid cols={2}>
              <Field label="Entidad contratante" value={p.entity_name} />
              <Field label="Dependencia ejecutora" value={p.department_name} />
              <Field label="Funcionario ordenador del gasto" value={p.official_name} />
              <Field label="Correo principal" value={p.main_email} />
            </Grid>
            {emails.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Correos secundarios</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {emails.map(e => (
                    <div key={e.secondary_email_id} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                      <span style={{ fontSize: 13, color: '#0EA5E9', fontWeight: 500 }}>{e.email}</span>
                      {e.contact_name && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.contact_name}</span>}
                      {e.contact_type && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {e.contact_type}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Documentación */}
          {(p.administrative_act || p.secop_link || p.observations) && (
            <Section icon={Lock} color="#64748B" title="Documentación">
              <Grid cols={2}>
                <Field label="Acto administrativo" value={p.administrative_act} mono />
                {/* ✅ SECOP clickeable */}
                {p.secop_link ? (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Enlace SECOP</p>
                    <a href={p.secop_link} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#0EA5E9', fontWeight: 500, wordBreak: 'break-all', textDecoration: 'underline' }}>
                      <ExternalLink size={13} />
                      {p.secop_link.length > 60 ? p.secop_link.substring(0, 60) + '...' : p.secop_link}
                    </a>
                  </div>
                ) : null}
              </Grid>
              {p.observations && <Field label="Observaciones" value={p.observations} span={1} />}
            </Section>
          )}

          {/* Códigos RUP */}
          {rupCodes.length > 0 && (
            <Section icon={Tag} color="#0EA5E9" title={`Códigos RUP / UNSPSC (${rupCodes.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rupCodes.map(r => (
                  <div key={r.rup_code_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                    {r.is_main_code && <span style={{ fontSize: 10, fontWeight: 700, background: '#F59E0B20', color: '#D97706', border: '1px solid #F59E0B40', borderRadius: 4, padding: '2px 6px' }}>PRINCIPAL</span>}
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0EA5E9' }}>{r.rup_code}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.product_name || r.class_name}</span>
                    {r.segment_name && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{r.segment_name}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Modificaciones */}
          {mods.length > 0 && (
            <Section icon={GitBranch} color="#F59E0B" title={`Modificaciones (${mods.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mods.map(m => {
                  const meta   = TYPE_META[m.modification_type] || { label: m.modification_type, color: '#94A3B8' }
                  const isOpen = !expanded[m.modification_id]
                  return (
                    <div key={m.modification_id} style={{ border: `1px solid ${meta.color}30`, borderRadius: 10, overflow: 'hidden', opacity: m.is_active ? 1 : 0.6 }}>
                      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: `${meta.color}05`, cursor: 'pointer' }}
                        onClick={() => toggleExpand(m.modification_id)}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: meta.color }}>#{m.modification_number}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <TypeBadge type={m.modification_type} />
                            {m.administrative_act && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.administrative_act}</span>}
                            {!m.is_active && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(100,116,139,0.1)', color: '#94A3B8', fontWeight: 700 }}>INACTIVA</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                            {m.approval_date && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📅 {fmtDate(m.approval_date)}</span>}
                            {m.addition_value && <span style={{ fontSize: 11, color: '#10B981', fontFamily: 'monospace', fontWeight: 600 }}>+{fmtMoney(m.addition_value)}</span>}
                            {m.new_end_date && <span style={{ fontSize: 11, color: '#0EA5E9' }}>→ {fmtDate(m.new_end_date)}</span>}
                          </div>
                        </div>
                        {isOpen ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronUp size={16} color="var(--text-muted)" />}
                      </div>
                      {!isOpen && <ModDetail m={m} />}
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

        </div>
      </div>
    </div>
  )
}
