import nodemailer from "nodemailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { name, email, subject, message } = req.body ?? {};

  if (!name?.trim() || !EMAIL_RE.test(email ?? "") || !message?.trim()) {
    return res.status(400).json({ message: "Missing or invalid fields" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      // to: process.env.EMAIL_USER,
      to: "anishkadam92@gmail.com",
      replyTo: email,
      subject: subject || `Portfolio message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });

    return res.status(200).json({
      message: "Email sent successfully!",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Error sending email",
    });
  }
}
