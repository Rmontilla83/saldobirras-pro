import type { Customer } from './types';

const W = 85.6;
const H = 54;

interface CardOptions {
  customer: Customer;
  photoBase64: string | null;
  logoBase64: string | null;
}

export async function generateCard({ customer, photoBase64, logoBase64 }: CardOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const QRCode = await import('qrcode');

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [H, W] });

  // ═══ BACKGROUND ═══
  // Dark premium base
  pdf.setFillColor(10, 16, 32);
  pdf.rect(0, 0, W, H, 'F');

  // Subtle diagonal texture lines
  pdf.setDrawColor(18, 28, 50);
  pdf.setLineWidth(0.08);
  for (let i = -H; i < W + H; i += 3) {
    pdf.line(i, 0, i + H, H);
  }

  // Dark overlay to soften texture
  pdf.setFillColor(10, 16, 32);
  pdf.rect(0, 0, W, H, 'F');

  // ═══ TOP GOLD BAR ═══
  pdf.setFillColor(212, 155, 40);
  pdf.rect(0, 0, W, 0.6, 'F');
  pdf.setFillColor(245, 190, 60);
  pdf.rect(W * 0.2, 0, W * 0.6, 0.6, 'F');

  // ═══ BOTTOM GOLD BAR ═══
  pdf.setFillColor(212, 155, 40);
  pdf.rect(0, H - 0.6, W, 0.6, 'F');
  pdf.setFillColor(245, 190, 60);
  pdf.rect(W * 0.2, H - 0.6, W * 0.6, 0.6, 'F');

  // ═══ PHOTO SECTION ═══
  const px = 4.5, py = 14.5, pw = 19, ph = 23;

  // Gold frame
  pdf.setFillColor(200, 155, 40);
  pdf.roundedRect(px - 0.8, py - 0.8, pw + 1.6, ph + 1.6, 1.8, 1.8, 'F');

  // Inner dark bg
  pdf.setFillColor(15, 22, 40);
  pdf.roundedRect(px, py, pw, ph, 1.2, 1.2, 'F');

  if (photoBase64) {
    // Clip to rounded rect manually — draw image then overlay borders
    pdf.addImage(photoBase64, 'JPEG', px + 0.4, py + 0.4, pw - 0.8, ph - 0.8);
    // Re-draw gold frame on top
    pdf.setDrawColor(200, 155, 40);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(px, py, pw, ph, 1.2, 1.2, 'S');
  } else {
    // Initials
    const initials = customer.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(200, 155, 40);
    pdf.text(initials, px + pw / 2, py + ph / 2 + 3, { align: 'center' });
  }

  // ═══ CUSTOMER INFO ═══
  const ix = px + pw + 3.5;

  // VIP label
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(3.8);
  pdf.setTextColor(200, 155, 40);
  pdf.text('━━  M I E M B R O  V I P  ━━', ix, 17.5);

  // Name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(250, 250, 255);
  const dispName = customer.name.length > 20 ? customer.name.substring(0, 20) + '…' : customer.name;
  pdf.text(dispName.toUpperCase(), ix, 23);

  // Thin gold separator
  pdf.setDrawColor(200, 155, 40);
  pdf.setLineWidth(0.15);
  pdf.line(ix, 25, ix + 28, 25);

  // Contact info
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(4.8);
  pdf.setTextColor(130, 150, 180);

  let cy = 29;
  if (customer.email) {
    pdf.text(customer.email, ix, cy);
    cy += 3.5;
  }
  if (customer.phone) {
    pdf.text(customer.phone, ix, cy);
    cy += 4;
  }

  // Balance type pill
  pdf.setFillColor(20, 30, 55);
  pdf.setDrawColor(200, 155, 40);
  pdf.setLineWidth(0.15);
  const pillText = customer.balance_type === 'money' ? '  $  SALDO EN DÓLARES  ' : '  🍺  SALDO EN CERVEZAS  ';
  const pillW = 28;
  pdf.roundedRect(ix, cy, pillW, 4.5, 1.2, 1.2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(3.5);
  pdf.setTextColor(200, 155, 40);
  pdf.text(pillText, ix + pillW / 2, cy + 3, { align: 'center' });

  // ═══ QR CODE ═══
  const qrDataUrl = await QRCode.toDataURL(customer.qr_code, {
    width: 500, margin: 0,
    color: { dark: '#0A1020', light: '#FFFFFF' },
  });

  const qs = 19, qx = W - qs - 5, qy = 14;

  // Gold frame for QR
  pdf.setFillColor(200, 155, 40);
  pdf.roundedRect(qx - 1.2, qy - 1.2, qs + 2.4, qs + 2.4, 2, 2, 'F');

  // White QR background
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(qx - 0.4, qy - 0.4, qs + 0.8, qs + 0.8, 1.2, 1.2, 'F');

  // QR image
  pdf.addImage(qrDataUrl, 'PNG', qx, qy, qs, qs);

  // Scan label
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(3.2);
  pdf.setTextColor(200, 155, 40);
  pdf.text('ESCANEAR', qx + qs / 2, qy + qs + 2.8, { align: 'center' });

  // ═══ BOTTOM SECTION → MOVED TO TOP BAR WITH LOGO ═══

  // Logo bar at top (larger)
  // Dark bar behind logo area
  pdf.setFillColor(12, 20, 38);
  pdf.rect(0, 0.6, W, 11, 'F');

  // Gold accent line below logo bar
  pdf.setDrawColor(200, 155, 40);
  pdf.setLineWidth(0.2);
  pdf.line(0, 11.6, W, 11.6);

  // Logo — draw on dark background so transparency looks correct
  if (logoBase64) {
    // Draw dark circle behind logo to mask any transparency issues
    pdf.setFillColor(12, 20, 38);
    pdf.circle(8, 6.2, 5, 'F');
    pdf.addImage(logoBase64, 'PNG', 3, 1.5, 10, 10);
  }

  // Brand text next to logo
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(200, 155, 40);
  pdf.text('BIRRASPORT', 15, 5.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(3.8);
  pdf.setTextColor(90, 110, 140);
  pdf.text('Cervecería Premium  ·  SaldoBirras', 15, 8.5);

  // Card ID at bottom right
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(2.8);
  pdf.setTextColor(50, 65, 90);
  pdf.text(customer.qr_code, W - 4, H - 2, { align: 'right' });
  pdf.text('CARD ID', W - 4, H - 4.5, { align: 'right' });

  // ═══ SAVE ═══
  const safe = customer.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
  pdf.save(`Carnet_${safe}.pdf`);
}

// Helper: preload an image URL to base64 (call from component, not from jsPDF)
export async function preloadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const blob = await res.blob();

    // Use createImageBitmap to auto-fix EXIF rotation
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
