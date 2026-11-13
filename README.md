# Talleres STEM — Control y presupuestos

Aplicación web para gestionar talleres STEM: centros educativos, materiales,
desplazamientos, horas de trabajo y presupuestos con estado.

- **Frontend:** HTML/CSS/JS vanilla (sin build), servido desde `public/`.
- **Backend:** Vercel Serverless Functions en `api/` (Node.js).
- **Base de datos:** Neon (PostgreSQL serverless).

## Estructura

```
api/                 Funciones serverless (rutas /api/*)
  auth/              register, login, me
  centros/           CRUD centros educativos
  talleres/          CRUD talleres
  materiales/        CRUD materiales (por taller)
  desplazamientos/   CRUD desplazamientos (por taller)
  horas-trabajo/     CRUD horas (por taller)
  presupuestos/      Totales calculados + estado
lib/                 Código compartido (db, auth, http)
db/schema.sql        Esquema de la base de datos
scripts/migrate.mjs  Aplica el esquema en Neon
public/              Frontend estático
```

## Requisitos

1. Una base de datos en [Neon](https://console.neon.tech) y su cadena de conexión.
2. Node.js 18+.

## Variables de entorno

Copia `.env.example` a `.env.local` para desarrollo local:

```bash
cp .env.example .env.local
```

| Variable       | Descripción                                      |
| -------------- | ------------------------------------------------ |
| `DATABASE_URL` | Cadena de conexión de Neon (`?sslmode=require`). |
| `JWT_SECRET`   | Cadena larga y aleatoria para firmar los JWT.    |

## Puesta en marcha

```bash
npm install
# 1) Crear las tablas en Neon
export $(grep -v '^#' .env.local | xargs)   # carga DATABASE_URL
npm run migrate
# 2) Arrancar en local con Vercel
npx vercel dev
```

La app quedará en `http://localhost:3000`. Regístrate desde la pantalla de
acceso para crear el primer usuario.

## Despliegue en Vercel

1. Importa el repositorio en Vercel (framework preset: **Other**).
2. Añade las variables `DATABASE_URL` y `JWT_SECRET` en *Settings → Environment
   Variables*.
3. Ejecuta la migración una vez contra la base de datos de producción
   (`npm run migrate` con `DATABASE_URL` de producción) o pega
   `db/schema.sql` en el SQL editor de Neon.
4. Deploy. Vercel sirve `public/` como sitio estático y `api/` como funciones.

## Modelo de datos

- `centros_educativos`: centros/clientes.
- `talleres`: taller con centro, tipo (`regular`/`especial`), fecha y monitor.
- `materiales`, `desplazamientos`, `horas_trabajo`: líneas de coste por taller.
  El `subtotal` es una columna generada (`cantidad * precio`, `km * coste`,
  `horas * tarifa`).
- `presupuestos`: totales y estado (`borrador`/`enviado`/`aprobado`). Los
  totales se calculan en vivo al consultar y se consolidan al cambiar el estado.

## API

| Método | Ruta                              | Descripción                          |
| ------ | --------------------------------- | ------------------------------------ |
| POST   | `/api/auth/register`              | Crear cuenta                         |
| POST   | `/api/auth/login`                 | Iniciar sesión (devuelve JWT)        |
| GET    | `/api/auth/me`                    | Usuario del token                    |
| GET    | `/api/centros`                    | Listar centros                       |
| POST   | `/api/centros`                    | Crear centro                         |
| GET/PUT/DELETE | `/api/centros/:id`        | Leer / editar / borrar centro        |
| GET    | `/api/talleres`                   | Listar talleres                      |
| POST   | `/api/talleres`                   | Crear taller                         |
| GET/PUT/DELETE | `/api/talleres/:id`       | Leer / editar / borrar taller        |
| GET    | `/api/materiales?taller_id=`      | Listar materiales                    |
| POST   | `/api/materiales`                 | Añadir material                      |
| PUT/DELETE | `/api/materiales/:id`         | Editar / borrar material             |
| GET    | `/api/desplazamientos?taller_id=` | Listar desplazamientos               |
| POST   | `/api/desplazamientos`            | Añadir desplazamiento                |
| PUT/DELETE | `/api/desplazamientos/:id`    | Editar / borrar desplazamiento       |
| GET    | `/api/horas-trabajo?taller_id=`   | Listar horas                         |
| POST   | `/api/horas-trabajo`              | Añadir horas                         |
| PUT/DELETE | `/api/horas-trabajo/:id`      | Editar / borrar horas                |
| GET    | `/api/presupuestos?taller_id=`    | Totales + estado del taller          |
| PATCH  | `/api/presupuestos/:taller_id`    | Cambiar estado (`{estado}`)          |

Todas las rutas salvo `register` y `login` requieren cabecera
`Authorization: Bearer <token>`.

## Notas de seguridad

- El token JWT se guarda en `localStorage` y se envía por cabecera. Es sencillo;
  para mayor protección frente a XSS se podría migrar a cookie `httpOnly`.
- El registro permite elegir rol (`monitor`/`admin`). Si vas a exponer la app
  públicamente, restringe el registro (por ejemplo, desactivándolo tras crear
  las cuentas) para evitar altas no deseadas.
- La cadena de conexión de Neon nunca se expone al navegador: solo la usan las
  funciones de `api/`.

## Verificación realizada

- Sintaxis de todos los módulos Node validada (`node --check`).
- Handlers probados con mocks (401 sin token, 400 de validación, 404/405, JWT).
- Esquema y consultas de presupuesto validadas sobre PostgreSQL (PGlite):
  columnas generadas, `ON CONFLICT`, totales y borrado en cascada.
