import { useEffect, useState } from 'react'
import { Globe, Building2, University, Layers, DollarSign, UserCheck, Activity, FileType, ArrowUpRight } from 'lucide-react'
import { entitiesService, entityTypesService, executingDepartmentsService, executionModalitiesService, financingTypesService, orderingOfficialsService, projectStatusesService, documentTypesService } from '../services/catalogs'

const cards = [
  { label: 'Entidades',           icon: Globe,      key: 'entities',     bg: 'rgba(14,165,233,0.08)',  color: '#0EA5E9', accent: 'stat-card-accent-sky',     path: '/catalogs/entities' },
  { label: 'Tipos de Entidad',    icon: Building2,  key: 'entityTypes',  bg: 'rgba(185,28,60,0.08)',  color: '#B91C3C', accent: 'stat-card-accent-crimson', path: '/catalogs/entity-types' },
  { label: 'Dependencias',        icon: University, key: 'departments',  bg: 'rgba(30,58,110,0.08)',  color: '#1E3A6E', accent: 'stat-card-accent-navy',    path: '/catalogs/departments' },
  { label: 'Modalidades',         icon: Layers,     key: 'modalities',   bg: 'rgba(139,92,246,0.08)', color: '#8B5CF6', accent: 'stat-card-accent-emerald', path: '/catalogs/modalities' },
  { label: 'Financiaciones',      icon: DollarSign, key: 'financing',    bg: 'rgba(16,185,129,0.08)', color: '#10B981', accent: 'stat-card-accent-emerald', path: '/catalogs/financing' },
  { label: 'Funcionarios',        icon: UserCheck,  key: 'officials',    bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', accent: 'stat-card-accent-sky',     path: '/catalogs/officials' },
  { label: 'Estados',             icon: Activity,   key: 'statuses',     bg: 'rgba(239,68,68,0.08)',  color: '#EF4444', accent: 'stat-card-accent-crimson', path: '/catalogs/statuses' },
  { label: 'Tipos de Documento',  icon: FileType,   key: 'docTypes',     bg: 'rgba(14,165,233,0.08)', color: '#0EA5E9', accent: 'stat-card-accent-sky',     path: '/catalogs/document-types' },
]

export default function DashboardPage() {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      entitiesService.list(), entityTypesService.list(), executingDepartmentsService.list(),
      executionModalitiesService.list(), financingTypesService.list(),
      orderingOfficialsService.list(), projectStatusesService.list(),
      documentTypesService.list(),
    ]).then(([en, et, dep, mod, fin, off, ps, dt]) => {
      setCounts({
        entities:    en.data.length,
        entityTypes: et.data.length,
        departments: dep.data.length,
        modalities:  mod.data.length,
        financing:   fin.data.length,
        officials:   off.data.length,
        statuses:    ps.data.length,
        docTypes:    dt.data.length,
      })
    }).finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{greeting} 👋</p>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>Panel de Control</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Sistema de Extensión · Universidad Distrital Francisco José de Caldas</p>
        </div>
        <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', fontSize: 12, color: '#0EA5E9', fontWeight: 600 }}>
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Fila 1 — 4 tarjetas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {cards.slice(0, 4).map((card, i) => (
          <a key={card.key} href={card.path} className={`card ${card.accent} animate-fade-in`}
            style={{ padding: 20, textDecoration: 'none', animationDelay: `${i * 60}ms`, display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={19} color={card.color} />
              </div>
              <ArrowUpRight size={15} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{loading ? '—' : counts[card.key] ?? 0}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, fontWeight: 500 }}>{card.label}</p>
          </a>
        ))}
      </div>

      {/* Fila 2 — 4 tarjetas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {cards.slice(4).map((card, i) => (
          <a key={card.key} href={card.path} className={`card ${card.accent} animate-fade-in`}
            style={{ padding: 20, textDecoration: 'none', animationDelay: `${(i + 4) * 60}ms`, display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={19} color={card.color} />
              </div>
              <ArrowUpRight size={15} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{loading ? '—' : counts[card.key] ?? 0}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, fontWeight: 500 }}>{card.label}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
