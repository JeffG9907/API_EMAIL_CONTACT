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

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!(name && email && subject && message)) {
    return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
  }

  // Aquí debes poner el remitente validado en Brevo, por ejemplo:
  // jcagua4477@utm.edu.ec (actualiza este correo al que tengas validado)
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Servidor escuchando en puerto", PORT));