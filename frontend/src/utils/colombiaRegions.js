// frontend/src/utils/colombiaRegions.js
// Mapeo de departamentos (DANE) a las 6 regiones naturales de Colombia.
// Usado para colorear el mapa coroplético del dashboard por región de ejecución.

export const DEPT_REGION = {
  '05': 'ANDINA',     // Antioquia
  '08': 'CARIBE',     // Atlántico
  '11': 'ANDINA',     // Bogotá D.C.
  '13': 'CARIBE',     // Bolívar
  '15': 'ANDINA',     // Boyacá
  '17': 'ANDINA',     // Caldas
  '18': 'AMAZONIA',   // Caquetá
  '19': 'PACIFICA',   // Cauca
  '20': 'CARIBE',     // Cesar
  '23': 'CARIBE',     // Córdoba
  '25': 'ANDINA',     // Cundinamarca
  '27': 'PACIFICA',   // Chocó
  '41': 'ANDINA',     // Huila
  '44': 'CARIBE',     // La Guajira
  '47': 'CARIBE',     // Magdalena
  '50': 'ORINOQUIA',  // Meta
  '52': 'PACIFICA',   // Nariño
  '54': 'ANDINA',     // Norte de Santander
  '63': 'ANDINA',     // Quindío
  '66': 'ANDINA',     // Risaralda
  '68': 'ANDINA',     // Santander
  '70': 'CARIBE',     // Sucre
  '73': 'ANDINA',     // Tolima
  '76': 'PACIFICA',   // Valle del Cauca
  '81': 'ORINOQUIA',  // Arauca
  '85': 'ORINOQUIA',  // Casanare
  '86': 'AMAZONIA',   // Putumayo
  '88': 'INSULAR',    // San Andrés, Providencia y Sta. Catalina
  '91': 'AMAZONIA',   // Amazonas
  '94': 'AMAZONIA',   // Guainía
  '95': 'AMAZONIA',   // Guaviare
  '97': 'AMAZONIA',   // Vaupés
  '99': 'ORINOQUIA',  // Vichada
}

export const regionOfDept = code => DEPT_REGION[code] || null
