# PDMA Claude Code Marketplace

Marketplace interno de plugins de Claude Code para el equipo PDMA. Este repositorio permite compartir comandos, agentes y utilidades personalizadas para mejorar el flujo de trabajo con CENSO3.

## Estructura del Marketplace

```
PDMA_ClaudeMarketPlace/
├── .claude-plugin/
│   └── marketplace.json          # Configuración del marketplace
├── plugins/                       # Directorio de plugins
│   └── censo3-helpers/           # Plugin de ejemplo
│       ├── .claude-plugin/
│       │   └── plugin.json       # Metadata del plugin
│       ├── commands/             # Comandos personalizados
│       │   ├── build-all.md
│       │   ├── run-tests.md
│       │   └── start-dev.md
│       └── agents/               # Agentes especializados
│           └── database-helper.md
└── README.md
```

## Instalación del Marketplace

### Opción 1: Marketplace Local (Desarrollo/Testing)

```bash
# En Claude Code, ejecuta:
/plugin marketplace add C:\Users\fbarra.TYM\source\repos\CENSO3\Code\PDMA_ClaudeMarketPlace
```

### Opción 2: Desde Git (Recomendado para equipo)

Una vez que subas este marketplace a un repositorio Git:

```bash
# Usando GitHub
/plugin marketplace add owner/pdma-marketplace

# Usando GitLab u otro
/plugin marketplace add https://gitlab.com/your-org/pdma-marketplace.git
```

### Opción 3: Configuración Automática para el Equipo

Añade esto al `.claude/settings.json` del proyecto:

```json
{
  "extraKnownMarketplaces": [
    {
      "name": "pdma-marketplace",
      "source": "C:\\Users\\fbarra.TYM\\source\\repos\\CENSO3\\Code\\PDMA_ClaudeMarketPlace"
    }
  ]
}
```

## Instalar Plugins

```bash
# Ver plugins disponibles
/plugin marketplace list

# Instalar un plugin
/plugin install censo3-helpers

# Ver plugins instalados
/plugin list

# Desinstalar un plugin
/plugin uninstall censo3-helpers
```

## Plugins Disponibles

### censo3-helpers (v1.0.0)

Plugin con comandos y utilidades para desarrollo de CENSO3.

**Comandos incluidos:**

- `/build-all` - Construir todo el proyecto CENSO3 (backend + frontend)
- `/run-tests` - Ejecutar todos los tests unitarios
- `/start-dev` - Iniciar ambiente de desarrollo (API + Angular)

**Agentes incluidos:**

- `database-helper` - Especialista en base de datos CENSO3 (schemas, EF Core, SSDT)

## Crear Nuevos Plugins

### 1. Estructura Básica

```
plugins/mi-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/          # Opcional
├── agents/           # Opcional
└── skills/           # Opcional
```

### 2. Crear plugin.json

```json
{
  "name": "mi-plugin",
  "version": "1.0.0",
  "description": "Descripción del plugin",
  "author": {
    "name": "Tu Nombre",
    "email": "tu@email.com"
  },
  "keywords": ["censo3", "utilities"]
}
```

### 3. Añadir Comandos

Crea archivos `.md` en `commands/`:

```markdown
# Mi Comando

Descripción de lo que hace el comando.

## Pasos:

1. Primer paso
2. Segundo paso

Usa los siguientes comandos:

\`\`\`bash
# Ejemplo de comando
dotnet build
\`\`\`
```

### 4. Añadir Agentes

Crea archivos `.md` en `agents/` con frontmatter:

```markdown
---
name: mi-agente
description: Descripción del agente especializado
capabilities:
  - Capacidad 1
  - Capacidad 2
tools:
  - Read
  - Grep
  - Bash
---

# Mi Agente

Instrucciones detalladas para el agente...
```

### 5. Registrar en marketplace.json

Añade tu plugin al array `plugins`:

```json
{
  "name": "mi-plugin",
  "description": "Descripción breve",
  "source": "mi-plugin",
  "version": "1.0.0",
  "author": {
    "name": "Tu Nombre"
  },
  "keywords": ["censo3", "tag1", "tag2"]
}
```

## Compartir con el Equipo

### Opción A: Red Local/Compartida

1. Coloca el marketplace en una carpeta compartida de red
2. Comparte la ruta con el equipo
3. Cada miembro ejecuta: `/plugin marketplace add \\servidor\ruta\PDMA_ClaudeMarketPlace`

### Opción B: Repositorio Git (Recomendado)

1. Inicializa git en el marketplace:

```bash
cd C:\Users\fbarra.TYM\source\repos\CENSO3\Code\PDMA_ClaudeMarketPlace
git init
git add .
git commit -m "Initial marketplace setup"
```

2. Sube a GitHub/GitLab/Azure DevOps:

```bash
git remote add origin https://github.com/your-org/pdma-marketplace.git
git push -u origin main
```

3. Comparte el repositorio con el equipo
4. Cada miembro ejecuta: `/plugin marketplace add your-org/pdma-marketplace`

## Mantenimiento

### Actualizar un Plugin

1. Modifica los archivos del plugin
2. Actualiza el `version` en `.claude-plugin/plugin.json`
3. Actualiza el `version` en `marketplace.json`
4. Commitea y pushea los cambios (si usas Git)

Los usuarios pueden actualizar con:

```bash
/plugin update censo3-helpers
```

### Añadir Más Comandos a un Plugin Existente

Simplemente añade nuevos archivos `.md` en la carpeta `commands/` del plugin. Claude Code los detectará automáticamente.

## Buenas Prácticas

1. **Nombres descriptivos**: Usa nombres claros para comandos y agentes
2. **Documentación**: Incluye instrucciones detalladas en cada comando
3. **Versionado**: Usa semantic versioning (1.0.0, 1.1.0, 2.0.0)
4. **Keywords**: Añade palabras clave relevantes para búsqueda
5. **Testing**: Prueba los plugins localmente antes de compartir
6. **Git**: Usa control de versiones para el marketplace

## Soporte

Para problemas o sugerencias:
- Crea un issue en el repositorio del marketplace
- Contacta al equipo PDMA
- Consulta la documentación oficial: https://code.claude.com/docs/en/plugins

## Referencias

- [Plugin Documentation](https://code.claude.com/docs/en/plugins)
- [Plugin Reference](https://code.claude.com/docs/en/plugins-reference)
- [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
