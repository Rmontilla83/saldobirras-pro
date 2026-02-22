import type { Customer } from './types';

// Credit card dimensions: 85.6mm x 54mm
const CARD_W = 85.6;
const CARD_H = 54;

export async function generateCard(customer: Customer): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CARD_H, CARD_W], // height x width for landscape
  });

  // ─── Background ───
  doc.setFillColor(6, 10, 19); // #060A13
  doc.rect(0, 0, CARD_W, CARD_H, 'F');

  // Subtle gradient strip at top
  doc.setFillColor(245, 166, 35); // amber
  doc.rect(0, 0, CARD_W, 1.2, 'F');

  // ─── Logo area (left side) ───
  try {
    const logoUrl = '/logo.png';
    const logoData = await loadImageAsBase64(logoUrl);
    if (logoData) {
      doc.addImage(logoData, 'PNG', 3, 4, 12, 12);
    }
  } catch {}

  // ─── Brand text ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(245, 166, 35); // amber
  doc.text('SALDOBIRRAS', 17, 9);

  doc.setFontSize(4.5);
  doc.setTextColor(100, 116, 139); // slate
  doc.text('BIRRASPORT', 17, 12.5);

  // ─── Divider line ───
  doc.setDrawColor(245, 166, 35, 0.15);
  doc.setLineWidth(0.15);
  doc.line(3, 18, CARD_W - 3, 18);

  // ─── Customer photo (left) ───
  const photoX = 3;
  const photoY = 21;
  const photoSize = 16;

  if (customer.photo_url) {
    try {
      const photoData = await loadImageAsBase64(customer.photo_url);
      if (photoData) {
        // Rounded corner clip simulation — just add the image
        doc.addImage(photoData, 'JPEG', photoX, photoY, photoSize, photoSize);
        // Border around photo
        doc.setDrawColor(245, 166, 35);
        doc.setLineWidth(0.3);
        doc.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, 'S');
      }
    } catch {
      drawInitialsCircle(doc, customer.name, photoX, photoY, photoSize);
    }
  } else {
    drawInitialsCircle(doc, customer.name, photoX, photoY, photoSize);
  }

  // ─── Customer info (center) ───
  const infoX = photoX + photoSize + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(customer.name.toUpperCase(), infoX, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184); // slate-400
  if (customer.email) {
    doc.text(customer.email, infoX, 29.5);
  }
  if (customer.phone) {
    doc.text(customer.phone, infoX, 33);
  }

  // Balance type label
  doc.setFontSize(4.5);
  doc.setTextColor(100, 116, 139);
  const typeLabel = customer.balance_type === 'money' ? 'SALDO EN DÓLARES' : 'SALDO EN CERVEZAS';
  doc.text(typeLabel, infoX, 37);

  // ─── QR Code (right side) ───
  try {
    const QRCode = await import('qrcode');
    const qrDataUrl = await QRCode.toDataURL(customer.qr_code, {
      width: 200,
      margin: 1,
      color: { dark: '#1B2A4A', light: '#FFFFFF' },
    });
    const qrSize = 18;
    const qrX = CARD_W - qrSize - 3;
    const qrY = 20;

    // White background for QR
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1.5, 1.5, 'F');

    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // QR code ID below
    doc.setFontSize(3.5);
    doc.setTextColor(100, 116, 139);
    doc.text(customer.qr_code, qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
  } catch (e) {
    console.error('QR generation failed', e);
  }

  // ─── Bottom bar ───
  doc.setFillColor(245, 166, 35);
  doc.rect(0, CARD_H - 1.2, CARD_W, 1.2, 'F');

  // ─── Footer text ───
  doc.setFontSize(3.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Presenta este carnet para usar tu saldo', CARD_W / 2, CARD_H - 2.5, { align: 'center' });

  // ─── Save ───
  const safeName = customer.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Carnet_${safeName}.pdf`);
}

function drawInitialsCircle(doc: any, name: string, x: number, y: number, size: number) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  doc.setFillColor(245, 166, 35);
  doc.roundedRect(x, y, size, size, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(6, 10, 19);
  doc.text(initials, x + size / 2, y + size / 2 + 1.5, { align: 'center' });
}

function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
