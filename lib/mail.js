/**
 * lib/mail.js
 * Envío de correo institucional usando Resend.
 * El PDF se adjunta directamente al correo (no hay link externo).
 *
 * Variables de entorno requeridas:
 *   RESEND_API_KEY  → API key de Resend (re_xxxxxxxxxx)
 *   EMAIL_FROM      → Dirección remitente verificada en Resend
 *                     Ej: "Tutorías ISC <tutorias@veracruz.tecnm.mx>"
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Construye el correo institucional del alumno.
 * Formato: L{noControl}@veracruz.tecnm.mx
 *
 * @param {string} noControl
 * @returns {string}
 */
export function toCorreo(noControl) {
  return `L${noControl}@veracruz.tecnm.mx`;
}

/**
 * Envía el correo con el PDF adjunto.
 *
 * @param {string} noControl  - Número de control del alumno
 * @param {Buffer} pdfBuffer  - Buffer con el contenido del PDF descargado de R2
 * @returns {Promise<void>}
 */
export async function enviarConstancia(noControl, pdfBuffer) {
  const correo = toCorreo(noControl);
  const anio = `20${noControl.slice(0, 2)}`;   // "23" → "2023"

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: correo,
    subject: 'Tu constancia de Tutoría — ISC TecNM Veracruz',
    html: buildHtml(noControl, anio),
    text: buildText(noControl),
    attachments: [
      {
        filename: `constancia_tutoria_${noControl}.pdf`,
        content: pdfBuffer,         // Buffer — Resend lo acepta directamente
        contentType: 'application/pdf',
      },
    ],
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

/* ── Plantillas de correo ─────────────────────────────────────── */

function buildHtml(noControl, anio) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Constancia de Tutoría</title>
</head>
<body style="margin:0; padding:0; background:#F4F7FB; font-family:'Open Sans',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px; width:100%; background:#ffffff; border-radius:12px;
                      overflow:hidden; box-shadow:0 4px 24px rgba(27,57,106,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1B396A 0%,#24518F 100%);
                       padding:36px 40px; text-align:center;">
              <p style="margin:0 0 6px 0; font-size:12px; font-weight:700;
                         text-transform:uppercase; letter-spacing:2px;
                         color:rgba(255,255,255,0.7);">
                Instituto Tecnológico de Veracruz
              </p>
              <h1 style="margin:0; font-size:24px; font-weight:900; color:#ffffff;">
                Coordinación de Tutorías ISC
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">

              <p style="margin:0 0 20px 0; font-size:15px; color:#4a4a4a; line-height:1.7;">
                Hola, <strong>${noControl}</strong>.
              </p>

              <p style="margin:0 0 24px 0; font-size:15px; color:#4a4a4a; line-height:1.7;">
                Tu constancia de acreditación del
                <strong>Programa de Tutorías (generación ${anio})</strong>
                se encuentra adjunta a este correo en formato PDF.
              </p>

              <!-- Aviso adjunto -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background:#F4F7FB; border-left:4px solid #1B396A;
                            border-radius:0 8px 8px 0; margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px; font-size:13px; color:#1B396A; font-weight:600;">
                    📎 El PDF está adjunto a este correo.
                    Guárdalo en un lugar seguro, ya que lo necesitarás para tramitar tus créditos.
                  </td>
                </tr>
              </table>

              <!-- Pasos para tramitar créditos -->
              <p style="margin:0 0 12px 0; font-size:14px; font-weight:700; color:#111;">
                ¿Cómo tramitar tus créditos complementarios?
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="margin-bottom:28px;">
                <tr>
                  <td style="padding:10px 0; border-bottom:1px solid #f0f0f0;
                             font-size:13px; color:#4a4a4a;">
                    <strong style="color:#1B396A;">1.</strong>
                    &nbsp;Solicita la constancia de <strong>Tutoría I y Tutoría II</strong>
                    (ambas son necesarias).
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0; border-bottom:1px solid #f0f0f0;
                             font-size:13px; color:#4a4a4a;">
                    <strong style="color:#1B396A;">2.</strong>
                    &nbsp;Presenta ambos PDFs en el Departamento de Sistemas y Computación.
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#4a4a4a;">
                    <strong style="color:#1B396A;">3.</strong>
                    &nbsp;Solicita el registro de los créditos complementarios.
                  </td>
                </tr>
              </table>

              <p style="margin:0; font-size:13px; color:#7a7a7a; line-height:1.6;">
                Si no solicitaste esta constancia, ignora este mensaje.
                Para cualquier duda escríbenos a
                <a href="mailto:tutorias.isc@veracruz.tecnm.mx"
                   style="color:#1B396A; font-weight:600;">
                  tutorias.isc@veracruz.tecnm.mx
                </a>.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F4F7FB; padding:20px 40px; text-align:center;
                       border-top:1px solid #e8edf5;">
              <p style="margin:0; font-size:12px; color:#aaa;">
                Coordinación de Tutorías ISC<br>
                © ${new Date().getFullYear()} Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

function buildText(noControl) {
  return [
    'Coordinación de Tutorías ISC — TecNM Veracruz',
    '',
    `Hola, ${noControl}.`,
    '',
    'Tu constancia de acreditación del Programa de Tutorías está adjunta a este correo en PDF.',
    'Guárdala, la necesitarás para tramitar tus créditos complementarios.',
    '',
    '¿Cómo tramitar tus créditos?',
    '1. Solicita la constancia de Tutoría I y Tutoría II.',
    '2. Presenta ambos PDFs en el Departamento de Sistemas y Computación.',
    '3. Solicita el registro de los créditos complementarios.',
    '',
    'Si no realizaste esta solicitud, ignora este mensaje.',
    'Dudas: tutorias.isc@veracruz.tecnm.mx',
  ].join('\n');
}
