import collection from '../handlers/materiales/index.js';
import item from '../handlers/materiales/[id].js';

// materiales: colección (sin id) o elemento (?id=)
export default async function handler(req, res) {
  if (req.query.id) return item(req, res);
  return collection(req, res);
}
