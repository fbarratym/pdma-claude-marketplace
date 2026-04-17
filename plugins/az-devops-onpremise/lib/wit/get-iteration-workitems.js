#!/usr/bin/env node
'use strict';

/**
 * wit_get_iteration_workitems
 * Busca work items de una iteración concreta, con filtro opcional por estado y tipo.
 * Devuelve campos de tiempos (OriginalEstimate, RemainingWork, CompletedWork) incluidos.
 *
 * Uso:
 *   node get-iteration-workitems.js <iterationPath> [states] [types] [top]
 *
 * Parámetros:
 *   iterationPath  (requerido)  Ruta de la iteración o macro @currentIteration.
 *                               Ej: "@currentIteration"
 *                               Ej: "CENSO3\\1\\1.1.35 (2026 abril 2)"
 *   states         (opcional)   Estados separados por coma, o "all" para todos.
 *                               Default: "all"
 *                               Ej: "Active,Proposed"  /  "Closed"  /  "all"
 *   types          (opcional)   Tipos separados por coma, o "all" para todos.
 *                               Default: "all"
 *                               Ej: "Task,Bug"  /  "Task"  /  "all"
 *   top            (opcional)   Máximo de resultados. Default: 200.
 *
 * Salida: JSON con { count, iterationPath, workItems[] } incluyendo campos de tiempo.
 *
 * Ejemplos:
 *   node get-iteration-workitems.js @currentIteration
 *   node get-iteration-workitems.js @currentIteration Active,Proposed
 *   node get-iteration-workitems.js @currentIteration all Task,Bug
 *   node get-iteration-workitems.js "CENSO3\\1\\1.1.35 (2026 abril 2)" Active Task
 */

const AdoApiClient = require('../api-client');

// Campos a recuperar siempre (además de los básicos que devuelve WIQL)
const FIELDS_TO_EXPAND = [
  'System.Id',
  'System.Title',
  'System.WorkItemType',
  'System.State',
  'System.AssignedTo',
  'System.IterationPath',
  'System.AreaPath',
  'System.Parent',
  'System.Tags',
  'Microsoft.VSTS.Common.Priority',
  'Microsoft.VSTS.Scheduling.OriginalEstimate',
  'Microsoft.VSTS.Scheduling.RemainingWork',
  'Microsoft.VSTS.Scheduling.CompletedWork'
];

async function main() {
  const [,, iterationPathArg, statesArg = 'all', typesArg = 'all', topArg = '200'] = process.argv;

  if (!iterationPathArg) {
    console.error('ERROR: Se requiere la ruta de iteración o @currentIteration.');
    console.error('Uso: node get-iteration-workitems.js <iterationPath> [states] [types] [top]');
    console.error('Ejemplos:');
    console.error('  node get-iteration-workitems.js @currentIteration');
    console.error('  node get-iteration-workitems.js @currentIteration Active,Proposed Task,Bug');
    process.exit(1);
  }

  const top    = parseInt(topArg, 10);
  const client = new AdoApiClient();

  // ── Construir cláusula WHERE ───────────────────────────────────────────────

  const conditions = ['[System.TeamProject] = @project'];

  // Iteración
  if (iterationPathArg === '@currentIteration') {
    conditions.push('[System.IterationPath] = @currentIteration');
  } else {
    // Escapar comillas simples dentro de la ruta
    const escapedPath = iterationPathArg.replace(/'/g, "''");
    conditions.push(`[System.IterationPath] = '${escapedPath}'`);
  }

  // Estado
  if (statesArg && statesArg.toLowerCase() !== 'all') {
    const stateList = statesArg.split(',').map(s => `'${s.trim().replace(/'/g, "''")}'`).join(', ');
    conditions.push(`[System.State] IN (${stateList})`);
  }

  // Tipo
  if (typesArg && typesArg.toLowerCase() !== 'all') {
    const typeList = typesArg.split(',').map(t => `'${t.trim().replace(/'/g, "''")}'`).join(', ');
    conditions.push(`[System.WorkItemType] IN (${typeList})`);
  }

  const wiql = [
    `SELECT [System.Id]`,
    `FROM WorkItems`,
    `WHERE ${conditions.join(' AND ')}`,
    `ORDER BY [Microsoft.VSTS.Common.Priority], [System.Id]`
  ].join(' ');

  try {
    // ── Paso 1: Ejecutar WIQL para obtener IDs ─────────────────────────────
    const wiqlResult = await client.post('/wit/wiql', { query: wiql }, { '$top': top });

    const refs = wiqlResult.workItems || [];
    if (refs.length === 0) {
      console.log(JSON.stringify({
        count: 0,
        iterationPath: iterationPathArg,
        states: statesArg,
        types: typesArg,
        workItems: []
      }, null, 2));
      return;
    }

    // ── Paso 2: Obtener detalles con campos de tiempo (chunks de 200) ──────
    const ids      = refs.map(wi => wi.id);
    const allItems = [];

    for (let i = 0; i < ids.length; i += 200) {
      const chunk  = ids.slice(i, i + 200);
      const detail = await client.get('/wit/workitems', {
        'ids':    chunk.join(','),
        'fields': FIELDS_TO_EXPAND.join(',')
      });
      allItems.push(...(detail.value || []));
    }

    console.log(JSON.stringify({
      count:         allItems.length,
      iterationPath: iterationPathArg,
      states:        statesArg,
      types:         typesArg,
      workItems:     allItems
    }, null, 2));

  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
