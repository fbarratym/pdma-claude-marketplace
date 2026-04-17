#!/usr/bin/env node
'use strict';

/**
 * work_get_areas
 * Obtiene el árbol completo de áreas del proyecto.
 * Útil para conocer las rutas de área exactas al hacer consultas WIQL.
 *
 * Uso:
 *   node get-areas.js [depth]
 *
 * Parámetros:
 *   depth  (opcional)  Profundidad del árbol. Default: 10.
 *
 * Ejemplos:
 *   node get-areas.js
 *   node get-areas.js 3
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, depthArg = '10'] = process.argv;
  const depth = parseInt(depthArg, 10);

  const client = new AdoApiClient();

  try {
    const result = await client.get('/wit/classificationnodes/areas', {
      '$depth': depth
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
