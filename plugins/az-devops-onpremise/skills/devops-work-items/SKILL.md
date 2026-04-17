---
name: devops-work-items
description: Skill para localizar y leer Work Items de Azure DevOps on-premise. Úsalo cuando el usuario pida buscar tareas, bugs, user stories o epics, ver detalles de un work item concreto, consultar su historial de cambios, comentarios, o hacer búsquedas por sprint, área, estado o asignado. Ejemplos: "muéstrame el work item 1234", "busca los bugs abiertos del sprint actual", "¿qué cambios ha tenido la tarea 567?".
version: 1.0.0
plugin: az-devops-onpremise
tools:
  - Bash
  - Read
  - Write
---

# devops-work-items

Skill para trabajar con Work Items de Azure DevOps on-premise.
Ejecuta los scripts Node.js del plugin para llamar a la API REST de Azure DevOps.

---

## PASO 0 — Inicialización (ejecutar SIEMPRE al inicio)

### 0.1 Localizar el plugin

```bash
find "$HOME" -name "get-workitem.js" -path "*/az-devops-onpremise/lib/wit/*" 2>/dev/null | head -1
```

De la ruta obtenida:
- `SCRIPTS_DIR` = la carpeta que contiene ese fichero (`lib/wit/`)
- `CONFIG_FILE`  = dos niveles arriba + `config.local.json` (raíz del plugin, compartido con todos los skills)

Ejemplo:
```
SCRIPTS_DIR  = /c/Users/fbarra.TYM/.../az-devops-onpremise/lib/wit
CONFIG_FILE  = /c/Users/fbarra.TYM/.../az-devops-onpremise/config.local.json
```

### 0.2 Verificar Node.js

```bash
node --version
```

Si no está disponible, indicar al usuario que instale Node.js (https://nodejs.org).

### 0.3 Verificar configuración

```bash
cat "$CONFIG_FILE" 2>/dev/null || echo "NO_EXISTE"
```

Si devuelve `NO_EXISTE` → ejecutar el **Flujo de configuración** (ver abajo).

---

## FLUJO DE CONFIGURACIÓN (solo si no existe config.local.json)

Pedir al usuario:

1. **serverUrl** — URL base del servidor TFS/Azure DevOps on-premise
   - Formato: `https://tfs.empresa.com/tfs` o `http://servidor:8080/tfs`
   - NO usar `https://dev.azure.com/...` (eso es cloud)

2. **collection** — Nombre de la colección (normalmente `DefaultCollection`)

3. **project** — Nombre exacto del proyecto en Azure DevOps

4. **pat** — Personal Access Token
   - Cómo obtenerlo: Azure DevOps → icono usuario → Security → Personal Access Tokens → New Token
   - Scope mínimo requerido: **Work Items: Read**

Crear el fichero (ubicado en la raíz del plugin, compartido con todos los skills):

```bash
cat > "$CONFIG_FILE" << 'EOF'
{
  "serverUrl": "<serverUrl>",
  "collection": "<collection>",
  "project": "<project>",
  "pat": "<pat>",
  "defaultTeam": "<project>"
}
EOF
```

Verificar conexión:

```bash
node "$SCRIPTS_DIR/get-workitem.js" 1
```

- HTTP 401 → PAT inválido o caducado
- HTTP 404 → conexión OK (work item 1 no existe, es normal)
- Error de red → revisar serverUrl y conectividad

---

## MÉTODOS DISPONIBLES

> Sustituir `$SCRIPTS_DIR` por la ruta real encontrada en el paso 0.1.

---

### wit_get_iteration_workitems — Buscar work items de una iteración

```bash
node "$SCRIPTS_DIR/get-iteration-workitems.js" <iterationPath> [states] [types] [top]
```

| Parámetro       | Default | Notas |
|-----------------|---------|-------|
| `iterationPath` | —       | Ruta de iteración o `@currentIteration` (requerido) |
| `states`        | `all`   | Estados separados por coma. Ej: `Active,Proposed`. `all` = sin filtro |
| `types`         | `all`   | Tipos separados por coma. Ej: `Task,Bug`. `all` = sin filtro |
| `top`           | `200`   | Máximo de resultados |

Devuelve siempre los campos de tiempo: `OriginalEstimate`, `RemainingWork`, `CompletedWork`.

**Cuándo usar:** El usuario pide ver las tareas de un sprint concreto, filtradas por estado o tipo.

```bash
node "$SCRIPTS_DIR/get-iteration-workitems.js" @currentIteration
node "$SCRIPTS_DIR/get-iteration-workitems.js" @currentIteration Active,Proposed
node "$SCRIPTS_DIR/get-iteration-workitems.js" @currentIteration all Task,Bug
node "$SCRIPTS_DIR/get-iteration-workitems.js" "CENSO3\\1\\1.1.35 (2026 abril 2)" Active Task
```

---

### wit_update_workitem — Actualizar campos de un work item

```bash
node "$SCRIPTS_DIR/update-workitem.js" <id> <campo=valor> [campo=valor ...]
```

| Campo       | Campo ADO                                        | Tipo    |
|-------------|--------------------------------------------------|---------|
| `title`     | System.Title                                     | texto   |
| `state`     | System.State                                     | texto   |
| `iteration` | System.IterationPath                             | ruta    |
| `area`      | System.AreaPath                                  | ruta    |
| `estimate`  | Microsoft.VSTS.Scheduling.OriginalEstimate       | horas   |
| `remaining` | Microsoft.VSTS.Scheduling.RemainingWork          | horas   |
| `completed` | Microsoft.VSTS.Scheduling.CompletedWork          | horas   |
| `assigned`  | System.AssignedTo                                | usuario |
| `priority`  | Microsoft.VSTS.Common.Priority                   | 1-4     |
| `comment`   | System.History                                   | texto   |

**Cuándo usar:** El usuario quiere actualizar tiempos, cambiar estado, mover a otra iteración, etc.

```bash
node "$SCRIPTS_DIR/update-workitem.js" 1234 state=Active remaining=5
node "$SCRIPTS_DIR/update-workitem.js" 1234 estimate=8 remaining=8 completed=0
node "$SCRIPTS_DIR/update-workitem.js" 1234 completed=3 remaining=5 comment="Avance del día"
node "$SCRIPTS_DIR/update-workitem.js" 1234 iteration="CENSO3\\1\\1.1.36 (2026 mayo)"
```

---

### wit_copy_workitem — Copiar un work item (con hijos, vínculos y adjuntos)

```bash
node "$SCRIPTS_DIR/copy-workitem.js" <id> [opciones]
```

| Opción               | Default | Efecto |
|----------------------|---------|--------|
| `--no-links`         | links=sí | No copiar vínculos relacionados |
| `--no-attachments`   | adj=sí   | No copiar datos adjuntos |
| `--no-children`      | hijos=sí | No copiar elementos secundarios recursivamente |
| `--iteration=<path>` | —        | Asignar a una iteración diferente |
| `--title=<texto>`    | —        | Título para la copia |

Equivalente exacto a la opción web "Crear copia del elemento de trabajo" con los tres checks activados.
Los hijos se copian de forma recursiva respetando la jerarquía.

**Cuándo usar:** El usuario quiere duplicar una tarea, user story o epic (con o sin sus hijos).

```bash
node "$SCRIPTS_DIR/copy-workitem.js" 1234
node "$SCRIPTS_DIR/copy-workitem.js" 1234 --no-children
node "$SCRIPTS_DIR/copy-workitem.js" 1234 --iteration="CENSO3\\1\\1.1.36 (2026 mayo)"
node "$SCRIPTS_DIR/copy-workitem.js" 1234 --no-links --no-attachments --no-children
```

---

### wit_get_workitem — Obtener un work item por ID

```bash
node "$SCRIPTS_DIR/get-workitem.js" <id> [expand]
```

| Parámetro | Tipo    | Default | Valores posibles                        |
|-----------|---------|---------|-----------------------------------------|
| `id`      | number  | —       | ID numérico del work item (requerido)   |
| `expand`  | string  | `All`   | `None` \| `Relations` \| `Fields` \| `Links` \| `All` |

**Cuándo usar:** El usuario pide ver un work item concreto, sus detalles o descripción.

```bash
node "$SCRIPTS_DIR/get-workitem.js" 1234
node "$SCRIPTS_DIR/get-workitem.js" 1234 Relations
```

---

### wit_get_workitems — Obtener varios work items de una vez

```bash
node "$SCRIPTS_DIR/get-workitems.js" <id1,id2,...> [expand]
```

| Parámetro | Tipo    | Default | Notas                        |
|-----------|---------|---------|------------------------------|
| `ids`     | string  | —       | IDs separados por coma, sin espacios. Máx. 200. (requerido) |
| `expand`  | string  | `None`  | `None` \| `Relations` \| `Fields` \| `Links` \| `All` |

**Cuándo usar:** El usuario pide varios work items a la vez.

```bash
node "$SCRIPTS_DIR/get-workitems.js" 100,101,102
node "$SCRIPTS_DIR/get-workitems.js" 100,101 All
```

---

### wit_query_by_wiql — Buscar work items con consulta WIQL

```bash
node "$SCRIPTS_DIR/query-wiql.js" "<wiql_query>" [top]
```

| Parámetro | Tipo    | Default | Notas                              |
|-----------|---------|---------|------------------------------------|
| `query`   | string  | —       | Consulta WIQL entre comillas (requerido) |
| `top`     | number  | `50`    | Máx. resultados. Rango: 1-200.    |

**Cuándo usar:** El usuario busca por criterios: estado, tipo, asignado, sprint, área, etc.

Hace dos llamadas internamente: WIQL → IDs, luego detalles completos.

Macros disponibles: `@project`, `@currentIteration`, `@me`, `@today`

```bash
# Work items activos del sprint actual
node "$SCRIPTS_DIR/query-wiql.js" "SELECT [System.Id],[System.Title],[System.State],[System.AssignedTo] FROM WorkItems WHERE [System.TeamProject]=@project AND [System.IterationPath]=@currentIteration AND [System.State]<>'Done' ORDER BY [Microsoft.VSTS.Common.Priority]"

# Bugs abiertos
node "$SCRIPTS_DIR/query-wiql.js" "SELECT [System.Id],[System.Title],[System.State] FROM WorkItems WHERE [System.WorkItemType]='Bug' AND [System.State] IN ('Active','Resolved')"

# Tareas del usuario actual sin cerrar
node "$SCRIPTS_DIR/query-wiql.js" "SELECT [System.Id],[System.Title],[System.State] FROM WorkItems WHERE [System.AssignedTo]=@me AND [System.State]<>'Closed'"

# Work items de un área
node "$SCRIPTS_DIR/query-wiql.js" "SELECT [System.Id],[System.Title],[System.State] FROM WorkItems WHERE [System.AreaPath] UNDER 'MiProyecto\\Backend'"
```

---

### wit_get_workitem_updates — Ver historial de cambios

```bash
node "$SCRIPTS_DIR/get-workitem-updates.js" <id> [top] [skip]
```

| Parámetro | Tipo    | Default | Notas                              |
|-----------|---------|---------|------------------------------------|
| `id`      | number  | —       | ID del work item (requerido)       |
| `top`     | number  | `20`    | Número de revisiones a devolver    |
| `skip`    | number  | `0`     | Para paginación                    |

**Cuándo usar:** El usuario pregunta por historial, cambios de estado, quién modificó qué o cuándo.

```bash
node "$SCRIPTS_DIR/get-workitem-updates.js" 1234
node "$SCRIPTS_DIR/get-workitem-updates.js" 1234 10
node "$SCRIPTS_DIR/get-workitem-updates.js" 1234 10 10   # página 2
```

---

### wit_get_workitem_comments — Ver comentarios

```bash
node "$SCRIPTS_DIR/get-workitem-comments.js" <id> [top]
```

| Parámetro | Tipo    | Default | Notas                              |
|-----------|---------|---------|------------------------------------|
| `id`      | number  | —       | ID del work item (requerido)       |
| `top`     | number  | `20`    | Número de comentarios a devolver   |

**Cuándo usar:** El usuario pregunta por comentarios o discusiones de un work item.

> Si el servidor no soporta este endpoint (TFS < 2020), usar `get-workitem-updates.js` — los comentarios aparecen en `System.History`.

```bash
node "$SCRIPTS_DIR/get-workitem-comments.js" 1234
node "$SCRIPTS_DIR/get-workitem-comments.js" 1234 50
```

---

## PRESENTACIÓN DE RESULTADOS

### Work item individual

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Work Item #1234  ·  Task  ·  Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Título:     Implementar endpoint de login
Asignado a: Juan García
Área:       MiProyecto\Backend\Auth
Iteración:  MiProyecto\Sprint 12
Prioridad:  2
Creado:     2024-03-01  ·  Modificado: 2024-03-15
Padre:      #1200 · Epic: Sistema de Autenticación
Tags:       auth, api, backend

Descripción:
  Crear el endpoint POST /api/auth/login...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- Convertir HTML a texto plano (Description, Repro Steps, Acceptance Criteria, etc.)
- Omitir campos vacíos

### Lista de work items

```
#     Título                              Tipo    Estado   Asignado a      Iteración
────  ──────────────────────────────────  ──────  ───────  ──────────────  ──────────
1234  Implementar endpoint de login       Task    Active   Juan García     Sprint 12
1235  Fix bug en validación de email      Bug     New      (sin asignar)   Sprint 12
```

### Historial (orden cronológico inverso)

```
─ Rev. 5  ·  2024-03-15 10:23  ·  Juan García
  Estado:       In Progress → Active
  Asignado a:   (sin asignar) → Juan García

─ Rev. 4  ·  2024-03-10 09:00  ·  Ana Martínez
  Comentario: "He revisado los requisitos, procedo con la implementación"
```

### Comentarios (orden cronológico)

```
Juan García  ·  2024-03-10 09:00
  He revisado los requisitos, procedo con la implementación.

Ana Martínez  ·  2024-03-12 14:30
  Recuerda incluir el refresh token en la respuesta.
```

---

## NOTAS TÉCNICAS

- **SSL**: El cliente acepta certificados autofirmados (`rejectUnauthorized: false`), habitual en on-premise.
- **Versión API**: Por defecto `7.0`. Ajustar `DEFAULT_API_VERSION` en `lib/api-client.js` si el servidor es más antiguo (TFS 2018 → `5.0`, TFS 2015-2017 → `3.0`).
- **WIQL macros**: `@project`, `@currentIteration`, `@me`, `@today` son nativas — no reemplazar manualmente.
- **Campos HTML**: Description, Repro Steps, Acceptance Criteria y System.History contienen HTML. Extraer texto antes de mostrar.
- **Comentarios en servidores antiguos**: En TFS < 2020 usar `get-workitem-updates.js` (comentarios en `System.History`).
