#!/usr/bin/env node
'use strict';

/**
 * wit_get_workitems
 * Obtiene múltiples work items por sus IDs en una sola llamada (batch).
 *
 * Uso:
 *   node get-workitems.js <id1,id2,...> [expand]
 *
 * Parámetros:
 *   ids     (requerido) IDs separados por coma, sin espacios. Máximo 200.
 *   expand  (opcional)  None | Relations | Fields | Links | All. Default: None
 *
 * Salida: JSON con array "value" de work items en stdout.
 *
 * Ejemplos:
 *   node get-workitems.js 100,101,102
 *   node get-workitems.js 100,101 All
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, idsArg, expandArg = 'None'] = process.argv;

  if (!idsArg) {
    console.error('ERROR: Se requiere al menos un ID.');
    console.error('Uso: node get-workitems.js <id1,id2,...> [expand]');
    process.exit(1);
  }

  const ids = idsArg
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n));

  if (ids.length === 0) {
    console.error('ERROR: No se han proporcionado IDs válidos.');
    process.exit(1);
  }
  if (ids.length > 200) {
    console.error('ERROR: Máximo 200 IDs por llamada.');
    process.exit(1);
  }

  const client = new AdoApiClient();

  try {
    const result = await client.get('/wit/workitems', {
      'ids':     ids.join(','),
      '$expand': expandArg
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
