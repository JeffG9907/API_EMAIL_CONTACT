# Contact API

API de contacto básica para portafolios, usando Node.js, Express y Nodemailer.

## Endpoints

### POST /api/contact

**Body JSON:**
```json
{
  "name": "Tu nombre",
  "email": "tucorreo@email.com",
  "message": "Tu mensaje aquí"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Mensaje enviado correctamente."
}
```

**Respuesta de error:**
```json
{
  "success": false,
  "message": "Error al enviar el mensaje."
}
```

## Variables de entorno

- `EMAIL_USER` (ej: tunombre@gmail.com)
- `EMAIL_PASS` (contraseña de aplicación Gmail)
- `EMAIL_TO`   (correo destino)

## Cómo correr localmente

```bash
npm install
cp .env.example .env
# llena .env con tus datos
node index.js
```