import type { Customer } from './types';

// Credit card size at 300 DPI
const DPI = 300;
const W = Math.round(85.6 * DPI / 25.4); // ~1011px
const H = Math.round(54 * DPI / 25.4);   // ~638px

function mm(v: number) { return Math.round(v * DPI / 25.4); }

interface CardOptions {
  customer: Customer;
  photoBase64: string | null;
  logoBase64: string | null;
  marinosGoldBase64?: string | null;
  birrasportBase64?: string | null;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function generateCard({ customer, photoBase64, logoBase64, marinosGoldBase64, birrasportBase64 }: CardOptions): Promise<void> {
  const QRCode = await import('qrcode');

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ═══ BACKGROUND ═══
  ctx.fillStyle = '#080C1C';
  ctx.fillRect(0, 0, W, H);

  // Diagonal lines
  ctx.strokeStyle = '#0E162A';
  ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += mm(2.5)) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }

  // Darken overlay
  ctx.fillStyle = 'rgba(8, 12, 28, 0.7)';
  ctx.fillRect(0, 0, W, H);

  // ═══ MARINOS GOLD WATERMARK ═══
  if (marinosGoldBase64) {
    try {
      const mgImg = await loadImg(marinosGoldBase64);
      ctx.globalAlpha = 0.055;
      const mgS = mm(56);
      ctx.drawImage(mgImg, W / 2 - mgS / 2, H / 2 - mgS / 2, mgS, mgS);
      ctx.globalAlpha = 1;
    } catch {}
  }

  // ═══ GOLD BARS ═══
  ctx.fillStyle = '#C89B28';
  ctx.fillRect(0, 0, W, mm(0.5));
  ctx.fillStyle = '#EBBB3C';
  ctx.fillRect(W * 0.25, 0, W * 0.5, mm(0.5));

  ctx.fillStyle = '#C89B28';
  ctx.fillRect(0, H - mm(0.5), W, mm(0.5));
  ctx.fillStyle = '#EBBB3C';
  ctx.fillRect(W * 0.25, H - mm(0.5), W * 0.5, mm(0.5));

  // ═══ HEADER BAR ═══
  ctx.fillStyle = '#0A1020';
  ctx.fillRect(0, mm(0.5), W, mm(12.5));

  // Gold line
  ctx.strokeStyle = '#C89B28';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mm(4), mm(13));
  ctx.lineTo(W - mm(4), mm(13));
  ctx.stroke();

  // BirraSport logo (left, big)
  const bsLogo = birrasportBase64 || logoBase64;
  if (bsLogo) {
    try {
      const bsImg = await loadImg(bsLogo);
      ctx.drawImage(bsImg, mm(3), mm(1), mm(14), mm(11));
    } catch {}
  }

  // Brand text
  ctx.fillStyle = '#C89B28';
  ctx.font = `bold ${mm(3.5)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillText('BIRRASPORT', mm(19), mm(6.5));

  ctx.fillStyle = '#647896';
  ctx.font = `${mm(1.5)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillText('Cervecería Premium  ·  SaldoBirras', mm(19), mm(9.5));

  // Marinos Gold 50 Años (right)
  if (marinosGoldBase64) {
    try {
      const mgImg = await loadImg(marinosGoldBase64);
      ctx.drawImage(mgImg, W - mm(16), mm(1.5), mm(13), mm(10));
    } catch {}
  }

  // ═══ PHOTO ═══
  const px = mm(4.5), py = mm(16), pw = mm(18), ph = mm(22);

  // Gold frame
  roundRect(ctx, px - mm(0.7), py - mm(0.7), pw + mm(1.4), ph + mm(1.4), mm(1.5));
  ctx.fillStyle = '#C89B28';
  ctx.fill();

  // Inner dark
  roundRect(ctx, px, py, pw, ph, mm(1));
  ctx.fillStyle = '#0C1426';
  ctx.fill();

  if (photoBase64) {
    try {
      const photoImg = await loadImg(photoBase64);
      ctx.save();
      roundRect(ctx, px + mm(0.4), py + mm(0.4), pw - mm(0.8), ph - mm(0.8), mm(0.8));
      ctx.clip();
      ctx.drawImage(photoImg, px + mm(0.4), py + mm(0.4), pw - mm(0.8), ph - mm(0.8));
      ctx.restore();
      roundRect(ctx, px, py, pw, ph, mm(1));
      ctx.strokeStyle = '#C89B28';
      ctx.lineWidth = mm(0.7);
      ctx.stroke();
    } catch {}
  } else {
    const initials = customer.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
    ctx.fillStyle = '#C89B28';
    ctx.font = `bold ${mm(6)}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(initials, px + pw / 2, py + ph / 2 + mm(2));
    ctx.textAlign = 'left';
  }

  // ═══ CUSTOMER INFO ═══
  const ix = px + pw + mm(3);

  ctx.fillStyle = '#C89B28';
  ctx.font = `bold ${mm(1.5)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillText('━━  M I E M B R O  V I P  ━━', ix, mm(18.5));

  ctx.fillStyle = '#F5F5FF';
  ctx.font = `bold ${mm(3)}px 'Segoe UI', Arial, sans-serif`;
  const dispName = customer.name.length > 20 ? customer.name.substring(0, 20) + '…' : customer.name;
  ctx.fillText(dispName.toUpperCase(), ix, mm(24));

  // Gold separator
  ctx.strokeStyle = '#C89B28';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ix, mm(25.5));
  ctx.lineTo(ix + mm(26), mm(25.5));
  ctx.stroke();

  ctx.fillStyle = '#788CAF';
  ctx.font = `${mm(1.8)}px 'Segoe UI', Arial, sans-serif`;
  let cy = mm(29.5);
  if (customer.email) {
    ctx.fillText(customer.email, ix, cy);
    cy += mm(3.5);
  }
  if (customer.phone) {
    ctx.fillText(customer.phone, ix, cy);
    cy += mm(4);
  }

  // PIN
  if ((customer as any).pin) {
    roundRect(ctx, ix, cy, mm(14), mm(5), mm(1.2));
    ctx.fillStyle = '#121C30';
    ctx.fill();
    ctx.strokeStyle = '#C89B28';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#788CAF';
    ctx.font = `bold ${mm(1.2)}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText('PIN', ix + mm(1.5), cy + mm(1.8));
    ctx.fillStyle = '#C89B28';
    ctx.font = `bold ${mm(2.8)}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText((customer as any).pin, ix + mm(1.5), cy + mm(4.3));
    cy += mm(7);
  }

  // Balance pill
  roundRect(ctx, ix, cy, mm(26), mm(4.2), mm(1));
  ctx.fillStyle = '#121C30';
  ctx.fill();
  ctx.strokeStyle = '#C89B28';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#C89B28';
  ctx.font = `bold ${mm(1.3)}px 'Segoe UI', Arial, sans-serif`;
  ctx.textAlign = 'center';
  const pillText = customer.balance_type === 'money' ? '$  SALDO EN DÓLARES' : 'SALDO EN CERVEZAS';
  ctx.fillText(pillText, ix + mm(13), cy + mm(2.8));
  ctx.textAlign = 'left';

  // ═══ QR CODE ═══
  const qrDataUrl = await QRCode.toDataURL(customer.qr_code, {
    width: 500, margin: 0,
    color: { dark: '#0A1020', light: '#FFFFFF' },
  });

  const qs = mm(18), qx = W - qs - mm(4.5), qy = mm(15.5);

  // Gold frame
  roundRect(ctx, qx - mm(1), qy - mm(1), qs + mm(2), qs + mm(2), mm(1.8));
  ctx.fillStyle = '#C89B28';
  ctx.fill();

  // White bg
  roundRect(ctx, qx - mm(0.3), qy - mm(0.3), qs + mm(0.6), qs + mm(0.6), mm(1));
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // QR image
  try {
    const qrImg = await loadImg(qrDataUrl);
    ctx.drawImage(qrImg, qx, qy, qs, qs);
  } catch {}

  // Scan label
  ctx.fillStyle = '#C89B28';
  ctx.font = `bold ${mm(1.3)}px 'Segoe UI', Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ESCANEAR', qx + qs / 2, qy + qs + mm(2.5));
  ctx.textAlign = 'left';

  // ═══ CARD ID ═══
  ctx.fillStyle = '#2D3C55';
  ctx.font = `${mm(1)}px 'Segoe UI', Arial, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('CARD ID', W - mm(4), H - mm(4.2));
  ctx.fillText(customer.qr_code, W - mm(4), H - mm(2));
  ctx.textAlign = 'left';

  // ═══ DOWNLOAD AS PNG ═══
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const safe = customer.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
  link.download = `Carnet_${safe}.png`;
  link.href = dataUrl;
  link.click();
}

// Helper: preload an image URL to base64 as JPEG
export async function preloadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    const max = 500;
    let w = bitmap.width, h = bitmap.height;
    if (w > max || h > max) {
      const r = Math.min(max / w, max / h);
      w = Math.round(w * r);
      h = Math.round(h * r);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}

// Preload PNG preserving transparency
export async function preloadPNG(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    const max = 400;
    let w = bitmap.width, h = bitmap.height;
    if (w > max || h > max) {
      const r = Math.min(max / w, max / h);
      w = Math.round(w * r);
      h = Math.round(h * r);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
