import nodemailer from "nodemailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Prevent header injection — strip anything that could break out of a
// header line (newlines, carriage returns) before using a field in
// from/replyTo/subject.
const sanitizeHeader = (value) =>
  String(value)
    .replace(/[\r\n]+/g, " ")
    .trim();

// Prevent HTML injection when interpolating user input into the email body.
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ── Shared theme tokens (mirrors src/index.css :root dark values) ─────────
const THEME = {
  bg: "#070808",
  bg2: "#0e100f",
  bg3: "#131614",
  fg: "#e8eae9",
  fgDim: "rgba(232,234,233,0.62)",
  fgMuted: "rgba(232,234,233,0.40)",
  border: "rgba(232,234,233,0.10)",
  accent: "rgb(151,252,228)",
  accentMuted: "rgba(151,252,228,0.10)",
  fontDisplay: `'Space Grotesk', Arial, sans-serif`,
  fontBody: `'Inter', Arial, sans-serif`,
  fontMono: `'Space Mono', 'Courier New', monospace`,
};

// Wraps body content in the shared shell: dark canvas, "AK." mono brand
// mark, mint hairline border, pill footer note. Table-based for email
// client compatibility.
//
// The color-scheme meta tags + :root declaration tell dark-mode-aware
// clients (Apple Mail on iOS/macOS especially) that this email is already
// designed for dark mode. Without them, iOS treats the dark palette as a
// light email and re-maps the colors, which is what causes the inverted
// look on iPhone while desktop renders it correctly.
const emailShell = (innerHtml, footerNote) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <!--[if !mso]><!-->
    <style>
      :root {
        color-scheme: dark;
        supported-color-schemes: dark;
      }
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500&family=Space+Mono:wght@400;700&display=swap');
    </style>
    <!--<![endif]-->
  </head>
  <body style="margin:0;padding:0;background:${THEME.bg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

            <!-- Brand mark -->
            <tr>
              <td style="padding-bottom:20px;">
                <span style="font-family:${THEME.fontDisplay};font-size:15px;font-weight:700;color:${THEME.fg};letter-spacing:-0.01em;">AK.</span>
                <span style="font-family:${THEME.fontMono};font-size:10px;letter-spacing:0.16em;color:${THEME.fgMuted};text-transform:uppercase;margin-left:10px;">Portfolio</span>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td style="background:${THEME.bg2};border:1px solid ${THEME.border};border-radius:14px;overflow:hidden;">
                ${innerHtml}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 4px 0;">
                <span style="font-family:${THEME.fontMono};font-size:10px;letter-spacing:0.08em;color:${THEME.fgMuted};text-transform:uppercase;">
                  ${footerNote}
                </span>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const pillBadge = (label) => `
  <span style="display:inline-block;font-family:${THEME.fontMono};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${THEME.accent};background:${THEME.accentMuted};border:1px solid rgba(151,252,228,0.22);border-radius:999px;padding:4px 12px;">
    ${label}
  </span>
`;

const fieldRow = (label, valueHtml) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${THEME.border};">
      <div style="font-family:${THEME.fontMono};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${THEME.fgMuted};margin-bottom:4px;">${label}</div>
      <div style="font-family:${THEME.fontBody};font-size:14px;color:${THEME.fg};">${valueHtml}</div>
    </td>
  </tr>
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { name, email, subject, message } = req.body ?? {};

  if (!name?.trim() || !EMAIL_RE.test(email ?? "") || !message?.trim()) {
    return res.status(400).json({ message: "Missing or invalid fields" });
  }

  const safeName = sanitizeHeader(name);
  const safeEmail = sanitizeHeader(email);
  const safeSubject = sanitizeHeader(subject || "No Subject");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // ── Email 1: notification to you ──────────────────────────────────────
  const notifyInner = `
    <div style="padding:28px 28px 8px;">
      ${pillBadge("New Message")}
      <h1 style="font-family:${THEME.fontDisplay};font-size:22px;font-weight:600;letter-spacing:-0.02em;color:${THEME.fg};margin:14px 0 0;">
        Portfolio contact
      </h1>
    </div>
    <div style="padding:8px 28px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${fieldRow("Name", escapeHtml(safeName))}
        ${fieldRow("Email", `<a href="mailto:${escapeHtml(safeEmail)}" style="color:${THEME.accent};text-decoration:none;">${escapeHtml(safeEmail)}</a>`)}
        ${fieldRow("Subject", escapeHtml(safeSubject))}
      </table>
      <div style="font-family:${THEME.fontMono};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${THEME.fgMuted};margin:18px 0 6px;">Message</div>
      <div style="font-family:${THEME.fontBody};font-size:14px;line-height:1.7;color:${THEME.fgDim};background:${THEME.bg3};border:1px solid ${THEME.border};border-radius:10px;padding:16px;white-space:pre-wrap;">${escapeHtml(message)}</div>
    </div>
  `;

  const notifyHtml = emailShell(
    notifyInner,
    "Sent from your portfolio contact form",
  );

  const notifyText = `New Contact Form Submission

Name: ${safeName}
Email: ${safeEmail}
Subject: ${safeSubject}

Message:
${message}`;

  // ── Email 2: auto-acknowledgment to the visitor ───────────────────────
  const ackInner = `
  <div style="padding:32px 32px 10px;">
    ${pillBadge("Message received")}

    <h1 style="
      font-family:${THEME.fontDisplay};
      font-size:28px;
      font-weight:600;
      letter-spacing:-0.03em;
      color:${THEME.fg};
      margin:18px 0 0;
    ">
      Thanks for reaching out
    </h1>
  </div>

  <div style="padding:10px 32px 40px;">

    <p style="
      margin:0;
      font-family:${THEME.fontBody};
      font-size:15px;
      line-height:1.9;
      color:${THEME.fgDim};
    ">
      Hi <strong style="color:${THEME.fg};">${escapeHtml(safeName)}</strong>,
    </p>

    <p style="
      margin:18px 0 0;
      font-family:${THEME.fontBody};
      font-size:15px;
      line-height:1.9;
      color:${THEME.fgDim};
    ">
      Thanks for contacting me through my portfolio.
    </p>

    <p style="
      margin:14px 0 0;
      font-family:${THEME.fontBody};
      font-size:15px;
      line-height:1.9;
      color:${THEME.fgDim};
    ">
      I've received your message and will get back to you as soon as possible.
    </p>

    <p style="
      margin:34px 0 0;
      font-family:${THEME.fontBody};
      font-size:15px;
      line-height:1.8;
      color:${THEME.fg};
    ">
      Best,<br>
      <strong>Anish Kadam</strong>
    </p>

  </div>
`;

  const ackHtml = emailShell(
    ackInner,
    "This confirmation was sent automatically after your message was received.",
  );

  const ackText = `Hi ${safeName},

Thanks for contacting me through my portfolio. I've received your message and will get back to you as soon as possible.

Best,
Anish Kadam`;

  try {
    await transporter.sendMail({
      from: `"Anish Portfolio" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      replyTo: `"${safeName}" <${safeEmail}>`,
      subject: `New portfolio contact — ${safeSubject}`,
      text: notifyText,
      html: notifyHtml,
    });

    // Best-effort acknowledgment — don't fail the whole request if this
    // one email doesn't go through (e.g. visitor's address rejects mail).
    try {
      await transporter.sendMail({
        from: `"Anish Kadam" <${process.env.EMAIL_USER}>`,
        to: safeEmail,
        subject: "Thanks for reaching out",
        text: ackText,
        html: ackHtml,
      });
    } catch (ackErr) {
      console.error("Acknowledgment email failed:", ackErr);
    }

    return res.status(200).json({ message: "Email sent successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error sending email" });
  }
}

// import nodemailer from "nodemailer";

// const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// // Prevent header injection — strip anything that could break out of a
// // header line (newlines, carriage returns) before using a field in
// // from/replyTo/subject.
// const sanitizeHeader = (value) =>
//   String(value)
//     .replace(/[\r\n]+/g, " ")
//     .trim();

// // Prevent HTML injection when interpolating user input into the email body.
// const escapeHtml = (value) =>
//   String(value)
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#39;");

// // ── Shared theme tokens (mirrors src/index.css :root dark values) ─────────
// //
// // NOTE ON DARK MODE: The Gmail mobile app ignores color-scheme meta tags and
// // prefers-color-scheme queries. It simply inverts the *brightness* of coded
// // colors, which is why a near-black (#070808) background with near-white text
// // flipped to white on iOS Gmail dark mode. These tokens use dark *midtones*
// // instead of the extremes, so Gmail's inversion is gentle and legible rather
// // than a harsh flip. Apple Mail / desktop still render the design as-is.
// // To go darker or lighter, adjust bg/bg2/bg3 and fg here — everything else
// // derives from these tokens.
// const THEME = {
//   bg: "#1b1e1d",
//   bg2: "#222624",
//   bg3: "#2a2e2c",
//   fg: "#d9dbda",
//   fgDim: "rgba(217,219,218,0.64)",
//   fgMuted: "rgba(217,219,218,0.44)",
//   border: "rgba(217,219,218,0.12)",
//   accent: "rgb(151,252,228)",
//   accentMuted: "rgba(151,252,228,0.10)",
//   fontDisplay: `'Space Grotesk', Arial, sans-serif`,
//   fontBody: `'Inter', Arial, sans-serif`,
//   fontMono: `'Space Mono', 'Courier New', monospace`,
// };

// // Wraps body content in the shared shell: dark canvas, "AK." mono brand
// // mark, mint hairline border, pill footer note. Table-based for email
// // client compatibility.
// //
// // The color-scheme meta tags + :root declaration tell dark-mode-aware
// // clients (Apple Mail on iOS/macOS especially) that this email is already
// // designed for dark mode, so they render it as-is instead of repainting it.
// // Gmail's mobile app ignores these — see the THEME note above for how the
// // midtone palette handles Gmail.
// const emailShell = (innerHtml, footerNote) => `
// <!DOCTYPE html>
// <html>
//   <head>
//     <meta charset="utf-8" />
//     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//     <meta name="color-scheme" content="dark" />
//     <meta name="supported-color-schemes" content="dark" />
//     <!--[if !mso]><!-->
//     <style>
//       :root {
//         color-scheme: dark;
//         supported-color-schemes: dark;
//       }
//       @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500&family=Space+Mono:wght@400;700&display=swap');
//     </style>
//     <!--<![endif]-->
//   </head>
//   <body style="margin:0;padding:0;background:${THEME.bg};">
//     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.bg};padding:32px 16px;">
//       <tr>
//         <td align="center">
//           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

//             <!-- Brand mark -->
//             <tr>
//               <td style="padding-bottom:20px;">
//                 <span style="font-family:${THEME.fontDisplay};font-size:15px;font-weight:700;color:${THEME.fg};letter-spacing:-0.01em;">AK.</span>
//                 <span style="font-family:${THEME.fontMono};font-size:10px;letter-spacing:0.16em;color:${THEME.fgMuted};text-transform:uppercase;margin-left:10px;">Portfolio</span>
//               </td>
//             </tr>

//             <!-- Card -->
//             <tr>
//               <td style="background:${THEME.bg2};border:1px solid ${THEME.border};border-radius:14px;overflow:hidden;">
//                 ${innerHtml}
//               </td>
//             </tr>

//             <!-- Footer -->
//             <tr>
//               <td style="padding:20px 4px 0;">
//                 <span style="font-family:${THEME.fontMono};font-size:10px;letter-spacing:0.08em;color:${THEME.fgMuted};text-transform:uppercase;">
//                   ${footerNote}
//                 </span>
//               </td>
//             </tr>

//           </table>
//         </td>
//       </tr>
//     </table>
//   </body>
// </html>
// `;

// const pillBadge = (label) => `
//   <span style="display:inline-block;font-family:${THEME.fontMono};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${THEME.accent};background:${THEME.accentMuted};border:1px solid rgba(151,252,228,0.22);border-radius:999px;padding:4px 12px;">
//     ${label}
//   </span>
// `;

// const fieldRow = (label, valueHtml) => `
//   <tr>
//     <td style="padding:10px 0;border-bottom:1px solid ${THEME.border};">
//       <div style="font-family:${THEME.fontMono};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${THEME.fgMuted};margin-bottom:4px;">${label}</div>
//       <div style="font-family:${THEME.fontBody};font-size:14px;color:${THEME.fg};">${valueHtml}</div>
//     </td>
//   </tr>
// `;

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     res.setHeader("Allow", "POST");
//     return res.status(405).json({ message: "Method Not Allowed" });
//   }

//   const { name, email, subject, message } = req.body ?? {};

//   if (!name?.trim() || !EMAIL_RE.test(email ?? "") || !message?.trim()) {
//     return res.status(400).json({ message: "Missing or invalid fields" });
//   }

//   const safeName = sanitizeHeader(name);
//   const safeEmail = sanitizeHeader(email);
//   const safeSubject = sanitizeHeader(subject || "No Subject");

//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   // ── Email 1: notification to you ──────────────────────────────────────
//   const notifyInner = `
//     <div style="padding:28px 28px 8px;">
//       ${pillBadge("New Message")}
//       <h1 style="font-family:${THEME.fontDisplay};font-size:22px;font-weight:600;letter-spacing:-0.02em;color:${THEME.fg};margin:14px 0 0;">
//         Portfolio contact
//       </h1>
//     </div>
//     <div style="padding:8px 28px 28px;">
//       <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
//         ${fieldRow("Name", escapeHtml(safeName))}
//         ${fieldRow("Email", `<a href="mailto:${escapeHtml(safeEmail)}" style="color:${THEME.accent};text-decoration:none;">${escapeHtml(safeEmail)}</a>`)}
//         ${fieldRow("Subject", escapeHtml(safeSubject))}
//       </table>
//       <div style="font-family:${THEME.fontMono};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${THEME.fgMuted};margin:18px 0 6px;">Message</div>
//       <div style="font-family:${THEME.fontBody};font-size:14px;line-height:1.7;color:${THEME.fgDim};background:${THEME.bg3};border:1px solid ${THEME.border};border-radius:10px;padding:16px;white-space:pre-wrap;">${escapeHtml(message)}</div>
//     </div>
//   `;

//   const notifyHtml = emailShell(
//     notifyInner,
//     "Sent from your portfolio contact form",
//   );

//   const notifyText = `New Contact Form Submission

// Name: ${safeName}
// Email: ${safeEmail}
// Subject: ${safeSubject}

// Message:
// ${message}`;

//   // ── Email 2: auto-acknowledgment to the visitor ───────────────────────
//   const ackInner = `
//   <div style="padding:32px 32px 10px;">
//     ${pillBadge("Message received")}

//     <h1 style="
//       font-family:${THEME.fontDisplay};
//       font-size:28px;
//       font-weight:600;
//       letter-spacing:-0.03em;
//       color:${THEME.fg};
//       margin:18px 0 0;
//     ">
//       Thanks for reaching out
//     </h1>
//   </div>

//   <div style="padding:10px 32px 40px;">

//     <p style="
//       margin:0;
//       font-family:${THEME.fontBody};
//       font-size:15px;
//       line-height:1.9;
//       color:${THEME.fgDim};
//     ">
//       Hi <strong style="color:${THEME.fg};">${escapeHtml(safeName)}</strong>,
//     </p>

//     <p style="
//       margin:18px 0 0;
//       font-family:${THEME.fontBody};
//       font-size:15px;
//       line-height:1.9;
//       color:${THEME.fgDim};
//     ">
//       Thanks for contacting me through my portfolio.
//     </p>

//     <p style="
//       margin:14px 0 0;
//       font-family:${THEME.fontBody};
//       font-size:15px;
//       line-height:1.9;
//       color:${THEME.fgDim};
//     ">
//       I've received your message and will get back to you as soon as possible.
//     </p>

//     <p style="
//       margin:34px 0 0;
//       font-family:${THEME.fontBody};
//       font-size:15px;
//       line-height:1.8;
//       color:${THEME.fg};
//     ">
//       Best,<br>
//       <strong>Anish Kadam</strong>
//     </p>

//   </div>
// `;

//   const ackHtml = emailShell(
//     ackInner,
//     "This confirmation was sent automatically after your message was received.",
//   );

//   const ackText = `Hi ${safeName},

// Thanks for contacting me through my portfolio. I've received your message and will get back to you as soon as possible.

// Best,
// Anish Kadam`;

//   try {
//     await transporter.sendMail({
//       from: `"Anish Portfolio" <${process.env.EMAIL_USER}>`,
//       to: process.env.EMAIL_TO || process.env.EMAIL_USER,
//       replyTo: `"${safeName}" <${safeEmail}>`,
//       subject: `New portfolio contact — ${safeSubject}`,
//       text: notifyText,
//       html: notifyHtml,
//     });

//     // Best-effort acknowledgment — don't fail the whole request if this
//     // one email doesn't go through (e.g. visitor's address rejects mail).
//     try {
//       await transporter.sendMail({
//         from: `"Anish Kadam" <${process.env.EMAIL_USER}>`,
//         to: safeEmail,
//         subject: "Thanks for reaching out",
//         text: ackText,
//         html: ackHtml,
//       });
//     } catch (ackErr) {
//       console.error("Acknowledgment email failed:", ackErr);
//     }

//     return res.status(200).json({ message: "Email sent successfully!" });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "Error sending email" });
//   }
// }
