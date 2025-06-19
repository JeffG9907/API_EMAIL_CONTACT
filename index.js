import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_TO } = process.env;

// Configura el transporter de Nodemailer con credenciales de Brevo
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  secure: Number(SMTP_PORT) === 465,
});

// Endpoint para contacto tradicional
app.post("/api/contact", async (req, res) => {
  const { 
    name, 
    email, 
    subject, 
    message 
  } = req.body;

  if (!(name && email && subject && message)) {
    return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
  }

  const mailOptions = {
    from: `"${name}" <jcagua4477@utm.edu.ec>`, // Remitente validado
    to: EMAIL_TO, // Destinatario
    replyTo: email, // El correo real del visitante para responderle
    subject,
    text: `Nombre: ${name}\nEmail: ${email}\nMensaje:\n${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Mensaje enviado correctamente." });
  } catch (error) {
    console.error("Error enviando correo:", error);
    res.status(500).json({ success: false, message: "Error al enviar el mensaje." });
  }
});

// ENDPOINT PARA ALERTAS DINÁMICAS (pH y temperatura fuera de rango)
function generarMensaje({ 
  nombre, 
  ph, 
  temperatura, 
  fechaHora, 
  alertaPh, 
  alertaTemp 
}) {
  let alerta = '';
  if (alertaPh && alertaTemp) {
    alerta = 'una variación crítica en los parámetros de pH y temperatura de tu sistema hidropónico.';
  } else if (alertaPh) {
    alerta = 'una variación crítica en el pH de tu sistema hidropónico.';
  } else if (alertaTemp) {
    alerta = 'una variación crítica en la temperatura de tu sistema hidropónico.';
  } else {
    alerta = 'un evento en tu sistema hidropónico.';
  }

  let valores = '';
  if (alertaPh) {
    valores += `pH actual: ${ph} (Rango recomendado: 5.5 – 6.5)\n\n`;
  }
  if (alertaTemp) {
    valores += `Temperatura: ${temperatura}°C (Rango recomendado: 18 – 28 °C)\n\n`;
  }

  return (
    `Estimado/a ${nombre},\n\n` +
    `Te informamos que se ha detectado ${alerta} A continuación, se detallan los valores actuales registrados:\n\n` +
    valores +
    `Fecha y hora del evento: ${fechaHora}\n\n` +
    `🚨 Recomendación: Te sugerimos verificar el sistema y tomar acciones correctivas de inmediato para evitar daños en el cultivo.\n\n` +
    `Este mensaje ha sido generado automáticamente por el sistema de monitoreo inteligente de cultivos.\n\n` +
    `Atentamente,\nEquipo SmartGrow\n`
  );
}

app.post("/api/send-auto-alert", async (req, res) => {
  const { 
    to, 
    nombre, 
    ph, 
    temperatura, 
    fechaHora, 
    alertaPh, 
    alertaTemp 
  } = req.body;

  if (!(to && nombre && fechaHora && (alertaPh || alertaTemp))) {
    return res.status(400).json({ success: false, message: "Faltan campos obligatorios o no hay alertas activas." });
  }

  const subject = "🚨 Alerta de parámetros críticos en tu sistema hidropónico";
  const text = generarMensaje({ nombre, ph, temperatura, fechaHora, alertaPh, alertaTemp });

  const mailOptions = {
    from: `"Equipo SmartGrow" <jcagua4477@utm.edu.ec>`, // Remitente validado
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Correo de alerta enviado correctamente." });
  } catch (error) {
    console.error("Error enviando correo automático:", error);
    res.status(500).json({ success: false, message: "Error al enviar el correo automático." });
  }
});

// NUEVO ENDPOINT: Notificación de sensor deshabilitado
app.post("/api/send-disabled-sensor-alert", async (req, res) => {
  const { 
    to, 
    nombre, 
    sensor,  // "temp" o "ph"
    nombreSistema, 
    idSistema, 
    fechaHora 
  } = req.body;

  if (!(to && nombre && sensor && nombreSistema && idSistema && fechaHora)) {
    return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
  }

  // Traducción para el nombre del sensor
  const sensorMap = {
    temp: "Temperatura",
    ph: "pH"
  };

  const subject = `⚠️ Sensor de ${sensorMap[sensor] || sensor} deshabilitado en tu sistema hidropónico`;
  const text =
    `Hola ${nombre},\n\n` +
    `Te informamos que el sensor de ${sensorMap[sensor] || sensor} ha sido deshabilitado en tu sistema hidropónico "${nombreSistema}" (ID: ${idSistema}).\n\n` +
    `Fecha y hora de la acción: ${fechaHora}\n\n` +
    `Mientras este sensor esté deshabilitado, no se registrarán ni enviarán alertas sobre este parámetro.\n\n` +
    `Puedes volver a habilitarlo desde la plataforma cuando lo desees.\n\n` +
    `Este mensaje ha sido generado automáticamente por el sistema de monitoreo inteligente de cultivos.\n\n` +
    `Atentamente,\nEquipo SmartGrow\n`;

  const mailOptions = {
    from: `"Equipo SmartGrow" <jcagua4477@utm.edu.ec>`,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Correo de alerta de sensor deshabilitado enviado correctamente." });
  } catch (error) {
    console.error("Error enviando correo de sensor deshabilitado:", error);
    res.status(500).json({ success: false, message: "Error al enviar el correo de sensor deshabilitado." });
  }
});

// ENDPOINT: Notificación de conexión exitosa de sistema hidropónico + datos iniciales
app.post("/api/send-system-connected", async (req, res) => {
  const { 
    to, 
    nombre, 
    nombreSistema, 
    idSistema, 
    fechaHora, 
    ph, 
    temperatura, 
    fechaHoraLectura 
  } = req.body;
  if (!(to && nombre && nombreSistema && idSistema && fechaHora)) {
    return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
  }

  const subject = "¡Tu sistema hidropónico ha sido conectado exitosamente!";
  const text =
    `Hola ${nombre},\n\n` +
    `Te informamos que tu sistema hidropónico "${nombreSistema}" (ID: ${idSistema}) ha sido conectado correctamente.\n\n` +
    `Fecha y hora de conexión: ${fechaHora}\n\n` +
    (ph !== undefined && temperatura !== undefined
      ? `Primeros parámetros registrados:\n- Temperatura: ${temperatura}°C\n- pH: ${ph}\n${fechaHoraLectura ? "- Fecha de la lectura: " + fechaHoraLectura + "\n" : ""}\n`
      : ""
    ) +
    `Ya puedes monitorear los parámetros y recibir alertas automáticas en esta cuenta de correo.\n\n` +
    `¡Gracias por confiar en SmartGrow!\n\nEquipo SmartGrow`;

  const mailOptions = {
    from: `"Equipo SmartGrow" <jcagua4477@utm.edu.ec>`,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Correo de confirmación enviado correctamente." });
  } catch (error) {
    console.error("Error enviando correo de conexión:", error);
    res.status(500).json({ success: false, message: "Error al enviar el correo de conexión." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Servidor escuchando en puerto", PORT));