# ModificationFormModal.jsx — 2 cambios PUNTUALES

## CAMBIO 1: Quitar campo "N° de Modificación — Automático" de SecGenerales

Buscar EXACTAMENTE esta línea:
```jsx
<F label="N° de Modificación" hint="Automático"><Inp value="Automático" disabled/></F>
```

Reemplazar por: (NADA — eliminar la línea completamente)

El grid G cols={3} quedará con solo 2 campos (Acto Administrativo y Fecha de Aprobación):
```jsx
<G cols={2}>
  <F label="Acto Administrativo" hint="Máx. 50 car.">
    <Inp value={form.administrative_act} onChange={v=>set('administrative_act',v)} placeholder="Ej: OTRO-SÍ No. 1" disabled={noAct}/>
  </F>
  <F label="Fecha de Aprobación" required>
    <Inp type="date" value={form.approval_date} onChange={v=>set('approval_date',v)}/>
  </F>
</G>
```

---

## CAMBIO 2: En modo BOTH (Adición + Prórroga) — quitar checkboxes duplicados de SecAdicion

El problema: cuando modType==='BOTH', se renderiza:
  <SecAdicion/> → tiene sus propios checkboxes de pago/póliza
  <SecProrrhoga/> → también tiene sus propios checkboxes de pago/póliza

Solución: crear SecAdicionSinChecks (sin los checkboxes) para usar solo en modo BOTH

Buscar la función SecAdicion y AGREGAR justo después una versión sin checkboxes:

```jsx
/* Versión de SecAdicion para modo BOTH: sin los checkboxes (los gestiona SecProrrhoga) */
function SecAdicionSoloValor({ form, set }) {
  return <>
    <ST text="Adición Presupuestal" color="#10B981"/>
    <G cols={2}>
      <F label="Valor de la Adición" required><PesosInput value={form.addition_value} onChange={v=>set('addition_value',v)}/></F>
      <MoneyRO label="Nuevo valor total" value={form.new_total_value}/>
    </G>
  </>
}
```

Luego cambiar la línea del render de BOTH:
```jsx
// ANTES:
{modType==='BOTH' && <><SecAdicion form={form} set={set}/><SecProrrhoga form={form} set={set} project={project}/></>}

// DESPUÉS:
{modType==='BOTH' && <><SecAdicionSoloValor form={form} set={set}/><SecProrrhoga form={form} set={set} project={project}/></>}
```

Esto garantiza que los checkboxes de "¿Requiere modificación de la forma de pago?" y 
"¿Requiere actualización de póliza?" aparezcan UNA SOLA VEZ (en SecProrrhoga).
