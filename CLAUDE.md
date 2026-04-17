# PDMA Claude Marketplace

Marketplace interno de plugins para Claude Code del equipo PDMA (empresa Tym). Centraliza comandos, agentes y utilidades reutilizables para compartir entre el equipo.

## Estructura del repositorio

```
pdma-claude-marketplace/
├── .claude-plugin/
│   └── marketplace.json          # Registro de todos los plugins disponibles
├── plugins/
│   ├── censo3-helpers/           # Plugin específico para el proyecto CENSO3
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/             # Comandos ejecutables (/build-all, /run-tests, /start-dev)
│   │   └── agents/               # Agentes especializados (database-helper)
│   ├── project-generic/          # Plugin genérico reutilizable para cualquier proyecto
│   │   ├── .claude-plugin/plugin.json
│   │   └── agents/project-analyzer/  # Agente de análisis de codebases legacy
│   └── az-devops-onpremise/      # Skills para Azure DevOps on-premise via API REST
│       ├── .claude-plugin/plugin.json
│       ├── lib/                  # Scripts Node.js ejecutables (sin dependencias externas)
│       │   ├── config.js         # Carga config.local.json
│       │   ├── api-client.js     # Cliente HTTP base para ADO REST API
│       │   └── wit/              # Work Item Tracking
│       └── skills/               # Skills invocables
│           └── devops-work-items/
│               ├── SKILL.md      # Definición del skill
│               └── config.local.json  # (gitignored) Configuración por usuario
└── README.md
```

## Plugins actuales

### `censo3-helpers`
Comandos y agentes específicos del proyecto CENSO3 (.NET + Angular).
- **Comandos**: `build-all`, `run-tests`, `start-dev`
- **Agentes**: `database-helper` — experto en el esquema de BD de CENSO3 (SSDT, EF Core, 13+ schemas)
- Nota: las rutas en los comandos apuntan a `C:\Users\fbarra.TYM\source\repos\CENSO3\Code` — ajustar al desplegar en otros equipos

### `project-generic`
Herramientas genéricas independientes del proyecto.
- **Agentes**: `project-analyzer` — análisis y documentación de codebases legacy (arquitectura N-tier, diagramas Mermaid/PlantUML, índices de clases y métodos)
- Configuración por proyecto en `.claude/agents/project-analyzer/settings.json` (generada automáticamente en el primer uso)

## Cómo añadir un nuevo plugin

1. Crear carpeta en `plugins/<nombre-plugin>/`
2. Añadir `.claude-plugin/plugin.json` con la metadata (ver plugins existentes como referencia)
3. Crear subcarpetas `commands/`, `agents/` y/o `skills/` con archivos `.md`
4. Registrar el plugin en `.claude-plugin/marketplace.json`

### Estructura mínima de `plugin.json`
```json
{
  "name": "nombre-plugin",
  "version": "1.0.0",
  "description": "Descripción breve",
  "author": "PDMA Team",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"]
}
```

### Formato de comandos (`commands/*.md`)
Archivo Markdown con instrucciones en lenguaje natural. El nombre del fichero es el nombre del comando (ej. `build-all.md` → `/build-all`).

### Formato de agentes (`agents/<nombre>/<nombre>.md`)
Fichero Markdown con frontmatter YAML:
```yaml
---
name: nombre-agente
description: Descripción usada para selección automática del agente
model: claude-sonnet-4-6
color: blue
---
Instrucciones del agente...
```

### Formato de skills (`skills/<nombre>/SKILL.md`)
Skills invocables directamente. Siempre se llaman `SKILL.md` — el nombre de la carpeta es el nombre del skill.
Pueden incluir scripts de soporte en `lib/` dentro del plugin.
```yaml
---
name: nombre-skill
description: Descripción detallada con ejemplos de cuándo invocarlo
version: 1.0.0
plugin: nombre-plugin
tools:
  - Bash
  - Read
  - Write
---
Instrucciones del skill...
```

## Convenciones

- Nombres en kebab-case para ficheros y carpetas
- Versionado semántico (1.0.0, 1.1.0, ...)
- Documentación en español
- Plugins de proyecto concreto: `<nombre-proyecto>-helpers` (ej. `censo3-helpers`)
- Plugins genéricos: `project-<categoria>` (ej. `project-generic`)

## Roadmap

- Sistema de publicación del marketplace para instalación por el equipo (pendiente de diseño)
- Posibles canales: red compartida, Git interno, Azure DevOps Artifacts
