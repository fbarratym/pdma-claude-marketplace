# new-sprint-pdma

Skill para inicializar un nuevo sprint en Azure DevOps.

## Idea general

Le dices cuál es la **iteración nueva** y el script toma automáticamente la **inmediatamente anterior** como iteración actual. Procesa las tareas de la actual y las pasa a la nueva.

## Uso

```
node new-sprint-pdma.js <PROYECTO> "<ITERACION_NUEVA>"
```

- `PROYECTO`: nombre tal como aparece en `config.local.json` (campo `name`).
- `ITERACION_NUEVA`: nombre exacto de la iteración destino. **Debe existir previamente en Azure DevOps.**

Ejemplos:
```
node new-sprint-pdma.js AppCode "Iteration 4"
node new-sprint-pdma.js CENSO3 "1.1.36 (2026 mayo)"
```

---

## Pasos que ejecuta

### 1 — Valida la iteración nueva

Carga el árbol de iteraciones de ADO y busca la que indicas. Si no existe, muestra las disponibles y para.
La iteración actual se deduce sola: es la inmediatamente anterior en el árbol.

### 2 — Revisa las 5 iteraciones anteriores a la actual

Busca tareas/bugs en estado Active o New. Si hay alguna, para y las lista. Hay que cerrarlas o moverlas antes de continuar.

### 3 — Revisa tareas cerradas con horas restantes

Busca tareas Closed/Resolved en la iteración actual con RemainingWork > 0. Si las hay, para. Hay que poner RemainingWork a 0 o devolverlas a Active.

### 4 — Revisa tareas Active con horas restantes a 0

Busca tareas Active en la iteración actual con RemainingWork = 0. Si las hay, para. Hay que cerrarlas o asignarles horas restantes.

### 5 — Procesa las tareas de la iteración actual

Solo se tocan las tareas/bugs en estado **New** o **Active**. Las cerradas/resueltas no se modifican.

#### Tarea en estado **New**
→ Se mueve directamente a la iteración nueva. Sin más cambios.

#### Tarea en estado **Active sin trabajo completado** (CompletedWork = 0)
→ Se mueve directamente a la iteración nueva. Sin más cambios.

#### Tarea en estado **Active con trabajo completado** (CompletedWork > 0)
→ Se divide en dos:

**Original** (queda en la iteración actual, se cierra):
- Estado → Closed
- Título → añade `(1)` al final si no tiene número (ej: `"Mi tarea (1)"`)
- OriginalEstimate → `est - rw` *(lo que ya se ha consumido)*
- RemainingWork → `0`
- CompletedWork → sin cambios

**Copia** (va a la iteración nueva, queda activa):
- Estado → Active
- Título → número incrementado (ej: `"Mi tarea (2)"`, `"Mi tarea (3)"` si ya era `(2)"`, etc.)
- OriginalEstimate → `rw` *(lo que quedaba por hacer)*
- RemainingWork → `rw` *(igual que el estimate)*
- CompletedWork → `0`

> **Caso especial — tarea sobreestimada** (est ≤ rw, es decir, se han consumido más horas de las estimadas):
> En lugar de usar `est - rw` y `rw`, ambas partes (original y copia) reciben `est / 2` como estimate.

La copia hereda también los **vínculos** del original (Related, Dependency, Parent, etc.) y los **adjuntos**.

### 6 — Resumen final

Muestra el total de CompletedWork por persona en la iteración que acaba de cerrarse.

---

## Configuración (`config.local.json`)

El script busca `config.local.json` en `CLAUDE_PLUGIN_DATA`, que persiste entre reinstalaciones del plugin:

```
~/.claude/plugins/data/az-devops-onpremise-pdma-marketplace/config.local.json
```

En Windows:
```
C:\Users\<Usuario>\.claude\plugins\data\az-devops-onpremise-pdma-marketplace\config.local.json
```

Este archivo **no se borra** al reinstalar o actualizar el plugin con `/plugin`.

Estructura del archivo:
```json
[
  {
    "name":        "MiProyecto",
    "serverUrl":   "https://tfs.empresa.com/tfs",
    "collection":  "DefaultCollection",
    "project":     "nombre-en-ado",
    "pat":         "tu-personal-access-token",
    "defaultTeam": "nombre-equipo"
  }
]
```

---

## Log

Cada ejecución añade una entrada al archivo `sprint-pdma.log.local.md` (junto a `config.local.json`). El log es acumulativo — nunca sobreescribe entradas anteriores. Este archivo está en `.gitignore` y es local a cada usuario.

---

## Comprobaciones de seguridad

El script es conservador: si algo falla al crear la copia, **no toca el original**. Si algo falla al cerrar el original, avisa explícitamente indicando que la copia ya existe para que se pueda corregir manualmente.
