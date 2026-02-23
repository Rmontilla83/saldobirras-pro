import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM || 'SaldoBirras <onboarding@resend.dev>';

// ═══ EMAIL TEMPLATES ═══

function baseTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#080D19;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:30px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#F5A623;font-size:28px;letter-spacing:4px;margin:0;">SALDOBIRRAS</h1>
      <p style="color:#7B8DB5;font-size:10px;letter-spacing:5px;margin:4px 0 0;">BIRRASPORT</p>
    </div>
    <div style="background:#111A30;border:1px solid rgba(245,166,35,0.08);border-radius:16px;padding:32px;margin-bottom:20px;">
      ${content}
    </div>
    <p style="color:#4A5A7A;font-size:10px;text-align:center;margin:20px 0 0;">
      Este correo fue enviado automáticamente por SaldoBirras · BirraSport
    </p>
  </div>
</body>
</html>`;
}

function rechargeTemplate(name: string, amount: number, balance: number, balanceType: string, qrCode: string, bank?: string, reference?: string) {
  const unit = balanceType === 'money' ? '$' : '';
  const suffix = balanceType === 'beers' ? ' 🍺' : '';
  const bankInfo = bank ? `<p style="color:#7B8DB5;font-size:13px;margin:8px 0 0;">Método: <strong style="color:#F0F2F8;">${bank}</strong>${reference ? ` · Ref: <strong style="color:#F0F2F8;">${reference}</strong>` : ''}</p>` : '';

  return baseTemplate(`
    <p style="color:#F0F2F8;font-size:16px;margin:0 0 4px;">Hola <strong>${name}</strong>,</p>
    <p style="color:#7B8DB5;font-size:14px;margin:0 0 20px;">Tu recarga ha sido procesada exitosamente.</p>

    <div style="background:rgba(0,214,143,0.06);border:1px solid rgba(0,214,143,0.12);border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;">
      <p style="color:#7B8DB5;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Recarga</p>
      <p style="color:#00D68F;font-size:36px;font-weight:900;margin:0;">+${unit}${amount.toFixed(balanceType === 'money' ? 2 : 0)}${suffix}</p>
      ${bankInfo}
    </div>

    <div style="background:rgba(245,166,35,0.04);border:1px solid rgba(245,166,35,0.06);border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
      <p style="color:#7B8DB5;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Saldo Disponible</p>
      <p style="color:#F5A623;font-size:42px;font-weight:900;margin:0;">${unit}${balance.toFixed(balanceType === 'money' ? 2 : 0)}${suffix}</p>
    </div>

    <div style="text-align:center;">
      <p style="color:#7B8DB5;font-size:11px;margin:0 0 10px;">Tu código QR para identificarte:</p>
      <div style="display:inline-block;background:#FFFFFF;padding:12px;border-radius:12px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCode)}&color=1B2A4A" alt="QR Code" width="150" height="150" style="display:block;" />
      </div>
      <p style="color:#4A5A7A;font-size:10px;margin:10px 0 0;">ID: ${qrCode}</p>
    </div>
  `);
}

function lowBalanceTemplate(name: string, balance: number, balanceType: string) {
  const unit = balanceType === 'money' ? '$' : '';
  const suffix = balanceType === 'beers' ? ' 🍺' : '';

  return baseTemplate(`
    <p style="color:#F0F2F8;font-size:16px;margin:0 0 4px;">Hola <strong>${name}</strong>,</p>
    <p style="color:#7B8DB5;font-size:14px;margin:0 0 20px;">Tu saldo en BirraSport está bajando.</p>

    <div style="background:rgba(255,165,0,0.06);border:1px solid rgba(255,165,0,0.15);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
      <p style="color:#FFA500;font-size:32px;margin:0 0 4px;">⚠️</p>
      <p style="color:#7B8DB5;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Saldo Actual</p>
      <p style="color:#FFA500;font-size:42px;font-weight:900;margin:0;">${unit}${balance.toFixed(balanceType === 'money' ? 2 : 0)}${suffix}</p>
    </div>

    <p style="color:#7B8DB5;font-size:14px;text-align:center;margin:0;">
      Te recomendamos recargar pronto para seguir disfrutando de tu cervecería favorita. 🍻
    </p>
  `);
}

function zeroBalanceTemplate(name: string, balanceType: string) {
  return baseTemplate(`
    <p style="color:#F0F2F8;font-size:16px;margin:0 0 4px;">Hola <strong>${name}</strong>,</p>
    <p style="color:#7B8DB5;font-size:14px;margin:0 0 20px;">Tu saldo en BirraSport se ha agotado.</p>

    <div style="background:rgba(255,71,87,0.06);border:1px solid rgba(255,71,87,0.15);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
      <p style="color:#FF4757;font-size:32px;margin:0 0 4px;">🚫</p>
      <p style="color:#7B8DB5;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Saldo Actual</p>
      <p style="color:#FF4757;font-size:42px;font-weight:900;margin:0;">${balanceType === 'money' ? '$0.00' : '0 🍺'}</p>
    </div>

    <p style="color:#7B8DB5;font-size:14px;text-align:center;margin:0;">
      ¡Recarga tu saldo para seguir disfrutando en BirraSport! 🍻
    </p>
  `);
}

function qrEmailTemplate(name: string, balance: number, balanceType: string, qrCode: string) {
  const unit = balanceType === 'money' ? '$' : '';
  const suffix = balanceType === 'beers' ? ' 🍺' : '';

  return baseTemplate(`
    <p style="color:#F0F2F8;font-size:16px;margin:0 0 4px;">Hola <strong>${name}</strong>,</p>
    <p style="color:#7B8DB5;font-size:14px;margin:0 0 20px;">Aquí tienes tu código QR para identificarte en BirraSport.</p>

    <div style="background:rgba(245,166,35,0.04);border:1px solid rgba(245,166,35,0.06);border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
      <p style="color:#7B8DB5;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Saldo Disponible</p>
      <p style="color:#F5A623;font-size:42px;font-weight:900;margin:0;">${unit}${balance.toFixed(balanceType === 'money' ? 2 : 0)}${suffix}</p>
    </div>

    <div style="text-align:center;">
      <p style="color:#7B8DB5;font-size:11px;margin:0 0 10px;">Presenta este código en caja:</p>
      <div style="display:inline-block;background:#FFFFFF;padding:12px;border-radius:12px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCode)}&color=1B2A4A" alt="QR Code" width="180" height="180" style="display:block;" />
      </div>
      <p style="color:#4A5A7A;font-size:10px;margin:10px 0 0;">ID: ${qrCode}</p>
    </div>
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

export async function sendLowBalanceEmail(to: string, name: string, balance: number, balanceType: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `⚠️ Tu saldo en BirraSport está bajo`,
      html: lowBalanceTemplate(name, balance, balanceType),
    });
    console.log('📧 Low balance email sent:', to, data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('📧 Low balance email failed:', err);
    return { success: false, error: err };
  }
}

export async function sendZeroBalanceEmail(to: string, name: string, balanceType: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `🚫 Tu saldo en BirraSport se agotó`,
      html: zeroBalanceTemplate(name, balanceType),
    });
    console.log('📧 Zero balance email sent:', to, data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('📧 Zero balance email failed:', err);
    return { success: false, error: err };
  }
}

export async function sendQREmail(to: string, name: string, balance: number, balanceType: string, qrCode: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `🍺 Tu código QR — BirraSport`,
      html: qrEmailTemplate(name, balance, balanceType, qrCode),
    });
    console.log('📧 QR email sent:', to, data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('📧 QR email failed:', err);
    return { success: false, error: err };
  }
}
