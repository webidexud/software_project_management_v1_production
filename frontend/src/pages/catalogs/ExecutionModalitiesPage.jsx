import { useState } from 'react'
import { Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import CatalogPage from '../../components/ui/CatalogPage'
import StatusBadge from '../../components/ui/StatusBadge'
import CrudModal, { FormGrid, Field, FormActions } from '../../components/ui/CrudModal'
import { RowActions } from '../../components/ui/RowActions'
import { executionModalitiesService as svc } from '../../services/catalogs'

function Modal({ modal, closeModal, afterSave }) {
  const isEdit = modal.mode === 'edit'
  const rec    = modal.record || {}
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    modality_name:        rec.modality_name        || '',
    modality_description: rec.modality_description || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    if (!form.modality_name.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)
    try {
      isEdit ? await svc.update(rec.execution_modality_id, form) : await svc.create(form)
      toast.success(isEdit ? 'Modalidad actualizada ✓' : 'Modalidad creada ✓')
      afterSave()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <CrudModal isOpen title={isEdit ? 'Editar modalidad' : 'Nueva modalidad de ejecución'} onClose={closeModal} size="md">
      <form onSubmit={submit}>
        <FormGrid cols={1}>
          <Field label="Nombre de la modalidad" required>
            <input className="input-field" value={form.modality_name} onChange={e => set('modality_name', e.target.value)}
              placeholder="Ej: CONTRATO DE PRESTACIÓN DE SERVICIOS" autoFocus/>
          </Field>
          <Field label="Descripción">
            <textarea className="input-field" rows={3} value={form.modality_description}
              onChange={e => set('modality_description', e.target.value)}
              placeholder="Descripción opcional de la modalidad" style={{ resize:'vertical' }}/>
          </Field>
        </FormGrid>
        <FormActions onCancel={closeModal} saving={saving} isEdit={isEdit}/>
      </form>
    </CrudModal>
  )
}

const mkCols = ({ openEdit, reload }) => [
  { key:'execution_modality_id', label:'#', width:'55px', sortKey:'execution_modality_id',
    render: r => <span style={{ fontFamily:'monospace', color:'var(--text-muted)', fontSize:12 }}>{r.execution_modality_id}</span> },
  { key:'modality_name', label:'Modalidad', sortKey:'modality_name',
    render: r => <span style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{r.modality_name}</span> },
  { key:'modality_description', label:'Descripción', sortable:false,
    render: r => <span style={{ fontSize:12, color:'var(--text-muted)' }}>{r.modality_description || '—'}</span> },
  { key:'is_active', label:'Estado', width:'100px', sortKey:'is_active',
    render: r => <StatusBadge active={r.is_active}/> },
  { key:'_a', label:'', width:'90px', sortable:false,
    render: r => <RowActions r={r} idField="execution_modality_id" onEdit={() => openEdit(r)} service={svc} reload={reload}/> },
]

export default function ExecutionModalitiesPage() {
  return <CatalogPage title="Modalidades de Ejecución" icon={Layers} iconBg="rgba(139,92,246,.08)" iconColor="#8B5CF6"
    service={svc} columns={mkCols} searchKeys={['modality_name']} emptyMessage="No hay modalidades"
    renderModal={p => <Modal {...p}/>}/>
}
