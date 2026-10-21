# RegyHotel Frontend

Interfaz web para la administración de un hotel. RegyHotel reúne en un solo panel las tareas diarias de recepción y administración: reservas, clientes, habitaciones, caja, personal e inventario. Este repositorio contiene el frontend; para operar con datos reales necesita conectarse a una instancia compatible de la API backend.

## Capturas de pantalla

Las imágenes se muestran desde `docs/screenshots/`. Añade las capturas de la aplicación con estos nombres para que GitHub las renderice en esta sección:

![Panel principal de RegyHotel](docs/screenshots/dashboard.png)

![Gestión de reservas de RegyHotel](docs/screenshots/reservas.png)

## Funcionalidades

- Panel principal con acceso a los módulos disponibles.
- Gestión de reservas, clientes y habitaciones.
- Operaciones de recepción: check-in, check-out y parqueadero.
- Administración de empleados y control de acceso mediante sesión.
- Consulta de caja y pagos, gastos e inventario.
- Interfaz en español con navegación entre módulos.

## Tecnologías

- React 18 y Create React App.
- React Router para navegación.
- Axios para comunicación HTTP con la API.
- CSS para estilos de la interfaz.

## Requisitos

- Node.js y npm.
- Una instancia del backend de RegyHotel para usar las funciones que consultan o modifican datos.

## Instalación y ejecución

Desde la carpeta `frontend/`:

```bash
npm install
```

Crea un archivo local `.env` en esta carpeta e indica la URL de la API:

```env
REACT_APP_API_URL=http://localhost:5000
```

Inicia la aplicación en modo desarrollo:

```bash
npm start
```

Abre [http://localhost:3000](http://localhost:3000). Para compilar la versión de producción:

```bash
npm run build
```

El archivo `.env` contiene configuración local y no debe subirse al repositorio.

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
