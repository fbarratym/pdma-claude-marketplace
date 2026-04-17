'use strict';

/**
 * api-client.js
 * Cliente HTTP base para la API REST de Azure DevOps on-premise.
 *
 * Autenticación: Basic Auth con PAT (campo pat del config).
 *   Header: Authorization: Basic base64(:PAT)
 *
 * Acepta certificados autofirmados (habitual en instalaciones on-premise).
 * Versión de API por defecto: 7.0 (compatible con Azure DevOps Server 2022+).
 * Para TFS 2018 usar 5.0; para TFS 2015-2017 usar 4.1 o 3.0.
 */

const https  = require('https');
const http   = require('http');
const { loadConfig } = require('./config');

const DEFAULT_API_VERSION = '7.0';

class AdoApiClient {
  constructor() {
    this.cfg = loadConfig();
    // Basic auth: usuario vacío + PAT como contraseña
    this._authHeader = 'Basic ' + Buffer.from(`:${this.cfg.pat}`).toString('base64');
  }

  /**
   * GET a la API REST de ADO.
   * @param {string} apiPath  Ruta relativa al baseUrl (ej: '/wit/workitems/123')
   * @param {object} params   Query params adicionales
   */
  async get(apiPath, params = {}) {
    params['api-version'] = params['api-version'] || DEFAULT_API_VERSION;
    const url = this.cfg.baseUrl + apiPath + this._buildQS(params);
    return this._request('GET', url, null);
  }

  /**
   * POST a la API REST de ADO.
   * @param {string} apiPath  Ruta relativa al baseUrl
   * @param {object} body     Cuerpo de la petición (se serializa a JSON)
   * @param {object} params   Query params adicionales
   */
  async post(apiPath, body, params = {}) {
    params['api-version'] = params['api-version'] || DEFAULT_API_VERSION;
    const url = this.cfg.baseUrl + apiPath + this._buildQS(params);
    return this._request('POST', url, body);
  }

  // ── Privado ────────────────────────────────────────────────────────────────

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
        rejectUnauthorized: false   // Permite certs autofirmados (on-premise)
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
