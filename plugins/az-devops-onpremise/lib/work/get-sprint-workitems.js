#!/usr/bin/env node
'use strict';

/**
 * work_get_sprint_workitems
 * Obtiene los work items de un sprint con sus detalles completos.
 * Internamente hace dos llamadas:
 *   1. GET /teamsettings/iterations/{id}/workitems → relaciones (IDs)
 *   2. GET /wit/workitems?ids=... → detalles completos
 *
 * Uso:
 *   node get-sprint-workitems.js <iterationId> [team]
 *
 * Parámetros:
 *   iterationId  (requerido)  GUID del sprint (obtenido con get-team-iterations.js)
 *   team         (opcional)   Nombre del equipo. Default: "defaultTeam" del config.
 *
 * Ejemplos:
 *   node get-sprint-workitems.js a1b2c3d4-1234-5678-abcd-ef0123456789
 *   node get-sprint-workitems.js a1b2c3d4-1234-5678-abcd-ef0123456789 "CENSO3"
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, iterationIdArg, teamArg] = process.argv;

  if (!iterationIdArg) {
    console.error('ERROR: Se requiere el ID del sprint (GUID).');
    console.error('Usa get-team-iterations.js para obtener los IDs de los sprints.');
    console.error('Uso: node get-sprint-workitems.js <iterationId> [team]');
    process.exit(1);
  }

  const client = new AdoApiClient();
  const team   = teamArg || client.cfg.defaultTeam;

  try {
    // ── Paso 1: Obtener relaciones del sprint (solo IDs) ───────────────────
    const relUrl    = client.teamUrl(team, `/work/teamsettings/iterations/${iterationIdArg}/workitems`);
    const relResult = await client.get(relUrl);

    const relations = relResult.workItemRelations || [];
    if (relations.length === 0) {
      console.log(JSON.stringify({ count: 0, workItems: [] }, null, 2));
      return;
    }

    // Extraer IDs únicos de los targets
    const ids = [...new Set(
      relations
        .filter(r => r.target && r.target.id)
        .map(r => r.target.id)
    )];

    if (ids.length === 0) {
      console.log(JSON.stringify({ count: 0, workItems: [] }, null, 2));
      return;
    }

    // ── Paso 2: Obtener detalles completos ─────────────────────────────────
    // La API acepta máximo 200 IDs por llamada
    const chunks  = [];
    for (let i = 0; i < ids.length; i += 200) {
      chunks.push(ids.slice(i, i + 200));
    }

    const allItems = [];
    for (const chunk of chunks) {
      const detailResult = await client.get('/wit/workitems', {
        'ids':     chunk.join(','),
        '$expand': 'None'
      });
      allItems.push(...(detailResult.value || []));
    }

    // Incluir info de relaciones (padre/hijo) en la salida
    const output = {
      count:          allItems.length,
      iterationId:    iterationIdArg,
      team,
      workItemRelations: relations,
      workItems:      allItems
    };

    console.log(JSON.stringify(output, null, 2));

  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
