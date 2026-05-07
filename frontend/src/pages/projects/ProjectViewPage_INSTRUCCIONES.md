# ProjectViewPage.jsx — 3 cambios puntuales

## CAMBIO 1: Enlace SECOP clickeable
Buscar el componente Field y añadir variante para URLs, O buscar donde se renderiza secop_link:

Buscar:
```jsx
<Field label="Enlace SECOP" value={p.secop_link} />
```
Reemplazar por:
```jsx
{p.secop_link ? (
  <div>
    <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Enlace SECOP</p>
    <a href={p.secop_link} target="_blank" rel="noopener noreferrer"
      style={{ fontSize:13, color:'#0EA5E9', fontWeight:500, wordBreak:'break-all', textDecoration:'underline' }}>
      {p.secop_link}
    </a>
  </div>
) : null}
```

## CAMBIO 2: Trazabilidad — fecha fin vigente ACUMULATIVA
La función PlazosTrazabilidad calcula:
```js
const fechaFinVigente = hasProrrogas ? prorrogas[prorrogas.length - 1].new_end_date : p.end_date
```
Esto ya toma la ÚLTIMA prórroga. El problema es cómo se muestran los nodos.
Cada nodo en la línea de tiempo muestra el campo `m.new_end_date`, que es la nueva fecha para esa prórroga.
Eso es correcto.

El problema real puede ser que `diasVigentes` y `diasProrrogados` se calculen mal:

Buscar:
```js
const diasProrrogados = prorrogas.reduce((acc, m) => acc + (m.extension_days || 0), 0)
```
Verificar que `extension_days` sea la suma acumulada correcta.

REEMPLAZAR el bloque de cálculo por:
```js
// ✅ CORREGIDO: fechaFinVigente = new_end_date de la ÚLTIMA prórroga activa
const fechaFinVigente = hasProrrogas
  ? prorrogas[prorrogas.length - 1].new_end_date
  : p.end_date

const diasOriginales  = diffDays(p.start_date, p.end_date)
const diasVigentes    = diffDays(p.start_date, fechaFinVigente)
// Días prorrogados = diferencia entre fecha fin vigente y fecha fin original
const diasProrrogados = hasProrrogas
  ? Math.round((new Date(fechaFinVigente) - new Date(p.end_date)) / 86400000)
  : 0
```

## CAMBIO 3: Adiciones en sección financiera
Buscar la sección Financiero (Section con DollarSign) y agregar después del bloque existente:

```jsx
{/* Adiciones activas */}
{adicionesActivas > 0 && (
  <div style={{ marginTop:12, padding:'12px 16px', borderRadius:10, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.25)' }}>
    <p style={{ fontSize:11, fontWeight:700, color:'#065F46', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Adiciones al contrato</p>
    <Grid cols={2}>
      <Field label="Total adicionado" value={fmtMoney(adicionesActivas)} mono />
      <Field label="Valor total vigente" value={fmtMoney(parseFloat(p.project_value||0) + adicionesActivas)} mono />
    </Grid>
  </div>
)}
```

Para calcular `adicionesActivas` agregar en el componente principal (ProjectViewPage):
```js
const adicionesActivas = mods
  .filter(m => ['ADDITION','BOTH'].includes(m.modification_type) && m.is_active)
  .reduce((s, m) => s + (parseFloat(m.addition_value) || 0), 0)
```
Y pasarlo como prop a donde lo necesites, o calcularlo dentro de la sección.
