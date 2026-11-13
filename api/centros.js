import collection from '../handlers/centros/index.js';
import item from '../handlers/centros/[id].js';

// centros: colección (sin id) o elemento (?id=)
export default async function handler(req, res) {
  if (req.query.id) return item(req, res);
  return collection(req, res);
}
