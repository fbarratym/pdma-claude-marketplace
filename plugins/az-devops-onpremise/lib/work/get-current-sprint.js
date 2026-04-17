#!/usr/bin/env node
'use strict';

/**
 * work_get_current_sprint
 * Obtiene el sprint activo de un equipo.
 * Atajo de get-team-iterations.js con timeframe=current.
 *
 * Uso:
 *   node get-current-sprint.js [team]
 *
 * Parámetros:
 *   team  (opcional)  Nombre del equipo. Default: "defaultTeam" del config.
 *
 * Ejemplos:
 *   node get-current-sprint.js
 *   node get-current-sprint.js "CENSO3"
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, teamArg] = process.argv;

  const client = new AdoApiClient();
  const team   = teamArg || client.cfg.defaultTeam;

  try {
    const url    = client.teamUrl(team, '/work/teamsettings/iterations');
    const result = await client.get(url, { '$timeframe': 'current' });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
