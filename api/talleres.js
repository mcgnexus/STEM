import collection from '../handlers/talleres/index.js';
import item from '../handlers/talleres/[id].js';

// talleres: colección (sin id) o elemento (?id=)
export default async function handler(req, res) {
  if (req.query.id) return item(req, res);
  return collection(req, res);
}
