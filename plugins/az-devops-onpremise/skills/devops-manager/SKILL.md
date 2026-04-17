---
name: devops-manager
description: Skill para gestionar sprints, iteraciones, áreas, equipos, tableros y backlog de Azure DevOps on-premise. Úsalo para preguntas como "¿en qué sprint estamos?", "muéstrame las tareas del sprint actual", "lista los sprints futuros", "¿cuáles son las áreas del proyecto?", "muéstrame el backlog", "¿qué equipos hay?", "muéstrame el tablero Kanban" o "lista las consultas guardadas".
version: 1.0.0
plugin: az-devops-onpremise
tools:
  - Bash
  - Read
  - Write
---

# devops-manager

Skill para gestionar sprints, iteraciones, áreas, equipos, tableros y backlog
de Azure DevOps on-premise mediante la API REST.

---

## PASO 0 — Inicialización (ejecutar SIEMPRE al inicio)

### 0.1 Localizar los scripts

```bash
find "$HOME" -name "get-current-sprint.js" -path "*/az-devops-onpremise/lib/work/*" 2>/dev/null | head -1
```

De la ruta obtenida:
- `WORK_DIR` = carpeta que contiene ese fichero (`lib/work/`)
- `WIT_DIR`  = carpeta hermana `lib/wit/`
- `CONFIG_FILE` = dos niveles arriba + `config.local.json`

Ejemplo:
```
WORK_DIR    = /c/Users/.../az-devops-onpremise/lib/work
WIT_DIR     = /c/Users/.../az-devops-onpremise/lib/wit
CONFIG_FILE = /c/Users/.../az-devops-onpremise/config.local.json
```

### 0.2 Verificar config

```bash
cat "$CONFIG_FILE" 2>/dev/null || echo "NO_EXISTE"
```

Si no existe → ver **Flujo de configuración** en el skill `devops-work-items`.
La configuración es compartida por todos los skills del plugin.

### 0.3 Equipo por defecto

Todos los scripts que necesitan un equipo usan `defaultTeam` del config (o el nombre del proyecto si no está definido). Para ver los equipos disponibles:

```bash
node "$WORK_DIR/get-teams.js"
```

---

## MÉTODOS DISPONIBLES

> Sustituir `$WORK_DIR` y `$WIT_DIR` por las rutas reales del paso 0.1.

---

### work_get_teams — Listar equipos del proyecto

```bash
node "$WORK_DIR/get-teams.js" [top]
```

| Parámetro | Default | Notas |
|-----------|---------|-------|
| `top`     | `100`   | Máximo de equipos a devolver |

**Cuándo usar:** El usuario pregunta qué equipos existen en el proyecto.

```bash
node "$WORK_DIR/get-teams.js"
```

---

### work_get_team_settings — Configuración del equipo

```bash
node "$WORK_DIR/get-team-settings.js" [team]
```

| Parámetro | Default         | Notas |
|-----------|-----------------|-------|
| `team`    | `defaultTeam`   | Nombre del equipo |

**Cuándo usar:** El usuario pregunta por la configuración del equipo, iteración raíz, días laborables, etc.

```bash
node "$WORK_DIR/get-team-settings.js"
node "$WORK_DIR/get-team-settings.js" "CENSO3"
```

---

### work_get_team_iterations — Listar sprints del equipo

```bash
node "$WORK_DIR/get-team-iterations.js" [timeframe] [team]
```

| Parámetro   | Default       | Valores posibles                    |
|-------------|---------------|-------------------------------------|
| `timeframe` | (todos)       | `current` \| `past` \| `future`     |
| `team`      | `defaultTeam` | Nombre del equipo                   |

**Cuándo usar:** El usuario pregunta por los sprints del equipo (todos, pasados o futuros).

```bash
node "$WORK_DIR/get-team-iterations.js"             # todos
node "$WORK_DIR/get-team-iterations.js" past        # pasados
node "$WORK_DIR/get-team-iterations.js" future      # futuros
```

La respuesta incluye: `id` (GUID), `name`, `path`, `attributes.startDate`, `attributes.finishDate`, `attributes.timeFrame`.

---

### work_get_current_sprint — Sprint activo

```bash
node "$WORK_DIR/get-current-sprint.js" [team]
```

| Parámetro | Default         | Notas |
|-----------|-----------------|-------|
| `team`    | `defaultTeam`   | Nombre del equipo |

**Cuándo usar:** El usuario pregunta "¿en qué sprint estamos?" o "¿cuál es el sprint actual?".

```bash
node "$WORK_DIR/get-current-sprint.js"
```

---

### work_get_sprint_workitems — Work items de un sprint

```bash
node "$WORK_DIR/get-sprint-workitems.js" <iterationId> [team]
```

| Parámetro     | Tipo   | Notas |
|---------------|--------|-------|
| `iterationId` | GUID   | ID del sprint (de `get-team-iterations.js` o `get-current-sprint.js`) |
| `team`        | string | Default: `defaultTeam` |

**Cuándo usar:** El usuario pregunta "¿qué hay en el sprint actual?", "muéstrame las tareas del sprint X".

**Flujo típico para el sprint actual:**
```bash
# 1. Obtener ID del sprint actual
node "$WORK_DIR/get-current-sprint.js"
# → anota el "id" del sprint

# 2. Obtener sus work items
node "$WORK_DIR/get-sprint-workitems.js" "<id-del-sprint>"
```

---

### work_get_iterations — Árbol de iteraciones del proyecto

```bash
node "$WORK_DIR/get-iterations.js" [depth]
```

| Parámetro | Default | Notas |
|-----------|---------|-------|
| `depth`   | `10`    | Profundidad del árbol |

**Cuándo usar:** El usuario quiere ver la estructura completa de iteraciones/sprints del proyecto (independiente de los equipos). Útil para conocer los paths exactos de iteración para usar en WIQL.

```bash
node "$WORK_DIR/get-iterations.js"
node "$WORK_DIR/get-iterations.js" 3
```

---

### work_get_areas — Árbol de áreas del proyecto

```bash
node "$WORK_DIR/get-areas.js" [depth]
```

| Parámetro | Default | Notas |
|-----------|---------|-------|
| `depth`   | `10`    | Profundidad del árbol |

**Cuándo usar:** El usuario pregunta por la estructura de áreas del proyecto, o necesita conocer los paths exactos de área para usar en WIQL.

```bash
node "$WORK_DIR/get-areas.js"
node "$WORK_DIR/get-areas.js" 3
```

---

### work_get_boards — Listar tableros Kanban

```bash
node "$WORK_DIR/get-boards.js" [team]
```

| Parámetro | Default         | Notas |
|-----------|-----------------|-------|
| `team`    | `defaultTeam`   | Nombre del equipo |

**Cuándo usar:** El usuario quiere saber qué tableros Kanban existen para el equipo.

```bash
node "$WORK_DIR/get-boards.js"
```

---

### work_get_board — Detalles de un tablero Kanban

```bash
node "$WORK_DIR/get-board.js" <boardName> [team]
```

| Parámetro   | Notas |
|-------------|-------|
| `boardName` | Nombre del tablero (de `get-boards.js`). Ej: `"Stories"`, `"Backlog items"` |
| `team`      | Default: `defaultTeam` |

**Cuándo usar:** El usuario quiere ver las columnas del tablero, swimlanes o configuración Kanban.

```bash
node "$WORK_DIR/get-board.js" "Stories"
node "$WORK_DIR/get-board.js" "Backlog items" "CENSO3"
```

---

### work_get_backlog — Work items del backlog

```bash
node "$WORK_DIR/get-backlog.js" [level] [team]
```

| Parámetro | Default          | Valores posibles |
|-----------|------------------|------------------|
| `level`   | `requirements`   | `requirements` \| `features` \| `epics` \| `tasks` |
| `team`    | `defaultTeam`    | Nombre del equipo |

**Cuándo usar:** El usuario pide ver el backlog del equipo (user stories, features, epics sin sprint asignado o todos los del backlog).

```bash
node "$WORK_DIR/get-backlog.js"                        # user stories / PBIs
node "$WORK_DIR/get-backlog.js" features
node "$WORK_DIR/get-backlog.js" epics
node "$WORK_DIR/get-backlog.js" requirements "CENSO3"
```

---

### work_get_queries — Consultas guardadas

```bash
node "$WORK_DIR/get-queries.js" [folder] [depth]
```

| Parámetro | Default            | Notas |
|-----------|--------------------|-------|
| `folder`  | `"Shared Queries"` | Carpeta a listar |
| `depth`   | `2`                | Profundidad. Máx: 5. |

**Cuándo usar:** El usuario quiere ver las consultas guardadas del equipo para reutilizarlas.

```bash
node "$WORK_DIR/get-queries.js"
node "$WORK_DIR/get-queries.js" "Shared Queries" 3
node "$WORK_DIR/get-queries.js" "My Queries"
```

---

## COMBINACIONES FRECUENTES

### "¿Qué hay en el sprint actual?"

```bash
# 1. Obtener sprint activo y su ID
node "$WORK_DIR/get-current-sprint.js"
# 2. Con el ID obtenido:
node "$WORK_DIR/get-sprint-workitems.js" "<iterationId>"
```

### "Busca bugs activos del sprint actual con WIQL"

Combinar con el skill `devops-work-items` usando `query-wiql.js`:
```bash
node "$WIT_DIR/query-wiql.js" "SELECT [System.Id],[System.Title],[System.State],[System.AssignedTo] FROM WorkItems WHERE [System.WorkItemType]='Bug' AND [System.IterationPath]=@currentIteration AND [System.State]<>'Closed' ORDER BY [Microsoft.VSTS.Common.Priority]"
```

### "Muéstrame la estructura de sprints del proyecto"

```bash
node "$WORK_DIR/get-iterations.js" 5
```

### "¿Cuántos puntos tiene el sprint actual?"

```bash
# 1. Sprint ID
node "$WORK_DIR/get-current-sprint.js"
# 2. Work items del sprint
node "$WORK_DIR/get-sprint-workitems.js" "<iterationId>"
# 3. Sumar campo Microsoft.VSTS.Scheduling.StoryPoints de los resultados
```

---

## PRESENTACIÓN DE RESULTADOS

### Sprint activo

```
Sprint actual: 1.1.35 (2026 abril 2)
  Inicio:   02/04/2026
  Fin:      22/04/2026
  ID:       a1b2c3d4-...
```

### Lista de sprints

```
#   Nombre                  Inicio      Fin         Estado
──  ──────────────────────  ──────────  ──────────  ────────
    1.1.33 (2026 febrero)   05/02/2026  25/02/2026  past
    1.1.34 (2026 marzo)     05/03/2026  25/03/2026  past
  → 1.1.35 (2026 abril 2)  02/04/2026  22/04/2026  current
    1.1.36 (2026 mayo)      05/05/2026  25/05/2026  future
```

### Work items del sprint

Agrupar por tipo (Epic → Feature → User Story/PBI → Task/Bug):

```
Sprint: 1.1.35 (2026 abril 2)  —  12 work items

  [Task]  #41391  Nueva columna IdCrudAction            Proposed    Enrique M.
  [Task]  #41392  Actualizar SPs de log                 Active      Enrique M.
  [Bug]   #41300  Error en validación de email          Active      Ana M.
  ...
```

### Árbol de áreas/iteraciones

Mostrar como árbol con indentación:

```
CENSO3
├── Backend
│   ├── Auth
│   └── API
├── Frontend
└── Logs e histórico
```

### Backlog

Mostrar igual que lista de work items, indicando el nivel:

```
Backlog — Requirements (User Stories / PBIs)  —  23 items

  #40100  Implementar autenticación OAuth        New         (sin asignar)
  #40101  Migrar logs a nueva estructura         Active      Enrique M.
  ...
```

---

## NOTAS TÉCNICAS

- **Equipo por defecto**: Azure DevOps crea automáticamente un equipo con el mismo nombre que el proyecto. Si el proyecto se llama `CENSO3`, el equipo por defecto también se llama `CENSO3`.
- **IDs de sprint**: Los sprints en la API de teams usan GUIDs, no rutas. Usa `get-team-iterations.js` o `get-current-sprint.js` para obtenerlos.
- **Diferencia entre iteraciones de proyecto y de equipo**: `get-iterations.js` muestra el árbol de nodos de clasificación (todas las iteraciones definidas en el proyecto). `get-team-iterations.js` muestra las iteraciones asignadas a un equipo concreto (su planning de sprints).
- **Backlog vs Sprint**: El backlog incluye items sin sprint asignado o en el backlog del equipo. El sprint incluye los items asignados explícitamente a ese sprint.
- **WIQL con sprints**: Para filtrar por sprint actual en WIQL usar `@currentIteration`. Para un sprint concreto usar `[System.IterationPath] = 'CENSO3\\1\\1.1.35 (2026 abril 2)'`.
