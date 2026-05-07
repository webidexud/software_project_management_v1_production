import { useState } from 'react'
import { Pencil, PowerOff, Power } from 'lucide-react'
import toast from 'react-hot-toast'

export function ActionBtn({ title, onClick, color, children, disabled }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled} style={{
      width:28, height:28, borderRadius:6, border:'1px solid', cursor: disabled ? 'wait' : 'pointer',
      borderColor:`${color}33`, background:`${color}11`, color,
      display:'flex', alignItems:'center', justifyContent:'center',
      transition:'all .15s', fontFamily:'inherit', opacity: disabled ? 0.6 : 1,
    }}>{children}</button>
  )
}

export function RowActions({ r, idField, onEdit, service, reload }) {
  const [busy, setBusy] = useState(false)
  const handleToggle = async () => {
    setBusy(true)
    try {
      await service.toggle(r[idField])
      toast.success(r.is_active ? 'Registro deshabilitado' : 'Registro habilitado')
      reload()
    } catch { toast.error('Error al cambiar estado') }
    finally { setBusy(false) }
  }
  return (
    <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
      <ActionBtn title="Editar" onClick={onEdit} color="#0EA5E9"><Pencil size={13}/></ActionBtn>
      <ActionBtn title={r.is_active ? 'Deshabilitar' : 'Habilitar'} disabled={busy}
        color={r.is_active ? '#B91C3C' : '#10B981'} onClick={handleToggle}>
        {r.is_active ? <PowerOff size={13}/> : <Power size={13}/>}
      </ActionBtn>
    </div>
  )
}
