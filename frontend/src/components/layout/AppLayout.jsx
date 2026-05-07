import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Sun, Moon, ZoomIn, ZoomOut, RotateCcw, Accessibility } from 'lucide-react'

const SCALES  = [0.85, 1, 1.1, 1.2, 1.35]
const LABELS  = ['Pequeño', 'Normal', 'Mediano', 'Grande', 'Muy grande']

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('siexud-theme') || 'light')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('siexud-theme', theme)
  }, [theme])
  const toggle = useCallback(() => setTheme(t => t === 'light' ? 'dark' : 'light'), [])
  return [theme, toggle]
}

function useScale() {
  const [idx, setIdx] = useState(() => {
    const saved = localStorage.getItem('siexud-font-scale')
    return saved ? parseInt(saved) : 1
  })
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(SCALES[idx]))
    localStorage.setItem('siexud-font-scale', String(idx))
  }, [idx])
  const inc = useCallback(() => setIdx(i => Math.min(i + 1, SCALES.length - 1)), [])
  const dec = useCallback(() => setIdx(i => Math.max(i - 1, 0)), [])
  const reset = useCallback(() => setIdx(1), [])
  return [idx, inc, dec, reset]
}

export default function AppLayout() {
  const [theme, toggleTheme] = useTheme()
  const [scaleIdx, incScale, decScale, resetScale] = useScale()
  const [a11yOpen, setA11yOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Skip link para lectores de pantalla */}
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>

      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '100vh' }}>

        {/* ── Topbar institucional ── */}
        <header role="banner" style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 28px',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: '0 1px 0 var(--border-color)',
        }}>
          {/* Marca */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 'var(--font-xs)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--crimson)' }}>
                SIEXUD
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em', lineHeight: 1 }}>
                Sistema de Extensión · UD
              </span>
            </div>
          </div>

          {/* Controles de accesibilidad */}
          <nav role="toolbar" aria-label="Controles de accesibilidad" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

            {/* Panel de tamaño de fuente */}
            <div style={{ position: 'relative' }}>
              <button
                aria-label="Configurar tamaño de texto"
                aria-expanded={a11yOpen}
                onClick={() => setA11yOpen(o => !o)}
                title="Tamaño de texto"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${a11yOpen ? 'var(--sky)' : 'var(--border-color)'}`,
                  background: a11yOpen ? 'rgba(14,165,233,0.08)' : 'var(--bg-hover)',
                  color: a11yOpen ? 'var(--sky)' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 'var(--font-xs)', fontWeight: 700,
                  fontFamily: 'inherit', transition: 'all .15s',
                }}
              >
                <Accessibility size={14}/>
                <span>A{LABELS[scaleIdx] !== 'Normal' ? ` · ${LABELS[scaleIdx]}` : ''}</span>
              </button>

              {a11yOpen && (
                <div role="dialog" aria-label="Tamaño de texto" style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)', padding: 14, boxShadow: 'var(--shadow-lg)',
                  minWidth: 230,
                }}>
                  <p style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                    Tamaño del texto
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={decScale} disabled={scaleIdx === 0} aria-label="Reducir texto"
                      style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', background: 'var(--bg-hover)', cursor: scaleIdx===0?'not-allowed':'pointer', opacity: scaleIdx===0?.4:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)', fontFamily:'inherit' }}>
                      <ZoomOut size={16}/> <span style={{ fontSize: 12, marginLeft: 4 }}>A-</span>
                    </button>
                    <button onClick={resetScale} aria-label="Restablecer tamaño"
                      style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', background: 'var(--bg-hover)', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', fontFamily:'inherit' }}>
                      <RotateCcw size={14}/>
                    </button>
                    <button onClick={incScale} disabled={scaleIdx === SCALES.length - 1} aria-label="Aumentar texto"
                      style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', background: 'var(--bg-hover)', cursor: scaleIdx===SCALES.length-1?'not-allowed':'pointer', opacity: scaleIdx===SCALES.length-1?.4:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)', fontFamily:'inherit' }}>
                      <ZoomIn size={16}/> <span style={{ fontSize: 14, fontWeight:700, marginLeft: 4 }}>A+</span>
                    </button>
                  </div>
                  {/* Escala visual */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                    {SCALES.map((_, i) => (
                      <button key={i} onClick={() => { const d=i-scaleIdx; if(d>0)for(let j=0;j<d;j++)incScale(); else for(let j=0;j>d;j--)decScale(); }}
                        aria-label={LABELS[i]} aria-pressed={i===scaleIdx}
                        style={{ flex: 1, height: 6, borderRadius: 99, border: 'none', cursor: 'pointer', transition: 'background .15s',
                          background: i===scaleIdx ? 'var(--sky)' : 'var(--border-color)' }}/>
                    ))}
                  </div>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                    {LABELS[scaleIdx]}
                  </p>
                </div>
              )}
            </div>

            {/* Toggle tema */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
              title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
              style={{
                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-color)',
                background: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}
            >
              {theme === 'light' ? <Moon size={15}/> : <Sun size={15}/>}
            </button>
          </nav>
        </header>

        {/* ── Contenido principal ── */}
        <main id="main-content" role="main" tabIndex={-1} style={{
          flex: 1, overflowY: 'auto', background: 'var(--bg-primary)',
          outline: 'none',  /* tabIndex=-1 no debe mostrar outline */
        }}>
          <div style={{ padding: '28px 32px', maxWidth: 1380, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
