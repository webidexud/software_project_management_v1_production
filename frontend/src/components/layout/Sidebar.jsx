// frontend/src/components/layout/Sidebar.jsx — Responsive v3
// Lee el usuario desde localStorage directamente (no depende de AuthProvider)
import { useNavigate, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Globe, Building2, University, Layers, DollarSign,
  UserCheck, Activity, FolderOpen, FileType, BarChart3, Sun, Moon, X,
  LogOut, ShieldCheck, Eye, Settings2,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

/* ─── Navegación ─────────────────────────────────────────────────── */
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

/* ─── Roles ──────────────────────────────────────────────────────── */
const ROLE_META = {
  admin:      { label: 'Administrador', color: '#B91C3C', Icon: ShieldCheck },
  gestor_pmo: { label: 'Gestor PMO',    color: '#0EA5E9', Icon: Settings2   },
  consulta:   { label: 'Solo lectura',  color: '#94a3b8', Icon: Eye         },
}

/* ─── Iniciales ──────────────────────────────────────────────────── */
function getInitials(name, username) {
  const src   = (name || username || '?').trim()
  const words = src.split(/\s+/)
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : src.substring(0, 2).toUpperCase()
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENTE
═══════════════════════════════════════════════════════════════════ */
export default function Sidebar({ isOpen, isMobile, onClose }) {
  const { toggle, isDark } = useTheme()
  const navigate = useNavigate()

  /* Lee usuario desde localStorage — no necesita AuthProvider */
  let user = null
  try {
    const stored = localStorage.getItem('siexud_user')
    user = stored ? JSON.parse(stored) : null
  } catch { /* ignorar */ }

  const handleNavClick = () => { if (isMobile) onClose?.() }

  const handleLogout = () => {
    localStorage.removeItem('siexud_token')
    localStorage.removeItem('siexud_user')
    navigate('/login', { replace: true })
    if (isMobile) onClose?.()
  }

  const role     = user?.role
  const meta     = ROLE_META[role] || { label: role || '—', color: '#94a3b8', Icon: Eye }
  const initials = getInitials(user?.full_name, user?.username)

  return (
    <aside
      role="navigation"
      aria-label="Menú principal"
      aria-hidden={isMobile && !isOpen}
      style={{
        width: 220, minWidth: 220,
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: '#0F2952',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        boxShadow: isMobile
          ? '4px 0 32px rgba(0,0,0,0.5)'
          : '4px 0 20px rgba(15,41,82,0.2)',
        flexShrink: 0,
        overflowY: 'auto', overflowX: 'hidden',
        ...(isMobile ? {
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 999,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        } : {
          position: 'sticky', top: 0,
        }),
      }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '18px 16px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg,#B91C3C,#E11D48)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(185,28,60,0.4)',
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 12, letterSpacing: '-0.5px' }}>UD</span>
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 13, lineHeight: 1.2, margin: 0 }}>SIEXUD</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, lineHeight: 1.3, fontWeight: 500, margin: 0 }}>
              Sistema de Extensión
            </p>
          </div>
        </div>

        {/* Botón cerrar — solo mobile */}
        {isMobile && (
          <button onClick={onClose} aria-label="Cerrar menú" style={{
            width: 30, height: 30, borderRadius: 7,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.07)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.6)', flexShrink: 0,
          }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Navegación ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {navItems.map(section => (
          <div key={section.section} style={{ marginBottom: 20 }}>
            <p style={{
              fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '0 10px', margin: '0 0 4px',
            }}>
              {section.section}
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {section.items.map(item => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={handleNavClick}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 7, marginBottom: 2,
                      fontSize: 12.5, fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      textDecoration: 'none', transition: 'all 0.15s',
                    })}>
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

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>

        {/* Tarjeta de usuario */}
        {user && (
          <div style={{
            padding: '12px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Avatar con iniciales */}
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: `linear-gradient(135deg,${meta.color}cc,${meta.color}66)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 2px 8px ${meta.color}40`,
              }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 12 }}>
                  {initials}
                </span>
              </div>
              {/* Nombre y rol */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  color: 'white', fontWeight: 600, fontSize: 12, margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user.full_name || user.username}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <meta.Icon size={10} color={meta.color} />
                  <span style={{ fontSize: 10, color: meta.color, fontWeight: 600 }}>
                    {meta.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toggle tema */}
        <button onClick={toggle} style={{
          display: 'flex', alignItems: 'center', gap: 9, width: '100%',
          padding: '10px 14px', border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'transparent', cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)', fontSize: 12.5,
          fontWeight: 500, fontFamily: 'inherit', transition: 'background .15s',
        }}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
          <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 9, width: '100%',
            padding: '10px 14px', border: 'none', background: 'transparent',
            cursor: 'pointer', color: 'rgba(239,68,68,0.7)',
            fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
            transition: 'all .15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
            e.currentTarget.style.color = '#EF4444'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(239,68,68,0.7)'
          }}>
          <LogOut size={15} />
          <span>Cerrar sesión</span>
        </button>

      </div>
    </aside>
  )
}