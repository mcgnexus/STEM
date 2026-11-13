-- Esquema de la app de control y presupuestos de talleres STEM
-- Ejecutar contra Neon: npm run migrate

CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  nombre      TEXT NOT NULL,
  password    TEXT NOT NULL,
  rol         TEXT NOT NULL DEFAULT 'monitor' CHECK (rol IN ('admin', 'monitor')),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS centros_educativos (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  contacto    TEXT,
  email       TEXT,
  telefono    TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS talleres (
  id              SERIAL PRIMARY KEY,
  centro_id       INTEGER REFERENCES centros_educativos(id) ON DELETE SET NULL,
  nombre          TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'regular' CHECK (tipo IN ('regular', 'especial')),
  fecha           DATE,
  duracion_horas  NUMERIC(8,2) NOT NULL DEFAULT 0,
  ubicacion       TEXT,
  monitor_id      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_talleres_centro ON talleres(centro_id);

CREATE TABLE IF NOT EXISTS materiales (
  id               SERIAL PRIMARY KEY,
  taller_id        INTEGER NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  item             TEXT NOT NULL,
  cantidad         NUMERIC(10,2) NOT NULL DEFAULT 1,
  precio_unitario  NUMERIC(10,2) NOT NULL DEFAULT 0,
  proveedor        TEXT,
  subtotal         NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);
CREATE INDEX IF NOT EXISTS idx_materiales_taller ON materiales(taller_id);

CREATE TABLE IF NOT EXISTS desplazamientos (
  id             SERIAL PRIMARY KEY,
  taller_id      INTEGER NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  origen         TEXT,
  destino        TEXT,
  km             NUMERIC(10,2) NOT NULL DEFAULT 0,
  coste_por_km   NUMERIC(10,2) NOT NULL DEFAULT 0,
  medio          TEXT,
  subtotal       NUMERIC(12,2) GENERATED ALWAYS AS (km * coste_por_km) STORED
);
CREATE INDEX IF NOT EXISTS idx_desplazamientos_taller ON desplazamientos(taller_id);

CREATE TABLE IF NOT EXISTS horas_trabajo (
  id          SERIAL PRIMARY KEY,
  taller_id   INTEGER NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  monitor_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha       DATE,
  horas       NUMERIC(8,2) NOT NULL DEFAULT 0,
  tarifa_hora NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(12,2) GENERATED ALWAYS AS (horas * tarifa_hora) STORED
);
CREATE INDEX IF NOT EXISTS idx_horas_taller ON horas_trabajo(taller_id);

CREATE TABLE IF NOT EXISTS presupuestos (
  id                    SERIAL PRIMARY KEY,
  taller_id             INTEGER NOT NULL UNIQUE REFERENCES talleres(id) ON DELETE CASCADE,
  total_materiales      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_desplazamientos NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_horas           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_general         NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado                TEXT NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador', 'enviado', 'aprobado')),
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
