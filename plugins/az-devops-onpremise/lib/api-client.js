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
 *   - Proyecto:    {server}/{collection}/{project}/_apis/...         (get / post / patch)
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

  // ── Métodos HTTP — JSON ────────────────────────────────────────────────────

  /** GET — acepta ruta relativa al proyecto O URL completa */
  async get(apiPathOrUrl, params = {}) {
    params['api-version'] = params['api-version'] || DEFAULT_API_VERSION;
    const url = this._resolveUrl(apiPathOrUrl) + this._buildQS(params);
    return this._request('GET', url, null, 'application/json');
  }

  /** POST con body JSON estándar */
  async post(apiPathOrUrl, body, params = {}) {
    params['api-version'] = params['api-version'] || DEFAULT_API_VERSION;
    const url = this._resolveUrl(apiPathOrUrl) + this._buildQS(params);
    return this._request('POST', url, body, 'application/json');
  }

  /**
   * POST con JSON Patch (application/json-patch+json).
   * Usado para CREAR work items (Azure DevOps exige este content-type).
   * @param {string} apiPathOrUrl  Ej: '/wit/workitems/$Task'
   * @param {Array}  patchDoc      Array de operaciones: [{op, path, value}]
   */
  async postPatch(apiPathOrUrl, patchDoc, params = {}) {
    params['api-version'] = params['api-version'] || DEFAULT_API_VERSION;
    const url = this._resolveUrl(apiPathOrUrl) + this._buildQS(params);
    return this._request('POST', url, patchDoc, 'application/json-patch+json');
  }

  /**
   * PATCH con JSON Patch (application/json-patch+json).
   * Usado para ACTUALIZAR work items, añadir relaciones, etc.
   * @param {string} apiPathOrUrl  Ej: '/wit/workitems/1234'
   * @param {Array}  patchDoc      Array de operaciones: [{op, path, value}]
   */
  async patch(apiPathOrUrl, patchDoc, params = {}) {
    params['api-version'] = params['api-version'] || DEFAULT_API_VERSION;
    const url = this._resolveUrl(apiPathOrUrl) + this._buildQS(params);
    return this._request('PATCH', url, patchDoc, 'application/json-patch+json');
  }

  /**
   * POST binario para subir adjuntos.
   * @param {string} apiPathOrUrl  Ej: '/wit/attachments'
   * @param {Buffer} buffer        Contenido binario del fichero
   * @param {object} params        Query params (incluir fileName)
   */
  async postBinary(apiPathOrUrl, buffer, params = {}) {
    params['api-version'] = params['api-version'] || DEFAULT_API_VERSION;
    const url = this._resolveUrl(apiPathOrUrl) + this._buildQS(params);
    return this._requestBinary('POST', url, buffer);
  }

  /**
   * GET binario para descargar adjuntos.
   * @param {string} url  URL completa del adjunto
   * @returns {Buffer}
   */
  async download(url) {
    return this._downloadBinary(url);
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

  _request(method, url, body, contentType) {
    return new Promise((resolve, reject) => {
      let parsedUrl;
      try { parsedUrl = new URL(url); }
      catch (e) { return reject(new Error(`URL inválida: ${url}`)); }

      const isHttps  = parsedUrl.protocol === 'https:';
      const bodyData = body !== null && body !== undefined ? JSON.stringify(body) : null;

      const options = {
        hostname: parsedUrl.hostname,
        port:     parsedUrl.port || (isHttps ? 443 : 80),
        path:     parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          'Authorization': this._authHeader,
          'Content-Type':  contentType || 'application/json',
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

  _downloadBinary(url) {
    return new Promise((resolve, reject) => {
      let parsedUrl;
      try { parsedUrl = new URL(url); }
      catch (e) { return reject(new Error(`URL inválida: ${url}`)); }

      const isHttps = parsedUrl.protocol === 'https:';
      const options = {
        hostname: parsedUrl.hostname,
        port:     parsedUrl.port || (isHttps ? 443 : 80),
        path:     parsedUrl.pathname + parsedUrl.search,
        method:   'GET',
        headers:  { 'Authorization': this._authHeader },
        rejectUnauthorized: false
      };

      const protocol = isHttps ? https : http;
      const req = protocol.request(options, res => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode} al descargar adjunto`));
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });

      req.on('error', e => reject(new Error(`Error descargando adjunto: ${e.message}`)));
      req.end();
    });
  }

  _requestBinary(method, url, buffer) {
    return new Promise((resolve, reject) => {
      let parsedUrl;
      try { parsedUrl = new URL(url); }
      catch (e) { return reject(new Error(`URL inválida: ${url}`)); }

      const isHttps = parsedUrl.protocol === 'https:';
      const options = {
        hostname: parsedUrl.hostname,
        port:     parsedUrl.port || (isHttps ? 443 : 80),
        path:     parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          'Authorization':  this._authHeader,
          'Content-Type':   'application/octet-stream',
          'Accept':         'application/json',
          'Content-Length': buffer.length
        },
        rejectUnauthorized: false
      };

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
            reject(new Error(`HTTP ${res.statusCode} al subir binario\n${msg}`));
          }
        });
      });

      req.on('error', e => reject(new Error(`Error subiendo binario: ${e.message}`)));
      req.write(buffer);
      req.end();
    });
  }
}

module.exports = AdoApiClient;
