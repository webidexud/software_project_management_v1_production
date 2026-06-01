// frontend/src/pages/projects/ProjectViewPage.jsx — Responsive
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, FileText, Settings, DollarSign, Calendar, Users, Tag,
  GitBranch, Lock, ExternalLink, Pencil, FolderOpen, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { projectsService, rupService, emailsService, modificationsService } from '../../services/projects'
import useBreakpoint from '../../hooks/useBreakpoint'

/* ─── Metadata de tipos de modificación ─────────────────────────── */
const TYPE_META = {
  ADDITION:          { label: 'Adición',                  color: '#10B981' },
  EXTENSION:         { label: 'Prórroga',                 color: '#0EA5E9' },
  BOTH:              { label: 'Adición + Prórroga',       color: '#8B5CF6' },
  CONTRACTUAL:       { label: 'Modificación Contractual', color: '#F59E0B' },
  SUSPENSION:        { label: 'Suspensión',               color: '#EF4444' },
  RESTART:           { label: 'Reinicio',                 color: '#06B6D4' },
  CESION_CESIONARIA: { label: 'Cesión (UD Cesionaria)',   color: '#8B5CF6' },
  CESION_CEDENTE:    { label: 'Cesión (UD Cedente)',      color: '#8B5CF6' },
  LIQUIDATION:       { label: 'Liquidación',              color: '#64748B' },
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmtMoney = v => {
  if (!v && v !== 0) return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
const fmtDate = d => d
  ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'
const fmtPct = v => v != null ? `${parseFloat(v).toFixed(2)}%` : '—'
const diffDays = (a, b) => {
  if (!a || !b) return 0
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

const REGION_MAP = {
  NACIONAL: 'Nacional', INTERNACIONAL: 'Internacional',
  AMAZONIA: 'Amazonía', ANDINA: 'Andina', CARIBE: 'Caribe',
  INSULAR: 'Insular', PACIFICA: 'Pacífica', ORINOQUIA: 'Orinoquía',
}

/* ─── Componentes UI ─────────────────────────────────────────────── */
function Field({ label, value, span, mono }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4, margin: '0 0 4px' }}>{label}</p>
      <p style={{
        fontSize: 13, margin: 0,
        color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        fontFamily: mono ? 'monospace' : 'inherit',
        fontWeight: value ? 500 : 400,
        fontStyle: value ? 'normal' : 'italic',
        wordBreak: 'break-word',
      }}>
        {value || '—'}
      </p>
    </div>
  )
}

/* Grid responsive — colapsa a 1 col en mobile */
function Grid({ cols = 2, children }) {
  const { isMobile } = useBreakpoint()
  const effectiveCols = isMobile ? 1 : cols
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${effectiveCols}, 1fr)`, gap: '14px 24px', marginBottom: 16 }}>
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

/* ─── Helpers para modificaciones ────────────────────────────────── */
function DField({ label, value, mono, color }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2, margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: 12, color: color || 'var(--text-primary)', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: 500, wordBreak: 'break-word', margin: 0 }}>{String(value)}</p>
    </div>
  )
}

function DGrid({ cols = 2, children }) {
  const { isMobile } = useBreakpoint()
  const valid = (Array.isArray(children) ? children : [children]).filter(Boolean)
  if (!valid.length) return null
  const effectiveCols = isMobile ? 1 : cols
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${effectiveCols}, 1fr)`, gap: '8px 18px', marginBottom: 12 }}>
      {children}
    </div>
  )
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
          <DField label="Estado" value={m.is_active ? 'Activa' : 'Inactiva'} color={m.is_active ? '#10B981' : '#94a3b8'} />
        </DGrid>
        {m.justification && <DField label="Justificación" value={m.justification} />}
      </DSub>

      {/* Adición */}
      {['ADDITION', 'BOTH'].includes(m.modification_type) && (
        <DSub title="Adición económica" color="#10B981">
          <DGrid cols={3}>
            <DField label="Valor adicionado" value={fmtMoney(m.addition_value)} mono />
            <DField label="Aporte entidad (adición)" value={fmtMoney(m.entity_contribution_addition)} mono />
            <DField label="Aporte UD (adición)" value={fmtMoney(m.university_contribution_addition)} mono />
          </DGrid>
          {m.calculated_benefit_value != null && (
            <DField label="Beneficio institucional calculado" value={fmtMoney(m.calculated_benefit_value)} mono color="#10B981" />
          )}
          {m.cdp && <DGrid cols={2}><DField label="CDP" value={m.cdp} mono /><DField label="RP" value={m.rp} mono /></DGrid>}
        </DSub>
      )}

      {/* Prórroga */}
      {['EXTENSION', 'BOTH'].includes(m.modification_type) && (
        <DSub title="Prórroga" color="#0EA5E9">
          <DGrid cols={3}>
            <DField label="Nueva fecha fin" value={fmtDate(m.new_end_date)} />
            <DField label="Días prorrogados" value={m.extension_days} />
            <DField label="Período" value={m.extension_period_text} />
          </DGrid>
        </DSub>
      )}

      {/* Suspensión */}
      {m.modification_type === 'SUSPENSION' && (
        <DSub title="Suspensión" color="#EF4444">
          <DGrid cols={3}>
            <DField label="Inicio suspensión" value={fmtDate(m.suspension_start_date)} />
            <DField label="Fin suspensión" value={fmtDate(m.suspension_end_date)} />
            <DField label="Reinicio planeado" value={fmtDate(m.planned_restart_date)} />
          </DGrid>
        </DSub>
      )}

      {/* Reinicio */}
      {m.modification_type === 'RESTART' && (
        <DSub title="Reinicio" color="#06B6D4">
          <DGrid cols={2}>
            <DField label="Fecha real de reinicio" value={fmtDate(m.actual_restart_date)} />
            <DField label="Suspensión vinculada" value={m.linked_suspension_id ? `#${m.linked_suspension_id}` : null} />
          </DGrid>
        </DSub>
      )}

      {/* Cesión */}
      {['CESION_CESIONARIA', 'CESION_CEDENTE'].includes(m.modification_type) && (
        <DSub title="Cesión" color="#8B5CF6">
          <DGrid cols={2}>
            <DField label="Cedente" value={m.assignor_name} />
            <DField label="Cesionario" value={m.assignee_name} />
            <DField label="Fecha cesión" value={fmtDate(m.assignment_date)} />
            <DField label="Fecha firma" value={fmtDate(m.assignment_signature_date)} />
          </DGrid>
        </DSub>
      )}

      {/* Contractual */}
      {m.modification_type === 'CONTRACTUAL' && m.modification_description && (
        <DSub title="Descripción del cambio" color="#F59E0B">
          <DField label="" value={m.modification_description} />
        </DSub>
      )}

      {/* Liquidación */}
      {m.modification_type === 'LIQUIDATION' && (
        <DSub title="Liquidación" color="#64748B">
          <DGrid cols={2}>
            <DField label="Valor liquidado" value={fmtMoney(m.liquidation_value)} mono />
            <DField label="Fecha liquidación" value={fmtDate(m.liquidation_date)} />
          </DGrid>
        </DSub>
      )}
    </div>
  )
}


/* ─── Trazabilidad financiera ────────────────────────────────────── */
function TrazabilidadFinanciera({ p, mods }) {
  const adiciones = mods.filter(m =>
    ['ADDITION', 'BOTH'].includes(m.modification_type) && m.is_active
  ).sort((a, b) => a.modification_number - b.modification_number)

  if (adiciones.length === 0) return null

  // Calcular valor acumulado en cada hito
  const hitos = []
  let acumulado = parseFloat(p.project_value || 0)
  hitos.push({
    tipo: 'base',
    label: 'Contrato original',
    acto: p.administrative_act || '—',
    fecha: fmtDate(p.subscription_date || p.start_date),
    movimiento: acumulado,
    acumulado,
    color: '#0F2952',
    entidad: parseFloat(p.entity_contribution || 0),
    universidad: parseFloat(p.university_contribution || 0),
  })

  for (const m of adiciones) {
    const mov = parseFloat(m.addition_value || 0)
    acumulado += mov
    hitos.push({
      tipo: 'adicion',
      label: `Adición #${m.modification_number}`,
      acto: m.administrative_act || '—',
      fecha: fmtDate(m.approval_date),
      movimiento: mov,
      acumulado,
      color: '#10B981',
      entidad: parseFloat(m.entity_contribution_addition || 0),
      universidad: parseFloat(m.university_contribution_addition || 0),
      beneficio: m.calculated_benefit_value,
    })
  }

  const maxVal = Math.max(...hitos.map(h => h.acumulado))

  return (
    <div style={{ marginTop: 18, borderTop: '1px solid var(--border-color)', paddingTop: 18 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14, margin: '0 0 14px' }}>
        Trazabilidad del valor
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {hitos.map((h, i) => {
          const barPct = maxVal > 0 ? (h.acumulado / maxVal) * 100 : 100
          const isLast = i === hitos.length - 1
          return (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>

              {/* Línea de tiempo */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 20 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: h.color, border: '2px solid var(--bg-card)', boxShadow: `0 0 0 2px ${h.color}40`, flexShrink: 0, marginTop: 14 }} />
                {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--border-color)', marginTop: 2 }} />}
              </div>

              {/* Contenido */}
              <div style={{
                flex: 1, padding: '12px 14px', marginBottom: 8,
                borderRadius: 10, border: `1px solid ${h.color}22`,
                background: isLast ? `${h.color}06` : 'var(--bg-hover)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: h.color }}>{h.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '1px 7px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                      {h.acto}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{h.fecha}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {h.tipo === 'adicion' && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginRight: 10 }}>
                        +{fmtMoney(h.movimiento)}
                      </span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 800, color: isLast ? h.color : 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {fmtMoney(h.acumulado)}
                    </span>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden', marginBottom: h.tipo === 'adicion' ? 8 : 0 }}>
                  <div style={{ height: '100%', width: `${barPct}%`, background: `linear-gradient(90deg, ${h.color}88, ${h.color})`, borderRadius: 2, transition: 'width .4s' }} />
                </div>

                {/* Desglose aportes (solo adiciones) */}
                {h.tipo === 'adicion' && (h.entidad > 0 || h.universidad > 0) && (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                    {h.entidad > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Entidad: <strong style={{ color: 'var(--text-secondary)' }}>{fmtMoney(h.entidad)}</strong>
                      </span>
                    )}
                    {h.universidad > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Universidad: <strong style={{ color: 'var(--text-secondary)' }}>{fmtMoney(h.universidad)}</strong>
                      </span>
                    )}
                    {h.beneficio > 0 && (
                      <span style={{ fontSize: 10, color: '#8B5CF6' }}>
                        Beneficio UD acumulado: <strong>{fmtMoney(h.beneficio)}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Sección de Plazos con trazabilidad ─────────────────────────── */
function PlazosTrazabilidad({ p, mods }) {
  const prorrogas = mods.filter(m =>
    ['EXTENSION', 'BOTH'].includes(m.modification_type) && m.is_active
  )
  const hasProrrogas = prorrogas.length > 0

  const fechaFinVigente = hasProrrogas
    ? prorrogas[prorrogas.length - 1].new_end_date
    : p.end_date

  const diasOriginales  = diffDays(p.start_date, p.end_date)
  const diasVigentes    = diffDays(p.start_date, fechaFinVigente)
  const diasProrrogados = hasProrrogas
    ? Math.round((new Date(fechaFinVigente) - new Date(p.end_date)) / 86400000)
    : 0

  const today        = new Date()
  const finVigenteD  = fechaFinVigente ? new Date(fechaFinVigente) : null
  const diasRestantes = finVigenteD ? Math.round((finVigenteD - today) / 86400000) : null
  const vencido      = diasRestantes !== null && diasRestantes < 0
  const proxVencer   = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30

  const COLOR_ORIG  = '#0EA5E9'
  const COLOR_FINAL = hasProrrogas ? '#8B5CF6' : '#0EA5E9'
  const COLOR_PROX  = '#10B981'

  return (
    <Section icon={Calendar} color={COLOR_FINAL} title="Plazos del Contrato">
      {/* Fechas principales */}
      <Grid cols={3}>
        <Field label="Fecha de suscripción" value={fmtDate(p.subscription_date)} />
        <Field label="Fecha de inicio" value={fmtDate(p.start_date)} />
        <Field label="Fecha fin original" value={fmtDate(p.end_date)} />
      </Grid>

      {/* Fecha fin vigente */}
      <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: `${COLOR_FINAL}08`, border: `1px solid ${COLOR_FINAL}25` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4, margin: '0 0 4px' }}>
              Fecha fin vigente {hasProrrogas ? `(con ${prorrogas.length} prórroga${prorrogas.length !== 1 ? 's' : ''})` : '(original)'}
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: COLOR_FINAL, fontFamily: 'monospace', margin: 0 }}>
              {fmtDate(fechaFinVigente)}
            </p>
          </div>
          {diasRestantes !== null && (
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: vencido ? '#FEF2F2' : proxVencer ? '#FEF3C7' : '#ECFDF5',
              color: vencido ? '#B91C3C' : proxVencer ? '#D97706' : '#065F46',
              border: `1px solid ${vencido ? '#FECACA' : proxVencer ? '#FDE68A' : '#A7F3D0'}`,
            }}>
              {vencido
                ? `Vencido hace ${Math.abs(diasRestantes)} días`
                : proxVencer
                  ? `Vence en ${diasRestantes} días`
                  : `${diasRestantes} días restantes`}
            </span>
          )}
        </div>
      </div>

      {/* Métricas de duración */}
      {hasProrrogas && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, margin: '0 0 10px' }}>
            Duración: <strong style={{ color: COLOR_ORIG }}>{diasOriginales} días originales</strong>
            {' · '}
            <strong style={{ color: COLOR_PROX }}>+{diasProrrogados} días adicionales</strong>
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', padding: '10px 16px', borderRadius: 8, background: `${COLOR_FINAL}12`, border: `1px solid ${COLOR_FINAL}25`, flex: '1 1 120px' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: COLOR_FINAL, fontFamily: 'monospace', margin: 0 }}>{diasVigentes} días</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>Duración total vigente</p>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 16px', borderRadius: 8, background: `${COLOR_PROX}12`, border: `1px solid ${COLOR_PROX}25`, flex: '1 1 120px' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: COLOR_PROX, fontFamily: 'monospace', margin: 0 }}>+{diasProrrogados} días</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>Total prorrogado</p>
            </div>
          </div>
        </>
      )}

      {!hasProrrogas && (
        <div style={{ marginTop: 4, padding: '10px 14px', borderRadius: 8, background: 'rgba(100,116,139,0.06)', border: '1px solid rgba(100,116,139,0.15)', fontSize: 12, color: 'var(--text-muted)' }}>
          ℹ️ Este contrato no tiene prórrogas registradas. La fecha de fin original es la vigente.
        </div>
      )}

      {/* ── Trazabilidad de fechas ── */}
      {prorrogas.length > 0 && (
        <div style={{ marginTop: 18, borderTop: '1px solid var(--border-color)', paddingTop: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14, margin: '0 0 14px' }}>
            Trazabilidad de plazos
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Hito 0 — contrato original */}
            {[
              {
                label: 'Contrato original',
                acto: p.administrative_act || '—',
                fecha: fmtDate(p.approval_date || p.subscription_date),
                fechaFin: p.end_date,
                dias: diffDays(p.start_date, p.end_date),
                diasExtra: null,
                color: '#0F2952',
                isLast: false,
              },
              ...prorrogas.map((m, idx) => {
                const prevFin = idx === 0 ? p.end_date : prorrogas[idx - 1].new_end_date
                const diasExt = m.extension_days || diffDays(prevFin, m.new_end_date)
                return {
                  label: `Prórroga #${m.modification_number}`,
                  acto: m.administrative_act || '—',
                  fecha: fmtDate(m.approval_date),
                  fechaFin: m.new_end_date,
                  dias: diffDays(p.start_date, m.new_end_date),
                  diasExtra: diasExt,
                  color: '#0EA5E9',
                  isLast: idx === prorrogas.length - 1,
                }
              }),
            ].map((h, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 20 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: h.color, border: '2px solid var(--bg-card)', boxShadow: `0 0 0 2px ${h.color}40`, flexShrink: 0, marginTop: 14 }} />
                  {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border-color)', marginTop: 2 }} />}
                </div>

                <div style={{
                  flex: 1, padding: '12px 14px', marginBottom: 8,
                  borderRadius: 10, border: `1px solid ${h.color}22`,
                  background: h.isLast ? `${h.color}06` : 'var(--bg-hover)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: h.color }}>{h.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '1px 7px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                        {h.acto}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{h.fecha}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {h.diasExtra != null && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0EA5E9' }}>+{h.diasExtra} días</span>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: h.isLast ? h.color : 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {fmtDate(h.fechaFin)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{h.dias} días desde inicio</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.supervisor_type && (
        <>
          <div style={{ height: 1, background: 'var(--border-color)', margin: '18px 0 14px' }} />
          <Grid cols={2}>
            <Field label="Funcionario ordenador del gasto" value={p.supervisor_type === 'JEFE_EXTENSION' ? 'Jefe de la Oficina de Extensión' : 'Rector'} />
          </Grid>
        </>
      )}
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
export default function ProjectViewPage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const { isMobile } = useBreakpoint()

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
      .catch(() => { toast.error('Error cargando el proyecto'); navigate('/projects') })
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cargando proyecto...</p>
    </div>
  )

  if (!project) return null

  const p = project

  // Adiciones activas
  const adicionesActivas = mods
    .filter(m => ['ADDITION', 'BOTH'].includes(m.modification_type) && m.is_active)
    .reduce((s, m) => s + (parseFloat(m.addition_value) || 0), 0)

  const toggleExpand = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  /* ── Botón de acción del topbar ── */
  const ActionBtn = ({ onClick, color, icon: Icon, label }) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 6,
      background: 'none', border: '1px solid var(--border-color)',
      color, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
      padding: isMobile ? '7px 10px' : '7px 14px',
      borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap',
      transition: 'all .15s',
    }}>
      <Icon size={14} />
      {!isMobile && label}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Topbar ── */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)',
        padding: isMobile ? '8px 12px' : '12px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, flexWrap: 'wrap', gap: 8,
      }}>
        {/* Izquierda: volver + título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <button onClick={() => navigate('/projects')} style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none',
            border: '1px solid var(--border-color)', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'inherit',
            padding: '7px 12px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            <ArrowLeft size={15} /> {!isMobile && 'Volver'}
          </button>

          {!isMobile && <div style={{ width: 1, height: 24, background: 'var(--border-color)', flexShrink: 0 }} />}

          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.project_year}{p.external_project_number ? ` #${p.external_project_number}` : ''} · #{p.project_id}
            </h1>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.project_name?.substring(0, isMobile ? 40 : 80)}
            </p>
          </div>
        </div>

        {/* Derecha: botones de acción */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <ActionBtn onClick={() => navigate(`/projects/${id}/modifications`)} color="#F59E0B" icon={GitBranch} label="Modificaciones" />
          <ActionBtn onClick={() => navigate(`/projects/${id}/documents`)}     color="#10B981" icon={FolderOpen} label="Documentos" />
          <ActionBtn onClick={() => navigate(`/projects/${id}/edit`)}           color="#0EA5E9" icon={Pencil}    label="Editar" />
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)', padding: isMobile ? '14px' : '28px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>

          {/* ── Identificación ── */}
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

          {/* ── Clasificación ── */}
          <Section icon={Settings} color="#8B5CF6" title="Clasificación">
            <Grid cols={2}>
              <Field label="Estado" value={p.status_name} />
              <Field label="Tipo de proyecto" value={p.type_name} />
              <Field label="Tipo de financiación" value={p.financing_name} />
              <Field label="Modalidad de ejecución" value={p.modality_name} />
              {/* ← CAMBIO: "Lugar de ejecución" → "Región impactada" */}
              <Field label="Región impactada" value={
                p.execution_region ? (REGION_MAP[p.execution_region] ?? p.execution_region) : null
              } />
            </Grid>
          </Section>

          {/* ── Financiero ── */}
          <Section icon={DollarSign} color="#10B981" title="Información Financiera">
            <Grid cols={2}>
              <Field label="Valor total del proyecto" value={fmtMoney(p.project_value)} mono />
              <Field label="Código contable" value={p.accounting_code} mono />
              <Field label="Aporte Universidad" value={fmtMoney(p.university_contribution)} mono />
              <Field label="Aporte Entidad" value={fmtMoney(p.entity_contribution)} mono />
              {/* ──
              <Field label="% Beneficio institucional" value={fmtPct(p.institutional_benefit_percentage)} />
              ── */}
              <Field label="Valor beneficio institucional" value={fmtMoney(p.institutional_benefit_value)} mono />
            </Grid>
            {p.beneficiaries_count && (
              <Grid cols={2}>
                <Field label="Número de beneficiarios" value={p.beneficiaries_count} />
              </Grid>
            )}

            {/* Adiciones activas — resumen */}
            {adicionesActivas > 0 && (
              <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, margin: '0 0 10px' }}>
                  Adiciones al contrato
                </p>
                <Grid cols={2}>
                  <Field label="Total adicionado" value={fmtMoney(adicionesActivas)} mono />
                  <Field label="Valor total vigente" value={fmtMoney(parseFloat(p.project_value || 0) + adicionesActivas)} mono />
                </Grid>
              </div>
            )}

            {/* Trazabilidad financiera detallada */}
            <TrazabilidadFinanciera p={p} mods={mods} />
          </Section>

          {/* ── Plazos ── */}
          <PlazosTrazabilidad p={p} mods={mods} />

          {/* ── Actores ── */}
          <Section icon={Users} color="#0EA5E9" title="Actores del Proyecto">
            <Grid cols={2}>
              <Field label="Entidad contratante" value={p.entity_name} />
              <Field label="Dependencia ejecutora" value={p.department_name} />
              <Field label="Funcionario ordenador del gasto" value={
                p.supervisor_type === 'RECTOR' ? 'Rector' : 'Jefe de la Oficina de Extensión'
              } />
              <Field label="Supervisor del Proyecto" value={p.official_name} />
              <Field label="Correo principal" value={p.main_email} />
            </Grid>
            {emails.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, margin: '0 0 8px' }}>
                  Correos secundarios
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {emails.map(e => (
                    <div key={e.secondary_email_id} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: '#0EA5E9', fontWeight: 500 }}>{e.email}</span>
                      {e.contact_name && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.contact_name}</span>}
                      {e.contact_type && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {e.contact_type}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* ── Documentación ── */}
          {(p.administrative_act || p.secop_link || p.observations) && (
            <Section icon={Lock} color="#64748B" title="Documentación">
              <Grid cols={2}>
                <Field label="Acto administrativo" value={p.administrative_act} mono />
                {p.secop_link ? (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4, margin: '0 0 4px' }}>Enlace SECOP</p>
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

          {/* ── Códigos RUP ── */}
          {rupCodes.length > 0 && (
            <Section icon={Tag} color="#0EA5E9" title={`Códigos RUP / UNSPSC (${rupCodes.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rupCodes.map(r => (
                  <div key={r.rup_code_id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    padding: '8px 12px', background: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)', borderRadius: 8,
                  }}>
                    {r.is_main_code && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#F59E0B20', color: '#D97706', border: '1px solid #F59E0B40', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                        PRINCIPAL
                      </span>
                    )}
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0EA5E9', flexShrink: 0 }}>{r.rup_code}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, minWidth: 120 }}>{r.product_name || r.class_name}</span>
                    {r.segment_name && !isMobile && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>{r.segment_name}</span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Modificaciones ── */}
          {mods.length > 0 && (
            <Section icon={GitBranch} color="#F59E0B" title={`Modificaciones (${mods.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mods.map(m => {
                  const meta   = TYPE_META[m.modification_type] || { label: m.modification_type, color: '#94A3B8' }
                  const isOpen = expanded[m.modification_id]
                  return (
                    <div key={m.modification_id} style={{
                      border: `1px solid ${meta.color}30`, borderRadius: 10,
                      overflow: 'hidden', opacity: m.is_active ? 1 : 0.6,
                    }}>
                      {/* Header de modificación */}
                      <div
                        onClick={() => toggleExpand(m.modification_id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', cursor: 'pointer',
                          background: `${meta.color}08`,
                          flexWrap: isMobile ? 'wrap' : 'nowrap',
                        }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0 }}>
                          #{m.modification_number}
                        </span>
                        <TypeBadge type={m.modification_type} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, minWidth: 0 }}>
                          {m.administrative_act || '—'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {fmtDate(m.approval_date)}
                        </span>
                        {!m.is_active && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>
                            INACTIVA
                          </span>
                        )}
                        <div style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--text-muted)' }}>
                          {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </div>
                      </div>

                      {/* Detalle expandido */}
                      {isOpen && <ModDetail m={m} />}
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