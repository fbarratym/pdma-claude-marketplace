#!/usr/bin/env node
'use strict';

/**
 * wit_update_workitem
 * Actualiza campos de un work item existente.
 * Acepta pares clave=valor para los campos más habituales.
 *
 * Uso:
 *   node update-workitem.js <id> <campo=valor> [campo=valor ...]
 *
 * Campos disponibles:
 *   title=<texto>          System.Title
 *   state=<texto>          System.State          (Ej: Active, Proposed, Closed, Resolved)
 *   iteration=<ruta>       System.IterationPath  (Ej: "CENSO3\1\1.1.35 (2026 abril 2)")
 *   area=<ruta>            System.AreaPath
 *   estimate=<número>      Microsoft.VSTS.Scheduling.OriginalEstimate  (horas)
 *   remaining=<número>     Microsoft.VSTS.Scheduling.RemainingWork     (horas)
 *   completed=<número>     Microsoft.VSTS.Scheduling.CompletedWork     (horas)
 *   assigned=<usuario>     System.AssignedTo     (uniqueName, Ej: TYM\fbarra)
 *   priority=<1-4>         Microsoft.VSTS.Common.Priority
 *   comment=<texto>        System.History        (añade un comentario)
 *
 * Salida: JSON del work item actualizado.
 *
 * Ejemplos:
 *   node update-workitem.js 1234 state=Active remaining=5
 *   node update-workitem.js 1234 title="Nuevo título" estimate=8 remaining=8 completed=0
 *   node update-workitem.js 1234 iteration="CENSO3\1\1.1.36 (2026 mayo)"
 *   node update-workitem.js 1234 completed=3 remaining=5 comment="Avance del día"
 */

const AdoApiClient = require('../api-client');

// Mapa de alias a campo real de Azure DevOps
const FIELD_MAP = {
  title:      'System.Title',
  state:      'System.State',
  iteration:  'System.IterationPath',
  area:       'System.AreaPath',
  estimate:   'Microsoft.VSTS.Scheduling.OriginalEstimate',
  remaining:  'Microsoft.VSTS.Scheduling.RemainingWork',
  completed:  'Microsoft.VSTS.Scheduling.CompletedWork',
  assigned:   'System.AssignedTo',
  priority:   'Microsoft.VSTS.Common.Priority',
  comment:    'System.History'
};

// Campos numéricos
const NUMERIC_FIELDS = new Set(['estimate', 'remaining', 'completed', 'priority']);

function parseArgs(rawArgs) {
  const updates = {};
  for (const arg of rawArgs) {
    const eqIdx = arg.indexOf('=');
    if (eqIdx < 0) {
      console.error(`WARN: Argumento ignorado (sin '='): "${arg}"`);
      continue;
    }
    const key   = arg.slice(0, eqIdx).toLowerCase().trim();
    const value = arg.slice(eqIdx + 1).trim();

    if (!FIELD_MAP[key]) {
      console.error(`WARN: Campo desconocido ignorado: "${key}"`);
      console.error(`      Campos válidos: ${Object.keys(FIELD_MAP).join(', ')}`);
      continue;
    }

    updates[key] = NUMERIC_FIELDS.has(key) ? parseFloat(value) : value;
  }
  return updates;
}

async function main() {
  const [,, idArg, ...updateArgs] = process.argv;

  if (!idArg || isNaN(parseInt(idArg, 10))) {
    console.error('ERROR: Se requiere un ID de work item numérico.');
    console.error('Uso: node update-workitem.js <id> <campo=valor> [campo=valor ...]');
    process.exit(1);
  }

  if (updateArgs.length === 0) {
    console.error('ERROR: Se requiere al menos un campo a actualizar.');
    console.error(`Campos disponibles: ${Object.keys(FIELD_MAP).join(', ')}`);
    process.exit(1);
  }

  const id      = parseInt(idArg, 10);
  const updates = parseArgs(updateArgs);

  if (Object.keys(updates).length === 0) {
    console.error('ERROR: No se han podido parsear los campos a actualizar.');
    process.exit(1);
  }

  // Construir el JSON Patch document
  const patchDoc = Object.entries(updates).map(([key, value]) => ({
    op:    'replace',
    path:  `/fields/${FIELD_MAP[key]}`,
    value
  }));

  const client = new AdoApiClient();

  try {
    const result = await client.patch(`/wit/workitems/${id}`, patchDoc);
    console.log(JSON.stringify(result, null, 2));

    // Resumen en stderr para no contaminar stdout
    const f = result.fields || {};
    console.error(`\nWork item #${id} actualizado:`);
    for (const [key] of Object.entries(updates)) {
      const fieldName = FIELD_MAP[key];
      console.error(`  ${key}: ${f[fieldName]}`);
    }
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
