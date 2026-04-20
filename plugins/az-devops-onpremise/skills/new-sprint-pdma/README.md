# new-sprint-pdma

Skill para inicializar un nuevo sprint en Azure DevOps.

## Cómo funciona

Le dices cuál es la **iteración nueva** y el script deduce automáticamente cuál es la actual (la inmediatamente anterior en el árbol). Todas las tareas de la iteración actual se procesan así:

- **New** → se mueven directamente a la iteración nueva.
- **Active con trabajo hecho** (CompletedWork > 0) → se cierra el original y se crea una copia en la iteración nueva con las horas restantes.
- **Active sin trabajo hecho** (CompletedWork = 0) → se mueve directamente a la iteración nueva.
- **Closed / Resolved** → no se tocan.

Al final muestra un resumen de horas completadas por persona en la iteración que acaba de cerrar.

## Uso

```
node new-sprint-pdma.js <PROYECTO> "<ITERACION_NUEVA>"
```

Ejemplos:
```
node new-sprint-pdma.js AppCode "Iteration 4"
node new-sprint-pdma.js CENSO3 "1.1.36 (2026 mayo)"
```

El nombre del proyecto debe coincidir con el campo `name` de `config.local.json`.
La iteración nueva **debe existir previamente** en Azure DevOps.

## Comprobaciones previas

El script valida antes de tocar nada:

1. Que la iteración nueva existe en ADO.
2. Que no hay tareas Active/New en iteraciones anteriores a la actual.
3. Que no hay tareas Closed con horas restantes > 0.
4. Que no hay tareas Active con horas restantes = 0.

Si alguna comprobación falla, el script para y muestra las tareas problemáticas.
