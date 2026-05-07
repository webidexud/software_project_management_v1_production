# Cambios en ProjectModificationsPage.jsx

## 1. Título: #undefined → usar external_project_number o project_id

Buscar esta línea (aprox línea con "internal_project_number"):
```
Modificaciones · {project ? `${project.project_year} #${project.internal_project_number}` : '…'}
```
Reemplazar por:
```
Modificaciones · {project ? `${project.project_year}${project.external_project_number ? ` · ${project.external_project_number}` : ` #${project.project_id}`}` : '…'}
```

## 2. Fecha fin actual en topbar → usar la última new_end_date activa de prórrogas

Buscar el bloque donde se calcula la "Fecha fin actual" en el topbar (busca "end_date" en el topbar).

La lógica actual usa project.end_date directamente.

AÑADIR esta función helper antes del return del componente:
```js
// Fecha fin vigente: última new_end_date de prórrogas activas, o end_date original
const fechaFinVigente = (() => {
  const prorrogas = mods
    .filter(m => ['EXTENSION','BOTH'].includes(m.modification_type) && m.is_active && m.new_end_date)
    .sort((a, b) => a.modification_number - b.modification_number)
  return prorrogas.length > 0 ? prorrogas[prorrogas.length - 1].new_end_date : project?.end_date
})()
```

Y en el topbar donde muestra la fecha, reemplazar `project?.end_date` por `fechaFinVigente`.

## 3. Valor total vigente en topbar → sumar adiciones activas

Agregar junto a totalAdiciones:
```js
const valorVigente = project 
  ? parseFloat(project.project_value || 0) + totalAdiciones 
  : 0
```

Y mostrar `valorVigente` en vez de solo el valor base.
