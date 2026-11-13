import { neon } from '@neondatabase/serverless';

let db;

// @neondatabase/serverless devuelve una función invocable; exponemos una
// interfaz `.query(texto, params)` para simplificar el resto del código.
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL');
  }
  if (!db) {
    const sql = neon(process.env.DATABASE_URL);
    db = {
      query: (text, params = []) => sql(text, params),
    };
  }
  return db;
}
