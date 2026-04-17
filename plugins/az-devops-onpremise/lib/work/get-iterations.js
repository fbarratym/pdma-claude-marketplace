#!/usr/bin/env node
'use strict';

/**
 * work_get_iterations
 * Obtiene el árbol completo de iteraciones definidas en el proyecto.
 * Muestra la jerarquía de sprints independientemente de los equipos.
 *
 * Uso:
 *   node get-iterations.js [depth]
 *
 * Parámetros:
 *   depth  (opcional)  Profundidad del árbol. Default: 10. Máx recomendado: 15.
 *
 * Ejemplos:
 *   node get-iterations.js
 *   node get-iterations.js 5
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, depthArg = '10'] = process.argv;
  const depth = parseInt(depthArg, 10);

  const client = new AdoApiClient();

  try {
    const result = await client.get('/wit/classificationnodes/iterations', {
      '$depth': depth
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
