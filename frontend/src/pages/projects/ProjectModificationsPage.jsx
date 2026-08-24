// frontend/src/pages/projects/ProjectModificationsPage.jsx — v4.3
// CAMBIOS v4.3 (2026-07-15):
//  - Quitado "Justificación supervisor" del detalle de Suspensión
//  - Agregada sección "Documento(s) de soporte" en el detalle de cada modificación
// CAMBIOS v4.2 (histórico):
//  - Título: usa external_project_number o project_id (no internal_project_number que fue eliminado)
//  - Fecha fin actual: calcula la última new_end_date activa de prórrogas (acumulativa)
//  - Valor total: muestra valor base + adiciones
//  - N° modificación: quitado el campo "Automático" del encabezado
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, GitBranch, PowerOff, Power, Pencil, ChevronDown, ChevronUp,
  DollarSign, Clock, FileText, Users, Shield
} from 'lucide-react'
import toast from 'react-hot-toast'
import { projectsService, modificationsService } from '../../services/projects'
import ModificationFormModal from './modifications/ModificationFormModal'

/* ── Meta por tipo ───────────────────────────────────────────────── */
const TYPE_META = {
  ADDITION:          { label: 'Adición',                 color: '#10B981' },
  EXTENSION:         { label: 'Prórroga',                color: '#0EA5E9' },
  BOTH:              { label: 'Adición + Prórroga',      color: '#8B5CF6' },
  CONTRACTUAL:       { label: 'Modif. Contractual',      color: '#F59E0B' },
  SUSPENSION:        { label: 'Suspensión',              color: '#EF4444' },
  RESTART:           { label: 'Reinicio',                color: '#06B6D4' },
  CESION_CESIONARIA: { label: 'Cesión (Cesionaria)',     color: '#8B5CF6' },
  CESION_CEDENTE:    { label: 'Cesión (Cedente)',        color: '#8B5CF6' },
  LIQUIDATION:       { label: 'Liquidación',             color: '#64748B' },
}

function fmtPesos(v) {
  const n = parseFloat(v)
  if (!v || isNaN(n)) return '—'
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
}
function fmtDate(d) { return d ? String(d).split('T')[0] : '—' }

function TypeBadge({ type }) {
  const m = TYPE_META[type] || { label: type, color: '#94A3B8' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: `${m.color}18`, color: m.color, fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  )
}

function DField({ label, value, mono, color }) {
  if (!value && value !== 0 && value !== false) return null
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 12, color: color || 'var(--text-primary)', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: 500, wordBreak: 'break-word' }}>
        {String(value)}
      </p>
    </div>
  )
}

function DGrid({ cols = 2, children }) {
  const valid = Array.isArray(children) ? children.filter(Boolean) : (children ? [children] : [])
  if (valid.length === 0) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px 20px', marginBottom: 14 }}>
      {children}
    </div>
  )
}

function DSection({ title, color, icon: Icon, children }) {
  const valid = Array.isArray(children) ? children.filter(Boolean) : (children ? [children] : [])
  if (valid.length === 0) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {Icon && <Icon size={12} color={color} />}
        <span style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '.07em' }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: `${color}30`, marginLeft: 4 }} />
      </div>
      {children}
    </div>
  )
}

function ModDetail({ m }) {
  return (
    <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
      <DSection title="Datos Generales" color="#F59E0B" icon={FileText}>
        <DGrid cols={3}>
          <DField label="Acto administrativo" value={m.administrative_act} />
          <DField label="Fecha de aprobación" value={fmtDate(m.approval_date)} />
          <DField label="Estado" value={m.is_active ? 'Activa' : 'Inactiva'} color={m.is_active ? '#10B981' : '#94A3B8'} />
        </DGrid>
        {m.justification && <DField label="Justificación" value={m.justification} />}
      </DSection>

      {(m.addition_value || m.new_total_value) && (
        <DSection title="Adición Presupuestal" color="#10B981" icon={DollarSign}>
          <DGrid cols={2}>
            <DField label="Valor total de la adición" value={fmtPesos(m.addition_value)} color="#10B981" mono />
            <DField label="Nuevo valor total contrato" value={fmtPesos(m.new_total_value)} color="#10B981" mono />
          </DGrid>
          {(m.entity_contribution_addition || m.university_contribution_addition) && (
            <DGrid cols={2}>
              <DField label="Aporte entidad en adición" value={fmtPesos(m.entity_contribution_addition)} mono />
              <DField label="Aporte universidad en adición" value={fmtPesos(m.university_contribution_addition)} mono />
            </DGrid>
          )}
          {m.calculated_benefit_value && (
            <div style={{ marginTop:8, padding:'10px 14px', borderRadius:8, background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.25)' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#065F46', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>
                Beneficio institucional vigente tras esta adición
              </p>
              <p style={{ fontSize:15, fontWeight:800, color:'#059669', fontFamily:'monospace' }}>
                {fmtPesos(m.calculated_benefit_value)}
              </p>
              <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                ((Aporte entidad acumulado × 12%) ÷ 112%)
              </p>
            </div>
          )}
          {m.payment_method_modification && <DField label="Modificación forma de pago" value={m.payment_method_modification} />}
          {m.requires_policy_update && <DField label="Actualización de póliza" value={m.policy_update_description || 'Sí'} />}
        </DSection>
      )}

      {m.new_end_date && (
        <DSection title="Prórroga de Plazo" color="#0EA5E9" icon={Clock}>
          <DGrid cols={3}>
            <DField label="Nueva fecha de fin" value={fmtDate(m.new_end_date)} color="#0EA5E9" />
            <DField label="Días prorrogados" value={m.extension_days ? `${m.extension_days} días` : null} />
            <DField label="Período en letras" value={m.extension_period_text} />
          </DGrid>
        </DSection>
      )}

      {m.suspension && (
        <DSection title="Suspensión del Contrato" color="#EF4444" icon={Clock}>
          <DGrid cols={3}>
            <DField label="Fecha inicio" value={fmtDate(m.suspension.suspension_start_date)} />
            <DField label="Fecha fin" value={fmtDate(m.suspension.suspension_end_date)} />
            <DField label="Reinicio programado" value={fmtDate(m.suspension.planned_restart_date)} />
          </DGrid>
          {m.suspension.actual_restart_date && <DField label="Fecha real de reinicio" value={fmtDate(m.suspension.actual_restart_date)} />}
          {/* CAMBIO v4.3: quitada "Justificación supervisor" */}
          <DField label="Justificación contratista" value={m.suspension.contractor_justification} />
          <DField label="Estado suspensión" value={m.suspension.suspension_status} />
        </DSection>
      )}

      {m.restart && (
        <DSection title="Reinicio de Contrato" color="#06B6D4" icon={Clock}>
          <DGrid cols={2}>
            <DField label="Suspensión vinculada" value={`Suspensión ID ${m.restart.suspension_id}`} />
            <DField label="Fecha real de reinicio" value={fmtDate(m.restart.actual_restart_date)} color="#06B6D4" />
          </DGrid>
          <DField label="Período suspendido" value={`${fmtDate(m.restart.suspension_start_date)} → ${fmtDate(m.restart.suspension_end_date)}`} />
        </DSection>
      )}

      {m.clause && (
        <DSection title="Modificación Contractual" color="#F59E0B" icon={FileText}>
          <DField label="Descripción de la modificación" value={m.clause.modification_description} />
          {m.clause.requires_resource_liberation && (
            <DGrid cols={3}>
              <DField label="CDP a liberar" value={m.clause.cdp_to_release} mono />
              <DField label="RP a liberar" value={m.clause.rp_to_release} mono />
              <DField label="Valor a liberar" value={fmtPesos(m.clause.liberation_amount)} color="#EF4444" mono />
            </DGrid>
          )}
        </DSection>
      )}

      {m.assignment && (
        <DSection title="Cesión del Contrato" color="#8B5CF6" icon={Users}>
          <DGrid cols={3}>
            <DField label="Cedente" value={m.assignment.assignor_name} />
            <DField label="ID Cedente" value={`${m.assignment.assignor_id_type} ${m.assignment.assignor_id}`} mono />
            <DField label="Cesionario" value={m.assignment.assignee_name} />
            <DField label="ID Cesionario" value={`${m.assignment.assignee_id_type} ${m.assignment.assignee_id}`} mono />
          </DGrid>
          <DGrid cols={3}>
            <DField label="Fecha cesión" value={fmtDate(m.assignment.assignment_date)} />
            <DField label="Valor a ceder" value={fmtPesos(m.assignment.value_to_assign)} mono />
            <DField label="Valor pendiente cedente" value={fmtPesos(m.assignment.value_pending_to_assignor)} mono />
          </DGrid>
        </DSection>
      )}

      {m.liquidation && (
        <DSection title="Liquidación" color="#64748B" icon={Shield}>
          <DGrid cols={3}>
            <DField label="Tipo" value={m.liquidation.liquidation_type === 'BILATERAL' ? 'Bilateral' : 'Unilateral'} />
            <DField label="Porcentaje ejecución" value={m.liquidation.execution_percentage ? `${m.liquidation.execution_percentage}%` : null} />
            <DField label="Fecha liquidación" value={fmtDate(m.liquidation.liquidation_date)} />
          </DGrid>
          {m.liquidation.cdp && (
            <DGrid cols={4}>
              <DField label="CDP" value={m.liquidation.cdp} mono />
              <DField label="Valor CDP" value={fmtPesos(m.liquidation.cdp_value)} mono />
              <DField label="RP" value={m.liquidation.rp} mono />
              <DField label="Valor RP" value={fmtPesos(m.liquidation.rp_value)} mono />
            </DGrid>
          )}
          {m.liquidation.liquidation_type === 'UNILATERAL' && (
            <>
              <DGrid cols={2}>
                <DField label="N° resolución" value={m.liquidation.resolution_number} mono />
                <DField label="Fecha resolución" value={fmtDate(m.liquidation.resolution_date)} />
              </DGrid>
              <DField label="Causa unilateral" value={m.liquidation.unilateral_cause} />
              <DField label="Análisis de causa" value={m.liquidation.cause_analysis} />
            </>
          )}
          <DField label="Solicitud liquidación (supervisor)" value={m.liquidation.supervisor_liquidation_request} />
          <DField label="Fecha firma liquidación" value={fmtDate(m.liquidation.liquidation_signature_date)} />
        </DSection>
      )}

      {/* NUEVO v4.3 — documento(s) de soporte de esta modificación */}
      {m.documentos && m.documentos.length > 0 && (
        <DSection title="Documento(s) de Soporte" color="#64748B" icon={FileText}>
          {m.documentos.map(doc => (
            <div key={doc.document_id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'var(--bg-hover)', borderRadius:8, marginBottom:6 }}>
              <div>
                <p style={{ margin:0, fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{doc.document_name}</p>
                <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>{doc.type_name || 'Documento'} {doc.document_date ? `· ${doc.document_date}` : ''}</p>
              </div>
              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ fontSize:11, fontWeight:700, color:'#0EA5E9' }}>Ver documento</a>
              )}
            </div>
          ))}
        </DSection>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
export default function ProjectModificationsPage() {
  const navigate = useNavigate()
  const { id }   = useParams()

  const [project,     setProject]     = useState(null)
  const [mods,        setMods]        = useState([])
  const [suspensions, setSuspensions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editMod,     setEditMod]     = useState(null)
  const [expanded,    setExpanded]    = useState({})

  const loadProject = useCallback(async () => {
    try { const r = await projectsService.get(id); setProject(r.data) }
    catch { toast.error('Error cargando proyecto') }
  }, [id])

  const loadMods = useCallback(async () => {
    setLoading(true)
    try {
      const r = await modificationsService.list(id)
      setMods(Array.isArray(r.data) ? r.data : [])
    } catch {
      toast.error('Error al cargar modificaciones')
      setMods([])
    } finally { setLoading(false) }
  }, [id])

  const loadSuspensions = useCallback(async () => {
    try {
      const r = await modificationsService.listSuspensions(id)
      setSuspensions(Array.isArray(r.data) ? r.data : [])
    } catch { setSuspensions([]) }
  }, [id])

  useEffect(() => {
    loadProject(); loadMods(); loadSuspensions()
  }, [loadProject, loadMods, loadSuspensions])

  const handleToggle = async (m) => {
    try {
      await modificationsService.toggle(m.modification_id)
      toast.success(m.is_active ? 'Modificación deshabilitada' : 'Modificación habilitada')
      loadMods(); loadSuspensions()
    } catch { toast.error('Error al cambiar estado') }
  }

  const handleEdit = (m) => { setEditMod(m); setModalOpen(true) }
  const handleNew  = () => { setEditMod(null); setModalOpen(true) }

  const afterSave = () => {
    setModalOpen(false); setEditMod(null)
    loadProject(); loadMods(); loadSuspensions()
  }

  const toggleExpand = (modId) =>
    setExpanded(prev => ({ ...prev, [modId]: !prev[modId] }))

  const prevMods = mods.filter(m => m.is_active)

  // Total adiciones activas
  const totalAdiciones = prevMods
    .filter(m => ['ADDITION','BOTH'].includes(m.modification_type))
    .reduce((s, m) => s + (parseFloat(m.addition_value) || 0), 0)

  // Fecha fin VIGENTE: última new_end_date de prórrogas activas (acumulativa)
  const fechaFinVigente = (() => {
    const prorrogas = prevMods
      .filter(m => ['EXTENSION','BOTH'].includes(m.modification_type) && m.new_end_date)
      .sort((a, b) => a.modification_number - b.modification_number)
    return prorrogas.length > 0
      ? prorrogas[prorrogas.length - 1].new_end_date
      : project?.end_date
  })()

  // Valor total vigente = valor base + adiciones
  const valorVigente = project
    ? parseFloat(project.project_value || 0) + totalAdiciones
    : 0

  // Identificador del proyecto: external_project_number o project_id
  const proyectoLabel = project
    ? `${project.project_year}${project.external_project_number ? ` #${project.external_project_number}` : ''} · #${project.project_id}`
    : '…'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Topbar ── */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(`/projects/${id}/view`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'inherit', padding: '7px 12px', borderRadius: 8 }}>
            <ArrowLeft size={15} /> Volver
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--border-color)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(245,158,11,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GitBranch size={18} color="#F59E0B" />
            </div>
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Modificaciones · {proyectoLabel}
              </h1>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {project?.project_name?.substring(0, 70)}
                {!loading && mods.length > 0 && (
                  <span style={{ marginLeft: 8, fontWeight: 700, color: '#F59E0B' }}>
                    · {mods.length} modificación{mods.length !== 1 ? 'es' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {project && (
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '.06em' }}>Valor vigente</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#10B981', fontFamily: 'monospace', margin: 0 }}>{fmtPesos(valorVigente)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '.06em' }}>Fecha fin vigente</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0EA5E9', fontFamily: 'monospace', margin: 0 }}>{fmtDate(fechaFinVigente)}</p>
              </div>
            </div>
          )}
          <button onClick={handleNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#B91C3C', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', padding: '9px 16px', borderRadius: 8 }}>
            <Plus size={15} /> Nueva Modificación
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Cargando modificaciones...</p>
        ) : mods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <GitBranch size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Este proyecto no tiene modificaciones registradas.</p>
            <button onClick={handleNew} className="btn-primary">Crear la primera modificación</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 900, margin: '0 auto' }}>
            {mods.map(m => {
              const isOpen = !!expanded[m.modification_id]
              const meta   = TYPE_META[m.modification_type] || { label: m.modification_type, color: '#94A3B8' }
              return (
                <div key={m.modification_id}
                  style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 12, overflow: 'hidden', opacity: m.is_active ? 1 : 0.6,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexWrap: 'wrap' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: meta.color }}>#{m.modification_number}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <TypeBadge type={m.modification_type} />
                        {m.administrative_act && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.administrative_act}</span>}
                        {!m.is_active && <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '2px 7px', borderRadius: 10 }}>INACTIVA</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                        {m.approval_date && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📅 {fmtDate(m.approval_date)}</span>}
                        {m.addition_value && <span style={{ fontSize: 11, color: '#10B981', fontFamily: 'monospace', fontWeight: 600 }}>+{fmtPesos(m.addition_value)}</span>}
                        {m.new_end_date && <span style={{ fontSize: 11, color: '#0EA5E9' }}>→ {fmtDate(m.new_end_date)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => handleEdit(m)} title="Editar"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>
                        <Pencil size={12}/> Editar
                      </button>
                      <button onClick={() => handleToggle(m)} title={m.is_active ? 'Deshabilitar' : 'Habilitar'}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border-color)', background: 'none', color: m.is_active ? '#EF4444' : '#10B981', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>
                        {m.is_active ? <><PowerOff size={12}/> Deshabilitar</> : <><Power size={12}/> Habilitar</>}
                      </button>
                      <button onClick={() => toggleExpand(m.modification_id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                        {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        {isOpen ? 'Ocultar' : 'Detalle'}
                      </button>
                    </div>
                  </div>
                  {isOpen && <ModDetail m={m} />}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <ModificationFormModal
          project={project}
          editData={editMod}
          prevMods={prevMods}
          suspensions={suspensions}
          onSaved={afterSave}
          onClose={() => { setModalOpen(false); setEditMod(null) }}
        />
      )}
    </div>
  )
}
