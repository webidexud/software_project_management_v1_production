import { useState, useEffect } from 'react'
import { Globe, Mail, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import CatalogPage from '../../components/ui/CatalogPage'
import StatusBadge from '../../components/ui/StatusBadge'
import CrudModal, { FormGrid, Field, FormActions } from '../../components/ui/CrudModal'
import { RowActions } from '../../components/ui/RowActions'
import { entitiesService as svc, entityTypesService } from '../../services/catalogs'

function Modal({ modal, closeModal, afterSave }) {
  const isEdit = modal.mode === 'edit'
  const rec    = modal.record || {}
  const [types, setTypes] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    entity_name:          rec.entity_name        || '',
    tax_id:               rec.tax_id             || '',
    entity_type_id:       rec.entity_type_id     || '',
    main_address:         rec.main_address        || '',
    main_phone:           rec.main_phone          || '',
    institutional_email:  rec.institutional_email || '',
    website:              rec.website             || '',
    main_contact:         rec.main_contact        || '',
    contact_position:     rec.contact_position    || '',
    contact_phone:        rec.contact_phone       || '',
    contact_email:        rec.contact_email       || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    entityTypesService.list(true).then(r => setTypes(r.data))
  }, [])

  const submit = async e => {
    e.preventDefault()
    if (!form.entity_name.trim()) return toast.error('El nombre es obligatorio')
    if (!form.tax_id.trim())      return toast.error('El NIT es obligatorio')
    if (!form.entity_type_id)     return toast.error('Seleccione un tipo de entidad')
    setSaving(true)
    try {
      const payload = { ...form, entity_type_id: Number(form.entity_type_id) }
      isEdit ? await svc.update(rec.entity_id, payload) : await svc.create(payload)
      toast.success(isEdit ? 'Entidad actualizada ✓' : 'Entidad creada ✓')
      afterSave()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <CrudModal isOpen title={isEdit ? 'Editar entidad' : 'Nueva entidad'} onClose={closeModal} size="lg">
      <form onSubmit={submit}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Información principal</p>
        <FormGrid cols={2}>
          <Field label="Nombre de la entidad" required span={2}>
            <input className="input-field" value={form.entity_name} onChange={e => set('entity_name', e.target.value)} placeholder="Ej: MINISTERIO DE EDUCACIÓN" autoFocus/>
          </Field>
          <Field label="NIT / Tax ID" required>
            <input className="input-field" value={form.tax_id} onChange={e => set('tax_id', e.target.value)} placeholder="Ej: 899999001-7"/>
          </Field>
          <Field label="Tipo de entidad" required>
            <select className="input-field" value={form.entity_type_id} onChange={e => set('entity_type_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {types.map(t => <option key={t.entity_type_id} value={t.entity_type_id}>{t.type_name}</option>)}
            </select>
          </Field>
          <Field label="Dirección" span={2}>
            <input className="input-field" value={form.main_address} onChange={e => set('main_address', e.target.value)} placeholder="Dirección principal"/>
          </Field>
          <Field label="Teléfono">
            <input className="input-field" value={form.main_phone} onChange={e => set('main_phone', e.target.value)} placeholder="PBX / teléfono"/>
          </Field>
          <Field label="Email institucional">
            <input className="input-field" type="email" value={form.institutional_email} onChange={e => set('institutional_email', e.target.value)} placeholder="info@entidad.gov.co"/>
          </Field>
          <Field label="Sitio web" span={2}>
            <input className="input-field" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://"/>
          </Field>
        </FormGrid>

        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', margin:'18px 0 10px' }}>Contacto principal</p>
        <FormGrid cols={2}>
          <Field label="Nombre del contacto">
            <input className="input-field" value={form.main_contact} onChange={e => set('main_contact', e.target.value)} placeholder="Nombre completo"/>
          </Field>
          <Field label="Cargo">
            <input className="input-field" value={form.contact_position} onChange={e => set('contact_position', e.target.value)} placeholder="Ej: Jefe de contratación"/>
          </Field>
          <Field label="Teléfono contacto">
            <input className="input-field" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="Celular / extensión"/>
          </Field>
          <Field label="Email contacto">
            <input className="input-field" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="contacto@entidad.gov.co"/>
          </Field>
        </FormGrid>
        <FormActions onCancel={closeModal} saving={saving} isEdit={isEdit}/>
      </form>
    </CrudModal>
  )
}

const mkCols = ({ openEdit, reload }) => [
  { key:'entity_id', label:'#', width:'55px', sortKey:'entity_id',
    render: r => <span style={{ fontFamily:'monospace', color:'var(--text-muted)', fontSize:12 }}>{r.entity_id}</span> },
  { key:'entity_name', label:'Entidad', sortKey:'entity_name',
    render: r => (
      <div>
        <p style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{r.entity_name}</p>
        <p style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace', marginTop:2 }}>NIT: {r.tax_id}</p>
      </div>
    )},
  { key:'entity_type_name', label:'Tipo', width:'120px', sortKey:'entity_type_name',
    render: r => <span style={{ fontSize:12, color:'var(--text-secondary)', background:'var(--bg-hover)', padding:'3px 8px', borderRadius:5 }}>{r.entity_type_name || '—'}</span> },
  { key:'contact', label:'Contacto', width:'190px', sortable:false,
    render: r => (
      <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', flexDirection:'column', gap:2 }}>
        {r.main_contact && <span style={{ fontWeight:500, color:'var(--text-secondary)' }}>{r.main_contact}</span>}
        {r.institutional_email && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Mail size={10}/>{r.institutional_email}</span>}
        {r.main_phone && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Phone size={10}/>{r.main_phone}</span>}
        {!r.main_contact && !r.institutional_email && !r.main_phone && '—'}
      </div>
    )},
  { key:'is_active', label:'Estado', width:'100px', sortKey:'is_active',
    render: r => <StatusBadge active={r.is_active}/> },
  { key:'_a', label:'', width:'90px', sortable:false,
    render: r => <RowActions r={r} idField="entity_id" onEdit={() => openEdit(r)} service={svc} reload={reload}/> },
]

export default function EntitiesPage() {
  return <CatalogPage title="Entidades" icon={Globe} iconBg="rgba(14,165,233,.08)" iconColor="#0EA5E9"
    service={svc} columns={mkCols} searchKeys={['entity_name','tax_id']} emptyMessage="No hay entidades"
    renderModal={p => <Modal {...p}/>}/>
}
