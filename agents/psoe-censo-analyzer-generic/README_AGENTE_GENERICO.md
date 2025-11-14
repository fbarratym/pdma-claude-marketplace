# Agente Genérico de Análisis de Código Legacy

## 📋 Resumen

Se ha creado una versión genérica y reutilizable del agente `psoe-censo-analyzer` que separa la lógica genérica de análisis de la configuración específica del proyecto.

## 📁 Archivos Creados

### 1. `psoe-censo-analyzer-generic.local.md`
**Agente genérico reutilizable**

- Contiene toda la metodología de análisis de código legacy
- Funciona con cualquier proyecto tras configuración inicial
- Color: Morado (para distinguirlo del original azul)
- **Característica principal**: Detección automática de configuración y setup interactivo

### 2. `psoe-censo-analyzer-generic.project.settings.local.md`
**Configuración específica de PSOECenso**

- Nombre del proyecto: PSOECenso
- Arquitectura: N-tier Layered (6 capas)
- Tecnología: .NET Framework 3.0/3.5, C#, netTiers
- Dominios: Personas, Agrupaciones, AIE, Catálogos, Procesos, Envíos, etc.
- Rutas: `CLAUDE_Flujo/`, `Tym.CensoCore.Database/`
- Documentación: `CLAUDE.md`
- Convenciones de nomenclatura específicas
- Consideraciones especiales del proyecto

## 🔄 Cómo Funciona

### Primera Invocación (con configuración existente)
```
Usuario: "Analiza el módulo de Personas"
  ↓
Agente:
  1. Busca psoe-censo-analyzer-generic.project.settings.local.md
  2. ✅ Lo encuentra
  3. Carga toda la configuración del proyecto
  4. Procede con el análisis usando la configuración cargada
```

### Primera Invocación (sin configuración - CON CLAUDE.md existente)
```
Usuario: "Analiza el módulo X"
  ↓
Agente:
  1. Busca psoe-censo-analyzer-generic.project.settings.local.md
  2. ❌ No lo encuentra
  3. Busca CLAUDE.md en el proyecto
  4. ✅ Lo encuentra
  5. Lee CLAUDE.md y extrae automáticamente:
     - Nombre del proyecto
     - Arquitectura y capas
     - Tecnologías
     - Patrones de diseño
     - Dominios de negocio
     - Convenciones de nomenclatura
     - Herramientas de generación de código
     - etc.
  6. Solo pregunta al usuario lo que NO pudo extraer (2-3 preguntas típicamente)
  7. Crea el archivo de configuración
  8. Procede con el análisis original
```

### Primera Invocación (sin configuración - SIN CLAUDE.md)
```
Usuario: "Analiza el módulo X"
  ↓
Agente:
  1. Busca psoe-censo-analyzer-generic.project.settings.local.md
  2. ❌ No lo encuentra
  3. Busca CLAUDE.md en el proyecto
  4. ❌ No lo encuentra
  5. Recomienda ejecutar /init (MUY RECOMENDADO)
  6. Pregunta: "¿Quieres que ejecute /init para crear CLAUDE.md?"

     SI usuario acepta:
       - Ejecuta /init usando SlashCommand
       - Usuario completa el proceso de /init
       - Vuelve al flujo "CON CLAUDE.md existente"

     NO usuario rechaza:
       - Inicia setup manual completo
       - Hace 13 preguntas una por una
       - Crea el archivo de configuración
       - Procede con el análisis original
```

## 💡 Ejemplo Práctico de Setup

### Escenario: Proyecto nuevo con CLAUDE.md

```
Usuario: @psoe-censo-analyzer-generic "Analiza el módulo de usuarios"

Agente:
  📋 Buscando configuración del proyecto...
  ❌ No encontré psoe-censo-analyzer-generic.project.settings.local.md
  🔍 Buscando CLAUDE.md...
  ✅ Encontré CLAUDE.md

  📖 Extrayendo información automáticamente de CLAUDE.md...

  ✅ Extraído:
     - Proyecto: "MiAppWeb"
     - Arquitectura: "N-tier layered (3 capas)"
     - Tecnología: "ASP.NET Core 6.0, C#, Entity Framework"
     - Patrones: "Repository, Unit of Work, Dependency Injection"
     - Dominios: "Users, Products, Orders, Payments"
     - Base de datos: "database/schema/"
     - Generación de código: "Entity Framework scaffolding"

  ❓ Solo necesito confirmar algunas cosas:

  1. ¿Dónde quieres que guarde toda la documentación de análisis?
     (Sugerencias: docs/analysis, documentation, CLAUDE_Flujo)

  Usuario: "docs/analysis"

  2. ¿Hay recursos adicionales importantes? (estatutos, specs, etc.)

  Usuario: "docs/API_Spec.md"

  ✅ ¡Configuración completada!

  📄 He creado psoe-censo-analyzer-generic.project.settings.local.md

  🚀 Ahora procedo con tu petición original: "Analiza el módulo de usuarios"...
```

**Tiempo total**: ~1 minuto

## 🧪 Pruebas a Realizar

Para verificar que todo funciona correctamente, reinicia Claude Code y prueba:

### Prueba 1: Verificar que el agente se carga
```
Comando: Listar agentes disponibles o verificar que aparece en la lista
Resultado esperado: Debe aparecer "psoe-censo-analyzer-generic"
```

### Prueba 2: Verificar carga de configuración existente
```
Petición: @psoe-censo-analyzer-generic "¿Cuál es la configuración del proyecto actual?"

Resultado esperado:
- Lee el archivo de configuración
- Muestra: nombre (PSOECenso), arquitectura (N-tier), dominios, rutas
- Confirma estar listo para trabajar
```

### Prueba 3: Análisis simple
```
Petición: @psoe-censo-analyzer-generic "Explícame brevemente qué es el dominio de Personas según la configuración"

Resultado esperado:
- Carga configuración
- Usa la información del dominio Personas de la config
- Responde basándose en la configuración cargada
```

### Prueba 4: Setup en proyecto nuevo (opcional)
```
1. Renombra temporalmente el archivo de configuración
2. Invoca el agente
3. Debe detectar la ausencia y comenzar el setup interactivo
4. Restaura el archivo original después de la prueba
```

## 📦 Reutilización en Otros Proyectos

Para usar este agente en un proyecto diferente:

### Opción A: Setup Automático
1. Copia solo `psoe-censo-analyzer-generic.local.md` al nuevo proyecto
2. En la primera invocación, el agente detectará que no hay configuración
3. Te guiará con 14 preguntas para crear la configuración del nuevo proyecto
4. Trabajará perfectamente adaptado al nuevo proyecto

### Opción B: Configuración Manual
1. Copia `psoe-censo-analyzer-generic.local.md`
2. Copia `psoe-censo-analyzer-generic.project.settings.local.md`
3. Edita manualmente el archivo de configuración con los datos del nuevo proyecto
4. El agente lo cargará automáticamente

## 🤖 Proceso de Extracción Automática

Cuando existe CLAUDE.md, el agente intenta extraer automáticamente:

### Información que se extrae de CLAUDE.md:
- ✅ **Nombre del proyecto**: Busca en la sección "Project Overview" o título principal
- ✅ **Descripción**: Primera descripción del proyecto encontrada
- ✅ **Tipo de arquitectura**: Busca menciones de "N-tier", "microservices", "monolith", etc.
- ✅ **Capas de arquitectura**: Extrae la lista de capas si está documentada
- ✅ **Stack tecnológico**: Framework, lenguaje, versión, ORMs, librerías
- ✅ **Patrones de diseño**: Facade, Repository, Factory, etc. si están mencionados
- ✅ **Dominios de negocio**: Módulos o áreas funcionales principales
- ✅ **Ubicación de base de datos**: Rutas a esquemas o scripts SQL
- ✅ **Convenciones de nomenclatura**: Prefijos, sufijos, patrones de nombres
- ✅ **Herramientas de generación de código**: netTiers, EF, etc.
- ✅ **Consideraciones especiales**: Restricciones, áreas sensibles, notas importantes

### Información que típicamente necesita preguntar:
- ❓ **Directorio raíz de documentación**: Dónde guardar el análisis generado (no suele estar en CLAUDE.md)
- ❓ **Recursos adicionales**: Documentos especiales del proyecto
- ❓ **Confirmaciones**: Validar información extraída si hay ambigüedad

**Resultado**: En lugar de 13 preguntas, típicamente solo 2-3 preguntas específicas.

## ⚙️ Preguntas del Setup Interactivo

### Con CLAUDE.md (Setup Rápido):
El agente muestra un resumen de lo extraído y pregunta solo lo que falta (~2-3 preguntas).

### Sin CLAUDE.md (Setup Manual Completo):
Cuando el agente no encuentra configuración ni CLAUDE.md, hace estas preguntas (una por una):

1. **Project Name**: Nombre del proyecto
2. **Project Description**: Descripción breve (1-2 líneas)
3. **Architecture Type**: Tipo de arquitectura (N-tier, microservices, etc.)
4. **Architecture Layers**: Capas principales en orden
5. **Technology Stack**: Lenguaje, framework, versión, librerías
6. **Key Design Patterns**: Patrones de diseño utilizados
7. **Business Domains**: Dominios de negocio principales
8. **Documentation Root Directory**: Ruta donde se guardará documentación
9. **Project Documentation Reference**: Archivo principal de documentación
10. **Database Schema Location**: Ubicación del esquema de BD
11. **Additional Resources**: Otros recursos importantes
12. **Naming Conventions**: Convenciones de nomenclatura específicas
13. **Code Generation**: Herramientas de generación de código
14. **Special Considerations**: Consideraciones especiales del proyecto

## 🎯 Ventajas del Nuevo Sistema

1. ✅ **Reutilizable**: Un solo agente sirve para múltiples proyectos
2. ✅ **Separación de responsabilidades**: Lógica genérica vs configuración específica
3. ✅ **Setup automático inteligente**: Configuración guiada con extracción automática
4. ✅ **Integración con /init**: Recomienda y ejecuta /init si no existe CLAUDE.md
5. ✅ **Menos preguntas**: Extrae información de CLAUDE.md automáticamente (reduce de 13 a ~2-3 preguntas)
6. ✅ **Mantenible**: Cambios en la metodología no afectan configuraciones
7. ✅ **Documentado**: Toda la configuración está explícita y legible
8. ✅ **Preserva el original**: El agente `psoe-censo-analyzer` sigue disponible
9. ✅ **Setup rápido**: Con CLAUDE.md, el setup toma menos de 1 minuto

## 📊 Comparación

| Característica | Agente Original | Agente Genérico |
|---------------|-----------------|-----------------|
| Reutilizable | ❌ Solo PSOECenso | ✅ Cualquier proyecto |
| Configuración | Hardcoded | Archivo separado |
| Setup | Manual | Automático/Interactivo |
| Integración /init | ❌ No | ✅ Sí, recomendado |
| Extracción CLAUDE.md | ❌ No | ✅ Automática |
| Preguntas setup | N/A | 13 (sin CLAUDE.md) / 2-3 (con CLAUDE.md) |
| Tiempo setup | N/A | <1 min (con CLAUDE.md) / 5-7 min (sin) |
| Color | Azul | Morado |
| Mantenimiento | Archivo único | Dos archivos |

## 🔍 Solución de Problemas

### El agente no aparece en la lista
- Reinicia Claude Code
- Verifica que el archivo tenga extensión `.local.md`
- Verifica que esté en `.claude/agents/`

### No carga la configuración
- Verifica que existe `psoe-censo-analyzer-generic.project.settings.local.md`
- Verifica que está en el mismo directorio que el agente
- Revisa los logs del agente para ver errores

### Setup interactivo no se inicia
- Verifica que NO existe el archivo de configuración
- El agente solo inicia setup si no encuentra configuración

## 📝 Notas Importantes

- Los archivos `.local.md` no se suben a Git (están en `.gitignore`)
- Cada proyecto puede tener su propia configuración
- La configuración puede editarse manualmente en cualquier momento
- El agente recarga la configuración en cada invocación

## ✅ Estado Actual

- ✅ Agente genérico creado y configurado
- ✅ Archivo de configuración de PSOECenso creado
- ✅ Lógica de detección implementada
- ✅ Setup interactivo implementado
- ⏳ Pendiente: Pruebas en sesión nueva de Claude Code

---

**Fecha de creación**: 2025-11-14
**Versión**: 1.0
**Autor**: Claude Code
