import type { Customer } from './types';

const CARD_W = 85.6;
const CARD_H = 54;

export async function generateCard(customer: Customer): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CARD_H, CARD_W],
  });

  // ═══════════════════════════════════════════
  // PREMIUM BACKGROUND
  // ═══════════════════════════════════════════

  // Deep navy base
  doc.setFillColor(8, 14, 28);
  doc.rect(0, 0, CARD_W, CARD_H, 'F');

  // Subtle gradient overlay (darker at edges)
  doc.setFillColor(4, 8, 18);
  doc.rect(0, 0, CARD_W, 6, 'F');
  doc.setFillColor(4, 8, 18);
  doc.rect(0, CARD_H - 6, CARD_W, 6, 'F');

  // ═══════════════════════════════════════════
  // TOP GOLD ACCENT BAR
  // ═══════════════════════════════════════════
  const gradient = [
    { x: 0, w: CARD_W * 0.15, r: 180, g: 130, b: 20 },
    { x: CARD_W * 0.15, w: CARD_W * 0.7, r: 245, g: 166, b: 35 },
    { x: CARD_W * 0.85, w: CARD_W * 0.15, r: 180, g: 130, b: 20 },
  ];
  gradient.forEach(g => {
    doc.setFillColor(g.r, g.g, g.b);
    doc.rect(g.x, 0, g.w, 0.8, 'F');
  });

  // Thin white line below gold
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.05);
  doc.line(0, 0.85, CARD_W, 0.85);

  // ═══════════════════════════════════════════
  // LEFT SIDE — PHOTO + IDENTITY
  // ═══════════════════════════════════════════

  // Photo area with premium border
  const photoX = 4;
  const photoY = 5;
  const photoW = 20;
  const photoH = 24;

  // Photo shadow
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(photoX + 0.3, photoY + 0.3, photoW, photoH, 2, 2, 'F');

  // Photo border (gold)
  doc.setFillColor(245, 166, 35);
  doc.roundedRect(photoX - 0.5, photoY - 0.5, photoW + 1, photoH + 1, 2.2, 2.2, 'F');

  // Photo inner bg
  doc.setFillColor(15, 25, 45);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'F');

  let photoLoaded = false;
  if (customer.photo_url) {
    try {
      const photoData = await loadImage(customer.photo_url);
      if (photoData) {
        doc.addImage(photoData, 'JPEG', photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
        photoLoaded = true;
      }
    } catch {}
  }

  if (!photoLoaded) {
    const initials = customer.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    doc.setFillColor(30, 50, 80);
    doc.roundedRect(photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(245, 166, 35);
    doc.text(initials, photoX + photoW / 2, photoY + photoH / 2 + 2.5, { align: 'center' });
  }

  // ═══════════════════════════════════════════
  // CENTER — CUSTOMER INFO
  // ═══════════════════════════════════════════
  const infoX = photoX + photoW + 4;

  // "MIEMBRO" label
  doc.setFontSize(4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(245, 166, 35);
  doc.text('M I E M B R O', infoX, 8);

  // Tiny gold line
  doc.setDrawColor(245, 166, 35);
  doc.setLineWidth(0.2);
  doc.line(infoX, 9.5, infoX + 18, 9.5);

  // Customer name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const name = customer.name.length > 22 ? customer.name.substring(0, 22) + '…' : customer.name;
  doc.text(name.toUpperCase(), infoX, 14);

  // Email
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(120, 140, 170);

  let lineY = 17.5;
  if (customer.email) {
    doc.text(customer.email, infoX, lineY);
    lineY += 3.2;
  }
  if (customer.phone) {
    doc.text(customer.phone, infoX, lineY);
    lineY += 3.2;
  }

  // Balance type badge
  doc.setFillColor(245, 166, 35, 0.15);
  doc.setFillColor(30, 40, 60);
  const badgeText = customer.balance_type === 'money' ? '$ DÓLARES' : '🍺 CERVEZAS';
  const badgeW = doc.getTextWidth(badgeText) * 0.7 + 4;
  doc.roundedRect(infoX, lineY, badgeW, 4, 1, 1, 'F');
  doc.setDrawColor(245, 166, 35);
  doc.setLineWidth(0.1);
  doc.roundedRect(infoX, lineY, badgeW, 4, 1, 1, 'S');
  doc.setFontSize(3.5);
  doc.setTextColor(245, 166, 35);
  doc.text(badgeText, infoX + 2, lineY + 2.8);

  // ═══════════════════════════════════════════
  // RIGHT SIDE — QR CODE
  // ═══════════════════════════════════════════
  try {
    const QRCode = await import('qrcode');
    const qrDataUrl = await QRCode.toDataURL(customer.qr_code, {
      width: 400,
      margin: 0,
      color: { dark: '#0E1C36', light: '#FFFFFF' },
    });

    const qrSize = 20;
    const qrX = CARD_W - qrSize - 5;
    const qrY = 4;

    // QR outer frame (gold border)
    doc.setFillColor(245, 166, 35);
    doc.roundedRect(qrX - 1.5, qrY - 1.5, qrSize + 3, qrSize + 3, 2, 2, 'F');

    // QR white background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 0.8, qrY - 0.8, qrSize + 1.6, qrSize + 1.6, 1.5, 1.5, 'F');

    // QR code
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // "ESCANEA AQUÍ" below QR
    doc.setFontSize(3.5);
    doc.setTextColor(245, 166, 35);
    doc.text('ESCANEA AQUÍ', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
  } catch {}

  // ═══════════════════════════════════════════
  // BOTTOM SECTION
  // ═══════════════════════════════════════════

  // Decorative line
  doc.setDrawColor(35, 50, 75);
  doc.setLineWidth(0.1);
  doc.line(4, CARD_H - 12, CARD_W - 4, CARD_H - 12);

  // Logo at bottom left
  try {
    const logoData = await loadImage('/logo.png');
    if (logoData) {
      doc.addImage(logoData, 'PNG', 4, CARD_H - 10.5, 8, 8);
    }
  } catch {}

  // Brand name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(245, 166, 35);
  doc.text('BIRRASPORT', 14, CARD_H - 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.5);
  doc.setTextColor(70, 90, 120);
  doc.text('Cervecería Premium', 14, CARD_H - 3.5);

  // QR code ID at bottom right
  doc.setFontSize(3);
  doc.setTextColor(50, 65, 90);
  doc.text(customer.qr_code, CARD_W - 4, CARD_H - 3.5, { align: 'right' });
  doc.text('ID', CARD_W - 4, CARD_H - 6, { align: 'right' });

  // Bottom gold bar
  doc.setFillColor(245, 166, 35);
  doc.rect(0, CARD_H - 0.8, CARD_W, 0.8, 'F');

  // ═══════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════
  const safeName = customer.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
  doc.save(`Carnet_${safeName}.pdf`);
}

// Robust image loader: fetch as blob, draw to canvas (fixes EXIF rotation), return base64
async function loadImage(url: string): Promise<string | null> {
  try {
    // Step 1: Fetch the image as blob
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) return null;
    const blob = await response.blob();

    // Step 2: Create an ImageBitmap (auto-corrects EXIF orientation)
    const bitmap = await createImageBitmap(blob);

    // Step 3: Draw to canvas at fixed size (normalizes orientation)
    const canvas = document.createElement('canvas');
    const maxSize = 400;
    let w = bitmap.width;
    let h = bitmap.height;

    if (w > maxSize || h > maxSize) {
      const ratio = Math.min(maxSize / w, maxSize / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}
