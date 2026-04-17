#!/usr/bin/env node
'use strict';

/**
 * wit_query_by_wiql
 * Ejecuta una consulta WIQL y devuelve los work items con sus detalles.
 *
 * Internamente hace dos llamadas:
 *   1. POST /wit/wiql  → devuelve solo los IDs que cumplen la query
 *   2. GET  /wit/workitems?ids=... → obtiene los detalles de esos IDs
 *
 * Uso:
 *   node query-wiql.js "<wiql_query>" [top]
 *
 * Parámetros:
 *   query  (requerido) Consulta WIQL entre comillas dobles
 *   top    (opcional)  Máximo de resultados. Default: 50. Máximo: 200.
 *
 * Macros WIQL disponibles: @project, @currentIteration, @me, @today
 *
 * Salida: JSON con { count, query, workItems[] } en stdout.
 *
 * Ejemplos:
 *   node query-wiql.js "SELECT [System.Id],[System.Title] FROM WorkItems WHERE [System.State]='Active'"
 *   node query-wiql.js "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType]='Bug'" 20
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, queryArg, topArg = '50'] = process.argv;

  if (!queryArg) {
    console.error('ERROR: Se requiere una consulta WIQL.');
    console.error('Uso: node query-wiql.js "<wiql>" [top]');
    process.exit(1);
  }

  const top = parseInt(topArg, 10);
  if (isNaN(top) || top < 1 || top > 200) {
    console.error('ERROR: top debe ser un número entre 1 y 200.');
    process.exit(1);
  }

  const client = new AdoApiClient();

  try {
    // ── Paso 1: Ejecutar WIQL → obtener IDs ───────────────────────────────
    const wiqlResult = await client.post(
      '/wit/wiql',
      { query: queryArg },
      { '$top': top }
    );

    const refs = wiqlResult.workItems || [];

    if (refs.length === 0) {
      console.log(JSON.stringify({ count: 0, query: queryArg, workItems: [] }, null, 2));
      return;
    }

    // ── Paso 2: Obtener detalles de los IDs resultantes ───────────────────
    const ids = refs.map(wi => wi.id);
    const detailsResult = await client.get('/wit/workitems', {
      'ids':     ids.join(','),
      '$expand': 'None'
    });

    const output = {
      count:     detailsResult.count || ids.length,
      query:     queryArg,
      workItems: detailsResult.value || []
    };

    console.log(JSON.stringify(output, null, 2));

  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
