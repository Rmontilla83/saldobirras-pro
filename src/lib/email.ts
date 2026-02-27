import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM || 'SaldoBirras <onboarding@resend.dev>';

// ═══ HELPERS ═══

function portalButton(qrCode: string, label = 'ABRIR PORTAL') {
  const portalUrl = `https://portal.birrasport.com/portal?qr=${encodeURIComponent(qrCode)}`;
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:20px auto 0;">
      <tr>
        <td align="center" style="background:#F5A623;border-radius:12px;">
          <a href="${portalUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#000000;font-size:14px;font-weight:800;text-decoration:none;font-family:'Segoe UI',Arial,sans-serif;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

// ═══ EMAIL TEMPLATES ═══

function baseTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]>
  <style>table{border-collapse:collapse;}td{font-family:'Segoe UI',Arial,sans-serif;}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:#080D19;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#080D19;">
    <tr>
      <td align="center" style="padding:30px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <h1 style="color:#F5A623;font-size:28px;letter-spacing:4px;margin:0;font-family:'Segoe UI',Arial,sans-serif;">SALDOBIRRAS</h1>
              <p style="color:#7B8DB5;font-size:10px;letter-spacing:5px;margin:4px 0 0;">BIRRASPORT</p>
            </td>
          </tr>
          <tr>
            <td style="background:#111A30;border:1px solid #23252F;border-radius:16px;padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 0 0;">
              <p style="color:#4A5A7A;font-size:10px;margin:0;">
                Este correo fue enviado autom&aacute;ticamente por SaldoBirras &middot; BirraSport
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function rechargeTemplate(name: string, amount: number, balance: number, balanceType: string, qrCode: string, bank?: string, reference?: string) {
  const unit = balanceType === 'money' ? '$' : '';
  const suffix = balanceType === 'beers' ? ' 🍺' : '';
  const bankInfo = bank ? `<p style="color:#7B8DB5;font-size:13px;margin:8px 0 0;">M&eacute;todo: <strong style="color:#F0F2F8;">${bank}</strong>${reference ? ` &middot; Ref: <strong style="color:#F0F2F8;">${reference}</strong>` : ''}</p>` : '';

  return baseTemplate(`
    <p style="color:#F0F2F8;font-size:16px;margin:0 0 4px;">Hola <strong>${name}</strong>,</p>
    <p style="color:#7B8DB5;font-size:14px;margin:0 0 20px;">Tu recarga ha sido procesada exitosamente.</p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:16px;">
      <tr>
        <td style="background:#102536;border:1px solid #0F313B;border-radius:12px;padding:20px;text-align:center;">
          <p style="color:#7B8DB5;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Recarga</p>
          <p style="color:#00D68F;font-size:36px;font-weight:900;margin:0;">+${unit}${amount.toFixed(balanceType === 'money' ? 2 : 0)}${suffix}</p>
          ${bankInfo}
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
      <tr>
        <td style="background:#1A202F;border:1px solid #1F222F;border-radius:12px;padding:20px;text-align:center;">
          <p style="color:#7B8DB5;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Saldo Disponible</p>
          <p style="color:#F5A623;font-size:42px;font-weight:900;margin:0;">${unit}${balance.toFixed(balanceType === 'money' ? 2 : 0)}${suffix}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <p style="color:#7B8DB5;font-size:11px;margin:0 0 10px;">Tu c&oacute;digo QR para identificarte:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
            <tr>
              <td style="background:#FFFFFF;padding:12px;border-radius:12px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCode)}&color=1B2A4A" alt="C&oacute;digo QR de ${name}" width="150" height="150" style="display:block;" />
              </td>
            </tr>
          </table>
          <p style="color:#4A5A7A;font-size:10px;margin:10px 0 0;">ID: ${qrCode}</p>
        </td>
      </tr>
    </table>

    ${portalButton(qrCode)}
  `);
}

function lowBalanceTemplate(name: string, balance: number, balanceType: string, qrCode: string) {
  const unit = balanceType === 'money' ? '$' : '';
  const suffix = balanceType === 'beers' ? ' 🍺' : '';

  return baseTemplate(`
    <p style="color:#F0F2F8;font-size:16px;margin:0 0 4px;">Hola <strong>${name}</strong>,</p>
    <p style="color:#7B8DB5;font-size:14px;margin:0 0 20px;">Tu saldo en BirraSport est&aacute; bajando.</p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
      <tr>
        <td style="background:#1F222D;border:1px solid #352F29;border-radius:12px;padding:24px;text-align:center;">
          <p style="color:#FFA500;font-size:32px;margin:0 0 4px;">&#9888;&#65039;</p>
          <p style="color:#7B8DB5;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Saldo Actual</p>
          <p style="color:#FFA500;font-size:42px;font-weight:900;margin:0;">${unit}${balance.toFixed(balanceType === 'money' ? 2 : 0)}${suffix}</p>
        </td>
      </tr>
    </table>

    <p style="color:#7B8DB5;font-size:14px;text-align:center;margin:0;">
      Te recomendamos recargar pronto para seguir disfrutando de tu cervecer&iacute;a favorita. 🍻
    </p>

    ${portalButton(qrCode)}
  `);
}

function zeroBalanceTemplate(name: string, balanceType: string, qrCode: string) {
  return baseTemplate(`
    <p style="color:#F0F2F8;font-size:16px;margin:0 0 4px;">Hola <strong>${name}</strong>,</p>
    <p style="color:#7B8DB5;font-size:14px;margin:0 0 20px;">Tu saldo en BirraSport se ha agotado.</p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
      <tr>
        <td style="background:#1F1D32;border:1px solid #352136;border-radius:12px;padding:24px;text-align:center;">
          <p style="color:#FF4757;font-size:32px;margin:0 0 4px;">&#128683;</p>
          <p style="color:#7B8DB5;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Saldo Actual</p>
          <p style="color:#FF4757;font-size:42px;font-weight:900;margin:0;">${balanceType === 'money' ? '$0.00' : '0 🍺'}</p>
        </td>
      </tr>
    </table>

    <p style="color:#7B8DB5;font-size:14px;text-align:center;margin:0;">
      &iexcl;Recarga tu saldo para seguir disfrutando en BirraSport! 🍻
    </p>

    ${portalButton(qrCode)}
  `);
}

function qrEmailTemplate(name: string, balance: number, balanceType: string, qrCode: string, pin?: string) {
  const unit = balanceType === 'money' ? '$' : '';
  const suffix = balanceType === 'beers' ? ' 🍺' : '';
  const portalUrl = `https://portal.birrasport.com/portal?qr=${encodeURIComponent(qrCode)}`;

  return baseTemplate(`
    <p style="color:#F0F2F8;font-size:16px;margin:0 0 4px;">Hola <strong>${name}</strong>,</p>
    <p style="color:#7B8DB5;font-size:14px;margin:0 0 20px;">&iexcl;Bienvenido a BirraSport! Aqu&iacute; tienes toda la informaci&oacute;n para disfrutar tu experiencia.</p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
      <tr>
        <td style="background:#1A202F;border:1px solid #1F222F;border-radius:12px;padding:20px;text-align:center;">
          <p style="color:#7B8DB5;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Saldo Disponible</p>
          <p style="color:#F5A623;font-size:42px;font-weight:900;margin:0;">${unit}${balance.toFixed(balanceType === 'money' ? 2 : 0)}${suffix}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <p style="color:#7B8DB5;font-size:11px;margin:0 0 10px;">Tu c&oacute;digo QR para identificarte en caja:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
            <tr>
              <td style="background:#FFFFFF;padding:12px;border-radius:12px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCode)}&color=1B2A4A" alt="C&oacute;digo QR de ${name}" width="180" height="180" style="display:block;" />
              </td>
            </tr>
          </table>
          <p style="color:#4A5A7A;font-size:10px;margin:10px 0 0;">ID: ${qrCode}</p>
        </td>
      </tr>
    </table>

    ${pin ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background:#1F222F;border:1px solid #2C2B2E;border-radius:12px;padding:20px;text-align:center;">
          <p style="color:#7B8DB5;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">Tu PIN de acceso</p>
          <p style="color:#F5A623;font-size:48px;font-weight:900;letter-spacing:12px;margin:0;">${pin}</p>
          <p style="color:#7B8DB5;font-size:11px;margin:8px 0 0;">Usa este PIN para entrar al portal desde tu tel&eacute;fono</p>
        </td>
      </tr>
    </table>
    ` : ''}

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
      <tr>
        <td style="background:#102234;border:1px solid #0F2D39;border-radius:12px;padding:24px;">
          <p style="color:#00D68F;font-size:14px;font-weight:700;margin:0 0 12px;text-align:center;">📱 Haz pedidos desde tu tel&eacute;fono</p>
          <p style="color:#7B8DB5;font-size:13px;margin:0 0 16px;text-align:center;">Entra al portal, revisa el men&uacute; y pide sin hacer cola.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
            <tr>
              <td align="center" style="background:#F5A623;border-radius:12px;">
                <a href="${portalUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#000000;font-size:14px;font-weight:800;text-decoration:none;font-family:'Segoe UI',Arial,sans-serif;">
                  ENTRAR AL PORTAL
                </a>
              </td>
            </tr>
          </table>
          <p style="color:#4A5A7A;font-size:10px;text-align:center;margin:12px 0 0;">portal.birrasport.com</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="background:#161F34;border:1px solid #1B2338;border-radius:12px;padding:20px;">
          <p style="color:#F0F2F8;font-size:13px;font-weight:700;margin:0 0 12px;">&iquest;C&oacute;mo funciona?</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-spacing:0;">
            <tr>
              <td style="color:#F5A623;font-size:20px;width:36px;vertical-align:top;padding:0 0 8px;">1.</td>
              <td style="color:#7B8DB5;font-size:12px;padding:0 0 8px;">Abre <strong style="color:#F0F2F8;">portal.birrasport.com</strong> en tu tel&eacute;fono${pin ? ` e ingresa tu PIN <strong style="color:#F5A623;">${pin}</strong>` : ''}</td>
            </tr>
            <tr>
              <td style="color:#F5A623;font-size:20px;width:36px;vertical-align:top;padding:0 0 8px;">2.</td>
              <td style="color:#7B8DB5;font-size:12px;padding:0 0 8px;">Explora el men&uacute; y selecciona lo que quieras pedir</td>
            </tr>
            <tr>
              <td style="color:#F5A623;font-size:20px;width:36px;vertical-align:top;padding:0 0 8px;">3.</td>
              <td style="color:#7B8DB5;font-size:12px;padding:0 0 8px;">Env&iacute;a tu pedido y te lo llevan a tu zona</td>
            </tr>
            <tr>
              <td style="color:#F5A623;font-size:20px;width:36px;vertical-align:top;padding:0;">4.</td>
              <td style="color:#7B8DB5;font-size:12px;padding:0;">El monto se descuenta autom&aacute;ticamente de tu saldo</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="color:#7B8DB5;font-size:12px;text-align:center;margin:20px 0 0;">
      💡 <strong style="color:#F0F2F8;">Tip:</strong> Instala la app en tu tel&eacute;fono desde el portal para acceso r&aacute;pido
    </p>
  `);
}

// ═══ SEND FUNCTIONS ═══

export async function sendRechargeEmail(
  to: string, name: string, amount: number, balance: number,
  balanceType: string, qrCode: string, bank?: string, reference?: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `✅ Recarga exitosa — ${balanceType === 'money' ? '$' : ''}${amount.toFixed(balanceType === 'money' ? 2 : 0)}${balanceType === 'beers' ? ' cervezas' : ''}`,
      html: rechargeTemplate(name, amount, balance, balanceType, qrCode, bank, reference),
    });
    console.log('📧 Recharge email sent:', to, data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('📧 Recharge email failed:', err);
    return { success: false, error: err };
  }
}

export async function sendLowBalanceEmail(to: string, name: string, balance: number, balanceType: string, qrCode: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `⚠️ Tu saldo en BirraSport está bajo`,
      html: lowBalanceTemplate(name, balance, balanceType, qrCode),
    });
    console.log('📧 Low balance email sent:', to, data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('📧 Low balance email failed:', err);
    return { success: false, error: err };
  }
}

export async function sendZeroBalanceEmail(to: string, name: string, balanceType: string, qrCode: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `🚫 Tu saldo en BirraSport se agotó`,
      html: zeroBalanceTemplate(name, balanceType, qrCode),
    });
    console.log('📧 Zero balance email sent:', to, data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('📧 Zero balance email failed:', err);
    return { success: false, error: err };
  }
}

export async function sendQREmail(to: string, name: string, balance: number, balanceType: string, qrCode: string, pin?: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `🍺 Bienvenido a BirraSport — Tu acceso y portal de pedidos`,
      html: qrEmailTemplate(name, balance, balanceType, qrCode, pin),
    });
    console.log('📧 QR email sent:', to, data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('📧 QR email failed:', err);
    return { success: false, error: err };
  }
}
