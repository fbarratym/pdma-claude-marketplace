#!/usr/bin/env node
'use strict';

/**
 * new-sprint-pdma
 * Script autónomo para inicializar un nuevo sprint PDMA.
 *
 * Uso:
 *   node new-sprint-pdma.js "<ITERACION_PRINCIPAL_NUEVA>"
 *
 * Donde ITERACION_PRINCIPAL_NUEVA es el nombre EXACTO de la iteración destino
 * (ya debe existir en Azure DevOps).
 *
 * Ejemplo:
 *   node new-sprint-pdma.js "1.1.36 (2026 mayo)"
 *
 * El script:
 *   1. Valida que la iteración existe y localiza la anterior (ITERACION_ACTUAL).
 *   2. Comprueba que las 5 iteraciones previas no tienen tareas/bugs Active o Proposed.
 *   3. Comprueba que ITERACION_ACTUAL no tiene Resolved/Closed con RemainingWork > 0.
 *   4. Comprueba que ITERACION_ACTUAL no tiene Active con RemainingWork <= 0.
 *   5. Procesa Proposed (mueve) y Active (divide en copia nueva + original resuelto).
 *   6. Muestra resumen de CompletedWork por persona en ITERACION_ACTUAL.
 */

const AdoApiClient = require('../api-client');

// ── Constantes ─────────────────────────────────────────────────────────────

const WORK_ITEM_TYPES = ['Task', 'Bug'];

const FIELDS_BASIC = [
  'System.Id',
  'System.Title',
  'System.WorkItemType',
  'System.State',
  'System.AssignedTo',
  'System.IterationPath',
  'Microsoft.VSTS.Scheduling.OriginalEstimate',
  'Microsoft.VSTS.Scheduling.RemainingWork',
  'Microsoft.VSTS.Scheduling.CompletedWork'
].join(',');

// Campos que nunca se copian en la creación de un work item
const EXCLUDE_FIELDS = new Set([
  'System.Id', 'System.Rev', 'System.AreaId', 'System.NodeName',
  'System.AreaLevel1', 'System.AreaLevel2', 'System.AreaLevel3',
  'System.AreaLevel4', 'System.AreaLevel5', 'System.AreaLevel6', 'System.AreaLevel7',
  'System.IterationId',
  'System.IterationLevel1', 'System.IterationLevel2', 'System.IterationLevel3',
  'System.IterationLevel4', 'System.IterationLevel5', 'System.IterationLevel6', 'System.IterationLevel7',
  'System.CreatedDate', 'System.CreatedBy',
  'System.ChangedDate', 'System.ChangedBy',
  'System.AuthorizedDate', 'System.AuthorizedAs',
  'System.PersonId', 'System.Watermark', 'System.RevisedDate',
  'System.CommentCount', 'System.TeamProject', 'System.History',
  // Estado: la copia siempre nace en Proposed (luego se cambia por PATCH)
  'System.State', 'System.Reason',
  // Metadatos de transición de estado (los gestiona ADO automáticamente)
  'Microsoft.VSTS.Common.StateChangeDate',
  'Microsoft.VSTS.Common.ActivatedDate', 'Microsoft.VSTS.Common.ActivatedBy',
  'Microsoft.VSTS.Common.ResolvedDate',  'Microsoft.VSTS.Common.ResolvedBy',
  'Microsoft.VSTS.Common.ResolvedReason',
  'Microsoft.VSTS.Common.ClosedDate',    'Microsoft.VSTS.Common.ClosedBy',
  // Tiempos: los sobreescribimos explícitamente en los overrides
  'Microsoft.VSTS.Scheduling.OriginalEstimate',
  'Microsoft.VSTS.Scheduling.RemainingWork',
  'Microsoft.VSTS.Scheduling.CompletedWork'
]);

// Relaciones que son vínculos (se copian; excluye jerarquía y adjuntos)
const LINK_REL_PREFIXES = [
  'System.LinkTypes.Related',
  'System.LinkTypes.Dependency',
  'System.LinkTypes.Duplicate',
  'Microsoft.VSTS.Common.TestedBy',
  'Microsoft.VSTS.Common.Affects',
  'System.LinkTypes.Remote'
];

// ── Utilidades ──────────────────────────────────────────────────────────────

function isLinkRelation(rel) {
  return LINK_REL_PREFIXES.some(prefix => rel.startsWith(prefix));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Incrementa el número al final del título para la copia:
 *   "Hacer algo (2)"  → "Hacer algo (3)"
 *   "Hacer algo"      → "Hacer algo (2)"
 */
function titleForCopy(title) {
  const m = title.match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (m) return `${m[1]} (${parseInt(m[2], 10) + 1})`;
  return `${title} (2)`;
}

/**
 * Añade (1) al original si no tiene número; si ya lo tiene, lo deja igual:
 *   "Hacer algo"      → "Hacer algo (1)"
 *   "Hacer algo (2)"  → "Hacer algo (2)"
 */
function titleForOriginal(title) {
  if (/\(\d+\)\s*$/.test(title)) return title;
  return `${title} (1)`;
}

/**
 * Aplana el árbol de iteraciones devolviendo solo los nodos hoja (sprints reales),
 * en el orden en que aparecen en el árbol.
 *
 * El nodo raíz devuelto por la API tiene:
 *   name: "PROYECTO"   path: "\PROYECTO\Iteration"
 * Sus hijos (o nietos) son las iteraciones reales. El segmento "Iteration" es
 * interno de ADO y no aparece en System.IterationPath de los work items.
 * Sistema.IterationPath real = projectName + nodePath.slice(rootPath.length)
 *   Ej: rootPath="\AppCode\Iteration", nodePath="\AppCode\Iteration\Iteration 1"
 *       → "AppCode" + "\Iteration 1" = "AppCode\Iteration 1"  ✓
 */
function flattenIterations(rootNode) {
  const rootPath    = rootNode.path;    // e.g. "\AppCode\Iteration"
  const projectName = rootNode.name;    // e.g. "AppCode"
  const acc = [];

  function recurse(node) {
    if (node.children && node.children.length > 0) {
      for (const child of node.children) recurse(child);
    } else {
      const suffix   = node.path.slice(rootPath.length); // e.g. "\Iteration 1"
      const iterPath = projectName + suffix;              // e.g. "AppCode\Iteration 1"
      acc.push({ name: node.name, path: iterPath, identifier: node.identifier });
    }
  }

  recurse(rootNode);
  return acc;
}

/**
 * Imprime un resumen compacto de work items para los checks previos.
 */
function printBlockSummary(items, label) {
  console.error(`\n⚠  ${label}:`);
  console.error('─'.repeat(72));
  for (const wi of items) {
    const f  = wi.fields;
    const at = f['System.AssignedTo']?.displayName || '(sin asignar)';
    const rw = f['Microsoft.VSTS.Scheduling.RemainingWork'] ?? '—';
    console.error(`  #${wi.id}  [${f['System.WorkItemType']}] [${f['System.State']}]  RW:${rw}h  ${at}`);
    console.error(`       "${f['System.Title']}"`);
  }
  console.error('─'.repeat(72));
}

// ── Detección de estados del proyecto ───────────────────────────────────────

/**
 * Detecta automáticamente los nombres de estado para este proyecto consultando
 * la API de tipos de work item. Usa las categorías de ADO (independientes del
 * template: Agile, Scrum, CMMI o custom) para mapear conceptos semánticos:
 *
 *   proposed → categoría "Proposed"  (CMMI: "Proposed", Agile/Scrum: "New")
 *   active   → "Active" (igual en todos los templates)
 *   resolved → categoría "Resolved"  (CMMI: "Resolved")
 *              o categoría "Completed" si no existe "Resolved" (Agile: "Closed", Scrum: "Done")
 *
 * @returns {{ proposed: string, active: string, resolved: string }}
 */
async function detectStates(client) {
  let states = [];
  try {
    const r = await client.get('/wit/workitemtypes/Task/states');
    states   = r.value || [];
  } catch (e) {
    console.error(`  ⚠ No se pudieron detectar estados (${e.message}). Usando defaults CMMI.`);
  }

  // Índice por categoría (primera coincidencia)
  const byCategory = {};
  for (const s of states) {
    if (!byCategory[s.category]) byCategory[s.category] = s.name;
  }

  const proposed = byCategory['Proposed']  || 'Proposed';
  const resolved = byCategory['Resolved']  || byCategory['Completed'] || 'Resolved';

  return { proposed, active: 'Active', resolved };
}

// ── Acceso a datos ──────────────────────────────────────────────────────────

/**
 * Busca work items de una iteración con filtros opcionales de estado y tipo.
 * Siempre filtra por Task y Bug salvo que se indique lo contrario.
 *
 * @param {AdoApiClient} client
 * @param {string} iterationPath  Ruta completa, ej: "CENSO3\1\1.1.35 (2026 abril 2)"
 * @param {string[]|null} states  null = sin filtro de estado
 * @param {string[]} types        Default: Task y Bug
 */
async function getItems(client, iterationPath, states = null, types = WORK_ITEM_TYPES) {
  const escapedPath = iterationPath.replace(/'/g, "''");
  const conds = [
    '[System.TeamProject] = @project',
    `[System.IterationPath] = '${escapedPath}'`
  ];

  if (states && states.length > 0) {
    conds.push(`[System.State] IN (${states.map(s => `'${s}'`).join(', ')})`);
  }
  if (types && types.length > 0) {
    conds.push(`[System.WorkItemType] IN (${types.map(t => `'${t}'`).join(', ')})`);
  }

  const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${conds.join(' AND ')} ORDER BY [System.Id]`;
  const result = await client.post('/wit/wiql', { query: wiql }, { '$top': 500 });
  const refs = result.workItems || [];
  if (refs.length === 0) return [];

  const ids   = refs.map(r => r.id);
  const items = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk  = ids.slice(i, i + 200);
    const detail = await client.get('/wit/workitems', { ids: chunk.join(','), fields: FIELDS_BASIC });
    items.push(...(detail.value || []));
  }
  return items;
}

// ── Lógica de copia ─────────────────────────────────────────────────────────

/**
 * Construye el JSON Patch para crear un work item copiando los campos del original.
 * Los campos de overrides sustituyen o añaden sobre los del original.
 */
function buildFieldsPatch(sourceFields, overrides = {}) {
  const patchDoc = [];

  for (const [key, value] of Object.entries(sourceFields)) {
    if (EXCLUDE_FIELDS.has(key))                  continue;
    if (value === null || value === undefined)     continue;
    if (typeof value === 'string' && value === '') continue;

    let finalValue = value;
    if (typeof value === 'object' && value !== null) {
      if (value.uniqueName) finalValue = value.uniqueName;
      else continue;
    }

    patchDoc.push({ op: 'add', path: `/fields/${key}`, value: finalValue });
  }

  for (const [key, value] of Object.entries(overrides)) {
    const idx = patchDoc.findIndex(op => op.path === `/fields/${key}`);
    if (idx >= 0) patchDoc[idx].value = value;
    else patchDoc.push({ op: 'add', path: `/fields/${key}`, value });
  }

  return patchDoc;
}

/**
 * Crea una copia de un work item con los overrides indicados.
 * Añade siempre: vínculo Related con el original, vínculo Parent del original,
 * demás vínculos y adjuntos.
 * NO copia hijos.
 *
 * @param {AdoApiClient} client
 * @param {number}       sourceId   ID del work item original
 * @param {object}       overrides  Campos a sobreescribir (key = campo ADO, value = valor)
 * @returns {number}     ID del nuevo work item
 */
async function createCopy(client, sourceId, overrides) {
  // Leer el original con todas sus relaciones
  const source    = await client.get(`/wit/workitems/${sourceId}`, { '$expand': 'All' });
  const fields    = source.fields;
  const relations = source.relations || [];
  const itemType  = fields['System.WorkItemType'];

  // Crear el nuevo work item
  const patchDoc    = buildFieldsPatch(fields, overrides);
  const encodedType = encodeURIComponent(`$${itemType}`);
  const newItem     = await client.postPatch(`/wit/workitems/${encodedType}`, patchDoc);
  const newId       = newItem.id;

  // Vínculo Related con el original (siempre)
  try {
    await client.patch(`/wit/workitems/${newId}`, [{
      op: 'add', path: '/relations/-',
      value: { rel: 'System.LinkTypes.Related', url: source.url, attributes: { isLocked: false } }
    }]);
  } catch (e) {
    console.error(`    ⚠ No se pudo añadir vínculo Related al original: ${e.message}`);
  }

  // Vínculo Parent del original (si lo tiene)
  const parentRel = relations.find(r => r.rel === 'System.LinkTypes.Hierarchy-Reverse');
  if (parentRel) {
    try {
      await client.patch(`/wit/workitems/${newId}`, [{
        op: 'add', path: '/relations/-',
        value: { rel: 'System.LinkTypes.Hierarchy-Reverse', url: parentRel.url, attributes: { isLocked: false } }
      }]);
    } catch (e) {
      console.error(`    ⚠ No se pudo añadir vínculo Parent: ${e.message}`);
    }
  }

  // Otros vínculos (Related, Dependency, Duplicate, etc.)
  const links = relations.filter(r => isLinkRelation(r.rel));
  if (links.length > 0) {
    try {
      await client.patch(`/wit/workitems/${newId}`, links.map(r => ({
        op: 'add', path: '/relations/-',
        value: { rel: r.rel, url: r.url, attributes: r.attributes || {} }
      })));
    } catch (e) {
      console.error(`    ⚠ No se pudieron copiar algunos vínculos: ${e.message}`);
    }
  }

  // Adjuntos
  const attachments = relations.filter(r => r.rel === 'AttachedFile');
  for (const att of attachments) {
    const fileName = att.attributes?.name || 'attachment';
    try {
      const buffer   = await client.download(att.url);
      const uploaded = await client.postBinary('/wit/attachments', buffer, { fileName });
      await client.patch(`/wit/workitems/${newId}`, [{
        op: 'add', path: '/relations/-',
        value: { rel: 'AttachedFile', url: uploaded.url, attributes: { comment: att.attributes?.comment || '', name: fileName } }
      }]);
    } catch (e) {
      console.error(`    ⚠ No se pudo copiar adjunto "${fileName}": ${e.message}`);
    }
  }

  return newId;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [,, iterArg] = process.argv;

  if (!iterArg) {
    console.error('ERROR: Se requiere el nombre exacto de la iteración destino.');
    console.error('Uso: node new-sprint-pdma.js "<ITERACION_PRINCIPAL_NUEVA>"');
    console.error('Ejemplo: node new-sprint-pdma.js "1.1.36 (2026 mayo)"');
    process.exit(1);
  }

  const client = new AdoApiClient();

  // ────────────────────────────────────────────────────────────────────────────
  // [1/6] Cargar iteraciones y validar entrada
  // ────────────────────────────────────────────────────────────────────────────
  console.error('Cargando árbol de iteraciones...');
  const treeRoot = await client.get('/wit/classificationnodes/iterations', { '$depth': 10 });
  const allIters = flattenIterations(treeRoot);

  const idxNueva = allIters.findIndex(it => it.name === iterArg);
  if (idxNueva < 0) {
    console.error(`\nERROR: No existe ninguna iteración con el nombre "${iterArg}".`);
    console.error('\nIteraciones disponibles:');
    allIters.forEach(it => console.error(`  · ${it.name}`));
    process.exit(1);
  }
  if (idxNueva === 0) {
    console.error(`ERROR: "${iterArg}" es la primera iteración; no tiene iteración anterior.`);
    process.exit(1);
  }

  const ITER_NUEVA   = allIters[idxNueva];
  const ITER_ACTUAL  = allIters[idxNueva - 1];

  console.error(`\n  Iteración destino (nueva):  "${ITER_NUEVA.name}"`);
  console.error(`  Iteración origen (actual):  "${ITER_ACTUAL.name}"`);

  // ────────────────────────────────────────────────────────────────────────────
  // [1b] Detectar estados del proyecto (se adapta a Agile, Scrum, CMMI, custom)
  // ────────────────────────────────────────────────────────────────────────────
  console.error('\nDetectando estados del proyecto...');
  const ST = await detectStates(client);
  // Estados "cerrado": el resolved + "Closed" como red de seguridad (sin duplicados)
  const closedStates = [...new Set([ST.resolved, 'Closed'])];
  console.error(`  Estados detectados → pendiente: "${ST.proposed}" | activo: "${ST.active}" | cierre: "${ST.resolved}"`);

  // ────────────────────────────────────────────────────────────────────────────
  // [2/6] Revisar 5 iteraciones anteriores a ITERACION_ACTUAL
  // ────────────────────────────────────────────────────────────────────────────
  console.error('\n[2/6] Revisando iteraciones anteriores por pendientes...');
  const prevIters = allIters.slice(Math.max(0, idxNueva - 6), idxNueva - 1);
  let hayPendientesAnteriores = false;

  for (const iter of prevIters) {
    const pending = await getItems(client, iter.path, [ST.active, ST.proposed]);
    if (pending.length > 0) {
      printBlockSummary(pending, `Pendientes en "${iter.name}"`);
      hayPendientesAnteriores = true;
    }
  }

  if (hayPendientesAnteriores) {
    console.error(`\n❌ Hay tareas/bugs "${ST.active}" o "${ST.proposed}" en iteraciones anteriores.`);
    console.error('   Ciérralas o muévelas antes de continuar.');
    process.exit(1);
  }
  console.error('  ✓ Sin pendientes en iteraciones anteriores.');

  // ────────────────────────────────────────────────────────────────────────────
  // [3/6] Cerradas con RemainingWork > 0 en ITERACION_ACTUAL
  // ────────────────────────────────────────────────────────────────────────────
  console.error(`\n[3/6] Revisando ${closedStates.join('/')} con horas restantes en iteración actual...`);
  const resolvedConRemaining = (await getItems(client, ITER_ACTUAL.path, closedStates))
    .filter(wi => (wi.fields['Microsoft.VSTS.Scheduling.RemainingWork'] ?? 0) > 0);

  if (resolvedConRemaining.length > 0) {
    printBlockSummary(resolvedConRemaining, `${closedStates.join('/')} con RemainingWork > 0`);
    console.error('\n❌ Corrígelas antes de continuar (pon RemainingWork a 0 o devuélvelas a Active).');
    process.exit(1);
  }
  console.error('  ✓ Sin tareas cerradas con horas restantes.');

  // ────────────────────────────────────────────────────────────────────────────
  // [4/6] Active con RemainingWork <= 0 en ITERACION_ACTUAL
  // ────────────────────────────────────────────────────────────────────────────
  console.error(`\n[4/6] Revisando "${ST.active}" con horas restantes a 0...`);
  const activeConCeroRemaining = (await getItems(client, ITER_ACTUAL.path, [ST.active]))
    .filter(wi => (wi.fields['Microsoft.VSTS.Scheduling.RemainingWork'] ?? 0) <= 0);

  if (activeConCeroRemaining.length > 0) {
    printBlockSummary(activeConCeroRemaining, `"${ST.active}" con RemainingWork <= 0`);
    console.error('\n❌ Corrígelas antes de continuar (ciérralas o asigna horas restantes).');
    process.exit(1);
  }
  console.error('  ✓ Sin activas con horas a 0.');

  // ────────────────────────────────────────────────────────────────────────────
  // [5/6] Procesar Proposed y Active de ITERACION_ACTUAL
  // ────────────────────────────────────────────────────────────────────────────
  console.error('\n[5/6] Procesando tareas y bugs de la iteración actual...\n');

  const toProcess = await getItems(client, ITER_ACTUAL.path, [ST.proposed, ST.active]);

  if (toProcess.length === 0) {
    console.error('  (No hay tareas Proposed ni Active que procesar)');
  }

  let countMovidas = 0;
  let countCopiadas = 0;

  for (const wi of toProcess) {
    const f      = wi.fields;
    const id     = wi.id;
    const state  = f['System.State'];
    const title  = f['System.Title'];
    const type   = f['System.WorkItemType'];
    const rw     = f['Microsoft.VSTS.Scheduling.RemainingWork'] ?? 0;
    const est    = f['Microsoft.VSTS.Scheduling.OriginalEstimate'] ?? 0;

    if (state === ST.proposed) {
      // ── Proposed/New: mover a la nueva iteración ──────────────────────────
      console.error(`  → #${id} [${type}] ${ST.proposed}: moviendo a "${ITER_NUEVA.name}"...`);
      await client.patch(`/wit/workitems/${id}`, [{
        op: 'replace', path: '/fields/System.IterationPath', value: ITER_NUEVA.path
      }]);
      console.error(`    ✓ Movida`);
      countMovidas++;

    } else if (state === ST.active) {
      // ── Active: dividir en copia nueva + original resuelto ────────────────
      console.error(`  → #${id} [${type}] Active: "${title}"`);
      console.error(`    Estimate original: ${est}h  |  Remaining: ${rw}h`);

      // — Calcular nuevo estimate para el original —
      let newEst = round2(est - rw);
      if (newEst <= 0) newEst = round2(est / 2);

      // — Crear TASK_NUEVA (copia en nueva iteración, en estado Active) —
      const newTitle = titleForCopy(title);
      console.error(`    Creando copia: "${newTitle}"...`);

      const newId = await createCopy(client, id, {
        'System.Title':                               newTitle,
        'System.IterationPath':                        ITER_NUEVA.path,
        'Microsoft.VSTS.Scheduling.OriginalEstimate': rw,
        'Microsoft.VSTS.Scheduling.RemainingWork':    rw,
        'Microsoft.VSTS.Scheduling.CompletedWork':    0
      });
      console.error(`    ✓ Copia creada: #${newId}`);

      // Poner TASK_NUEVA en Active (nace en Proposed por defecto ADO)
      try {
        await client.patch(`/wit/workitems/${newId}`, [{
          op: 'replace', path: '/fields/System.State', value: 'Active'
        }]);
        console.error(`    ✓ #${newId} → Active`);
      } catch (e) {
        console.error(`    ⚠ No se pudo poner #${newId} en Active: ${e.message}`);
      }

      // — Actualizar TASK_ORIGINAL (→ estado de cierre, título con (1), tiempos ajustados) —
      const origTitle = titleForOriginal(title);
      await client.patch(`/wit/workitems/${id}`, [
        { op: 'replace', path: '/fields/System.State',                               value: ST.resolved },
        { op: 'replace', path: '/fields/System.Title',                               value: origTitle },
        { op: 'replace', path: '/fields/Microsoft.VSTS.Scheduling.OriginalEstimate', value: newEst },
        { op: 'replace', path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork',    value: 0 }
      ]);
      console.error(`    ✓ Original #${id} → ${ST.resolved} | título: "${origTitle}" | estimate: ${newEst}h | remaining: 0h`);
      countCopiadas++;
    }
  }

  console.error(`\n  Resultado: ${countMovidas} movida(s) a nueva iteración, ${countCopiadas} dividida(s) (copia+original).`);

  // ────────────────────────────────────────────────────────────────────────────
  // [6/6] Resumen final — CompletedWork por persona en ITERACION_ACTUAL
  // ────────────────────────────────────────────────────────────────────────────
  console.error('\n[6/6] Generando resumen de CompletedWork en iteración actual...\n');

  const finalItems = await getItems(client, ITER_ACTUAL.path, null); // todos los estados

  const byPerson = {};
  for (const wi of finalItems) {
    const f       = wi.fields;
    const persona = f['System.AssignedTo']?.displayName || '(sin asignar)';
    const cw      = f['Microsoft.VSTS.Scheduling.CompletedWork'] ?? 0;
    byPerson[persona] = round2((byPerson[persona] ?? 0) + cw);
  }

  const linea = '═'.repeat(60);
  console.log(`\n${linea}`);
  console.log(`RESUMEN SPRINT — ${ITER_ACTUAL.name}`);
  console.log(linea);
  console.log('Completed Work por persona:\n');

  const sorted = Object.entries(byPerson).sort(([, a], [, b]) => b - a);
  for (const [name, hours] of sorted) {
    const hoursStr = String(hours).replace('.', ',');
    console.log(`  ${name.padEnd(36)} ${hoursStr}h`);
  }

  const totalCW = round2(sorted.reduce((s, [, h]) => s + h, 0));
  console.log(`\n  ${'TOTAL'.padEnd(36)} ${String(totalCW).replace('.', ',')}h`);
  console.log(linea);
  console.log(`✓ Sprint "${ITER_NUEVA.name}" inicializado correctamente.`);
  console.log(linea);
}

main().catch(e => {
  console.error(`\nERROR FATAL: ${e.message}`);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
});
