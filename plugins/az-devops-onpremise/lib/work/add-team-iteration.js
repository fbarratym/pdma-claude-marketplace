#!/usr/bin/env node
'use strict';

/**
 * work_add_team_iteration
 * Asigna una iteración existente del proyecto al planning de sprints de un equipo.
 * Se usa después de create-iteration.js para que el sprint aparezca en el equipo.
 *
 * Uso:
 *   node add-team-iteration.js <iterationId> [team]
 *
 * Parámetros:
 *   iterationId  (requerido)  GUID de la iteración (obtenido con create-iteration.js
 *                             o get-iterations.js buscando por nombre)
 *   team         (opcional)   Nombre del equipo. Default: "defaultTeam" del config.
 *
 * Salida: JSON de la iteración asignada al equipo.
 *
 * Ejemplos:
 *   node add-team-iteration.js a1b2c3d4-1234-5678-abcd-ef0123456789
 *   node add-team-iteration.js a1b2c3d4-1234-5678-abcd-ef0123456789 "CENSO3 Team"
 */

const AdoApiClient = require('../api-client');

// Regex para validar formato GUID
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function main() {
  const [,, iterationIdArg, teamArg] = process.argv;

  if (!iterationIdArg) {
    console.error('ERROR: Se requiere el ID (GUID) de la iteración.');
    console.error('Uso: node add-team-iteration.js <iterationId> [team]');
    console.error('El GUID se obtiene con create-iteration.js o get-iterations.js');
    process.exit(1);
  }

  if (!GUID_REGEX.test(iterationIdArg)) {
    console.error(`ERROR: El ID "${iterationIdArg}" no tiene formato GUID válido.`);
    console.error('Formato esperado: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    process.exit(1);
  }

  const client = new AdoApiClient();
  const team   = teamArg || client.cfg.defaultTeam;

  try {
    const url    = client.teamUrl(team, '/work/teamsettings/iterations');
    const result = await client.post(url, { id: iterationIdArg });
    console.log(JSON.stringify(result, null, 2));
    console.error(`\nIteración "${result.name}" asignada al equipo "${team}".`);
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('TF400507')) {
      console.error(`ERROR: Esta iteración ya está asignada al equipo "${team}".`);
    } else {
      console.error(`ERROR: ${e.message}`);
    }
    process.exit(1);
  }
}

main();
