#!/usr/bin/env node
'use strict';

/**
 * work_get_backlog
 * Obtiene los work items del backlog de un equipo para un nivel dado.
 * Internamente hace dos llamadas: primero los IDs del backlog, luego los detalles.
 *
 * Uso:
 *   node get-backlog.js [level] [team]
 *
 * Parámetros:
 *   level  (opcional)  Nivel del backlog. Default: "requirements"
 *                        requirements → Microsoft.RequirementCategory (User Stories / PBIs)
 *                        features     → Microsoft.FeatureCategory
 *                        epics        → Microsoft.EpicCategory
 *                        tasks        → Microsoft.TaskCategory
 *   team   (opcional)  Nombre del equipo. Default: "defaultTeam" del config.
 *
 * Ejemplos:
 *   node get-backlog.js
 *   node get-backlog.js requirements
 *   node get-backlog.js features "CENSO3"
 *   node get-backlog.js epics
 */

const AdoApiClient = require('../api-client');

const BACKLOG_LEVELS = {
  requirements: 'Microsoft.RequirementCategory',
  features:     'Microsoft.FeatureCategory',
  epics:        'Microsoft.EpicCategory',
  tasks:        'Microsoft.TaskCategory'
};

async function main() {
  const [,, levelArg = 'requirements', teamArg] = process.argv;

  const backlogId = BACKLOG_LEVELS[levelArg.toLowerCase()];
  if (!backlogId) {
    console.error(`ERROR: Nivel de backlog no reconocido: "${levelArg}"`);
    console.error(`Valores válidos: ${Object.keys(BACKLOG_LEVELS).join(', ')}`);
    process.exit(1);
  }

  const client = new AdoApiClient();
  const team   = teamArg || client.cfg.defaultTeam;

  try {
    // ── Paso 1: Obtener IDs del backlog ────────────────────────────────────
    const backlogUrl    = client.teamUrl(team, `/work/backlogs/${backlogId}/workItems`);
    const backlogResult = await client.get(backlogUrl);

    const workItemRefs = backlogResult.workItems || [];
    if (workItemRefs.length === 0) {
      console.log(JSON.stringify({ count: 0, level: levelArg, workItems: [] }, null, 2));
      return;
    }

    const ids = workItemRefs
      .filter(wi => wi.target && wi.target.id)
      .map(wi => wi.target.id);

    // ── Paso 2: Obtener detalles (chunks de 200) ────────────────────────────
    const allItems = [];
    for (let i = 0; i < ids.length; i += 200) {
      const chunk       = ids.slice(i, i + 200);
      const detailResult = await client.get('/wit/workitems', {
        'ids':     chunk.join(','),
        '$expand': 'None'
      });
      allItems.push(...(detailResult.value || []));
    }

    const output = {
      count:    allItems.length,
      level:    levelArg,
      team,
      workItems: allItems
    };

    console.log(JSON.stringify(output, null, 2));

  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
