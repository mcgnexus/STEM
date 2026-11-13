import collection from '../handlers/horas-trabajo/index.js';
import item from '../handlers/horas-trabajo/[id].js';

// horas-trabajo: colección (sin id) o elemento (?id=)
export default async function handler(req, res) {
  if (req.query.id) return item(req, res);
  return collection(req, res);
}
