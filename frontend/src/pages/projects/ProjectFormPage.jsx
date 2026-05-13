import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  FileText, Settings, DollarSign, Calendar, Users,
  Tag, Link2, Save, ArrowLeft, CheckCircle2, AlertCircle,
  Mail, Plus, Trash2, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { projectsService, rupService, emailsService } from '../../services/projects'
import {
  entitiesService, executingDepartmentsService, projectStatusesService,
  executionModalitiesService, financingTypesService, orderingOfficialsService
} from '../../services/catalogs'
import SearchableSelect from '../../components/ui/SearchableSelect'
import RupSelector from '../../components/projects/RupSelector'

/* ─── Límites de caracteres según BD ─────────────────────────────── */
const LIMITS = {
  external_project_number:  20,
  project_name:             800,
  project_purpose:          2000,
  accounting_code:          50,
  main_email:               200,
  administrative_act:       50,
  secop_link:               1000,
  observations:             4000,
  rup_codes_general_observations: 4000,
  minutes_number:           50,
  session_type:             50,
}

function CharCount({ value, max }) {
  const len  = (value || '').length
  const pct  = len / max
  const color = pct >= 1 ? '#B91C3C' : pct >= 0.85 ? '#F59E0B' : 'var(--text-muted)'
  return (
    <span style={{ fontSize: 11, color, fontVariantNumeric: 'tabular-nums', transition: 'color .2s' }}>
      {len}/{max}
    </span>
  )
}

function TxtInp({ value, onChange, max, placeholder, type = 'text', disabled, style }) {
  return (
    <div>
      <input className="input-field" type={type} value={value ?? ''} maxLength={max}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        disabled={disabled} style={style} />
      {max && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
          <CharCount value={value} max={max} />
        </div>
      )}
    </div>
  )
}

function TxtArea({ value, onChange, max, rows = 3, placeholder }) {
  return (
    <div>
      <textarea className="input-field" rows={rows} value={value ?? ''} maxLength={max}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ resize: 'vertical' }} />
      {max && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
          <CharCount value={value} max={max} />
        </div>
      )}
    </div>
  )
}

const fmtNum = (v) => {
  if (v === '' || v === null || v === undefined) return ''
  const num = parseFloat(coNum(String(v)))
  if (isNaN(num)) return ''
  return num.toLocaleString('es-CO', { maximumFractionDigits: 2 })
}
function coNum(s) {
  s = String(s).trim()
  if (s.includes('.') && s.includes(',')) return s.replace(/\./g, '').replace(',', '.')
  if (s.includes(',') && !s.includes('.')) return s.replace(',', '.')
  if (s.includes('.')) {
    const afterDot = s.split('.').pop()
    if (afterDot.length === 3 && !isNaN(afterDot)) return s.replace(/\./g, '')
    return s
  }
  return s
}
const parseNum = (v) => {
  if (v === '' || v === null || v === undefined) return 0
  return parseFloat(coNum(String(v))) || 0
}

function MoneyInput({ value, onChange, placeholder, readOnly }) {
  const [display, setDisplay] = useState(fmtNum(value))
  useEffect(() => { setDisplay(fmtNum(value)) }, [value])
  const handleChange = (e) => {
    const raw = e.target.value.replace(/\./g, '').replace(/[^0-9,]/g, '')
    setDisplay(raw)
    onChange(parseFloat(raw.replace(',', '.')) || 0)
  }
  return (
    <input className="input-field" value={display}
      onChange={readOnly ? undefined : handleChange}
      onBlur={() => setDisplay(fmtNum(value))}
      onFocus={() => setDisplay(value !== '' && value !== null ? String(value).replace(/\./g, '') : '')}
      placeholder={placeholder} readOnly={readOnly}
      style={{ fontFamily: 'monospace', opacity: readOnly ? 0.7 : 1 }} />
  )
}

/* ─── Secciones ──────────────────────────────────────────────────── */
const SECTIONS = [
  { id: 'identificacion', label: 'Identificación',  icon: FileText,   required: ['project_name','project_purpose','project_year'] },
  { id: 'clasificacion',  label: 'Clasificación',   icon: Settings,   required: ['project_status_id','project_type_id','financing_type_id','execution_modality_id'] },
  { id: 'financiero',     label: 'Financiero',      icon: DollarSign, required: ['project_value'] },
  { id: 'fechas',         label: 'Fechas',          icon: Calendar,   required: ['start_date','end_date'] },
  { id: 'actores',        label: 'Actores',         icon: Users,      required: ['entity_id','executing_department_id','ordering_official_id'] },
  { id: 'rup',            label: 'Códigos RUP',     icon: Tag,        required: [] },
  { id: 'adicional',      label: 'Adicional',       icon: Link2,      required: [] },
]

const SESSION_TYPES = ['ORDINARIA', 'EXTRAORDINARIA']
const CURRENT_YEAR  = new Date().getFullYear()

const EMPTY = {
  project_year: CURRENT_YEAR,
  external_project_number: '', project_name: '', project_purpose: '',
  entity_id: '', executing_department_id: '', project_status_id: '',
  project_type_id: '', financing_type_id: '', execution_modality_id: '',
  project_value: '', accounting_code: '',
  institutional_benefit_percentage: 12, institutional_benefit_value: '',
  university_contribution: 0, entity_contribution: '',
  beneficiaries_count: '', subscription_date: '', start_date: '', end_date: '',
  ordering_official_id: '', main_email: '',
  administrative_act: '', secop_link: '', observations: '',
  rup_codes_general_observations: '', session_type: '', minutes_date: '', minutes_number: '',
  execution_region: '',
}


/* ─── Modal de confirmación de creación ──────────────────────────── */
function ConfirmCreateModal({ form, cats, onConfirm, onCancel, saving }) {
  const entity = cats.entities.find(e => String(e.entity_id) === String(form.entity_id))
  const total  = parseNum(form.project_value)
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 500,
        border: '1px solid var(--border-color)', boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0F2952,#1E3A6E)', padding: '22px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={22} color="#F59E0B"/>
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>¿Crear este proyecto?</h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Verifica los datos antes de confirmar</p>
            </div>
          </div>
        </div>

        {/* Datos del proyecto */}
        <div style={{ padding: '22px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Row label="Nombre del proyecto" value={form.project_name} highlight />
            <Row label="Año" value={form.project_year} />
            <Row label="N° externo" value={form.external_project_number || '—'} />
            <Row label="Entidad contratante" value={entity?.entity_name || '—'} />
            <Row label="Valor total del proyecto" value={`$ ${fmtNum(total)}`} money />
          </div>

          <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', fontSize: 12, color: '#92400E' }}>
            ⚠️ Una vez creado, el año y número del proyecto no podrán modificarse.
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={onCancel} style={{
              flex: 1, padding: '11px', borderRadius: 9, border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={saving} style={{
              flex: 1, padding: '11px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg,#B91C3C,#E11D48)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Creando...' : '✓ Sí, crear proyecto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, highlight, money }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: highlight || money ? 700 : 500,
        color: money ? '#10B981' : highlight ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: money ? 'monospace' : 'inherit', textAlign: 'right',
        wordBreak: 'break-word', maxWidth: '65%',
      }}>
        {value}
      </span>
    </div>
  )
}

/* ─── Página ──────────────────────────────────────────────────────── */
export default function ProjectFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const isEdit   = Boolean(id)

  const [section,     setSection]     = useState('identificacion')
  const [visited,     setVisited]     = useState(new Set(['identificacion']))
  const [saving,      setSaving]      = useState(false)
  const [loading,     setLoading]     = useState(isEdit)
  const [showConfirm, setShowConfirm] = useState(false)
  const [form,        setForm]        = useState(EMPTY)
  const [rupCodes,    setRupCodes]    = useState([])
  const [emails,      setEmails]      = useState([])
  const [emailForm,   setEmailForm]   = useState({ email:'', contact_type:'', contact_name:'', contact_position:'', contact_phone:'' })
  const [emailErr,    setEmailErr]    = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [cats,        setCats]        = useState({
    entities:[], departments:[], statuses:[], modalities:[], financing:[], officials:[], projTypes:[]
  })

  // Cargar catálogos
  useEffect(() => {
    Promise.all([
      entitiesService.list(true), executingDepartmentsService.list(true),
      projectStatusesService.list(true), executionModalitiesService.list(true),
      financingTypesService.list(true), orderingOfficialsService.list(true),
      projectsService.listTypes(),
    ]).then(([en,dep,st,mod,fin,off,pt]) => setCats({
      entities: en.data, departments: dep.data, statuses: st.data,
      modalities: mod.data, financing: fin.data, officials: off.data, projTypes: pt.data,
    })).catch(() => toast.error('Error cargando catálogos'))
  }, [])

  // Cargar proyecto si es edición
  useEffect(() => {
    if (!isEdit) return
    Promise.all([projectsService.get(id), rupService.getProjectRup(id)])
      .then(([pr, rr]) => {
        const p = pr.data
        setForm({
          project_year: p.project_year,
          external_project_number: p.external_project_number || '',
          project_name: p.project_name, project_purpose: p.project_purpose,
          entity_id: p.entity_id, executing_department_id: p.executing_department_id,
          project_status_id: p.project_status_id, project_type_id: p.project_type_id,
          financing_type_id: p.financing_type_id, execution_modality_id: p.execution_modality_id,
          project_value: p.project_value, accounting_code: p.accounting_code || '',
          institutional_benefit_percentage: p.institutional_benefit_percentage ?? 12,
          institutional_benefit_value: p.institutional_benefit_value || '',
          university_contribution: p.university_contribution || 0,
          entity_contribution: p.entity_contribution || '',
          beneficiaries_count: p.beneficiaries_count || '',
          subscription_date: p.subscription_date || '', start_date: p.start_date, end_date: p.end_date,
          ordering_official_id: p.ordering_official_id, main_email: p.main_email || '',
          administrative_act: p.administrative_act || '', secop_link: p.secop_link || '',
          observations: p.observations || '',
          rup_codes_general_observations: p.rup_codes_general_observations || '',
          session_type: p.session_type || '', minutes_date: p.minutes_date || '',
          minutes_number: p.minutes_number || '',
          execution_region: p.execution_region || '',
        })
        setRupCodes(rr.data.map(r => ({
          rup_code_id: r.rup_code_id, rup_code: r.rup_code,
          product_name: r.product_name, class_name: r.class_name,
          family_name: r.family_name, segment_name: r.segment_name,
          is_main_code: r.is_main_code,
        })))
        // En edición todas las secciones ya fueron "visitadas"
        setVisited(new Set(SECTIONS.map(s => s.id)))
        setLoading(false)
      })
      .catch(() => { toast.error('Error cargando proyecto'); navigate('/projects') })
    emailsService.list(id).then(r => setEmails(r.data)).catch(() => {})
  }, [id, isEdit, navigate])

  const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), [])

  // Marcar sección como visitada al navegar
  const goSection = (sectionId) => {
    setSection(sectionId)
    setVisited(prev => new Set([...prev, sectionId]))
  }

  const addEmail = async () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(emailForm.email)) { setEmailErr('Correo inválido'); return }
    setEmailErr('')
    if (!isEdit) {
      setEmails(prev => [...prev, { ...emailForm, secondary_email_id: Date.now(), local: true }])
      setEmailForm({ email:'', contact_type:'', contact_name:'', contact_position:'', contact_phone:'' })
      return
    }
    setSavingEmail(true)
    try {
      const r = await emailsService.create(id, emailForm)
      setEmails(prev => [...prev, r.data])
      setEmailForm({ email:'', contact_type:'', contact_name:'', contact_position:'', contact_phone:'' })
      toast.success('Correo agregado')
    } catch(e) {
      toast.error(e.response?.data?.detail || 'Error guardando correo')
    } finally { setSavingEmail(false) }
  }

  const removeEmail = async (em) => {
    if (em.local) { setEmails(prev => prev.filter(x => x.secondary_email_id !== em.secondary_email_id)); return }
    try {
      await emailsService.delete(id, em.secondary_email_id)
      setEmails(prev => prev.filter(x => x.secondary_email_id !== em.secondary_email_id))
      toast.success('Correo eliminado')
    } catch(e) { toast.error('Error eliminando correo') }
  }

  // Auto: aporte entidad = total - univ
  useEffect(() => {
    const total = parseNum(form.project_value)
    const univ  = parseNum(form.university_contribution)
    setForm(f => ({ ...f, entity_contribution: Math.max(0, total - univ) || '' }))
  }, [form.project_value, form.university_contribution])

  // Sección completa: tiene required llenos Y fue visitada (para secciones sin required)
  const secStatus = SECTIONS.map(s => ({
    ...s,
    complete: s.required.length > 0
      ? s.required.every(k => form[k] || form[k] === 0)
      : visited.has(s.id),
  }))
  const completedCount = secStatus.filter(s => s.complete).length

  const validate = () => {
    const checks = [
      ['identificacion', 'project_name',            'Nombre del proyecto'],
      ['identificacion', 'project_purpose',          'Objeto del proyecto'],
      ['clasificacion',  'project_status_id',        'Estado del proyecto'],
      ['clasificacion',  'project_type_id',          'Tipo de proyecto'],
      ['clasificacion',  'financing_type_id',        'Tipo de financiación'],
      ['clasificacion',  'execution_modality_id',    'Modalidad de ejecución'],
      ['financiero',     'project_value',            'Valor total del proyecto'],
      ['fechas',         'start_date',               'Fecha de inicio'],
      ['fechas',         'end_date',                 'Fecha de fin'],
      ['actores',        'entity_id',                'Entidad contratante'],
      ['actores',        'executing_department_id',  'Dependencia ejecutora'],
      ['actores',        'ordering_official_id',     'Funcionario ordenador del gasto'],
    ]
    for (const [sec, k, label] of checks) {
      if (!form[k] && form[k] !== 0) {
        toast.error(`Campo obligatorio: ${label}`)
        goSection(sec); return false
      }
    }
    if (parseNum(form.project_value) <= 0) {
      toast.error('El valor del proyecto debe ser mayor a 0')
      goSection('financiero'); return false
    }
    const total = parseNum(form.project_value)
    const univ  = parseNum(form.university_contribution)
    const ent   = parseNum(form.entity_contribution)
    if (univ + ent > total) {
      toast.error('La suma de aportes no puede superar el valor total del proyecto')
      goSection('financiero'); return false
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      toast.error('La fecha de fin debe ser igual o posterior a la fecha de inicio')
      goSection('fechas'); return false
    }
    if (form.subscription_date && form.start_date && form.start_date < form.subscription_date) {
      toast.error('La fecha de inicio no puede ser anterior a la fecha de suscripción')
      goSection('fechas'); return false
    }
    if (form.minutes_date && form.start_date && form.minutes_date > form.end_date) {
      toast.error('La fecha del acta no puede ser posterior a la fecha de fin del proyecto')
      goSection('adicional'); return false
    }
    return true
  }

  // Al pulsar "Crear proyecto" → mostrar modal de confirmación
  const handleSaveClick = () => {
    if (!validate()) return
    if (!isEdit) { setShowConfirm(true); return }
    doSave()
  }

  const doSave = async () => {
    setSaving(true)
    try {
      const numF = ['entity_id','executing_department_id','project_status_id','project_type_id',
        'financing_type_id','execution_modality_id','ordering_official_id','project_year','beneficiaries_count']
      const decF = ['project_value','institutional_benefit_percentage',
        'institutional_benefit_value','university_contribution','entity_contribution']

      const payload = {}
      for (const [k, v] of Object.entries(form)) {
        if (k === 'internal_project_number') continue
        if (isEdit && k === 'project_year') continue
        if (v === '' || v === null || v === undefined) { payload[k] = null; continue }
        if (numF.includes(k)) {
          payload[k] = Number(v)
        } else if (k === 'institutional_benefit_percentage') {
          const pct = parseFloat(String(v).replace(',', '.'))
          payload[k] = isNaN(pct) ? 12 : Math.min(pct, 999.99)
        } else if (decF.filter(f => f !== 'institutional_benefit_percentage').includes(k)) {
          payload[k] = parseNum(v)
        } else {
          payload[k] = v
        }
      }

      let projId
      if (isEdit) {
        await projectsService.update(id, payload)
        projId = Number(id)
      } else {
        const r = await projectsService.create(payload)
        projId = r.data.project_id
      }

      if (rupCodes.length > 0) {
        await rupService.assignRup(projId, rupCodes.map(c => ({
          rup_code_id: c.rup_code_id, is_main_code: c.is_main_code,
        })))
      }

      if (!isEdit) {
        const localEmails = emails.filter(e => e.local)
        for (const em of localEmails) {
          const { local, secondary_email_id, ...emailData } = em
          const clean = Object.fromEntries(Object.entries(emailData).filter(([,v]) => v !== ''))
          await emailsService.create(projId, clean).catch(() => {})
        }
      }

      toast.success(isEdit ? 'Proyecto actualizado ✓' : 'Proyecto creado ✓')
      navigate('/projects')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false); setShowConfirm(false) }
  }

  const curIdx  = SECTIONS.findIndex(s => s.id === section)
  const hasPrev = curIdx > 0
  const hasNext = curIdx < SECTIONS.length - 1

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <p style={{ color:'var(--text-muted)', fontSize:14 }}>Cargando proyecto...</p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>

      {/* ── Modal confirmación creación ── */}
      {showConfirm && (
        <ConfirmCreateModal
          form={form} cats={cats}
          onConfirm={doSave} onCancel={() => setShowConfirm(false)}
          saving={saving}
        />
      )}

      {/* ── Topbar ── */}
      <div style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border-color)', flexShrink:0 }}>
        <div style={{ padding:'10px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>navigate('/projects')} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'1px solid var(--border-color)', cursor:'pointer', color:'var(--text-secondary)', fontSize:13, fontFamily:'inherit', padding:'7px 12px', borderRadius:8, whiteSpace:'nowrap' }}>
              <ArrowLeft size={15}/> Volver
            </button>
            <div style={{ width:1, height:24, background:'var(--border-color)' }}/>
            <div>
              <h1 style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', margin:0 }}>
                {isEdit ? `Editando · ${form.project_year}${form.external_project_number ? ` #${form.external_project_number}` : ''} · #${id}` : `Nuevo proyecto · ${form.project_year}`}
              </h1>
              <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
                {completedCount} de {SECTIONS.length} pasos completados
              </p>
            </div>
          </div>
          <button onClick={handleSaveClick} disabled={saving} className="btn-primary" style={{ minWidth:170 }}>
            <Save size={14}/>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear proyecto'}
          </button>
        </div>

        {/* Stepper */}
        <div style={{ display:'flex', alignItems:'stretch', padding:'0 16px', overflowX:'auto' }}>
          {secStatus.map((s, i) => {
            const active = section === s.id
            const done   = s.complete
            return (
              <div key={s.id} style={{ display:'flex', alignItems:'center', flex: i < secStatus.length-1 ? '1 1 0' : 'none', minWidth:0 }}>
                <button onClick={()=>goSection(s.id)} style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                  padding:'8px 10px 11px', border:'none', background:'none', cursor:'pointer',
                  fontFamily:'inherit', flexShrink:0, position:'relative',
                }}>
                  <div style={{
                    width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:800, fontSize:11, transition:'all .2s',
                    background: done ? '#10B981' : active ? '#0F2952' : 'var(--bg-hover)',
                    color:      done ? '#fff'    : active ? '#fff'    : 'var(--text-muted)',
                    boxShadow:  active && !done ? '0 0 0 3px rgba(14,165,233,0.2)' : 'none',
                    border:     active && !done ? '2px solid #0EA5E9' : '2px solid transparent',
                  }}>
                    {done ? <CheckCircle2 size={14} color="#fff"/> : <span>{String(i+1).padStart(2,'0')}</span>}
                  </div>
                  <span style={{ fontSize:10, fontWeight: active ? 700 : 500, whiteSpace:'nowrap', color: done ? '#10B981' : active ? '#0EA5E9' : 'var(--text-muted)' }}>
                    {s.label}
                  </span>
                  {active && (
                    <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:28, height:3, borderRadius:'3px 3px 0 0', background:'#0EA5E9' }}/>
                  )}
                </button>
                {i < secStatus.length-1 && (
                  <div style={{ flex:1, height:2, borderRadius:2, margin:'0 2px', marginBottom:18,
                    background: done && secStatus[i+1].complete ? '#10B981' : done ? 'linear-gradient(to right,#10B981,var(--border-color))' : 'var(--border-color)'
                  }}/>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Cuerpo ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>
        {/* Sidebar */}
        <div style={{ width:210, borderRight:'1px solid var(--border-color)', background:'var(--bg-secondary)', flexShrink:0, display:'flex', flexDirection:'column', padding:'12px 8px' }}>
          {secStatus.map(s=>{
            const active = section===s.id
            return (
              <button key={s.id} onClick={()=>goSection(s.id)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:9,
                padding:'10px 12px', borderRadius:8, border:'none', marginBottom:2,
                borderLeft:`3px solid ${active?'#0EA5E9':'transparent'}`,
                background: active?'rgba(14,165,233,0.1)':'transparent',
                color: active?'#0EA5E9':'var(--text-muted)',
                cursor:'pointer', fontSize:13, fontWeight:active?700:500,
                fontFamily:'inherit', transition:'all .15s', textAlign:'left',
              }}>
                <s.icon size={15} style={{ flexShrink:0 }}/>
                <span style={{ flex:1 }}>{s.label}</span>
                {s.complete
                  ? <CheckCircle2 size={14} color="#10B981"/>
                  : s.required.length>0 ? <AlertCircle size={13} style={{ opacity:.3 }}/> : null}
              </button>
            )
          })}
          <div style={{ marginTop:'auto', padding:'16px 8px 4px' }}>
            <div style={{ height:6, background:'var(--border-color)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, background:'#10B981', transition:'width .4s', width:`${(completedCount/SECTIONS.length)*100}%` }}/>
            </div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:6, textAlign:'center' }}>
              {Math.round((completedCount/SECTIONS.length)*100)}% completado
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ flex:1, overflowY:'auto', background:'var(--bg-primary)' }}>
          <div style={{ maxWidth:780, margin:'0 auto', padding:36 }}>
            {section==='identificacion' && <SecIdentificacion form={form} set={set} isEdit={isEdit}/>}
            {section==='clasificacion'  && <SecClasificacion  form={form} set={set} cats={cats}/>}
            {section==='financiero'     && <SecFinanciero     form={form} set={set} projectId={id} isEdit={isEdit}/>}
            {section==='fechas'         && <SecFechas         form={form} set={set} isEdit={isEdit}/>}
            {section==='actores'        && <SecActores        form={form} set={set} cats={cats} emails={emails} emailForm={emailForm} setEmailForm={setEmailForm} emailErr={emailErr} addEmail={addEmail} removeEmail={removeEmail} savingEmail={savingEmail} isEdit={isEdit}/>}
            {section==='rup'            && <SecRup            rupCodes={rupCodes} onChange={setRupCodes} form={form} set={set}/>}
            {section==='adicional'      && <SecAdicional      form={form} set={set}/>}
          </div>
        </div>
      </div>

      {/* ── Nav inferior ── */}
      <div style={{ borderTop:'1px solid var(--border-color)', background:'var(--bg-card)', padding:'12px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <button onClick={()=>hasPrev&&goSection(SECTIONS[curIdx-1].id)} disabled={!hasPrev}
          className="btn-secondary" style={{ opacity:hasPrev?1:0.3, minWidth:130 }}>
          ← {hasPrev?SECTIONS[curIdx-1].label:'Anterior'}
        </button>
        <span style={{ fontSize:12, color:'var(--text-muted)' }}>
          {curIdx+1} / {SECTIONS.length} · <strong style={{ color:'var(--text-secondary)' }}>{SECTIONS[curIdx].label}</strong>
        </span>
        <button onClick={()=>hasNext&&goSection(SECTIONS[curIdx+1].id)} disabled={!hasNext}
          className="btn-secondary" style={{ opacity:hasNext?1:0.3, minWidth:130 }}>
          {hasNext?SECTIONS[curIdx+1].label:'Finalizar'} →
        </button>
      </div>
    </div>
  )
}

/* ─── Helpers UI ─────────────────────────────────────────────────── */
function ST({ icon:Icon, color='#0EA5E9', title, subtitle }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={20} color={color}/>
        </div>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', margin:0 }}>{title}</h2>
          {subtitle&&<p style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ height:1, background:'var(--border-color)', marginTop:18 }}/>
    </div>
  )
}
function G({ cols=2, children }) {
  return <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:16, marginBottom:16 }}>{children}</div>
}
function F({ label, required, span, hint, children }) {
  return (
    <div style={span?{gridColumn:`span ${span}`}:{}}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
        <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>
          {label}{required&&<span style={{ color:'#B91C3C' }}> *</span>}
        </label>
      </div>
      {children}
      {hint&&<p style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{hint}</p>}
    </div>
  )
}

/* Select con flecha visible siempre */
const selStyle = {
  appearance: 'auto',
  WebkitAppearance: 'auto',
  MozAppearance: 'auto',
  cursor: 'pointer',
}
const Sel = ({value,onChange,children}) => (
  <select className="input-field" style={selStyle} value={value??''} onChange={e=>onChange(e.target.value)}>
    {children}
  </select>
)

/* ─── Sección 1: Identificación ─────────────────────────────────── */
function SecIdentificacion({ form, set, isEdit }) {
  return <>
    <ST icon={FileText} title="Identificación del proyecto"
      subtitle="El número de proyecto se asigna automáticamente al guardar"/>
    {isEdit && (
      <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:'var(--radius-md)', background:'rgba(14,165,233,0.06)', border:'1px solid rgba(14,165,233,0.2)', fontSize:12, color:'var(--text-muted)' }}>
        ℹ️ El <strong>año</strong> del proyecto no es modificable — es la clave de identificación en la base de datos.
      </div>
    )}
    <G cols={2}>
      <F label="Año del proyecto" required hint={isEdit ? 'No modificable · clave de BD' : undefined}>
        <input className="input-field" type="number" value={form.project_year}
          onChange={isEdit ? undefined : e=>set('project_year',e.target.value)}
          readOnly={isEdit} min={2020} max={2100}
          style={{ background: isEdit ? 'var(--bg-hover)' : undefined, cursor: isEdit ? 'not-allowed' : undefined }}/>
      </F>
      <F label="N° externo (contrato)" hint={`Máx. ${LIMITS.external_project_number} caracteres`}>
        <TxtInp value={form.external_project_number} onChange={v=>set('external_project_number',v)}
          max={LIMITS.external_project_number} placeholder="Ej: CONV-001"/>
      </F>
    </G>
    <G cols={1}>
      <F label="Nombre completo del proyecto" required>
        <TxtInp value={form.project_name} onChange={v=>set('project_name',v)}
          max={LIMITS.project_name} placeholder="Nombre descriptivo del proyecto de extensión"/>
      </F>
      <F label="Objeto del proyecto" required hint="Propósito y alcance principal del proyecto">
        <TxtArea rows={5} value={form.project_purpose} onChange={v=>set('project_purpose',v)}
          max={LIMITS.project_purpose} placeholder="Descripción del objeto o propósito principal..."/>
      </F>
    </G>
  </>
}

/* ─── Sección 2: Clasificación ───────────────────────────────────── */
function SecClasificacion({ form, set, cats }) {
  return <>
    <ST icon={Settings} color="#8B5CF6" title="Clasificación"
      subtitle="Categorías y modalidades que clasifican el proyecto"/>
    <G cols={2}>
      <F label="Estado" required>
        <Sel value={form.project_status_id} onChange={v=>set('project_status_id',v)}>
          <option value="">— Seleccionar —</option>
          {cats.statuses.map(s=><option key={s.status_id} value={s.status_id}>{s.status_name}</option>)}
        </Sel>
      </F>
      <F label="Tipo de proyecto" required>
        <Sel value={form.project_type_id} onChange={v=>set('project_type_id',v)}>
          <option value="">— Seleccionar —</option>
          {cats.projTypes.map(t=><option key={t.project_type_id} value={t.project_type_id}>{t.type_name}</option>)}
        </Sel>
      </F>
      <F label="Tipo de financiación" required>
        <Sel value={form.financing_type_id} onChange={v=>set('financing_type_id',v)}>
          <option value="">— Seleccionar —</option>
          {cats.financing.map(f=><option key={f.financing_type_id} value={f.financing_type_id}>{f.financing_name}</option>)}
        </Sel>
      </F>
      <F label="Modalidad de ejecución" required>
        <Sel value={form.execution_modality_id} onChange={v=>set('execution_modality_id',v)}>
          <option value="">— Seleccionar —</option>
          {cats.modalities.map(m=><option key={m.execution_modality_id} value={m.execution_modality_id}>{m.modality_name}</option>)}
        </Sel>
      </F>
      <F label="Lugar de ejecución">
        <Sel value={form.execution_region||''} onChange={v=>set('execution_region',v)}>
          <option value="">— Seleccionar —</option>
          <option value="NACIONAL">Nacional</option>
          <option value="INTERNACIONAL">Internacional</option>
          <option value="AMAZONIA">Amazonía</option>
          <option value="ANDINA">Andina</option>
          <option value="CARIBE">Caribe</option>
          <option value="INSULAR">Insular</option>
          <option value="PACIFICA">Pacífica</option>
          <option value="ORINOQUIA">Orinoquía</option>
        </Sel>
      </F>
    </G>
  </>
}

/* ─── Sección 3: Financiero ──────────────────────────────────────── */
function SecFinanciero({ form, set, projectId, isEdit }) {
  const [totalAdditions, setTotalAdditions] = useState(0)
  const [suggested,      setSuggested]      = useState(null)

  useEffect(() => {
    if (!isEdit || !projectId) return
    projectsService.getAdditions(projectId)
      .then(r => setTotalAdditions(parseNum(r.data.total_additions)))
      .catch(() => {})
  }, [isEdit, projectId])

  const total  = parseNum(form.project_value)
  const univ   = parseNum(form.university_contribution)
  const ent    = parseNum(form.entity_contribution)
  const benVal = parseNum(form.institutional_benefit_value)
  const benPct = total > 0 && benVal > 0 ? ((benVal / total) * 100).toFixed(2) : '0.00'

  useEffect(() => {
    if (ent > 0) setSuggested(((ent + totalAdditions) * 0.12) / 1.12)
    else setSuggested(null)
  }, [ent, totalAdditions])

  return <>
    <ST icon={DollarSign} color="#10B981" title="Información financiera" subtitle="Valores en pesos colombianos (COP)"/>
    <G cols={2}>
      <F label="Valor total del proyecto (COP)" required>
        <MoneyInput value={form.project_value} onChange={v=>set('project_value',v)} placeholder="0"/>
      </F>
      <F label="Código contable">
        <TxtInp value={form.accounting_code} onChange={v=>set('accounting_code',v)} max={LIMITS.accounting_code} placeholder="Ej: 4-1-01-001"/>
      </F>
      <F label="Aporte Universidad (COP)">
        <MoneyInput value={form.university_contribution} onChange={v=>set('university_contribution',v)} placeholder="0"/>
      </F>
      <F label="Aporte Entidad (COP)" hint="Automático: Valor total − Aporte Universidad">
        <MoneyInput value={form.entity_contribution} onChange={()=>{}} readOnly/>
      </F>
    </G>

    <div style={{ background:'var(--bg-hover)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:'16px 18px', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
        <div style={{ flex:'1 1 220px', minWidth:0 }}>
          <label style={{ display:'block', fontSize:'var(--font-xs)', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
            Beneficio institucional (COP)
          </label>
          <MoneyInput value={form.institutional_benefit_value} onChange={v=>set('institutional_benefit_value',v)} placeholder="Ingrese el valor"/>
          {suggested !== null && Math.abs(suggested - benVal) > 1 && (
            <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                Sugerido: <strong style={{ color:'#10B981', fontFamily:'monospace' }}>${fmtNum(suggested.toFixed(0))}</strong>
              </span>
              <button onClick={()=>set('institutional_benefit_value', Math.round(suggested))} style={{ fontSize:11, fontWeight:700, color:'#0EA5E9', background:'rgba(14,165,233,0.08)', border:'1px solid rgba(14,165,233,0.25)', borderRadius:6, padding:'2px 8px', cursor:'pointer', fontFamily:'inherit' }}>
                Aplicar
              </button>
            </div>
          )}
        </div>
        <div style={{ flex:'0 0 120px', textAlign:'center' }}>
          <label style={{ display:'block', fontSize:'var(--font-xs)', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>% sobre total</label>
          <div style={{ padding:'10px 8px', borderRadius:'var(--radius-md)', background:'var(--bg-card)', border:'1px solid var(--border-color)', fontFamily:'monospace', fontSize:18, fontWeight:800, color:'#10B981', textAlign:'center' }}>
            {benPct}%
          </div>
        </div>
      </div>
      {isEdit && totalAdditions > 0 && (
        <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:10 }}>
          Adiciones activas: <strong style={{ color:'var(--text-secondary)', fontFamily:'monospace' }}>${fmtNum(totalAdditions)}</strong> · incluidas en el cálculo sugerido
        </p>
      )}
    </div>

    <G cols={1}>
      <F label="N° beneficiarios">
        <input className="input-field" type="number" value={form.beneficiaries_count??''} onChange={e=>set('beneficiaries_count',e.target.value)} min={0} placeholder="0" style={{ maxWidth:200 }}/>
      </F>
    </G>

    {/* Adiciones activas — solo si existen */}
    {isEdit && totalAdditions > 0 && (
      <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'var(--radius-lg)', padding:'14px 18px', marginTop:4, marginBottom:16 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'#065F46', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Adiciones al contrato</p>
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>Total adicionado</p>
            <p style={{ fontSize:16, fontWeight:800, color:'#10B981', fontFamily:'monospace' }}>${fmtNum(totalAdditions)}</p>
          </div>
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>Valor total vigente</p>
            <p style={{ fontSize:16, fontWeight:800, color:'#0F2952', fontFamily:'monospace' }}>${fmtNum(total + totalAdditions)}</p>
          </div>
        </div>
      </div>
    )}

    {total > 0 && (
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:20, marginTop:4 }}>
        <p style={{ fontSize:'var(--font-xs)', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>Resumen financiero</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            ['Valor total',        total,   '#0F2952'],
            ['Beneficio UD',       benVal,  '#0EA5E9'],
            ['Aporte Universidad', univ,    '#10B981'],
            ['Aporte Entidad',     ent,     '#F59E0B'],
          ].map(([label, num, color]) => (
            <div key={label} style={{ textAlign:'center', padding:'12px 8px', borderRadius:'var(--radius-md)', background:`${color}08`, border:`1px solid ${color}22` }}>
              <p style={{ fontSize:'var(--font-xs)', color:'var(--text-muted)', marginBottom:5 }}>{label}</p>
              <p style={{ fontSize:'var(--font-sm)', fontWeight:800, color, fontFamily:'monospace' }}>${fmtNum(num)}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </>
}

/* ─── Sección 4: Fechas ──────────────────────────────────────────── */
function SecFechas({ form, set, isEdit }) {
  const days = form.start_date && form.end_date && form.end_date > form.start_date
    ? Math.round((new Date(form.end_date) - new Date(form.start_date)) / 86400000) : null
  const startErr = !isEdit && form.subscription_date && form.start_date && form.start_date < form.subscription_date
  const endErr   = !isEdit && form.start_date && form.end_date && form.end_date <= form.start_date

  return <>
    <ST icon={Calendar} color="#F59E0B" title="Fechas y cronograma"
      subtitle={isEdit ? 'Las fechas contractuales originales no son modificables — registra una prórroga en Modificaciones' : 'La fecha de inicio no puede ser anterior a la suscripción'}/>
    {isEdit && (
      <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:'var(--radius-md)', background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.25)', fontSize:12, color:'var(--text-muted)' }}>
        🔒 <strong>Fecha de inicio</strong> y <strong>Fecha de fin</strong> son inmutables — fechas originales del contrato.
      </div>
    )}
    <p style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', marginBottom:12 }}>Cronograma de ejecución</p>
    <G cols={3}>
      <F label="Fecha de suscripción" hint="Fecha de firma del convenio">
        <input className="input-field" type="date" value={form.subscription_date||''} onChange={e=>set('subscription_date',e.target.value)}/>
      </F>
      <F label="Fecha de inicio" required hint={isEdit?'No modificable':undefined}>
        <div>
          <input className="input-field" type="date" value={form.start_date||''}
            onChange={isEdit?undefined:e=>set('start_date',e.target.value)} readOnly={isEdit}
            min={!isEdit?(form.subscription_date||''):undefined}
            style={{ borderColor:startErr?'#B91C3C':isEdit?'var(--border-color)':undefined, background:isEdit?'var(--bg-hover)':undefined, cursor:isEdit?'not-allowed':undefined, opacity:isEdit?0.75:1 }}/>
          {startErr&&<p style={{ fontSize:11, color:'#B91C3C', marginTop:4 }}>⚠ No puede ser anterior a la suscripción</p>}
        </div>
      </F>
      <F label="Fecha de fin original" required hint={isEdit?'No modificable':undefined}>
        <div>
          <input className="input-field" type="date" value={form.end_date||''}
            onChange={isEdit?undefined:e=>set('end_date',e.target.value)} readOnly={isEdit}
            min={!isEdit?(form.start_date||''):undefined}
            style={{ borderColor:endErr?'#B91C3C':isEdit?'var(--border-color)':undefined, background:isEdit?'var(--bg-hover)':undefined, cursor:isEdit?'not-allowed':undefined, opacity:isEdit?0.75:1 }}/>
          {endErr&&<p style={{ fontSize:11, color:'#B91C3C', marginTop:4 }}>⚠ Debe ser posterior al inicio</p>}
        </div>
      </F>
    </G>
    {days !== null && (
      <div style={{ display:'flex', gap:10, marginBottom:24 }}>
        {[
          [`${days} días`, 'Duración original', '#0EA5E9'],
          [`≈ ${Math.round(days/30)} meses`, 'Aproximados', '#10B981'],
          [`${(days/365).toFixed(1)} años`, 'En años', '#8B5CF6'],
        ].map(([val, label, color]) => (
          <div key={label} style={{ flex:1, textAlign:'center', padding:'14px 8px', borderRadius:10, background:`${color}08`, border:`1px solid ${color}22` }}>
            <p style={{ fontSize:20, fontWeight:800, color, fontFamily:'monospace', margin:0 }}>{val}</p>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{label}</p>
          </div>
        ))}
      </div>
    )}
    <div style={{ height:1, background:'var(--border-color)', margin:'4px 0 20px' }}/>
    <p style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', marginBottom:12 }}>Acta de aprobación del Comité</p>
    <G cols={3}>
      <F label="Tipo de sesión">
        <Sel value={form.session_type} onChange={v=>set('session_type',v)}>
          <option value="">— Seleccionar —</option>
          {SESSION_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </Sel>
      </F>
      <F label="Número del acta">
        <TxtInp value={form.minutes_number} onChange={v=>set('minutes_number',v)} max={LIMITS.minutes_number} placeholder="001-2025"/>
      </F>
      <F label="Fecha del acta">
        <input className="input-field" type="date" value={form.minutes_date||''} onChange={e=>set('minutes_date',e.target.value)}/>
      </F>
    </G>
  </>
}

/* ─── Sección 5: Actores ─────────────────────────────────────────── */
function SecActores({ form, set, cats, emails, emailForm, setEmailForm, emailErr, addEmail, removeEmail, savingEmail, isEdit }) {
  return <>
    <ST icon={Users} color="#B91C3C" title="Actores del proyecto" subtitle="Solo se listan registros activos en cada catálogo"/>
    <G cols={1}>
      <F label="Entidad contratante" required hint={`${cats.entities.length} entidades activas disponibles`}>
        <SearchableSelect value={form.entity_id} onChange={v=>set('entity_id',v)}
          placeholder="Buscar entidad por nombre o NIT..."
          options={cats.entities.map(e=>({ value:e.entity_id, label:e.entity_name, sub:`NIT: ${e.tax_id}` }))}/>
      </F>
      <F label="Dependencia ejecutora" required hint={`${cats.departments.length} dependencias activas disponibles`}>
        <SearchableSelect value={form.executing_department_id} onChange={v=>set('executing_department_id',v)}
          placeholder="Buscar dependencia..."
          options={cats.departments.map(d=>({ value:d.department_id, label:d.department_name }))}/>
      </F>
      <F label="Funcionario ordenador del gasto" required hint={`${cats.officials.length} funcionarios activos disponibles`}>
        <SearchableSelect value={form.ordering_official_id} onChange={v=>set('ordering_official_id',v)}
          placeholder="Buscar funcionario por nombre o identificación..."
          options={cats.officials.map(o=>({ value:o.official_id, label:o.full_name, sub:`${o.identification_type} ${o.identification_number}` }))}/>
      </F>
    </G>
    <G cols={1}>
      <F label="Supervisor del Contrato" required hint="¿Quién supervisa el contrato por parte de la Universidad?">
        <Sel value={form.supervisor_type||'JEFE_EXTENSION'} onChange={v=>set('supervisor_type',v)}>
          <option value="JEFE_EXTENSION">Jefe de la Oficina de Extensión</option>
          <option value="RECTOR">Rector</option>
        </Sel>
      </F>
    </G>

    <div style={{ marginTop:24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <Mail size={16} color="#0EA5E9"/>
        <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', margin:0 }}>Correos de contacto</p>
      </div>
      <div style={{ background:'var(--bg-hover)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:'14px 16px', marginBottom:12 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Correo principal del proyecto</p>
        <TxtInp type="email" value={form.main_email} onChange={v=>set('main_email',v)} max={LIMITS.main_email} placeholder="correo@udistrital.edu.co"/>
      </div>
      {emails.length > 0 && (
        <div style={{ marginBottom:12 }}>
          {emails.map(em => (
            <div key={em.secondary_email_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', marginBottom:6 }}>
              <Mail size={14} color="var(--text-muted)" style={{ flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', margin:0 }}>{em.email}</p>
                <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>
                  {[em.contact_name, em.contact_type, em.contact_position, em.contact_phone].filter(Boolean).join(' · ') || 'Sin información adicional'}
                </p>
              </div>
              {em.local && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'rgba(245,158,11,0.1)', color:'#B45309', fontWeight:700 }}>Pendiente</span>}
              <button onClick={()=>removeEmail(em)} style={{ border:'none', background:'transparent', cursor:'pointer', padding:4, color:'var(--text-muted)', borderRadius:6, display:'flex', alignItems:'center' }}>
                <Trash2 size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ background:'var(--bg-card)', border:'1.5px dashed var(--border-color)', borderRadius:'var(--radius-lg)', padding:'16px' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>+ Agregar correo secundario</p>
        <G cols={2}>
          <F label="Correo electrónico" required>
            <TxtInp type="email" value={emailForm.email} onChange={v=>setEmailForm(f=>({...f,email:v}))} max={200} placeholder="contacto@entidad.gov.co"/>
          </F>
          <F label="Tipo de contacto" hint="Ej: Principal, Técnico, Financiero">
            <TxtInp value={emailForm.contact_type} onChange={v=>setEmailForm(f=>({...f,contact_type:v}))} max={50} placeholder="Técnico"/>
          </F>
          <F label="Nombre del contacto">
            <TxtInp value={emailForm.contact_name} onChange={v=>setEmailForm(f=>({...f,contact_name:v}))} max={100} placeholder="Nombre completo"/>
          </F>
          <F label="Cargo / Posición">
            <TxtInp value={emailForm.contact_position} onChange={v=>setEmailForm(f=>({...f,contact_position:v}))} max={100} placeholder="Director de Proyecto"/>
          </F>
          <F label="Teléfono de contacto">
            <TxtInp value={emailForm.contact_phone} onChange={v=>setEmailForm(f=>({...f,contact_phone:v}))} max={20} placeholder="3001234567"/>
          </F>
        </G>
        {emailErr && <p style={{ fontSize:12, color:'#B91C3C', marginTop:6, marginBottom:8 }}>{emailErr}</p>}
        <button onClick={addEmail} disabled={!emailForm.email||savingEmail} className="btn-secondary" style={{ marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
          <Plus size={14}/>
          {savingEmail ? 'Guardando...' : 'Agregar correo'}
        </button>
        {!isEdit && emails.length > 0 && (
          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>ℹ️ Los correos se guardarán junto con el proyecto</p>
        )}
      </div>
    </div>
  </>
}

/* ─── Sección 6: Códigos RUP ─────────────────────────────────────── */
function SecRup({ rupCodes, onChange, form, set }) {
  return <>
    <ST icon={Tag} color="#0EA5E9" title="Códigos RUP / UNSPSC"
      subtitle="Clasificador de Bienes y Servicios. Navegue en cascada o use la búsqueda rápida"/>
    {rupCodes.length === 0 && (
      <div style={{ padding:'12px 16px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, marginBottom:20, fontSize:13, color:'#B45309' }}>
        ⚠️ No hay códigos RUP asignados aún. Agregue al menos uno usando el selector.
      </div>
    )}
    <RupSelector selectedCodes={rupCodes} onChange={onChange}/>
    <div style={{ height:1, background:'var(--border-color)', margin:'24px 0 20px' }}/>
    <F label="Observaciones generales de códigos RUP" hint={`Máx. ${LIMITS.rup_codes_general_observations} caracteres`}>
      <TxtArea rows={4} value={form.rup_codes_general_observations} onChange={v=>set('rup_codes_general_observations',v)}
        max={LIMITS.rup_codes_general_observations} placeholder="Observaciones sobre los códigos RUP asignados al proyecto..."/>
    </F>
  </>
}

/* ─── Sección 7: Adicional ───────────────────────────────────────── */
function SecAdicional({ form, set }) {
  return <>
    <ST icon={Link2} color="#64748B" title="Información adicional"
      subtitle="Datos complementarios, enlaces y observaciones generales"/>
    <G cols={1}>
      <F label="Acto administrativo">
        <TxtInp value={form.administrative_act} onChange={v=>set('administrative_act',v)} max={LIMITS.administrative_act} placeholder="Resolución 001 de 2025"/>
      </F>
      <F label="Enlace SECOP" span={2}>
        <TxtInp value={form.secop_link} onChange={v=>set('secop_link',v)} max={LIMITS.secop_link} placeholder="https://www.secop.gov.co/..."/>
      </F>
    </G>
    <G cols={1}>
      <F label="Observaciones generales">
        <TxtArea rows={4} value={form.observations} onChange={v=>set('observations',v)} max={LIMITS.observations} placeholder="Observaciones, notas o comentarios relevantes del proyecto..."/>
      </F>
    </G>
  </>
}
