#!/usr/bin/env node
'use strict';

/**
 * work_get_queries
 * Lista las consultas guardadas del proyecto (carpetas y queries).
 * Útil para descubrir las queries compartidas del equipo.
 *
 * Uso:
 *   node get-queries.js [folder] [depth]
 *
 * Parámetros:
 *   folder  (opcional)  Carpeta a listar: "Shared Queries" | "My Queries" | ruta.
 *                       Default: "Shared Queries"
 *   depth   (opcional)  Profundidad de exploración. Default: 2. Máx: 5.
 *
 * Ejemplos:
 *   node get-queries.js
 *   node get-queries.js "Shared Queries" 3
 *   node get-queries.js "My Queries"
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, folderArg = 'Shared Queries', depthArg = '2'] = process.argv;
  const depth = Math.min(parseInt(depthArg, 10), 5);

  const client = new AdoApiClient();

  try {
    const result = await client.get(
      `/wit/queries/${encodeURIComponent(folderArg)}`,
      {
        '$depth':  depth,
        '$expand': 'all'
      }
    );
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    if (e.message.includes('404')) {
      console.error(`ERROR: Carpeta no encontrada: "${folderArg}"`);
      console.error('Carpetas disponibles normalmente: "Shared Queries", "My Queries"');
    } else {
      console.error(`ERROR: ${e.message}`);
    }
    process.exit(1);
  }
}

main();
