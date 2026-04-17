#!/usr/bin/env node
'use strict';

/**
 * wit_get_workitem_comments
 * Obtiene los comentarios de un work item.
 *
 * Nota de compatibilidad:
 *   Los comentarios usan api-version 7.0-preview.3.
 *   En TFS 2018 / Azure DevOps Server 2019 puede no estar disponible.
 *   En ese caso, usar wit_get_workitem_updates que incluye comentarios
 *   como cambios en el campo 'System.History'.
 *
 * Uso:
 *   node get-workitem-comments.js <id> [top]
 *
 * Parámetros:
 *   id   (requerido) ID del work item
 *   top  (opcional)  Número de comentarios a devolver. Default: 20.
 *
 * Salida: JSON con array de comentarios en stdout.
 *
 * Ejemplos:
 *   node get-workitem-comments.js 1234
 *   node get-workitem-comments.js 1234 50
 */

const AdoApiClient = require('../api-client');

async function main() {
  const [,, idArg, topArg = '20'] = process.argv;

  if (!idArg || isNaN(parseInt(idArg, 10))) {
    console.error('ERROR: Se requiere un ID de work item numérico.');
    console.error('Uso: node get-workitem-comments.js <id> [top]');
    process.exit(1);
  }

  const id  = parseInt(idArg, 10);
  const top = parseInt(topArg, 10);

  const client = new AdoApiClient();

  try {
    const result = await client.get(`/wit/workitems/${id}/comments`, {
      '$top':       top,
      'api-version': '7.0-preview.3'
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    // Si falla el endpoint de comentarios, sugerir alternativa
    if (e.message.includes('404') || e.message.includes('not found')) {
      console.error(`ERROR: El endpoint de comentarios no está disponible en este servidor.`);
      console.error(`Alternativa: usa get-workitem-updates.js ${idArg} para ver comentarios`);
      console.error(`  (los comentarios aparecen como cambios en System.History)`);
    } else {
      console.error(`ERROR: ${e.message}`);
    }
    process.exit(1);
  }
}

main();
