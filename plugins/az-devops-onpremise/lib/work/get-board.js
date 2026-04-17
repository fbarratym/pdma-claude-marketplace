#!/usr/bin/env node
'use strict';

/**
 * work_get_board
 * Obtiene los detalles de un tablero Kanban: columnas, lanes (swimlanes),
 * tipos de work item permitidos y configuración de columnas.
 *
 * Uso:
 *   node get-board.js <boardName> [team]
 *
 * Parámetros:
 *   boardName  (requerido)  Nombre del tablero (obtenido con get-boards.js).
 *                           Ejemplos típicos: "Stories", "Backlog items", "Tasks"
 *   team       (opcional)   Nombre del equipo. Default: "defaultTeam" del config.
 *
 * Ejemplos:
 *   node get-board.js "Stories"
 *   node get-board.js "Backlog items" "CENSO3"
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, boardNameArg, teamArg] = process.argv;

  if (!boardNameArg) {
    console.error('ERROR: Se requiere el nombre del tablero.');
    console.error('Usa get-boards.js para ver los tableros disponibles.');
    console.error('Uso: node get-board.js <boardName> [team]');
    process.exit(1);
  }

  const client = new AdoApiClient();
  const team   = teamArg || client.cfg.defaultTeam;

  try {
    const url    = client.teamUrl(team, `/work/boards/${encodeURIComponent(boardNameArg)}`);
    const result = await client.get(url);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
