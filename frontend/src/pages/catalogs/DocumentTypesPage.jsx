// frontend/src/pages/catalogs/DocumentTypesPage.jsx
import { useState } from 'react'
import { FileType } from 'lucide-react'
import toast from 'react-hot-toast'
import CatalogPage from '../../components/ui/CatalogPage'
import StatusBadge from '../../components/ui/StatusBadge'
import CrudModal, { FormGrid, Field, FormActions } from '../../components/ui/CrudModal'
import { RowActions } from '../../components/ui/RowActions'
import { documentTypesService as svc } from '../../services/catalogs'

/* ── Colores de preview por tipo (decorativo) ────────────────────── */
const TYPE_COLORS = {
  ACTA_INI:'#10B981',ACTA_LIQ:'#8B5CF6',ACTA_REI:'#06B6D4',ACTA_SUS:'#EF4444',
  ACTA_COM:'#64748B',ADICION:'#0EA5E9', ANEXO:'#F59E0B', ANEXO_TEC:'#F59E0B',
  CDP:'#10B981',CERT_CUM:'#0EA5E9',CESION:'#8B5CF6',CIERRE_F:'#64748B',
  CORR_ENV:'#64748B',CORR_REC:'#64748B',CREAC_FIN:'#10B981',DOC_PRIV:'#94A3B8',
  DOC_PUB:'#94A3B8',ESTADO_CT:'#0EA5E9',EST_TEC:'#F59E0B',EST_PREV:'#F59E0B',
  FACTURAS:'#10B981',INCORPORAC:'#0EA5E9',INF_SEG:'#8B5CF6',INF_EJEC:'#8B5CF6',
  INTERVENT:'#EF4444',INVITACION:'#F59E0B',MINUTA:'#0F2952',MODIF:'#0EA5E9',
  ORD_PAGO:'#10B981',ORD_GASTO:'#10B981',OTRAS_ACT:'#64748B',POLIZAS:'#F59E0B',
  PRESUP:'#10B981',PROPUESTA:'#F59E0B',PRORROGA:'#0EA5E9',RESOLUCION:'#EF4444',
  RP:'#10B981',OTRO:'#94A3B8',SEGUI:'#8B5CF6',SU_PROY:'#0EA5E9',TER:'#64748B',
}
const getColor = (code) => TYPE_COLORS[code] || '#94A3B8'

function Modal({ modal, closeModal, afterSave }) {
  const isEdit = modal.mode === 'edit'
  const rec    = modal.record || {}
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type_code:        rec.type_code        || '',
    type_name:        rec.type_name        || '',
    type_description: rec.type_description || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    if (!form.type_code.trim()) return toast.error('El código es obligatorio')
    if (form.type_code.length > 10) return toast.error('El código no puede superar 10 caracteres')
    if (!form.type_name.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)
    try {
      const payload = { ...form, type_code: form.type_code.toUpperCase().trim() }
      isEdit
        ? await svc.update(rec.document_type_id, payload)
        : await svc.create(payload)
      toast.success(isEdit ? 'Tipo actualizado ✓' : 'Tipo creado ✓')
      afterSave()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') toast.error(detail)
      else toast.error('Error al guardar. Verifique que el código y nombre no estén duplicados.')
    }
    finally { setSaving(false) }
  }

  const previewColor = getColor(form.type_code.toUpperCase())

  return (
    <CrudModal
      isOpen
      title={isEdit ? 'Editar tipo de documento' : 'Nuevo tipo de documento'}
      onClose={closeModal}
      size="md"
    >
      <form onSubmit={submit}>
        <FormGrid cols={2}>
          <Field label="Código (máx. 10 caracteres)" required hint="Ej: ACTA_INI, PRESUP, CDP">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Preview del color */}
              <div style={{
                width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                background: previewColor, opacity: 0.85,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
                  {form.type_code.substring(0, 3) || '?'}
                </span>
              </div>
              <input
                className="input-field"
                value={form.type_code}
                onChange={e => set('type_code', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="Ej: ACTA_INI"
                maxLength={10}
                autoFocus={!isEdit}
                readOnly={isEdit}
                style={isEdit ? { background: 'var(--bg-hover)', cursor: 'not-allowed', fontFamily: 'monospace', fontWeight: 700 } : { fontFamily: 'monospace', fontWeight: 700 }}
              />
            </div>
            {isEdit && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>⚠️ El código no es modificable — es la clave de identificación.</p>}
          </Field>

          <Field label="Nombre del tipo" required>
            <input
              className="input-field"
              value={form.type_name}
              onChange={e => set('type_name', e.target.value.toUpperCase())}
              placeholder="Ej: ACTA INICIO"
              autoFocus={isEdit}
            />
          </Field>
        </FormGrid>

        <FormGrid cols={1}>
          <Field label="Descripción">
            <textarea
              className="input-field"
              rows={3}
              value={form.type_description}
              onChange={e => set('type_description', e.target.value)}
              placeholder="Descripción opcional del tipo de documento..."
              style={{ resize: 'vertical' }}
            />
          </Field>
        </FormGrid>

        <FormActions onCancel={closeModal} saving={saving} isEdit={isEdit} />
      </form>
    </CrudModal>
  )
}

const mkCols = ({ openEdit, reload }) => [
  {
    key: 'document_type_id', label: '#', width: '55px', sortKey: 'document_type_id',
    render: r => <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{r.document_type_id}</span>,
  },
  {
    key: 'type_code', label: 'Código', width: '130px', sortKey: 'type_code',
    render: r => (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderRadius: 20,
        background: `${getColor(r.type_code)}18`, color: getColor(r.type_code),
        fontSize: 11, fontWeight: 800, fontFamily: 'monospace',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: getColor(r.type_code), flexShrink: 0 }} />
        {r.type_code}
      </span>
    ),
  },
  {
    key: 'type_name', label: 'Nombre', sortKey: 'type_name',
    render: r => <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{r.type_name}</span>,
  },
  {
    key: 'type_description', label: 'Descripción', sortable: false,
    render: r => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.type_description || '—'}</span>,
  },
  {
    key: 'is_active', label: 'Estado', width: '100px', sortKey: 'is_active',
    render: r => <StatusBadge active={r.is_active} />,
  },
  {
    key: '_a', label: '', width: '90px', sortable: false,
    render: r => <RowActions r={r} idField="document_type_id" onEdit={() => openEdit(r)} service={svc} reload={reload} />,
  },
]

export default function DocumentTypesPage() {
  return (
    <CatalogPage
      title="Tipos de Documento"
      icon={FileType}
      iconBg="rgba(14,165,233,.08)"
      iconColor="#0EA5E9"
      service={svc}
      columns={mkCols}
      searchKeys={['type_code', 'type_name']}
      emptyMessage="No hay tipos de documento"
      renderModal={p => <Modal {...p} />}
    />
  )
}
