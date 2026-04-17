# Notas sobre rxreyn3/azure-devops-mcp

Repositorio clonado en: `./rxreyn3-azure-devops-mcp/`

## Resumen del MCP

El MCP `rxreyn3/azure-devops-mcp` es un servidor MCP en TypeScript que conecta asistentes IA con Azure DevOps.
Usa `azure-devops-node-api` y el SDK `@modelcontextprotocol/sdk`.

**Configuración (variables de entorno):**
- `ADO_ORGANIZATION` - URL de la organización (normaliza a `https://dev.azure.com/{org}`)
- `ADO_PROJECT` - Proyecto
- `ADO_PAT` - Personal Access Token

**IMPORTANTE:** Este MCP está orientado a Azure DevOps cloud y usa URLs de `dev.azure.com`.
Para on-premise (TFS/Azure DevOps Server), la URL base es diferente: `https://{servidor}/{collection}`.

## Herramientas implementadas en el MCP

### Agent Tools (`src/tools/agent-tools.ts`)

| Herramienta | Descripción |
|---|---|
| `project_health_check` | Verifica conexión y permisos |
| `project_list_queues` | Lista agent queues del proyecto |
| `project_get_queue` | Detalles de una queue específica |
| `org_find_agent` | Localiza en qué queue/pool está un agente |
| `org_list_agents` | Lista agentes con filtros y paginación |

### Build Tools (`src/tools/build-tools.ts`)

| Herramienta | Descripción |
|---|---|
| `build_list` | Lista builds con filtros (pipeline, estado, resultado, rama, fecha) |
| `build_list_definitions` | Lista definiciones de pipelines |
| `build_queue` | Lanza un nuevo build |
| `build_get_timeline` | Timeline de un build (jobs, tasks, agentes) |
| `build_download_job_logs` | Descarga logs de un job específico |
| `build_download_logs_by_name` | Descarga logs por nombre de stage/job/task |
| `build_list_artifacts` | Lista artefactos de un build |
| `build_download_artifact` | Descarga artefacto como ZIP |
| `list_downloads` | Lista ficheros descargados localmente |
| `cleanup_downloads` | Limpia ficheros descargados |
| `get_download_location` | Ruta del directorio temporal y uso de espacio |

## Conclusión para nuestro plugin

El MCP **NO implementa Work Items**. Solo tiene builds y agentes.

Nuestro skill `devops-work-items` implementa métodos propios basados en la **API REST de Azure DevOps**,
siguiendo las convenciones de nomenclatura del MCP (prefijo `wit_` para Work Item Tracking).

## Métodos implementados en devops-work-items

| Método | Descripción |
|---|---|
| `wit_get_workitem` | Obtiene un work item por ID |
| `wit_get_workitems` | Obtiene múltiples work items por IDs |
| `wit_query_by_wiql` | Consulta WIQL → devuelve work items |
| `wit_get_workitem_updates` | Historial de cambios de un work item |
| `wit_get_workitem_comments` | Comentarios de un work item |

## API REST Azure DevOps - Endpoints usados

Base URL on-premise: `https://{serverUrl}/{collection}/{project}/_apis`

```
GET  /wit/workitems/{id}?$expand=All&api-version=7.0
GET  /wit/workitems?ids={ids}&api-version=7.0
POST /wit/wiql?$top={n}&api-version=7.0
GET  /wit/workitems/{id}/updates?$top={n}&api-version=7.0
GET  /wit/workitems/{id}/comments?$top={n}&api-version=7.0
```

Auth: `Authorization: Basic {base64(:PAT)}`
