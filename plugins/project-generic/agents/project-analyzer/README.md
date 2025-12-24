# Project Analyzer Agent

## Descripción

El agente **project-analyzer** es un asistente especializado en analizar y documentar bases de código legacy (heredadas). Ha sido diseñado para trabajar con sistemas empresariales de gran escala, especialmente aquellos construidos con arquitecturas en capas (N-tier).

## Características principales

- Análisis sistemático de código capa por capa
- Generación de documentación comprensiva
- Creación de diagramas de flujo (Mermaid, PlantUML)
- Seguimiento de progreso entre sesiones
- Optimización de tokens mediante índices
- Configuración flexible por proyecto

## Configuración inicial

### Primera vez usando el agente

La primera vez que uses el agente en un proyecto, se te pedirá que configures la ruta de documentación:

1. El agente detectará que no existe el archivo `settings.json`
2. Te preguntará: "Este es el primer uso del agente project-analyzer. Por favor, proporciona la ruta donde deseas que se genere la documentación de análisis"
3. Proporciona una ruta relativa o absoluta, por ejemplo:
   - `Docs\Analysis\Project_Documentation`
   - `Documentation\CodeAnalysis`
4. El agente creará automáticamente el archivo `settings.json` con tu configuración

### Estructura del settings.json

El archivo `settings.json` tiene la siguiente estructura:

```json
{
  "documentationOutputPath": "ruta/donde/guardar/documentacion",
  "projectName": "Project Analysis"
}
```

**Parámetros:**
- `documentationOutputPath`: Ruta base donde se generará toda la documentación de análisis
- `projectName`: (Opcional) Nombre del proyecto para referencia

### Reutilizando configuración existente

Si el archivo `settings.json` ya existe (por ejemplo, porque lo compartiste con tu equipo en el control de versiones), el agente:
1. Leerá automáticamente la configuración
2. Usará la ruta configurada para generar toda la documentación
3. No te volverá a pedir la ruta

## Estructura de documentación generada

Toda la documentación se organiza bajo la ruta configurada en `{DOCS_PATH}`:

```
{DOCS_PATH}/
├── INDICE_ANALISIS.md          # Índice maestro de componentes analizados
├── INDICE_METODOS.md            # Índice de métodos con referencias
├── INDICE_CLASES.md             # Índice de clases y ubicaciones
├── INDICE_SERVICIOS_WEB.md      # Índice de endpoints web
├── MAPA_DEPENDENCIAS.md         # Mapa de dependencias entre componentes
├── GLOSARIO_DOMINIO.md          # Terminología específica del dominio
│
├── [DomainName]/                # Carpetas por dominio de negocio
│   ├── Working/                 # Documentos de trabajo temporales
│   │   ├── TRABAJO_[Component]_[Date].md
│   │   ├── NOTAS_[Component].md
│   │   └── PENDIENTE_[Component].md
│   │
│   ├── Metodos/                 # Análisis detallado de métodos
│   │   └── [MethodName].md
│   │
│   ├── DOC_[Component]_[Version].md
│   ├── DIAGRAMA_[Component]_[Type].mmd
│   ├── ARQUITECTURA_[Layer].md
│   └── INDICE_[Domain].md       # Índice específico del dominio
│
└── [OtherDomain]/
    └── ...
```

## Casos de uso

### Análisis de un componente específico
```
Usuario: "Analiza el módulo de autenticación, específicamente cómo funciona el login"
```

El agente:
1. Verificará la configuración
2. Consultará documentación existente
3. Analizará solo lo necesario para responder
4. Generará documentación en `{DOCS_PATH}\Authentication\`

### Continuar análisis previo
```
Usuario: "Continúa con el análisis del flujo de datos que empezamos ayer"
```

El agente:
1. Consultará `{DOCS_PATH}\INDICE_ANALISIS.md`
2. Recuperará documentos de trabajo previos
3. Continuará desde donde se quedó

### Crear diagrama de flujo
```
Usuario: "Crea un diagrama de flujo del proceso de registro de usuarios"
```

El agente generará un diagrama Mermaid en `{DOCS_PATH}\Users\DIAGRAMA_Registro_Flujo.mmd`

## Principios de trabajo del agente

1. **Análisis Just-In-Time**: Solo analiza lo necesario para la tarea actual
2. **Documentación primero**: Consulta documentación existente antes de leer código
3. **Análisis incremental**: Trabaja componente por componente
4. **Optimización de tokens**: Usa índices para localizar información rápidamente
5. **Continuidad entre sesiones**: Mantiene contexto mediante documentos persistentes

## Ventajas de usar este agente

- ✅ **Configuración por proyecto**: Cada proyecto puede tener su propia ruta de documentación
- ✅ **Reutilizable**: Una vez configurado, funciona automáticamente
- ✅ **Colaborativo**: El settings.json puede compartirse con el equipo
- ✅ **Organizado**: Estructura clara de carpetas por dominios de negocio
- ✅ **Eficiente**: Evita análisis redundantes mediante índices
- ✅ **Persistente**: La documentación generada persiste entre sesiones

## Notas importantes

- El archivo `settings.json` debe estar en `.claude/agents/project-analyzer/settings.json`
- Se recomienda commitear el `settings.json` al control de versiones para que todo el equipo use la misma estructura
- El agente respeta la arquitectura y patrones definidos en `CLAUDE.md` del proyecto
- Siempre consulta los índices antes de hacer búsquedas exhaustivas en el código

## Soporte

Para reportar problemas o sugerencias sobre este agente, contacta al equipo de desarrollo.
