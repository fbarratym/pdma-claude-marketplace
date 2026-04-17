'use strict';

/**
 * config.js
 * Carga y valida la configuración de conexión a Azure DevOps.
 *
 * El fichero config.local.json se busca SIEMPRE relativo a este fichero:
 *   ../skills/devops-work-items/config.local.json
 *
 * Estructura esperada:
 * {
 *   "serverUrl":   "https://tfs.empresa.com/tfs",
 *   "collection":  "DefaultCollection",
 *   "project":     "mi-proyecto",
 *   "pat":         "xxxxxxxxxxxx"
 * }
 */

const path = require('path');
const fs   = require('fs');

const CONFIG_PATH = path.resolve(
  __dirname,
  '../skills/devops-work-items/config.local.json'
);

function loadConfig() {
  // ── 1. Verificar que existe ────────────────────────────────────────────────
  if (!fs.existsSync(CONFIG_PATH)) {
    const template = {
      serverUrl:  'https://your-tfs-server/tfs',
      collection: 'DefaultCollection',
      project:    'your-project',
      pat:        'your-personal-access-token'
    };
    console.error('ERROR: Fichero de configuración no encontrado.');
    console.error(`  Ruta esperada: ${CONFIG_PATH}`);
    console.error('\nCrea el fichero con la siguiente estructura:');
    console.error(JSON.stringify(template, null, 2));
    process.exit(1);
  }

  // ── 2. Parsear JSON ────────────────────────────────────────────────────────
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error(`ERROR: No se puede parsear config.local.json: ${e.message}`);
    process.exit(1);
  }

  // ── 3. Validar campos requeridos ───────────────────────────────────────────
  const required = ['serverUrl', 'collection', 'project', 'pat'];
  const missing  = required.filter(k => !cfg[k]);
  if (missing.length > 0) {
    console.error(`ERROR: Faltan campos en config.local.json: ${missing.join(', ')}`);
    process.exit(1);
  }

  // ── 4. Normalizar y construir URLs ─────────────────────────────────────────
  cfg.serverUrl = cfg.serverUrl.replace(/\/+$/, '');
  cfg.baseUrl   = `${cfg.serverUrl}/${cfg.collection}/${cfg.project}/_apis`;

  // Rutas internas (para referencia del agente)
  cfg._configPath = CONFIG_PATH;
  cfg._pluginRoot = path.resolve(__dirname, '..');
  cfg._scriptsDir = path.resolve(__dirname, 'wit');

  return cfg;
}

module.exports = { loadConfig, CONFIG_PATH };
