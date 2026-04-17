'use strict';

/**
 * config.js
 * Carga y valida la configuración de conexión a Azure DevOps.
 *
 * El fichero config.local.json se encuentra en la RAÍZ del plugin:
 *   plugins/az-devops-onpremise/config.local.json
 * (un nivel por encima de esta carpeta lib/)
 *
 * Estructura esperada (array de proyectos):
 * [
 *   {
 *     "name":        "CENSO3",                          <- Nombre identificador del proyecto
 *     "serverUrl":   "https://tfs.empresa.com/tfs",    <- URL base del servidor
 *     "collection":  "DefaultCollection",               <- Nombre de la colección
 *     "project":     "mi-proyecto",                     <- Nombre del proyecto en ADO
 *     "pat":         "xxxxxxxxxxxx",                    <- Personal Access Token
 *     "defaultTeam": "mi-proyecto"                      <- (opcional) Equipo por defecto
 *   },
 *   ...
 * ]
 *
 * También se acepta el formato antiguo (objeto único) por compatibilidad hacia atrás.
 *
 * loadConfig()              → devuelve la primera entrada del array
 * loadConfig("CENSO3")      → devuelve la entrada con name === "CENSO3"
 *
 * Si "defaultTeam" no se especifica, se usa el nombre del proyecto como equipo.
 */

const path = require('path');
const fs   = require('fs');

const CONFIG_PATH = path.resolve(__dirname, '../config.local.json');

function loadConfig(projectName = null) {
  // ── 1. Verificar que existe ────────────────────────────────────────────────
  if (!fs.existsSync(CONFIG_PATH)) {
    const template = [{
      name:        'MI_PROYECTO',
      serverUrl:   'https://your-tfs-server/tfs',
      collection:  'DefaultCollection',
      project:     'your-project',
      pat:         'your-personal-access-token',
      defaultTeam: 'your-project'
    }];
    console.error('ERROR: Fichero de configuración no encontrado.');
    console.error(`  Ruta esperada: ${CONFIG_PATH}`);
    console.error('\nCrea el fichero con la siguiente estructura:');
    console.error(JSON.stringify(template, null, 2));
    process.exit(1);
  }

  // ── 2. Parsear JSON ────────────────────────────────────────────────────────
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error(`ERROR: No se puede parsear config.local.json: ${e.message}`);
    process.exit(1);
  }

  // ── 3. Normalizar: admite tanto objeto único como array ───────────────────
  const entries = Array.isArray(raw) ? raw : [raw];

  if (entries.length === 0) {
    console.error('ERROR: config.local.json está vacío o no contiene entradas.');
    process.exit(1);
  }

  // ── 4. Seleccionar la entrada adecuada ────────────────────────────────────
  let cfg;
  if (projectName) {
    cfg = entries.find(e => e.name === projectName);
    if (!cfg) {
      console.error(`ERROR: No existe ningún proyecto "${projectName}" en config.local.json.`);
      console.error(`  Proyectos disponibles: ${entries.map(e => e.name || '(sin nombre)').join(', ')}`);
      process.exit(1);
    }
  } else {
    cfg = entries[0];
  }

  // ── 5. Validar campos requeridos ───────────────────────────────────────────
  const required = ['serverUrl', 'collection', 'project', 'pat'];
  const missing  = required.filter(k => !cfg[k]);
  if (missing.length > 0) {
    const id = cfg.name ? `"${cfg.name}"` : '(primera entrada)';
    console.error(`ERROR: Faltan campos en la entrada ${id} de config.local.json: ${missing.join(', ')}`);
    process.exit(1);
  }

  // ── 6. Normalizar y construir URLs ─────────────────────────────────────────
  cfg = { ...cfg }; // no mutar el objeto original
  cfg.serverUrl   = cfg.serverUrl.replace(/\/+$/, '');
  cfg.defaultTeam = cfg.defaultTeam || cfg.project;

  // URLs base por contexto
  cfg.projectBaseUrl    = `${cfg.serverUrl}/${cfg.collection}/${cfg.project}/_apis`;
  cfg.collectionBaseUrl = `${cfg.serverUrl}/${cfg.collection}/_apis`;

  // Alias para compatibilidad con api-client existente
  cfg.baseUrl = cfg.projectBaseUrl;

  // Rutas internas
  cfg._configPath = CONFIG_PATH;
  cfg._pluginRoot = path.resolve(__dirname, '..');
  cfg._scriptsDir = {
    wit:  path.resolve(__dirname, 'wit'),
    work: path.resolve(__dirname, 'work')
  };

  return cfg;
}

module.exports = { loadConfig, CONFIG_PATH };
