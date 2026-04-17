#!/usr/bin/env node
'use strict';

/**
 * wit_get_workitem_updates
 * Obtiene el historial de cambios (updates) de un work item.
 * Cada update refleja una revisión: qué campos cambiaron, quién y cuándo.
 *
 * Uso:
 *   node get-workitem-updates.js <id> [top] [skip]
 *
 * Parámetros:
 *   id    (requerido) ID del work item
 *   top   (opcional)  Número de updates a devolver. Default: 20.
 *   skip  (opcional)  Updates a omitir (paginación). Default: 0.
 *
 * Salida: JSON con array de revisiones en stdout.
 *
 * Ejemplos:
 *   node get-workitem-updates.js 1234
 *   node get-workitem-updates.js 1234 10
 *   node get-workitem-updates.js 1234 10 10   ← página 2
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, idArg, topArg = '20', skipArg = '0'] = process.argv;

  if (!idArg || isNaN(parseInt(idArg, 10))) {
    console.error('ERROR: Se requiere un ID de work item numérico.');
    console.error('Uso: node get-workitem-updates.js <id> [top] [skip]');
    process.exit(1);
  }

  const id   = parseInt(idArg, 10);
  const top  = parseInt(topArg, 10);
  const skip = parseInt(skipArg, 10);

  const client = new AdoApiClient();

  try {
    const result = await client.get(`/wit/workitems/${id}/updates`, {
      '$top':  top,
      '$skip': skip
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
