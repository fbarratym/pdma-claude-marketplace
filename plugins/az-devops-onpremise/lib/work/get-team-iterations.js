#!/usr/bin/env node
'use strict';

/**
 * work_get_team_iterations
 * Lista los sprints/iteraciones de un equipo, opcionalmente filtrados por momento.
 *
 * Uso:
 *   node get-team-iterations.js [timeframe] [team]
 *
 * Parámetros:
 *   timeframe  (opcional)  Filtro temporal: current | past | future | (vacío = todos)
 *   team       (opcional)  Nombre del equipo. Default: "defaultTeam" del config.
 *
 * Ejemplos:
 *   node get-team-iterations.js                      <- todos los sprints
 *   node get-team-iterations.js current              <- sprint en curso
 *   node get-team-iterations.js future               <- sprints futuros
 *   node get-team-iterations.js past "CENSO3"
 */

const AdoApiClient = require('../api-client');

const VALID_TIMEFRAMES = ['current', 'past', 'future'];

async function main() {
  const [,, timeframeArg, teamArg] = process.argv;

  if (timeframeArg && !VALID_TIMEFRAMES.includes(timeframeArg)) {
    console.error(`ERROR: timeframe debe ser: ${VALID_TIMEFRAMES.join(' | ')} (o vacío para todos)`);
    process.exit(1);
  }

  const client = new AdoApiClient();
  const team   = teamArg || client.cfg.defaultTeam;
  const params = {};
  if (timeframeArg) params['$timeframe'] = timeframeArg;

  try {
    const url    = client.teamUrl(team, '/work/teamsettings/iterations');
    const result = await client.get(url, params);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
