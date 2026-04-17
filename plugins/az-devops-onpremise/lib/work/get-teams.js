#!/usr/bin/env node
'use strict';

/**
 * work_get_teams
 * Lista todos los equipos del proyecto.
 *
 * Uso:
 *   node get-teams.js [top]
 *
 * Parámetros:
 *   top  (opcional)  Máximo de equipos a devolver. Default: 100.
 *
 * Ejemplos:
 *   node get-teams.js
 *   node get-teams.js 50
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, topArg = '100'] = process.argv;
  const top = parseInt(topArg, 10);

  const client = new AdoApiClient();

  try {
    // Los equipos se listan a nivel de colección, no de proyecto
    const url = client.collectionUrl(`/projects/${client.cfg.project}/teams`);
    const result = await client.get(url, { '$top': top });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
