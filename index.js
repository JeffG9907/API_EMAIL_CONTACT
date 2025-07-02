import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

import path from "path";

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

// ---------- Utilidad para fecha y hora en formato 24 horas español ----------
function formatearFechaHora(fecha = new Date()) {
  return new Date(fecha).toLocaleString('es-EC', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

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

// ENDPOINT: Notificación de sensor deshabilitado o habilitado
app.post("/api/send-disabled-sensor-alert", async (req, res) => {
  const { 
    to, 
    nombre, 
    sensor,  // "temp" o "ph"
    nombreSistema, 
    idSistema, 
    fechaHora,
    estado // 'habilitado' o 'deshabilitado'
  } = req.body;

  if (!(to && nombre && sensor && nombreSistema && idSistema && fechaHora && estado)) {
    return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
  }

  // Traducción para el nombre del sensor
  const sensorMap = {
    temp: "Temperatura",
    ph: "pH"
  };

  const accion = estado === 'habilitado' ? 'habilitado' : 'deshabilitado';
  const subject = `⚠️ Sensor de ${sensorMap[sensor] || sensor} ${accion} en tu sistema hidropónico`;

  // Cuerpo del mensaje, ahora ambos sensores tienen mensaje extenso y uniforme
  let text = 
    `Hola ${nombre},\n\n` +
    `Te informamos que el sensor de ${sensorMap[sensor] || sensor} ha sido **${accion}** en tu sistema hidropónico "${nombreSistema}" (ID: ${idSistema}).\n\n` +
    `Fecha y hora de la acción: ${fechaHora}\n\n`;

  if (accion === 'deshabilitado') {
    text +=
      `Mientras este sensor esté deshabilitado, no se registrarán ni enviarán alertas sobre este parámetro.\n\n`;
  }
  
  text +=
    `Puedes cambiar su estado desde la plataforma cuando lo desees.\n\n` +
    `Este mensaje ha sido generado automáticamente por el sistema de monitoreo inteligente de cultivos.\n\n` +
    `Atentamente,\nEquipo SmartGrow`;

  const mailOptions = {
    from: `"Equipo SmartGrow" <jcagua4477@utm.edu.ec>`,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Correo de alerta de sensor enviado correctamente." });
  } catch (error) {
    console.error("Error enviando correo de sensor:", error);
    res.status(500).json({ success: false, message: "Error al enviar el correo de sensor." });
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

app.post("/api/send-user-credentials", async (req, res) => {
  const { to, nombre, password } = req.body;
  if (!(to && nombre && password)) {
    return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
  }

  const subject = "Bienvenido a SmartGrow – Tus credenciales de acceso";
  const text =
    `Hola ${nombre},\n\n` +
    `Tu cuenta ha sido creada correctamente en la plataforma SmartGrow.\n\n` +
    `Puedes acceder con:\n` +
    `Usuario (correo): ${to}\n` +
    `Contraseña temporal: ${password}\n\n` +
    `Por seguridad, te recomendamos cambiar la contraseña después de tu primer inicio de sesión.\n\n` +
    `A continuación se adjuntan los siguientes documentos:\n` +
    `• Guía de Construcción del sistema hidropónico\n` +
    `• Guía de Conexión de sistema hidropónico\n\n` +
    `¡Bienvenido!\nEquipo SmartGrow`;

  const att1 = path.join(__dirname, "documents", "GUIA_CONEX_SIST_HIDR.pdf");
  const att2 = path.join(__dirname, "documents", "GUIA_CONS_SIST_HIDR.pdf");

  // Agrega logs antes de adjuntar
  console.log("Adjunto 1:", att1, "¿Existe?", fs.existsSync(att1));
  console.log("Adjunto 2:", att2, "¿Existe?", fs.existsSync(att2));

  const attachments = [];
  if (fs.existsSync(att1)) attachments.push({ filename: "GUIA_CONEX_SIST_HIDR.pdf", path: att1 });
  if (fs.existsSync(att2)) attachments.push({ filename: "GUIA_CONS_SIST_HIDR.pdf", path: att2 });

  // Log de los adjuntos finales
  console.log("Adjuntos finales enviados:", attachments);

  const mailOptions = {
    from: `"Equipo SmartGrow" <jcagua4477@utm.edu.ec>`,
    to,
    subject,
    text,
    attachments
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Correo de credenciales enviado correctamente." });
  } catch (error) {
    console.error("Error enviando correo de credenciales:", error);
    res.status(500).json({ success: false, message: "Error al enviar el correo de credenciales." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Servidor escuchando en puerto", PORT));