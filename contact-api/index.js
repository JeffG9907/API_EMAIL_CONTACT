import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

const { EMAIL_USER, EMAIL_PASS, EMAIL_TO } = process.env;

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!(name && email && message)) {
    return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
  }

  const mailOptions = {
    from: `"${name}" <${email}>`,
    to: EMAIL_TO,
    subject: "Nuevo mensaje de contacto desde el portafolio",
    text: `Nombre: ${name}\nEmail: ${email}\nMensaje:\n${message}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Mensaje enviado correctamente." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al enviar el mensaje." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Servidor escuchando en puerto", PORT));