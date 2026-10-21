// Responsive, email-client-safe HTML for customer emails (itinerary, receipt). Tables and inline styles
// only, one 600px column that becomes full width on phones, a hidden preheader, a bulletproof button and
// a light-only color scheme. The logo is the white artwork on the blue band, which survives clients that
// force dark mode (they invert light backgrounds, never images). Fonts fall back to system sans-serif.
// Every dynamic value passes through escapeHtml; URLs are built by the caller from fixed origins.

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
}

export const emailColors = { ink: "#12161C", inkSoft: "#5A6672", line: "#E4E8EB", surface: "#F5F7F8", brand: "#1656D6", brandDeep: "#103FAE", wa: "#25D366", success: "#16A34A" } as const;
const font = "font-family:Manrope,'Segoe UI',Helvetica,Arial,sans-serif;";
export const emailOrigin = "https://www.miviatour.com";

export function emailButton(href: string, label: string, color: string = emailColors.brand, textColor = "#FFFFFF") {
  // Padding sits on the cell (Outlook ignores padding on links); the whole colored cell reads as the button.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td align="center" bgcolor="${color}" style="border-radius:10px;padding:14px 28px;mso-padding-alt:14px 28px"><a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;${font}font-size:16px;font-weight:700;line-height:20px;color:${textColor};text-decoration:none">${escapeHtml(label)}</a></td></tr></table>`;
}

// Label/value rows for "trip at a glance" blocks.
export function emailFacts(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.map(([label, value], index) => `<tr><td style="padding:10px 0;${index ? `border-top:1px solid ${emailColors.line};` : ""}${font}font-size:13px;line-height:18px;color:${emailColors.inkSoft};width:38%;vertical-align:top">${escapeHtml(label)}</td><td style="padding:10px 0;${index ? `border-top:1px solid ${emailColors.line};` : ""}${font}font-size:15px;line-height:21px;color:${emailColors.ink};font-weight:600;vertical-align:top">${escapeHtml(value)}</td></tr>`).join("")}</table>`;
}

export const emailText = (html: string, style = "") => `<p style="margin:0 0 14px;${font}font-size:16px;line-height:25px;color:${emailColors.ink};${style}">${html}</p>`;
export const emailHeading = (text: string) => `<h2 style="margin:28px 0 8px;${font}font-size:13px;line-height:18px;letter-spacing:1px;text-transform:uppercase;color:${emailColors.inkSoft};font-weight:700">${escapeHtml(text)}</h2>`;

export function emailLayout({ title, preheader, hero, body, footer }: { title: string; preheader: string; hero: { eyebrow: string; title: string; lines: string[] }; body: string; footer: string }) {
  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(title)}</title>
<style>
  @media (max-width:620px){ .container{width:100%!important} .pad{padding-left:20px!important;padding-right:20px!important} .hero-title{font-size:26px!important;line-height:32px!important} }
  a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
</style>
</head>
<body style="margin:0;padding:0;background:${emailColors.surface}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${emailColors.surface}">${escapeHtml(preheader)}${"&#8199;&#65279;&#847; ".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${emailColors.surface}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden">
<tr><td class="pad" bgcolor="${emailColors.brandDeep}" style="padding:28px 32px 30px;background:${emailColors.brandDeep}">
<img src="${emailOrigin}/logo-white.png" width="112" alt="viatour" style="display:block;width:112px;height:auto;border:0;margin:0 0 24px;color:#FFFFFF;font-family:Arial,sans-serif;font-size:20px;font-weight:700">
<p style="margin:0 0 6px;${font}font-size:13px;line-height:18px;letter-spacing:1px;text-transform:uppercase;color:#C9D8FB;font-weight:700">${escapeHtml(hero.eyebrow)}</p>
<h1 class="hero-title" style="margin:0;${font}font-size:30px;line-height:36px;color:#FFFFFF;font-weight:800">${escapeHtml(hero.title)}</h1>
${hero.lines.map(line => `<p style="margin:8px 0 0;${font}font-size:16px;line-height:22px;color:#E3EBFD">${escapeHtml(line)}</p>`).join("")}
</td></tr>
<tr><td class="pad" style="padding:28px 32px 8px">${body}</td></tr>
<tr><td class="pad" style="padding:20px 32px 28px;border-top:1px solid ${emailColors.line}">${footer}</td></tr>
</table>
<p style="margin:16px 0 0;${font}font-size:12px;line-height:18px;color:${emailColors.inkSoft}">viatour · asesores de viaje · sueña, descubre, sonríe.</p>
</td></tr></table>
</body>
</html>`;
}

export function emailFooter(reference: string) {
  return `<p style="margin:0 0 8px;${font}font-size:13px;line-height:20px;color:${emailColors.inkSoft}">WhatsApp <a href="https://wa.me/50488668704" style="color:${emailColors.brand}">+504 8866-8704</a> · <a href="mailto:soporte@miviatour.com" style="color:${emailColors.brand}">soporte@miviatour.com</a> · <a href="${emailOrigin}" style="color:${emailColors.brand}">miviatour.com</a></p>
<p style="margin:0;${font}font-size:12px;line-height:18px;color:${emailColors.inkSoft}">Recibe este correo porque tiene la reserva ${escapeHtml(reference)} con viatour. Por su seguridad, Mi viaje solicita su apellido y un código de verificación enviado a su correo.</p>`;
}
