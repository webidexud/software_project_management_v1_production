import { useState } from 'react'
import { DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import CatalogPage from '../../components/ui/CatalogPage'
import StatusBadge from '../../components/ui/StatusBadge'
import CrudModal, { FormGrid, Field, FormActions } from '../../components/ui/CrudModal'
import { RowActions } from '../../components/ui/RowActions'
import { financingTypesService as svc } from '../../services/catalogs'

function Modal({ modal, closeModal, afterSave }) {
  const isEdit = modal.mode === 'edit'
  const rec    = modal.record || {}
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ financing_name: rec.financing_name || '' })

  const submit = async e => {
    e.preventDefault()
    if (!form.financing_name.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)
    try {
      isEdit ? await svc.update(rec.financing_type_id, form) : await svc.create(form)
      toast.success(isEdit ? 'Financiación actualizada ✓' : 'Financiación creada ✓')
      afterSave()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <CrudModal isOpen title={isEdit ? 'Editar tipo de financiación' : 'Nuevo tipo de financiación'} onClose={closeModal} size="sm">
      <form onSubmit={submit}>
        <FormGrid cols={1}>
          <Field label="Nombre del tipo" required>
            <input className="input-field" value={form.financing_name}
              onChange={e => setForm(f => ({ ...f, financing_name: e.target.value }))}
              placeholder="Ej: FINANCIADO. Universidad = 0%" autoFocus/>
          </Field>
        </FormGrid>
        <FormActions onCancel={closeModal} saving={saving} isEdit={isEdit}/>
      </form>
    </CrudModal>
  )
}

const mkCols = ({ openEdit, reload }) => [
  { key:'financing_type_id', label:'#', width:'55px', sortKey:'financing_type_id',
    render: r => <span style={{ fontFamily:'monospace', color:'var(--text-muted)', fontSize:12 }}>{r.financing_type_id}</span> },
  { key:'financing_name', label:'Tipo de Financiación', sortKey:'financing_name',
    render: r => <span style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{r.financing_name}</span> },
  { key:'is_active', label:'Estado', width:'100px', sortKey:'is_active',
    render: r => <StatusBadge active={r.is_active}/> },
  { key:'_a', label:'', width:'90px', sortable:false,
    render: r => <RowActions r={r} idField="financing_type_id" onEdit={() => openEdit(r)} service={svc} reload={reload}/> },
]

export default function FinancingTypesPage() {
  return <CatalogPage title="Tipos de Financiación" icon={DollarSign} iconBg="rgba(16,185,129,.08)" iconColor="#10B981"
    service={svc} columns={mkCols} searchKeys={['financing_name']} emptyMessage="No hay tipos de financiación"
    renderModal={p => <Modal {...p}/>}/>
}
