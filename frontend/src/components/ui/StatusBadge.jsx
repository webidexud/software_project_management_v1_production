export default function StatusBadge({ active }) {
  return active
    ? <span className="badge-active"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803D', display: 'inline-block' }} />Activo</span>
    : <span className="badge-inactive"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748B', display: 'inline-block' }} />Inactivo</span>
}
