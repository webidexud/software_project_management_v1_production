import { useState } from 'react'
import { UserCheck, Mail, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import CatalogPage from '../../components/ui/CatalogPage'
import StatusBadge from '../../components/ui/StatusBadge'
import CrudModal, { FormGrid, Field, FormActions } from '../../components/ui/CrudModal'
import { RowActions } from '../../components/ui/RowActions'
import { orderingOfficialsService as svc } from '../../services/catalogs'

const ID_TYPES = ['CC','CE','PA','NIT','TI','RC']

function Modal({ modal, closeModal, afterSave }) {
  const isEdit = modal.mode === 'edit'
  const rec    = modal.record || {}
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name:             rec.first_name             || '',
    second_name:            rec.second_name            || '',
    first_surname:          rec.first_surname          || '',
    second_surname:         rec.second_surname         || '',
    identification_type:    rec.identification_type    || 'CC',
    identification_number:  rec.identification_number  || '',
    appointment_resolution: rec.appointment_resolution || '',
    resolution_date:        rec.resolution_date        || '',
    institutional_email:    rec.institutional_email    || '',
    phone:                  rec.phone                  || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    if (!form.first_name.trim())            return toast.error('El primer nombre es obligatorio')
    if (!form.first_surname.trim())         return toast.error('El primer apellido es obligatorio')
    if (!form.identification_number.trim()) return toast.error('El número de identificación es obligatorio')
    setSaving(true)
    try {
      const payload = { ...form, resolution_date: form.resolution_date || null }
      isEdit ? await svc.update(rec.official_id, payload) : await svc.create(payload)
      toast.success(isEdit ? 'Funcionario actualizado ✓' : 'Funcionario creado ✓')
      afterSave()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <CrudModal isOpen title={isEdit ? 'Editar funcionario' : 'Nuevo funcionario ordenador'} onClose={closeModal} size="lg">
      <form onSubmit={submit}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Nombre</p>
        <FormGrid cols={2}>
          <Field label="Primer nombre" required>
            <input className="input-field" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Primer nombre" autoFocus/>
          </Field>
          <Field label="Segundo nombre">
            <input className="input-field" value={form.second_name} onChange={e => set('second_name', e.target.value)} placeholder="Segundo nombre"/>
          </Field>
          <Field label="Primer apellido" required>
            <input className="input-field" value={form.first_surname} onChange={e => set('first_surname', e.target.value)} placeholder="Primer apellido"/>
          </Field>
          <Field label="Segundo apellido">
            <input className="input-field" value={form.second_surname} onChange={e => set('second_surname', e.target.value)} placeholder="Segundo apellido"/>
          </Field>
        </FormGrid>

        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', margin:'18px 0 10px' }}>Identificación</p>
        <FormGrid cols={2}>
          <Field label="Tipo de ID" required>
            <select className="input-field" value={form.identification_type} onChange={e => set('identification_type', e.target.value)}>
              {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Número de identificación" required>
            <input className="input-field" value={form.identification_number} onChange={e => set('identification_number', e.target.value)} placeholder="Número"/>
          </Field>
          <Field label="Resolución de nombramiento">
            <input className="input-field" value={form.appointment_resolution} onChange={e => set('appointment_resolution', e.target.value)} placeholder="Ej: Res. 001 de 2024"/>
          </Field>
          <Field label="Fecha de resolución">
            <input className="input-field" type="date" value={form.resolution_date} onChange={e => set('resolution_date', e.target.value)}/>
          </Field>
        </FormGrid>

        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', margin:'18px 0 10px' }}>Contacto</p>
        <FormGrid cols={2}>
          <Field label="Email institucional">
            <input className="input-field" type="email" value={form.institutional_email} onChange={e => set('institutional_email', e.target.value)} placeholder="correo@udistrital.edu.co"/>
          </Field>
          <Field label="Teléfono">
            <input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Celular / extensión"/>
          </Field>
        </FormGrid>
        <FormActions onCancel={closeModal} saving={saving} isEdit={isEdit}/>
      </form>
    </CrudModal>
  )
}

const mkCols = ({ openEdit, reload }) => [
  { key:'official_id', label:'#', width:'55px', sortKey:'official_id',
    render: r => <span style={{ fontFamily:'monospace', color:'var(--text-muted)', fontSize:12 }}>{r.official_id}</span> },
  { key:'full_name', label:'Funcionario', sortKey:'full_name',
    render: r => (
      <div>
        <p style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{r.full_name}</p>
        <p style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace', marginTop:2 }}>{r.identification_type} {r.identification_number}</p>
      </div>
    )},
  { key:'contact', label:'Contacto', width:'220px', sortable:false,
    render: r => (
      <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', flexDirection:'column', gap:2 }}>
        {r.institutional_email && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Mail size={10}/>{r.institutional_email}</span>}
        {r.phone               && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Phone size={10}/>{r.phone}</span>}
        {!r.institutional_email && !r.phone && '—'}
      </div>
    )},
  { key:'appointment_resolution', label:'Resolución', width:'140px', sortKey:'appointment_resolution',
    render: r => <span style={{ fontSize:12, color:'var(--text-muted)' }}>{r.appointment_resolution || '—'}</span> },
  { key:'is_active', label:'Estado', width:'100px', sortKey:'is_active',
    render: r => <StatusBadge active={r.is_active}/> },
  { key:'_a', label:'', width:'90px', sortable:false,
    render: r => <RowActions r={r} idField="official_id" onEdit={() => openEdit(r)} service={svc} reload={reload}/> },
]

export default function OrderingOfficialsPage() {
  return <CatalogPage title="Funcionarios Ordenadores" icon={UserCheck} iconBg="rgba(245,158,11,.08)" iconColor="#F59E0B"
    service={svc} columns={mkCols} searchKeys={['full_name','identification_number']} emptyMessage="No hay funcionarios"
    renderModal={p => <Modal {...p}/>}/>
}
