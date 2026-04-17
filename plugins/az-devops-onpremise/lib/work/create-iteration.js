#!/usr/bin/env node
'use strict';

/**
 * work_create_iteration
 * Crea un nuevo nodo de iteración en el árbol del proyecto.
 * NOTA: Solo crea el nodo. Para que aparezca en los sprints de un equipo,
 *       usar add-team-iteration.js con el ID devuelto.
 *
 * Uso:
 *   node create-iteration.js <name> [startDate] [finishDate] [parentPath]
 *
 * Parámetros:
 *   name        (requerido)  Nombre de la iteración. Ej: "1.1.36 (2026 mayo)"
 *   startDate   (opcional)   Fecha de inicio en formato YYYY-MM-DD. Ej: "2026-05-05"
 *   finishDate  (opcional)   Fecha de fin en formato YYYY-MM-DD.   Ej: "2026-05-23"
 *   parentPath  (opcional)   Ruta del nodo padre relativa al proyecto.
 *                            Default: "" (raíz de iteraciones del proyecto).
 *                            Ej: "1" para crear dentro de la carpeta "1"
 *
 * Salida: JSON del nodo creado, incluyendo su "id" (GUID) para usar en add-team-iteration.js
 *
 * Ejemplos:
 *   node create-iteration.js "Sprint 42"
 *   node create-iteration.js "1.1.36 (2026 mayo)" 2026-05-05 2026-05-23
 *   node create-iteration.js "1.1.36 (2026 mayo)" 2026-05-05 2026-05-23 "1"
 */

const AdoApiClient = require('../api-client');

function toIsoDate(dateStr) {
  if (!dateStr) return undefined;
  // Acepta YYYY-MM-DD y lo convierte a ISO 8601
  const d = new Date(dateStr + 'T00:00:00.000Z');
  if (isNaN(d.getTime())) {
    console.error(`ERROR: Fecha inválida: "${dateStr}". Formato esperado: YYYY-MM-DD`);
    process.exit(1);
  }
  return d.toISOString();
}

async function main() {
  const [,, nameArg, startDateArg, finishDateArg, parentPathArg = ''] = process.argv;

  if (!nameArg) {
    console.error('ERROR: Se requiere el nombre de la iteración.');
    console.error('Uso: node create-iteration.js <name> [startDate] [finishDate] [parentPath]');
    console.error('Ejemplo: node create-iteration.js "1.1.36 (2026 mayo)" 2026-05-05 2026-05-23 "1"');
    process.exit(1);
  }

  const client = new AdoApiClient();

  // Construir el cuerpo de la petición
  const body = { name: nameArg };

  const startDate  = toIsoDate(startDateArg);
  const finishDate = toIsoDate(finishDateArg);

  if (startDate || finishDate) {
    body.attributes = {};
    if (startDate)  body.attributes.startDate  = startDate;
    if (finishDate) body.attributes.finishDate = finishDate;
  }

  // La ruta de la API incluye el parentPath si se especifica
  const apiPath = parentPathArg
    ? `/wit/classificationnodes/iterations/${parentPathArg.replace(/\\/g, '/')}`
    : '/wit/classificationnodes/iterations';

  try {
    const result = await client.post(apiPath, body);
    console.log(JSON.stringify(result, null, 2));
    console.error(`\nIteración creada: "${result.name}" (id: ${result.identifier})`);
    console.error(`Para asignarla a un equipo: node add-team-iteration.js ${result.identifier}`);
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('TF400507')) {
      console.error(`ERROR: Ya existe una iteración con el nombre "${nameArg}" en esa ruta.`);
    } else {
      console.error(`ERROR: ${e.message}`);
    }
    process.exit(1);
  }
}

main();
