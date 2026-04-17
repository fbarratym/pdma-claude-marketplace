#!/usr/bin/env node
'use strict';

/**
 * wit_copy_workitem
 * Crea una copia de un work item, equivalente a la opción web
 * "Crear copia del elemento de trabajo" con los checks:
 *   ✓ Incluir vínculos existentes
 *   ✓ Incluir datos adjuntos existentes
 *   ✓ Incluir elementos de trabajo secundarios (copia recursiva de hijos)
 *
 * Uso:
 *   node copy-workitem.js <id> [opciones]
 *
 * Opciones:
 *   --no-links          No copiar vínculos (relacionados, duplicados, etc.)
 *   --no-attachments    No copiar datos adjuntos
 *   --no-children       No copiar elementos secundarios recursivamente
 *   --iteration=<path>  Asignar a una iteración diferente. Ej: --iteration="CENSO3\1\1.1.36"
 *   --title=<texto>     Título para la copia (por defecto igual al original)
 *
 * Salida: JSON del work item raíz creado. Los hijos se reportan en stderr.
 *
 * Ejemplos:
 *   node copy-workitem.js 1234
 *   node copy-workitem.js 1234 --no-children
 *   node copy-workitem.js 1234 --iteration="CENSO3\1\1.1.36 (2026 mayo)"
 *   node copy-workitem.js 1234 --no-links --no-attachments --no-children
 */

const AdoApiClient = require('../api-client');

// Campos que NO se copian en la creación inicial (metadatos del sistema, IDs, fechas auto)
const EXCLUDE_FIELDS = new Set([
  'System.Id', 'System.Rev', 'System.AreaId', 'System.NodeName',
  'System.AreaLevel1', 'System.AreaLevel2', 'System.AreaLevel3',
  'System.AreaLevel4', 'System.AreaLevel5', 'System.AreaLevel6',
  'System.AreaLevel7', 'System.IterationId', 'System.IterationLevel1',
  'System.IterationLevel2', 'System.IterationLevel3', 'System.IterationLevel4',
  'System.IterationLevel5', 'System.IterationLevel6', 'System.IterationLevel7',
  'System.CreatedDate', 'System.CreatedBy', 'System.ChangedDate',
  'System.ChangedBy', 'System.AuthorizedDate', 'System.AuthorizedAs',
  'System.PersonId', 'System.Watermark', 'System.RevisedDate',
  'System.CommentCount', 'System.TeamProject', 'System.History',
  // La copia siempre queda en estado inicial (Proposed): nunca copiar ni restaurar el estado original
  'System.State', 'System.Reason',
  // Metadatos de transición de estado (los rellena ADO automáticamente)
  'Microsoft.VSTS.Common.StateChangeDate',
  'Microsoft.VSTS.Common.ActivatedDate', 'Microsoft.VSTS.Common.ActivatedBy',
  'Microsoft.VSTS.Common.ResolvedDate',  'Microsoft.VSTS.Common.ResolvedBy',
  'Microsoft.VSTS.Common.ResolvedReason',
  'Microsoft.VSTS.Common.ClosedDate',    'Microsoft.VSTS.Common.ClosedBy'
]);

// Tipos de relación que son vínculos (no jerarquía, no adjuntos)
const LINK_REL_PREFIXES = [
  'System.LinkTypes.Related',
  'System.LinkTypes.Dependency',
  'System.LinkTypes.Duplicate',
  'Microsoft.VSTS.Common.TestedBy',
  'Microsoft.VSTS.Common.Affects',
  'System.LinkTypes.Remote'
];

function isLinkRelation(rel) {
  return LINK_REL_PREFIXES.some(prefix => rel.startsWith(prefix));
}

function parseOptions(args) {
  const opts = {
    includeLinks:       true,
    includeAttachments: true,
    includeChildren:    true,
    iteration:          null,
    title:              null
  };
  for (const arg of args) {
    if (arg === '--no-links')       opts.includeLinks       = false;
    if (arg === '--no-attachments') opts.includeAttachments = false;
    if (arg === '--no-children')    opts.includeChildren    = false;
    if (arg.startsWith('--iteration=')) opts.iteration = arg.slice('--iteration='.length);
    if (arg.startsWith('--title='))    opts.title     = arg.slice('--title='.length);
  }
  return opts;
}

/**
 * Construye el JSON Patch doc para crear un work item copiando los campos del original.
 */
function buildFieldsPatch(sourceFields, opts) {
  const patchDoc = [];

  for (const [key, value] of Object.entries(sourceFields)) {
    if (EXCLUDE_FIELDS.has(key))                    continue;
    if (value === null || value === undefined)       continue;
    if (typeof value === 'string' && value === '')   continue;

    // Campos de identidad (AssignedTo, etc.): usar uniqueName
    let finalValue = value;
    if (typeof value === 'object' && value !== null) {
      if (value.uniqueName) finalValue = value.uniqueName;
      else continue; // objetos complejos sin uniqueName: omitir
    }

    patchDoc.push({ op: 'add', path: `/fields/${key}`, value: finalValue });
  }

  // Overrides de opciones
  if (opts.title) {
    const idx = patchDoc.findIndex(op => op.path === '/fields/System.Title');
    if (idx >= 0) patchDoc[idx].value = opts.title;
    else patchDoc.push({ op: 'add', path: '/fields/System.Title', value: opts.title });
  }

  if (opts.iteration) {
    const idx = patchDoc.findIndex(op => op.path === '/fields/System.IterationPath');
    if (idx >= 0) patchDoc[idx].value = opts.iteration;
    else patchDoc.push({ op: 'add', path: '/fields/System.IterationPath', value: opts.iteration });
  }

  return patchDoc;
}

/**
 * Copia recursivamente un work item y opcionalmente sus hijos.
 * @param {AdoApiClient} client
 * @param {number}       sourceId     ID del work item a copiar
 * @param {object}       opts         Opciones de copia
 * @param {number|null}  newParentId  ID del nuevo padre (para hijos recursivos)
 * @param {number}       depth        Nivel de recursión (para logs)
 * @returns {object} El nuevo work item creado
 */
async function copyWorkItem(client, sourceId, opts, newParentId = null, depth = 0) {
  const indent = '  '.repeat(depth);

  // ── 1. Leer el work item original con todas las relaciones ────────────────
  const source     = await client.get(`/wit/workitems/${sourceId}`, { '$expand': 'All' });
  const fields     = source.fields;
  const itemType   = fields['System.WorkItemType'];
  const title      = fields['System.Title'];
  const relations  = source.relations || [];

  console.error(`${indent}→ Copiando #${sourceId} [${itemType}] "${title}"`);

  // ── 2. Crear el nuevo work item con los campos copiados ───────────────────
  const patchDoc    = buildFieldsPatch(fields, depth === 0 ? opts : { ...opts, title: null, iteration: null });
  const encodedType = encodeURIComponent(`$${itemType}`);
  const newItem     = await client.postPatch(`/wit/workitems/${encodedType}`, patchDoc);
  const newId       = newItem.id;
  console.error(`${indent}  ✓ Creado #${newId}`);

  // ── 3. Vínculo Related entre copia y original ────────────────────────────
  // Siempre se añade: la copia queda relacionada con el original y viceversa.
  try {
    await client.patch(`/wit/workitems/${newId}`, [{
      op:    'add',
      path:  '/relations/-',
      value: { rel: 'System.LinkTypes.Related', url: source.url, attributes: { isLocked: false } }
    }]);
    console.error(`${indent}  ✓ Vínculo Related con el original #${sourceId}`);
  } catch (e) {
    console.error(`${indent}  ⚠ No se pudo añadir vínculo Related: ${e.message}`);
  }

  // ── 5. Añadir vínculo al nuevo padre (si es copia recursiva de hijo) ──────
  if (newParentId !== null) {
    const parentUrl = source.url.replace(/\/workItems\/\d+$/, `/workItems/${newParentId}`);
    await client.patch(`/wit/workitems/${newId}`, [{
      op:    'add',
      path:  '/relations/-',
      value: {
        rel:        'System.LinkTypes.Hierarchy-Reverse',
        url:        parentUrl,
        attributes: { isLocked: false }
      }
    }]);
    console.error(`${indent}  ✓ Vinculado al padre #${newParentId}`);
  }

  // ── 6. Copiar vínculos ───────────────────────────────────────────────────
  // Se copian: relacionados, dependencias, duplicados, etc.
  // En la copia raíz (no hijo recursivo) se copia también el vínculo Parent.
  // El vínculo Forward (hijos) no se copia: los hijos se recrean recursivamente en el paso 6.
  if (opts.includeLinks) {
    const links = relations.filter(r => {
      if (isLinkRelation(r.rel)) return true;
      // Copiar Parent solo para el elemento raíz (los hijos recursivos ya reciben su nuevo padre en el paso 3)
      if (newParentId === null && r.rel === 'System.LinkTypes.Hierarchy-Reverse') return true;
      return false;
    });
    if (links.length > 0) {
      const linksPatch = links.map(r => ({
        op:    'add',
        path:  '/relations/-',
        value: { rel: r.rel, url: r.url, attributes: r.attributes || {} }
      }));
      try {
        await client.patch(`/wit/workitems/${newId}`, linksPatch);
        console.error(`${indent}  ✓ ${links.length} vínculo(s) copiado(s)`);
      } catch (e) {
        console.error(`${indent}  ⚠ No se pudieron copiar algunos vínculos: ${e.message}`);
      }
    }
  }

  // ── 7. Copiar adjuntos ────────────────────────────────────────────────────
  if (opts.includeAttachments) {
    const attachments = relations.filter(r => r.rel === 'AttachedFile');
    for (const att of attachments) {
      const fileName = att.attributes?.name || 'attachment';
      try {
        // Descargar el adjunto original
        const buffer = await client.download(att.url);

        // Subir como nuevo adjunto
        const uploaded = await client.postBinary('/wit/attachments', buffer, { fileName });

        // Vincular al nuevo work item
        await client.patch(`/wit/workitems/${newId}`, [{
          op:    'add',
          path:  '/relations/-',
          value: {
            rel:        'AttachedFile',
            url:        uploaded.url,
            attributes: { comment: att.attributes?.comment || '', name: fileName }
          }
        }]);
        console.error(`${indent}  ✓ Adjunto copiado: "${fileName}"`);
      } catch (e) {
        console.error(`${indent}  ⚠ No se pudo copiar adjunto "${fileName}": ${e.message}`);
      }
    }
  }

  // ── 8. Copiar hijos recursivamente ────────────────────────────────────────
  if (opts.includeChildren) {
    const children = relations.filter(r => r.rel === 'System.LinkTypes.Hierarchy-Forward');
    for (const child of children) {
      // Extraer ID del hijo desde la URL
      const childId = parseInt(child.url.split('/').pop(), 10);
      if (!isNaN(childId)) {
        await copyWorkItem(client, childId, opts, newId, depth + 1);
      }
    }
  }

  return newItem;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const [,, idArg, ...flagArgs] = process.argv;

  if (!idArg || isNaN(parseInt(idArg, 10))) {
    console.error('ERROR: Se requiere un ID de work item numérico.');
    console.error('Uso: node copy-workitem.js <id> [--no-links] [--no-attachments] [--no-children] [--iteration=<path>] [--title=<texto>]');
    process.exit(1);
  }

  const sourceId = parseInt(idArg, 10);
  const opts     = parseOptions(flagArgs);

  console.error(`Copiando work item #${sourceId}...`);
  console.error(`  Vínculos: ${opts.includeLinks ? 'sí' : 'no'}`);
  console.error(`  Adjuntos: ${opts.includeAttachments ? 'sí' : 'no'}`);
  console.error(`  Hijos:    ${opts.includeChildren ? 'sí (recursivo)' : 'no'}`);
  if (opts.iteration) console.error(`  Iteración: ${opts.iteration}`);
  if (opts.title)     console.error(`  Título: ${opts.title}`);
  console.error('');

  const client = new AdoApiClient();

  try {
    const newItem = await copyWorkItem(client, sourceId, opts);
    console.error(`\n✓ Copia completada. Work item raíz: #${newItem.id}`);
    // Imprimir en stdout solo el work item raíz creado
    console.log(JSON.stringify(newItem, null, 2));
  } catch (e) {
    console.error(`\nERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
