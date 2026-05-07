import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Globe, Building2, University, Layers, DollarSign, UserCheck, Activity, FolderOpen, FileType, BarChart3, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const navItems = [
  {
    section: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/projects',  icon: FolderOpen,      label: 'Proyectos' },
      { to: '/reportes',  icon: BarChart3,        label: 'Reportes' },
    ],
  },
  {
    section: 'Catálogos',
    items: [
      { to: '/catalogs/entities',       icon: Globe,      label: 'Entidades' },
      { to: '/catalogs/entity-types',   icon: Building2,  label: 'Tipos de Entidad' },
      { to: '/catalogs/departments',    icon: University, label: 'Dependencias' },
      { to: '/catalogs/modalities',     icon: Layers,     label: 'Modalidades' },
      { to: '/catalogs/financing',      icon: DollarSign, label: 'Financiaciones' },
      { to: '/catalogs/officials',      icon: UserCheck,  label: 'Funcionarios' },
      { to: '/catalogs/statuses',       icon: Activity,   label: 'Estados' },
      { to: '/catalogs/document-types', icon: FileType,   label: 'Tipos de Documento' },
    ],
  },
]

export default function Sidebar() {
  const { toggle, isDark } = useTheme()

  return (
    <aside className="sidebar">
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #B91C3C, #E11D48)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(185,28,60,0.4)', flexShrink: 0 }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 13, letterSpacing: '-0.5px' }}>UD</span>
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>SIEXUD</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, lineHeight: 1.3, fontWeight: 500 }}>Sistema de Extensión</p>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {navItems.map((section) => (
          <div key={section.section} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 10px', marginBottom: 4 }}>
              {section.section}
            </p>
            <ul style={{ listStyle: 'none' }}>
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 7,
                      fontSize: 12.5, fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      textDecoration: 'none', transition: 'all 0.15s',
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={15} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit' }}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
          <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
      </div>
    </aside>
  )
}
