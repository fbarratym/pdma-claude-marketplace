
  📁 Archivos en el directorio del agente

  .claude/agents/project-analyzer/
  ├── project-analyzer.md      # Archivo principal del agente
  ├── README.md                # Documentación de uso
  └── settings.json			   # Plantilla de configuración (se debe crear a mano o mediante la ayuda del agente, de forma automática, ya que preguntará los datos necesarios para crearlo)

  🎯 Cómo funciona ahora

  1. Primera vez: El agente preguntará la ruta de documentación y creará settings.json
  2. Usos posteriores: Leerá automáticamente la configuración de settings.json
  3. Colaborativo: Puedes commitear settings.json para que todo el equipo use la misma estructura

  ✨ Ventajas

  - Completamente reutilizable en cualquier proyecto
  - Sin referencias específicas a proyectos concretos
  - Configuración flexible y persistente
  - Fácil de compartir con el equipo

  El agente está listo para ser usado en cualquier proyecto de análisis de código legacy!