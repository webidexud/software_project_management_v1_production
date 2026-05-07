import { useState } from 'react'
import { Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import CatalogPage from '../../components/ui/CatalogPage'
import StatusBadge from '../../components/ui/StatusBadge'
import CrudModal, { FormGrid, Field, FormActions } from '../../components/ui/CrudModal'
import { RowActions } from '../../components/ui/RowActions'
import { projectStatusesService as svc } from '../../services/catalogs'

const PRESET = ['#0EA5E9','#10B981','#F59E0B','#B91C3C','#8B5CF6','#0F2952','#EC4899','#14B8A6','#64748B','#EF4444']

// Asegura que el color sea siempre #RRGGBB de 6 dígitos
const safeColor = (c) => {
  if (!c) return '#0EA5E9'
  const hex = c.replace('#','')
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) return `#${hex}`
  return '#0EA5E9'
}

function Modal({ modal, closeModal, afterSave }) {
  const isEdit = modal.mode === 'edit'
  const rec    = modal.record || {}
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    status_code:        rec.status_code        || '',
    status_name:        rec.status_name        || '',
    status_color:       safeColor(rec.status_color),
    status_order:       rec.status_order       ?? '',
    status_description: rec.status_description || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    if (!form.status_code.trim()) return toast.error('El código es obligatorio')
    if (form.status_code.length > 10) return toast.error('El código no puede superar 10 caracteres')
    if (!form.status_name.trim()) return toast.error('El nombre es obligatorio')
    if (!/^#[0-9A-Fa-f]{6}$/.test(form.status_color)) return toast.error('Color inválido')
    setSaving(true)
    try {
      const payload = {
        ...form,
        status_color: safeColor(form.status_color),
        status_order: form.status_order !== '' ? Number(form.status_order) : null,
      }
      isEdit ? await svc.update(rec.status_id, payload) : await svc.create(payload)
      toast.success(isEdit ? 'Estado actualizado ✓' : 'Estado creado ✓')
      afterSave()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') toast.error(detail)
      else toast.error('Error al guardar. Verifique que el código y nombre no estén duplicados.')
    }
    finally { setSaving(false) }
  }

  return (
    <CrudModal isOpen title={isEdit ? 'Editar estado' : 'Nuevo estado de proyecto'} onClose={closeModal} size="md">
      <form onSubmit={submit}>
        <FormGrid cols={2}>
          <Field label="Código (máx. 10 caracteres)" required>
            <div>
              <input className="input-field" value={form.status_code} maxLength={10}
                onChange={e => set('status_code', e.target.value.toUpperCase())}
                placeholder="Ej: EJECUCION" autoFocus/>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:2 }}>
                <span style={{ fontSize:11, color: form.status_code.length >= 10 ? '#B91C3C' : 'var(--text-muted)' }}>
                  {form.status_code.length}/10
                </span>
              </div>
            </div>
          </Field>
          <Field label="Orden de visualización">
            <input className="input-field" type="number" min={1} value={form.status_order}
              onChange={e => set('status_order', e.target.value)} placeholder="1, 2, 3..."/>
          </Field>
          <Field label="Nombre del estado" required span={2}>
            <input className="input-field" value={form.status_name}
              onChange={e => set('status_name', e.target.value)} placeholder="Ej: En ejecución"/>
          </Field>
          <Field label="Descripción" span={2}>
            <textarea className="input-field" rows={2} value={form.status_description}
              onChange={e => set('status_description', e.target.value)}
              placeholder="Descripción opcional del estado" style={{ resize:'vertical' }}/>
          </Field>
          <Field label="Color del estado" span={2}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <input type="color" value={safeColor(form.status_color)}
                onChange={e => set('status_color', safeColor(e.target.value))}
                style={{ width:40, height:36, border:'1px solid var(--border-color)', borderRadius:6, cursor:'pointer', padding:2 }}/>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', flex:1 }}>
                {PRESET.map(c => (
                  <button key={c} type="button" onClick={() => set('status_color', c)}
                    style={{ width:24, height:24, borderRadius:6, background:c, cursor:'pointer',
                      border: form.status_color===c ? '3px solid var(--text-primary)' : '2px solid transparent',
                      transition:'all .15s' }}/>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20,
                border:`1px solid ${form.status_color}44`, background:`${form.status_color}15` }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:form.status_color }}/>
                <span style={{ fontSize:12, color:form.status_color, fontWeight:600 }}>
                  {form.status_name || 'Vista previa'}
                </span>
              </div>
            </div>
          </Field>
        </FormGrid>
        <FormActions onCancel={closeModal} saving={saving} isEdit={isEdit}/>
      </form>
    </CrudModal>
  )
}

const mkCols = ({ openEdit, reload }) => [
  { key:'status_id', label:'#', width:'50px', sortKey:'status_id',
    render: r => <span style={{ fontFamily:'monospace', color:'var(--text-muted)', fontSize:12 }}>{r.status_id}</span> },
  { key:'status_code', label:'Código', width:'120px', sortKey:'status_code',
    render: r => <code style={{ fontSize:12, color:'var(--text-secondary)', background:'var(--bg-hover)', padding:'2px 6px', borderRadius:4 }}>{r.status_code}</code> },
  { key:'status_name', label:'Nombre', sortKey:'status_name',
    render: r => (
      <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
        <span style={{ width:10, height:10, borderRadius:'50%', background:r.status_color||'#94A3B8', flexShrink:0 }}/>
        <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{r.status_name}</span>
      </span>
    )},
  { key:'status_order', label:'Orden', width:'70px', sortKey:'status_order',
    render: r => <span style={{ fontSize:12, color:'var(--text-muted)' }}>{r.status_order ?? '—'}</span> },
  { key:'is_active', label:'Estado', width:'100px', sortKey:'is_active',
    render: r => <StatusBadge active={r.is_active}/> },
  { key:'_a', label:'', width:'90px', sortable:false,
    render: r => <RowActions r={r} idField="status_id" onEdit={() => openEdit(r)} service={svc} reload={reload}/> },
]

export default function ProjectStatusesPage() {
  return <CatalogPage title="Estados de Proyecto" icon={Activity} iconBg="rgba(185,28,60,.08)" iconColor="#B91C3C"
    service={svc} columns={mkCols} searchKeys={['status_name','status_code']} emptyMessage="No hay estados"
    renderModal={p => <Modal {...p}/>}/>
}
