#!/usr/bin/env node
'use strict';

/**
 * wit_get_workitem
 * Obtiene un único work item por su ID con todos sus campos.
 *
 * Uso:
 *   node get-workitem.js <id> [expand]
 *
 * Parámetros:
 *   id      (requerido) ID numérico del work item
 *   expand  (opcional)  Nivel de expansión: None | Relations | Fields | Links | All
 *                       Default: All
 *
 * Salida: JSON del work item en stdout. Errores en stderr.
 *
 * Ejemplos:
 *   node get-workitem.js 1234
 *   node get-workitem.js 1234 Relations
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, idArg, expandArg = 'All'] = process.argv;

  if (!idArg || isNaN(parseInt(idArg, 10))) {
    console.error('ERROR: Se requiere un ID de work item numérico.');
    console.error('Uso: node get-workitem.js <id> [expand]');
    process.exit(1);
  }

  const id     = parseInt(idArg, 10);
  const expand = expandArg;
  const client = new AdoApiClient();

  try {
    const result = await client.get(`/wit/workitems/${id}`, {
      '$expand': expand
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
