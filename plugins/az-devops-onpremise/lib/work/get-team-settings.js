#!/usr/bin/env node
'use strict';

/**
 * work_get_team_settings
 * Obtiene la configuración de un equipo: iteración de backlog, iteración por defecto,
 * días laborables, comportamiento de bugs, etc.
 *
 * Uso:
 *   node get-team-settings.js [team]
 *
 * Parámetros:
 *   team  (opcional)  Nombre del equipo. Default: valor de "defaultTeam" en config.
 *
 * Ejemplos:
 *   node get-team-settings.js
 *   node get-team-settings.js "CENSO3"
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, teamArg] = process.argv;

  const client = new AdoApiClient();
  const team   = teamArg || client.cfg.defaultTeam;

  try {
    const url    = client.teamUrl(team, '/work/teamsettings');
    const result = await client.get(url);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
