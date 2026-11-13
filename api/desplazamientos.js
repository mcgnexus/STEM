import collection from '../handlers/desplazamientos/index.js';
import item from '../handlers/desplazamientos/[id].js';

// desplazamientos: colección (sin id) o elemento (?id=)
export default async function handler(req, res) {
  if (req.query.id) return item(req, res);
  return collection(req, res);
}
