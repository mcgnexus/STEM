import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { neon } from '@neondatabase/serverless';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta la variable de entorno DATABASE_URL');
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

// El driver HTTP de Neon ejecuta una sentencia por llamada: dividimos el esquema.
const statements = schema
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.split('\n').every((l) => l.trim().startsWith('--')));

try {
  for (const statement of statements) {
    await sql(statement);
  }
  console.log(`Esquema aplicado correctamente (${statements.length} sentencias).`);
} catch (err) {
  console.error('Error al aplicar el esquema:', err.message);
  process.exit(1);
}
