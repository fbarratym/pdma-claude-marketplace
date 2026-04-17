---
name: new-sprint-pdma
description: Inicializa un nuevo sprint PDMA de forma autónoma. Úsalo cuando el usuario diga "crear nuevo sprint", "inicializar sprint", "preparar siguiente sprint", "arrancar el sprint X" o similar. El usuario debe indicar el proyecto (nombre en config.local.json) y el nombre exacto de la iteración destino (ya debe existir en ADO). El script valida, comprueba tareas pendientes, procesa Proposed y Active, y genera un resumen.
version: 1.0.0
plugin: az-devops-onpremise
tools:
  - Bash
---

# new-sprint-pdma

Skill que ejecuta el script autónomo `new-sprint-pdma.js` para inicializar un sprint PDMA.

---

## PASO 0 — Localizar el script

```bash
find "$HOME" -name "new-sprint-pdma.js" -path "*/az-devops-onpremise/lib/wit/*" 2>/dev/null | head -1
```

Guarda la ruta obtenida en `SCRIPT_PATH`.

---

## Uso

```bash
node "$SCRIPT_PATH" <PROYECTO> "<ITERACION_PRINCIPAL_NUEVA>"
```

- `PROYECTO`: nombre del proyecto tal como aparece en `config.local.json` (campo `name`).
- `ITERACION_PRINCIPAL_NUEVA`: nombre **exacto** de la iteración destino (ya debe existir en Azure DevOps).

### Ejemplos

```bash
node "$SCRIPT_PATH" CENSO3 "1.1.36 (2026 mayo)"
node "$SCRIPT_PATH" CENSO3 "1.1.37 (2026 junio 1)"
node "$SCRIPT_PATH" AppCode "Iteration 5"
```

---

## Qué hace el script (autónomo)

1. **Valida** que la iteración indicada existe. Si no → error y para.
2. **Localiza ITERACION_ACTUAL** (la inmediatamente anterior en el árbol).
3. **Revisa 5 iteraciones previas** buscando tareas/bugs Active o Proposed. Si hay → muestra listado y para.
4. **Revisa ITERACION_ACTUAL** por Resolved/Closed con RemainingWork > 0. Si hay → muestra listado y para.
5. **Revisa ITERACION_ACTUAL** por Active con RemainingWork <= 0. Si hay → muestra listado y para.
6. **Procesa** cada tarea/bug de ITERACION_ACTUAL:
   - **Proposed** → cambia iteración a la nueva.
   - **Active** → crea copia en nueva iteración (Active, estimate=remaining, remaining=remaining, completed=0, título incrementado) y cierra el original (Resolved, remaining=0, estimate ajustado, título con "(1)").
7. **Resumen final**: CompletedWork por persona en ITERACION_ACTUAL tal como quedó.

---

## Salida

- `stderr`: logs de progreso paso a paso.
- `stdout`: resumen final con CompletedWork por persona.

Si algún check falla, el script para con código de salida 1 mostrando las tareas problemáticas en `stderr`.

---

## Notas

- El script es **completamente autónomo**: no requiere intervención intermedia.
- Usa el mismo `config.local.json` compartido por todos los skills del plugin (raíz del plugin).
- Si el servidor devuelve error al poner una tarea en Active (estado no permitido por flujo), lo registra como advertencia y continúa.
- Las tareas en estado Closed, Resolved u otros son ignoradas en el procesamiento (no se modifican).
