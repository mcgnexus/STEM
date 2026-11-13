import { send } from '../lib/http.js';

import register from '../handlers/auth/register.js';
import login from '../handlers/auth/login.js';
import me from '../handlers/auth/me.js';

import centros from '../handlers/centros/index.js';
import centrosId from '../handlers/centros/[id].js';
import talleres from '../handlers/talleres/index.js';
import talleresId from '../handlers/talleres/[id].js';
import materiales from '../handlers/materiales/index.js';
import materialesId from '../handlers/materiales/[id].js';
import desplazamientos from '../handlers/desplazamientos/index.js';
import desplazamientosId from '../handlers/desplazamientos/[id].js';
import horas from '../handlers/horas-trabajo/index.js';
import horasId from '../handlers/horas-trabajo/[id].js';
import presupuestos from '../handlers/presupuestos/index.js';
import presupuestosId from '../handlers/presupuestos/[id].js';

const resources = {
  centros: { collection: centros, item: centrosId },
  talleres: { collection: talleres, item: talleresId },
  materiales: { collection: materiales, item: materialesId },
  desplazamientos: { collection: desplazamientos, item: desplazamientosId },
  'horas-trabajo': { collection: horas, item: horasId },
  presupuestos: { collection: presupuestos, item: presupuestosId },
};

function getSegments(req) {
  // El runtime de Vercel puede no rellenar el parámetro catch-all en req.query,
  // así que lo derivamos de la URL como respaldo.
  const fromQuery = req.query && req.query.route;
  if (fromQuery) {
    const arr = [].concat(fromQuery).filter(Boolean);
    if (arr.length) return arr;
  }
  const raw = (req.url || '').split('?')[0];
  const idx = raw.indexOf('/api');
  const path = idx >= 0 ? raw.slice(idx + 4) : raw;
  return path.split('/').filter(Boolean);
}

// Una única Serverless Function que enruta /api/* a los handlers internos.
// Evita el límite de 12 funciones por deployment del plan Hobby de Vercel.
export default async function handler(req, res) {
  const segments = getSegments(req);
  const [resource, second] = segments;

  try {
    if (resource === 'auth') {
      if (second === 'register') return await register(req, res);
      if (second === 'login') return await login(req, res);
      if (second === 'me') return await me(req, res);
      return send(res, 404, { error: 'Ruta no encontrada' });
    }

    const entry = resources[resource];
    if (!entry) return send(res, 404, { error: 'Ruta no encontrada' });

    if (second) {
      req.query.id = second;
      return await entry.item(req, res);
    }
    return await entry.collection(req, res);
  } catch (err) {
    console.error(err);
    if (!res.writableEnded) return send(res, 500, { error: err.message || 'Error interno' });
  }
}
