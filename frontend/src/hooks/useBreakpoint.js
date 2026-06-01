// frontend/src/hooks/useBreakpoint.js
// Hook central de breakpoints — úsalo en cualquier componente
// para obtener el tamaño de pantalla en tiempo real.
//
// Uso:
//   const { isMobile, isTablet, isDesktop, width } = useBreakpoint()
//
// Breakpoints:
//   mobile  < 768px
//   tablet  768px – 1023px
//   desktop ≥ 1024px

import { useState, useEffect } from 'react'

const BP = { md: 768, lg: 1024, xl: 1280 }

export default function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )

  useEffect(() => {
    let timer
    const handle = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setWidth(window.innerWidth), 80)
    }
    window.addEventListener('resize', handle)
    return () => { window.removeEventListener('resize', handle); clearTimeout(timer) }
  }, [])

  return {
    width,
    isMobile:  width < BP.md,
    isTablet:  width >= BP.md && width < BP.lg,
    isDesktop: width >= BP.lg,
    isWide:    width >= BP.xl,
    // helpers de columnas para grids
    cols: (desktop, tablet, mobile) =>
      width >= BP.lg ? desktop : width >= BP.md ? tablet : mobile,
  }
}