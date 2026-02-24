import type { Customer } from './types';

const W = 85.6;
const H = 54;

interface CardOptions {
  customer: Customer;
  photoBase64: string | null;
  logoBase64: string | null;
  marinosGoldBase64?: string | null;
  marinos2026Base64?: string | null;
  birrasportBase64?: string | null;
}

export async function generateCard({ customer, photoBase64, logoBase64, marinosGoldBase64, marinos2026Base64, birrasportBase64 }: CardOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const QRCode = await import('qrcode');

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [H, W] });

  // ═══ BACKGROUND — Deep navy ═══
  pdf.setFillColor(8, 12, 28);
  pdf.rect(0, 0, W, H, 'F');

  // Subtle diagonal lines
  pdf.setDrawColor(14, 22, 42);
  pdf.setLineWidth(0.06);
  for (let i = -H; i < W + H; i += 2.5) {
    pdf.line(i, 0, i + H, H);
  }

  // Darken overlay
  pdf.setGState(new (pdf as any).GState({ opacity: 0.7 }));
  pdf.setFillColor(8, 12, 28);
  pdf.rect(0, 0, W, H, 'F');
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // ═══ MARINOS GOLD WATERMARK — ghosted background ═══
  if (marinosGoldBase64) {
    pdf.setGState(new (pdf as any).GState({ opacity: 0.055 }));
    pdf.addImage(marinosGoldBase64, 'PNG', W / 2 - 30, H / 2 - 28, 60, 56);
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
  }

  // ═══ TOP GOLD BAR ═══
  pdf.setFillColor(200, 155, 40);
  pdf.rect(0, 0, W, 0.5, 'F');
  pdf.setFillColor(235, 185, 60);
  pdf.rect(W * 0.25, 0, W * 0.5, 0.5, 'F');

  // ═══ BOTTOM GOLD BAR ═══
  pdf.setFillColor(200, 155, 40);
  pdf.rect(0, H - 0.5, W, 0.5, 'F');
  pdf.setFillColor(235, 185, 60);
  pdf.rect(W * 0.25, H - 0.5, W * 0.5, 0.5, 'F');

  // ═══ HEADER BAR ═══
  pdf.setFillColor(10, 16, 32);
  pdf.rect(0, 0.5, W, 12.5, 'F');

  // Gold line under header
  pdf.setDrawColor(200, 155, 40);
  pdf.setLineWidth(0.2);
  pdf.line(4, 13, W - 4, 13);

  // BirraSport logo (left, prominent, bigger)
  const bsLogo = birrasportBase64 || logoBase64;
  if (bsLogo) {
    pdf.addImage(bsLogo, 'PNG', 3, 1, 14, 11);
  }

  // Brand text
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(200, 155, 40);
  pdf.text('BIRRASPORT', 19, 5.8);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(3.5);
  pdf.setTextColor(100, 120, 150);
  pdf.text('Cervecería Premium  ·  SaldoBirras', 19, 8.8);

  // Marinos Gold 50 Años (right in header)
  if (marinosGoldBase64) {
    pdf.addImage(marinosGoldBase64, 'PNG', W - 16, 1.5, 13, 10);
  }

  // ═══ PHOTO ═══
  const px = 4.5, py = 16, pw = 18, ph = 22;

  pdf.setFillColor(200, 155, 40);
  pdf.roundedRect(px - 0.7, py - 0.7, pw + 1.4, ph + 1.4, 1.5, 1.5, 'F');

  pdf.setFillColor(12, 20, 38);
  pdf.roundedRect(px, py, pw, ph, 1, 1, 'F');

  if (photoBase64) {
    pdf.addImage(photoBase64, 'JPEG', px + 0.4, py + 0.4, pw - 0.8, ph - 0.8);
    pdf.setDrawColor(200, 155, 40);
    pdf.setLineWidth(0.7);
    pdf.roundedRect(px, py, pw, ph, 1, 1, 'S');
  } else {
    const initials = customer.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(200, 155, 40);
    pdf.text(initials, px + pw / 2, py + ph / 2 + 2.5, { align: 'center' });
  }

  // ═══ CUSTOMER INFO ═══
  const ix = px + pw + 3;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(3.5);
  pdf.setTextColor(200, 155, 40);
  pdf.text('━━  M I E M B R O  V I P  ━━', ix, 18.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(245, 245, 255);
  const dispName = customer.name.length > 20 ? customer.name.substring(0, 20) + '…' : customer.name;
  pdf.text(dispName.toUpperCase(), ix, 23.5);

  pdf.setDrawColor(200, 155, 40);
  pdf.setLineWidth(0.12);
  pdf.line(ix, 25.5, ix + 26, 25.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(4.5);
  pdf.setTextColor(120, 140, 175);
  let cy = 29.5;
  if (customer.email) {
    pdf.text(customer.email, ix, cy);
    cy += 3.5;
  }
  if (customer.phone) {
    pdf.text(customer.phone, ix, cy);
    cy += 4;
  }

  // PIN
  if ((customer as any).pin) {
    pdf.setFillColor(18, 28, 48);
    pdf.setDrawColor(200, 155, 40);
    pdf.setLineWidth(0.15);
    pdf.roundedRect(ix, cy, 14, 5, 1.2, 1.2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(3);
    pdf.setTextColor(120, 140, 175);
    pdf.text('PIN', ix + 2, cy + 2);
    pdf.setFontSize(7);
    pdf.setTextColor(200, 155, 40);
    pdf.text((customer as any).pin, ix + 2, cy + 4.3);
    cy += 7;
  }

  // Balance type pill
  pdf.setFillColor(18, 28, 48);
  pdf.setDrawColor(200, 155, 40);
  pdf.setLineWidth(0.12);
  const pillText = customer.balance_type === 'money' ? '  $  SALDO EN DÓLARES  ' : '  SALDO EN CERVEZAS  ';
  const pillW = 26;
  pdf.roundedRect(ix, cy, pillW, 4.2, 1, 1, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(3.2);
  pdf.setTextColor(200, 155, 40);
  pdf.text(pillText, ix + pillW / 2, cy + 2.8, { align: 'center' });

  // ═══ QR CODE ═══
  const qrDataUrl = await QRCode.toDataURL(customer.qr_code, {
    width: 500, margin: 0,
    color: { dark: '#0A1020', light: '#FFFFFF' },
  });

  const qs = 18, qx = W - qs - 4.5, qy = 15.5;

  pdf.setFillColor(200, 155, 40);
  pdf.roundedRect(qx - 1, qy - 1, qs + 2, qs + 2, 1.8, 1.8, 'F');

  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(qx - 0.3, qy - 0.3, qs + 0.6, qs + 0.6, 1, 1, 'F');

  pdf.addImage(qrDataUrl, 'PNG', qx, qy, qs, qs);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(3);
  pdf.setTextColor(200, 155, 40);
  pdf.text('ESCANEAR', qx + qs / 2, qy + qs + 2.5, { align: 'center' });

  // ═══ BOTTOM — Card ID ═══
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(2.5);
  pdf.setTextColor(45, 60, 85);
  pdf.text(customer.qr_code, W - 4, H - 2, { align: 'right' });
  pdf.text('CARD ID', W - 4, H - 4.2, { align: 'right' });

  // ═══ SAVE ═══
  const safe = customer.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
  pdf.save(`Carnet_${safe}.pdf`);
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
