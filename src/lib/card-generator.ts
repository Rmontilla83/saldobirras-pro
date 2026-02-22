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

  // ─── Background ───
  doc.setFillColor(6, 10, 19);
  doc.rect(0, 0, CARD_W, CARD_H, 'F');

  // Top amber strip
  doc.setFillColor(245, 166, 35);
  doc.rect(0, 0, CARD_W, 1.2, 'F');

  // ─── Logo ───
  try {
    const logoData = await fetchImageAsBase64('/logo.png');
    if (logoData) {
      doc.addImage(logoData, 'PNG', 3, 3, 13, 13);
    }
  } catch {}

  // ─── Brand ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(245, 166, 35);
  doc.text('SALDOBIRRAS', 18, 9);

  doc.setFontSize(4.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BIRRASPORT', 18, 12.5);

  // ─── Divider ───
  doc.setDrawColor(40, 60, 90);
  doc.setLineWidth(0.15);
  doc.line(3, 18, CARD_W - 3, 18);

  // ─── Customer photo ───
  const photoX = 3;
  const photoY = 21;
  const photoSize = 16;
  let photoLoaded = false;

  if (customer.photo_url) {
    try {
      const photoData = await fetchImageAsBase64(customer.photo_url);
      if (photoData) {
        doc.addImage(photoData, 'JPEG', photoX, photoY, photoSize, photoSize);
        doc.setDrawColor(245, 166, 35);
        doc.setLineWidth(0.3);
        doc.roundedRect(photoX, photoY, photoSize, photoSize, 1.5, 1.5, 'S');
        photoLoaded = true;
      }
    } catch {}
  }

  if (!photoLoaded) {
    drawInitials(doc, customer.name, photoX, photoY, photoSize);
  }

  // ─── Customer info ───
  const infoX = photoX + photoSize + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  const displayName = customer.name.length > 24 ? customer.name.substring(0, 24) + '...' : customer.name;
  doc.text(displayName.toUpperCase(), infoX, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(148, 163, 184);

  let infoY = 29;
  if (customer.email) {
    doc.text(customer.email, infoX, infoY);
    infoY += 3.5;
  }
  if (customer.phone) {
    doc.text(customer.phone, infoX, infoY);
    infoY += 3.5;
  }

  doc.setFontSize(4);
  doc.setTextColor(80, 100, 120);
  const typeLabel = customer.balance_type === 'money' ? 'SALDO EN DÓLARES' : 'SALDO EN CERVEZAS';
  doc.text(typeLabel, infoX, infoY + 1);

  // ─── QR Code ───
  try {
    const QRCode = await import('qrcode');
    const qrDataUrl = await QRCode.toDataURL(customer.qr_code, {
      width: 300,
      margin: 1,
      color: { dark: '#1B2A4A', light: '#FFFFFF' },
    });
    const qrSize = 18;
    const qrX = CARD_W - qrSize - 4;
    const qrY = 20;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 1.5, qrY - 1.5, qrSize + 3, qrSize + 3, 1.5, 1.5, 'F');
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    doc.setFontSize(3.2);
    doc.setTextColor(80, 100, 120);
    const qrLabel = customer.qr_code.length > 18 ? customer.qr_code.substring(0, 18) : customer.qr_code;
    doc.text(qrLabel, qrX + qrSize / 2, qrY + qrSize + 3.5, { align: 'center' });
  } catch (e) {
    console.error('QR error', e);
  }

  // ─── Bottom strip ───
  doc.setFillColor(245, 166, 35);
  doc.rect(0, CARD_H - 1.2, CARD_W, 1.2, 'F');

  doc.setFontSize(3.2);
  doc.setTextColor(80, 100, 120);
  doc.text('Presenta este carnet para usar tu saldo', CARD_W / 2, CARD_H - 2.5, { align: 'center' });

  // ─── Save ───
  const safeName = customer.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
  doc.save(`Carnet_${safeName}.pdf`);
}

function drawInitials(doc: any, name: string, x: number, y: number, size: number) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  doc.setFillColor(245, 166, 35);
  doc.roundedRect(x, y, size, size, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(6, 10, 19);
  doc.text(initials, x + size / 2, y + size / 2 + 1.5, { align: 'center' });
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
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
}
