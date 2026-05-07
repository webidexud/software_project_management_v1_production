import { useState } from 'react'
import { Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import CatalogPage from '../../components/ui/CatalogPage'
import StatusBadge from '../../components/ui/StatusBadge'
import CrudModal, { FormGrid, Field, FormActions } from '../../components/ui/CrudModal'
import { RowActions } from '../../components/ui/RowActions'
import { entityTypesService as svc } from '../../services/catalogs'

function Modal({ modal, closeModal, afterSave }) {
  const isEdit = modal.mode === 'edit'
  const rec    = modal.record || {}
  const [form, setForm]   = useState({ type_name: rec.type_name || '' })
  const [saving, setSaving] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!form.type_name.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)
    try {
      isEdit ? await svc.update(rec.entity_type_id, form) : await svc.create(form)
      toast.success(isEdit ? 'Tipo actualizado ✓' : 'Tipo creado ✓')
      afterSave()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <CrudModal isOpen title={isEdit ? 'Editar tipo de entidad' : 'Nuevo tipo de entidad'} onClose={closeModal} size="sm">
      <form onSubmit={submit}>
        <FormGrid cols={1}>
          <Field label="Nombre del tipo" required>
            <input className="input-field" value={form.type_name}
              onChange={e => setForm(f => ({ ...f, type_name: e.target.value }))}
              placeholder="Ej: NACIONAL, PRIVADO..." autoFocus/>
          </Field>
        </FormGrid>
        <FormActions onCancel={closeModal} saving={saving} isEdit={isEdit}/>
      </form>
    </CrudModal>
  )
}

const mkCols = ({ openEdit, reload }) => [
  { key:'entity_type_id', label:'#', width:'60px', sortKey:'entity_type_id',
    render: r => <span style={{ fontFamily:'monospace', color:'var(--text-muted)', fontSize:12 }}>{r.entity_type_id}</span> },
  { key:'type_name', label:'Nombre', sortKey:'type_name',
    render: r => <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{r.type_name}</span> },
  { key:'is_active', label:'Estado', width:'110px', sortKey:'is_active',
    render: r => <StatusBadge active={r.is_active}/> },
  { key:'created_at', label:'Creado', width:'120px', sortKey:'created_at',
    render: r => <span style={{ fontSize:12, color:'var(--text-muted)' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : '—'}</span> },
  { key:'_a', label:'', width:'90px', sortable:false,
    render: r => <RowActions r={r} idField="entity_type_id" onEdit={() => openEdit(r)} service={svc} reload={reload}/> },
]

export default function EntityTypesPage() {
  return <CatalogPage title="Tipos de Entidad" icon={Building2} iconBg="rgba(185,28,60,.08)" iconColor="#B91C3C"
    service={svc} columns={mkCols} searchKeys={['type_name']} emptyMessage="No hay tipos de entidad"
    renderModal={p => <Modal {...p}/>}/>
}
