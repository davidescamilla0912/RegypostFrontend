# RegyHotel Frontend

Aplicación web para la operación diaria de RegyHotel. Desde el panel se administran reservas, clientes, habitaciones, empleados, inventario, gastos, caja, pagos, parqueadero y check-in/check-out.

Este repositorio contiene únicamente el frontend React. Para consultar y guardar información se requiere que la API Flask y su base de datos estén disponibles.

## Capturas de pantalla

### Panel principal

![Panel principal de RegyHotel](public/docs/screenshots/Screenshot%202026-10-20%20221055.png)

### Clientes

![Gestión de clientes](public/docs/screenshots/Screenshot%202026-10-20%20221147.png)

### Reservas

![Gestión de reservas](public/docs/screenshots/Screenshot%202026-10-20%20221216.png)

### Habitaciones

![Listado de habitaciones](public/docs/screenshots/Screenshot%202026-10-20%20221230.png)

![Detalle de una habitación y su reserva](public/docs/screenshots/Screenshot%202026-10-20%20221251.png)

### Inventario

![Gestión de inventario](public/docs/screenshots/Screenshot%202026-10-20%20221313.png)

### Check-out

![Gestión de check-out](public/docs/screenshots/Screenshot%202026-10-20%20221337.png)

### Empleados

![Gestión de empleados](public/docs/screenshots/Screenshot%202026-10-20%20221401.png)

## Funcionalidades

- Panel principal con acceso a los módulos disponibles.
- Gestión de reservas, clientes y habitaciones.
- Operaciones de recepción: check-in, check-out, acompañantes y parqueadero.
- Administración de empleados y roles.
- Consulta y gestión de caja, pagos, gastos e inventario.
- Interfaz en español con navegación entre módulos.

## Tecnologías

- React 18 y Create React App.
- React Router para navegación.
- Axios para comunicación HTTP con la API.
- CSS para los estilos de la interfaz.

## Requisitos

- Node.js y npm.
- Una instancia del backend de RegyHotel para usar las funciones que consultan o modifican datos.

## Instalación y ejecución

Ejecuta los siguientes comandos desde la raíz de este repositorio:

```bash
npm install
```

Copia `.env.example` como `.env` y configura la dirección del backend:

```env
REACT_APP_API_URL=http://localhost:5000
```

En PowerShell puedes crear la copia con `Copy-Item .env.example .env`. Si utilizas la URL local, inicia el backend Flask en el puerto `5000` antes de usar la aplicación. Reinicia React después de cambiar `.env`.

Inicia el servidor de desarrollo:

```bash
npm start
```

Abre [http://localhost:3000](http://localhost:3000). Para crear el build de producción:

```powershell
./node_modules/.bin/react-scripts.cmd build
```

En macOS o Linux también puedes usar:

```bash
npm run build
```

Los archivos `.env` son locales y están excluidos de Git. No agregues tokens, contraseñas ni credenciales a `.env.example`.

## API

La URL base se configura con `REACT_APP_API_URL`; si no se define, el frontend usa `http://127.0.0.1:5000`. Axios agrega el token guardado en la sesión a las solicitudes autenticadas.

Las respuestas de colecciones de la API tienen la forma `{ "data": [...], "total": 0 }` y los recursos individuales `{ "data": { ... } }`. El frontend normaliza ambos formatos en `src/utils/apiResponse.js`.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm start` | Iniciar el frontend local en modo desarrollo. |
| `npm test` | Ejecutar las pruebas interactivas de Create React App. |
| `npm run build` | Crear el build de producción en macOS/Linux. En Windows usa el comando PowerShell indicado arriba. |

Si la pantalla no carga datos, verifica que el backend esté activo, que `REACT_APP_API_URL` apunte a esa instancia y que el usuario tenga permisos para el módulo. Revisa también la consola del navegador y la pestaña Network para conocer el código HTTP de la solicitud.

## Estructura del código

```text
src/
  components/  Componentes compartidos y elementos de interfaz
  hooks/       Hooks de autenticación y estado de reserva
  pages/       Pantallas y módulos de la aplicación
  services/    Llamadas a los recursos de la API
  utils/       Formato, fechas y utilidades comunes
```

## Pruebas

Ejecuta `npm test` para iniciar el entorno de pruebas de Create React App.
