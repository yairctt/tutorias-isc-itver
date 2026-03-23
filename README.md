# Tutorías ISC — Tecnológico de Veracruz (TecNM)

Este proyecto es la plataforma oficial de la **Coordinación de Tutorías de Ingeniería en Sistemas Computacionales** del ITVER. Permite a los estudiantes consultar programas de actividades, descargar recursos y solicitar constancias de acreditación de forma automatizada.

## 🚀 Tecnologías Utilizadas

### Frontend
- **HTML5 & Vanilla JavaScript**: Estructura y lógica del lado del cliente.
- **CSS3 (Vanilla)**: Diseño responsivo y personalizado basándose en la plantilla Eduwell.
- **Bootstrap 5**: Framework para el sistema de rejilla y componentes básicos.
- **FontAwesome**: Iconografía.
- **Clamp() Typography**: Tipografía fluida que se adapta al tamaño de la pantalla.

### Backend (Serverless)
- **Node.js**: Entorno de ejecución para funciones en la nube.
- **Vercel Functions**: Procesamiento de lógica de negocio (Generación de constancias).
- **Nodemailer**: Envío automatizado de correos electrónicos.
- **Cloudflare R2**: Almacenamiento de archivos (PDFs de constancias).
- **Upstash Redis**: Gestión de límites de peticiones (Rate Limiting).

## 📁 Estructura del Proyecto

```text
/
├── api/                # Funciones Serverless (Backend)
│   └── constancias.js  # Lógica para generar y enviar constancias
├── lib/                # Librerías compartidas y utilerías
│   ├── mail.js         # Configuración de envío de correo
│   ├── r2.js           # Conexión con Cloudflare R2
│   └── ratelimit.js    # Implementación de límites de tráfico (Redis)
├── public/             # Archivos estáticos (Frontend)
│   ├── assets/         # CSS, JS, Imágenes y PDFs
│   ├── index.html      # Página de inicio
│   ├── constancias.html # Formulario de solicitud
│   └── ...             # Otras páginas del sitio
├── vercel.json         # Configuración de despliegue y URLs limpias
└── package.json        # Dependencias de Node.js
```

## ⚙️ Cómo Funciona

### 1. Sistema de Constancias
Cuando un usuario ingresa su número de control en la página de **Constancias**:
1. El frontend envía una petición POST a `/api/constancias`.
2. El backend verifica que el usuario no haya excedido el límite de peticiones (`ratelimit.js`).
3. Se busca la constancia correspondiente en el almacenamiento de **Cloudflare R2**.
4. Si existe, se envía el archivo adjunto al correo institucional del alumno mediante **Gmail/SMTP**.

### 2. URLs Limpias
El proyecto está configurado para no mostrar la extensión `.html` en el navegador. Ejemplo:
- `tutorias-isc.com/constancias` en lugar de `tutorias-isc.com/constancias.html`.
*Configurado vía `vercel.json` con `cleanUrls: true`.*

### 3. Responsividad
El sitio está optimizado para dispositivos móviles, con ajustes específicos en el tamaño de formularios y tipografía dinámica para asegurar que los títulos nunca se desborden.

## 🛠️ Desarrollo Local

1. Clona el repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno en un archivo `.env` (mira la sección de abajo).
4. Inicia el servidor de desarrollo de Vercel (requiere Vercel CLI):
   ```bash
   vercel dev
   ```

## 🔐 Variables de Entorno (.env)

El proyecto requiere las siguientes claves para funcionar correctamente:

| Variable | Descripción |
| --- | --- |
| `R2_ACCESS_KEY_ID` | ID de acceso para Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Clave secreta para Cloudflare R2 |
| `R2_ENDPOINT` | Endpoint del bucket de R2 |
| `R2_BUCKET_NAME` | Nombre del bucket donde están los PDFs |
| `SMTP_USER` | Correo de Gmail para envíos |
| `SMTP_PASS` | Contraseña de aplicación de Gmail |
| `UPSTASH_REDIS_REST_URL` | URL de Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token de Upstash Redis |

## 📦 Despliegue

El sitio está diseñado para ser desplegado en **Vercel**. Simplemente conecta tu repositorio de GitHub y configura las variables de entorno en el panel de control.

---
**Coordinación de Tutorías ISC — Depto. de Sistemas y Computación**  
*Ingeniería en Sistemas Computacionales, ITVER.*
