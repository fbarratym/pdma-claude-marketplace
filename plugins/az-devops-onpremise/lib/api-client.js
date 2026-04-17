'use strict';

/**
 * api-client.js
 * Cliente HTTP base para la API REST de Azure DevOps on-premise.
 *
 * Autenticación: Basic Auth con PAT (campo "pat" del config).
 *   Header: Authorization: Basic base64(:PAT)
 *
 * Acepta certificados autofirmados (habitual en on-premise).
 * Versión de API por defecto: 7.0
 *
 * Contextos de URL soportados:
 *   - Proyecto:    {server}/{collection}/{project}/_apis/...         (get / post)
 *   - Colección:   {server}/{collection}/_apis/...                   (getCollection)
 *   - Equipo:      {server}/{collection}/{project}/{team}/_apis/...  (getTeam / postTeam)
 */

const https  = require('https');
const http   = require('http');
const { loadConfig } = require('./config');

const DEFAULT_API_VERSION = '7.0';

class AdoApiClient {
  constructor() {
    this.cfg = loadConfig();
    this._authHeader = 'Basic ' + Buffer.from(`:${this.cfg.pat}`).toString('base64');
  }

  // ── Helpers de URL ─────────────────────────────────────────────────────────

  /** URL en contexto de proyecto: {server}/{collection}/{project}/_apis{path} */
  projectUrl(apiPath) {
    return `${this.cfg.projectBaseUrl}${apiPath}`;
  }

  /** URL en contexto de colección: {server}/{collection}/_apis{path} */
  collectionUrl(apiPath) {
    return `${this.cfg.collectionBaseUrl}${apiPath}`;
  }

  /** URL en contexto de equipo: {server}/{collection}/{project}/{team}/_apis{path} */
  teamUrl(team, apiPath) {
    const t = encodeURIComponent(team || this.cfg.defaultTeam);
    return `${this.cfg.serverUrl}/${this.cfg.collection}/${this.cfg.project}/${t}/_apis${apiPath}`;
  }

  // ── Métodos HTTP ───────────────────────────────────────────────────────────

  /**
   * GET — acepta ruta relativa al baseUrl del proyecto O URL completa.
   * @param {string} apiPathOrUrl  Ruta (ej: '/wit/workitems/1') o URL completa
   * @param {object} params        Query params adicionales
   */
  async get(apiPathOrUrl, params = {}) {
    params['api-version'] = params['api-version'] || DEFAULT_API_VERSION;
    const url = this._resolveUrl(apiPathOrUrl) + this._buildQS(params);
    return this._request('GET', url, null);
  }

  /**
   * POST — acepta ruta relativa al baseUrl del proyecto O URL completa.
   * @param {string} apiPathOrUrl  Ruta o URL completa
   * @param {object} body          Cuerpo de la petición
   * @param {object} params        Query params adicionales
   */
  async post(apiPathOrUrl, body, params = {}) {
    params['api-version'] = params['api-version'] || DEFAULT_API_VERSION;
    const url = this._resolveUrl(apiPathOrUrl) + this._buildQS(params);
    return this._request('POST', url, body);
  }

  // ── Privado ────────────────────────────────────────────────────────────────

  _resolveUrl(apiPathOrUrl) {
    return apiPathOrUrl.startsWith('http')
      ? apiPathOrUrl
      : this.cfg.projectBaseUrl + apiPathOrUrl;
  }

  _buildQS(params) {
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    return parts.length ? '?' + parts.join('&') : '';
  }

  _request(method, url, body) {
    return new Promise((resolve, reject) => {
      let parsedUrl;
      try { parsedUrl = new URL(url); }
      catch (e) { return reject(new Error(`URL inválida: ${url}`)); }

      const isHttps  = parsedUrl.protocol === 'https:';
      const bodyData = body ? JSON.stringify(body) : null;

      const options = {
        hostname: parsedUrl.hostname,
        port:     parsedUrl.port || (isHttps ? 443 : 80),
        path:     parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          'Authorization': this._authHeader,
          'Content-Type':  'application/json',
          'Accept':        'application/json'
        },
        rejectUnauthorized: false
      };

      if (bodyData) {
        options.headers['Content-Length'] = Buffer.byteLength(bodyData);
      }

      const protocol = isHttps ? https : http;
      const req = protocol.request(options, res => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(raw)); }
            catch { resolve({ raw }); }
          } else {
            let msg = raw;
            try { msg = JSON.parse(raw).message || raw; } catch { /* ok */ }
            reject(new Error(`HTTP ${res.statusCode} — ${method} ${url}\n${msg}`));
          }
        });
      });

      req.on('error', e => reject(new Error(`Error de red: ${e.message}`)));
      if (bodyData) req.write(bodyData);
      req.end();
    });
  }
}

module.exports = AdoApiClient;
