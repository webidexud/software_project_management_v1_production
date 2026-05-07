import { useState } from 'react'
import { University, Mail, Phone, Globe2 } from 'lucide-react'
import toast from 'react-hot-toast'
import CatalogPage from '../../components/ui/CatalogPage'
import StatusBadge from '../../components/ui/StatusBadge'
import CrudModal, { FormGrid, Field, FormActions } from '../../components/ui/CrudModal'
import { RowActions } from '../../components/ui/RowActions'
import { executingDepartmentsService as svc } from '../../services/catalogs'

function Modal({ modal, closeModal, afterSave }) {
  const isEdit = modal.mode === 'edit'
  const rec    = modal.record || {}
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    department_name: rec.department_name || '',
    address:         rec.address         || '',
    phone:           rec.phone           || '',
    email:           rec.email           || '',
    website:         rec.website         || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    if (!form.department_name.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)
    try {
      isEdit ? await svc.update(rec.department_id, form) : await svc.create(form)
      toast.success(isEdit ? 'Dependencia actualizada ✓' : 'Dependencia creada ✓')
      afterSave()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <CrudModal isOpen title={isEdit ? 'Editar dependencia' : 'Nueva dependencia ejecutora'} onClose={closeModal} size="md">
      <form onSubmit={submit}>
        <FormGrid cols={1}>
          <Field label="Nombre de la dependencia" required>
            <input className="input-field" value={form.department_name} onChange={e => set('department_name', e.target.value)}
              placeholder="Nombre completo de la dependencia" autoFocus/>
          </Field>
        </FormGrid>
        <FormGrid cols={2}>
          <Field label="Dirección" span={2}>
            <input className="input-field" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Dirección física"/>
          </Field>
          <Field label="Teléfono">
            <input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Teléfono / extensión"/>
          </Field>
          <Field label="Email">
            <input className="input-field" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@udistrital.edu.co"/>
          </Field>
          <Field label="Sitio web" span={2}>
            <input className="input-field" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://"/>
          </Field>
        </FormGrid>
        <FormActions onCancel={closeModal} saving={saving} isEdit={isEdit}/>
      </form>
    </CrudModal>
  )
}

const mkCols = ({ openEdit, reload }) => [
  { key:'department_id', label:'#', width:'55px', sortKey:'department_id',
    render: r => <span style={{ fontFamily:'monospace', color:'var(--text-muted)', fontSize:12 }}>{r.department_id}</span> },
  { key:'department_name', label:'Dependencia', sortKey:'department_name',
    render: r => <span style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{r.department_name}</span> },
  { key:'contact', label:'Contacto', width:'220px', sortable:false,
    render: r => (
      <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', flexDirection:'column', gap:2 }}>
        {r.email   && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Mail size={10}/>{r.email}</span>}
        {r.phone   && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Phone size={10}/>{r.phone}</span>}
        {r.address && <span>{r.address}</span>}
        {!r.email && !r.phone && !r.address && '—'}
      </div>
    )},
  { key:'website', label:'Web', width:'90px', sortable:false,
    render: r => r.website
      ? <a href={r.website} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#0EA5E9', display:'flex', alignItems:'center', gap:4 }}><Globe2 size={12}/>Ver</a>
      : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span> },
  { key:'is_active', label:'Estado', width:'100px', sortKey:'is_active',
    render: r => <StatusBadge active={r.is_active}/> },
  { key:'_a', label:'', width:'90px', sortable:false,
    render: r => <RowActions r={r} idField="department_id" onEdit={() => openEdit(r)} service={svc} reload={reload}/> },
]

export default function ExecutingDepartmentsPage() {
  return <CatalogPage title="Dependencias Ejecutoras" icon={University} iconBg="rgba(30,58,110,.08)" iconColor="#1E3A6E"
    service={svc} columns={mkCols} searchKeys={['department_name','email']} emptyMessage="No hay dependencias"
    renderModal={p => <Modal {...p}/>}/>
}
