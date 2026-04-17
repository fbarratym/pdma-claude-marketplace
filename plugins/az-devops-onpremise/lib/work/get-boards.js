#!/usr/bin/env node
'use strict';

/**
 * work_get_boards
 * Lista los tableros Kanban de un equipo.
 *
 * Uso:
 *   node get-boards.js [team]
 *
 * Parámetros:
 *   team  (opcional)  Nombre del equipo. Default: "defaultTeam" del config.
 *
 * Ejemplos:
 *   node get-boards.js
 *   node get-boards.js "CENSO3"
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, teamArg] = process.argv;

  const client = new AdoApiClient();
  const team   = teamArg || client.cfg.defaultTeam;

  try {
    const url    = client.teamUrl(team, '/work/boards');
    const result = await client.get(url);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
