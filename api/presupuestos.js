import collection from '../handlers/presupuestos/index.js';
import item from '../handlers/presupuestos/[id].js';

// presupuestos: colección (sin id) o elemento (?id=)
export default async function handler(req, res) {
  if (req.query.id) return item(req, res);
  return collection(req, res);
}
