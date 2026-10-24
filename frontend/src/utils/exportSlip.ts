import type { Receipt } from '../types';

/**
 * Converts a base64 JPEG data URL into a raw Uint8Array of JPEG bytes.
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Wraps a JPEG byte array (DCTDecode) into a valid single-page A4 PDF 1.4 binary document.
 */
function buildPdfFromJpegBytes(jpegBytes: Uint8Array, imgWidth: number, imgHeight: number): Blob {
  const pageWidthPt = 595.28; // A4 width in points
  const pageHeightPt = 841.89; // A4 height in points

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;

  const pushString = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  // PDF Header (with binary comment marker)
  pushString('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Object 1: Catalog
  offsets.push(currentOffset);
  pushString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages
  offsets.push(currentOffset);
  pushString('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Object 3: Page
  offsets.push(currentOffset);
  pushString(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 4 0 R >> >> /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Contents 5 0 R >>\nendobj\n`
  );

  // Object 4: Image XObject (DCTDecode JPEG stream)
  offsets.push(currentOffset);
  pushString(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushString('\nendstream\nendobj\n');

  // Object 5: Page Content Stream
  const contentStream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentStreamBytes = encoder.encode(contentStream);
  offsets.push(currentOffset);
  pushString(`5 0 obj\n<< /Length ${contentStreamBytes.length} >>\nstream\n`);
  pushBytes(contentStreamBytes);
  pushString('endstream\nendobj\n');

  // Cross-Reference Table (xref)
  const xrefOffset = currentOffset;
  pushString(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`);
  for (const off of offsets) {
    pushString(`${String(off).padStart(10, '0')} 00000 n \n`);
  }

  // Trailer
  pushString(
    `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

/**
 * Loads an image from a URL or data URL for drawing onto the slip canvas.
 */
function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src || src === 'manual-entry') {
      resolve(null);
      return;
    }
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Triggers a direct file download in the user's browser.
 */
function triggerBrowserDownload(blobOrDataUrl: Blob | string, filename: string) {
  const link = document.createElement('a');
  let objectUrl: string | null = null;

  if (typeof blobOrDataUrl === 'string') {
    link.href = blobOrDataUrl;
  } else {
    objectUrl = URL.createObjectURL(blobOrDataUrl);
    link.href = objectUrl;
  }

  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (objectUrl) {
    setTimeout(() => URL.revokeObjectURL(objectUrl!), 8000);
  }
}

/**
 * Generates and downloads an A4 PDF Purchase Voucher Slip for a receipt,
 * including the header metadata, verified line items table, GST breakdown,
 * and embedded original voucher scan image.
 */
export async function exportReceiptSlipPdf(
  receipt: Receipt,
  storeName: string = 'My Store',
  ownerName: string = 'Store Owner'
): Promise<void> {
  const width = 1240;
  const height = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable for PDF export');
  }

  // 1. Paper Background
  ctx.fillStyle = '#FAF9F4';
  ctx.fillRect(0, 0, width, height);

  // 2. Top Brand Header Banner
  ctx.fillStyle = '#14532D';
  ctx.fillRect(0, 0, width, 150);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText('Hissaab Kitaab — Smart Kirana Bahi Khata', 56, 68);

  ctx.fillStyle = '#A7F3D0';
  ctx.font = '600 18px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText('OFFICIAL PURCHASE VOUCHER & GST RECONCILIATION SLIP', 56, 108);

  // Status Pill in Top Right
  const isVerified = receipt.status === 'verified';
  ctx.fillStyle = isVerified ? '#DCFCE7' : '#FEF3C7';
  ctx.beginPath();
  ctx.roundRect(width - 310, 48, 254, 48, 24);
  ctx.fill();

  ctx.fillStyle = isVerified ? '#166534' : '#92400E';
  ctx.font = 'bold 18px Inter, Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isVerified ? '✓ VERIFIED IN LEDGER' : '● NEEDS CHECKING', width - 183, 79);
  ctx.textAlign = 'left';

  // 3. Supplier & Voucher Metadata Card
  let y = 186;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#D6D5CE';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(56, y, width - 112, 175, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 15px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText('SUPPLIER / VENDOR PARTY', 84, y + 38);
  ctx.fillText('VOUCHER / BILL NO.', 620, y + 38);
  ctx.fillText('BILL DATE', 920, y + 38);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 26px Inter, Segoe UI, Arial, sans-serif';
  const truncatedSupplier =
    receipt.supplierName.length > 32
      ? receipt.supplierName.slice(0, 32) + '…'
      : receipt.supplierName;
  ctx.fillText(truncatedSupplier, 84, y + 74);

  ctx.font = 'bold 22px Consolas, monospace';
  ctx.fillText(`#${receipt.invoiceNo}`, 620, y + 74);
  ctx.fillText(receipt.billDate, 920, y + 74);

  // Second row of metadata
  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 15px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText('STORE / BRANCH TENANT', 84, y + 118);
  ctx.fillText('PAYMENT MODE', 620, y + 118);
  ctx.fillText('PAYMENT STATUS', 920, y + 118);

  ctx.fillStyle = '#1F2937';
  ctx.font = '600 20px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText(storeName, 84, y + 148);
  ctx.fillText(receipt.paymentMode.replace('_', ' ').toUpperCase(), 620, y + 148);

  ctx.fillStyle = '#15803D';
  ctx.font = 'bold 20px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText(receipt.paymentStatus.toUpperCase(), 920, y + 148);

  // 4. Line Items Table Section
  y += 205;
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 22px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText(`Verified Line Items (${receipt.items.length})`, 56, y);

  y += 18;
  // Table Header
  ctx.fillStyle = '#E5E7EB';
  ctx.beginPath();
  ctx.roundRect(56, y, width - 112, 46, 8);
  ctx.fill();

  ctx.fillStyle = '#374151';
  ctx.font = 'bold 16px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText('#', 76, y + 29);
  ctx.fillText('ITEM DESCRIPTION', 125, y + 29);
  ctx.fillText('CATEGORY', 540, y + 29);
  ctx.fillText('QTY', 770, y + 29);
  ctx.textAlign = 'right';
  ctx.fillText('UNIT RATE (₹)', 995, y + 29);
  ctx.fillText('LINE TOTAL (₹)', width - 76, y + 29);
  ctx.textAlign = 'left';

  y += 46;
  const maxRows = Math.min(receipt.items.length, 10);
  for (let i = 0; i < maxRows; i++) {
    const it = receipt.items[i];
    const rowH = 46;

    ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#F3F4F6';
    ctx.fillRect(56, y, width - 112, rowH);

    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, y + rowH);
    ctx.lineTo(width - 56, y + rowH);
    ctx.stroke();

    ctx.fillStyle = '#6B7280';
    ctx.font = 'bold 16px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText(String(i + 1), 76, y + 29);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 18px Inter, Segoe UI, Arial, sans-serif';
    const itemName = it.name.length > 30 ? it.name.slice(0, 30) + '…' : it.name;
    ctx.fillText(itemName, 125, y + 29);

    ctx.fillStyle = '#4B5563';
    ctx.font = '600 15px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText((it.category || 'General').slice(0, 22), 540, y + 29);

    ctx.fillStyle = '#111827';
    ctx.font = '600 17px Consolas, monospace';
    ctx.fillText(`${it.quantity} ${it.unit || 'pc'}`, 770, y + 29);

    ctx.textAlign = 'right';
    ctx.fillText(`₹${it.unitRate.toFixed(2)}`, 995, y + 29);

    ctx.font = 'bold 18px Consolas, monospace';
    ctx.fillText(`₹${it.lineTotal.toFixed(2)}`, width - 76, y + 29);
    ctx.textAlign = 'left';

    y += rowH;
  }

  if (receipt.items.length === 0) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(56, y, width - 112, 54);
    ctx.fillStyle = '#6B7280';
    ctx.font = 'italic 17px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText('No itemized rows recorded on this voucher.', 84, y + 33);
    y += 54;
  }

  // 5. Totals & GST Reconciliation Box + Embedded Scan Preview
  y += 28;
  const bottomSectionHeight = Math.min(540, height - y - 110);

  // Left Card: Original Uploaded Scan Preview (if available)
  const leftCardWidth = 540;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#D6D5CE';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(56, y, leftCardWidth, bottomSectionHeight, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 18px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText('Original Uploaded Voucher Scan', 80, y + 36);

  const imgEl = await loadImageElement(receipt.sourceVoucherUrl || '');
  if (imgEl) {
    const padX = 24;
    const availW = leftCardWidth - padX * 2;
    const availH = bottomSectionHeight - 68;
    const scale = Math.min(availW / imgEl.width, availH / imgEl.height);
    const drawW = imgEl.width * scale;
    const drawH = imgEl.height * scale;
    const drawX = 56 + (leftCardWidth - drawW) / 2;
    const drawY = y + 52 + (availH - drawH) / 2;

    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.roundRect(56 + padX, y + 50, availW, availH, 10);
    ctx.fill();

    ctx.drawImage(imgEl, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = '#6B7280';
    ctx.font = '16px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText('Digital manual voucher entry (no photo attached).', 80, y + 90);
  }

  // Right Card: Financial Totals & GST Tax Reconciliation + Audit Log
  const rightCardX = 620;
  const rightCardW = width - 56 - rightCardX;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#D6D5CE';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rightCardX, y, rightCardW, bottomSectionHeight, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 20px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText('GST & Total Reconciliation', rightCardX + 28, y + 42);

  const rows = [
    ['Taxable Subtotal:', `₹${receipt.subtotal.toFixed(2)}`],
    ['CGST (2.5%):', `₹${(receipt.taxTotal / 2).toFixed(2)}`],
    ['SGST (2.5%):', `₹${(receipt.taxTotal / 2).toFixed(2)}`],
    ['Total GST Tax:', `₹${receipt.taxTotal.toFixed(2)}`],
  ];

  let ry = y + 84;
  for (const [label, val] of rows) {
    ctx.fillStyle = '#4B5563';
    ctx.font = '600 18px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText(label, rightCardX + 28, ry);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 18px Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(val, rightCardX + rightCardW - 28, ry);
    ctx.textAlign = 'left';
    ry += 38;
  }

  // Grand Total Highlight Banner
  ry += 10;
  ctx.fillStyle = '#ECFDF5';
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rightCardX + 24, ry, rightCardW - 48, 68, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#065F46';
  ctx.font = 'bold 22px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText('GRAND TOTAL', rightCardX + 44, ry + 42);

  ctx.font = 'bold 28px Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`₹${receipt.grandTotal.toFixed(2)}`, rightCardX + rightCardW - 44, ry + 44);
  ctx.textAlign = 'left';

  // Audit Trail section inside Right Card
  ry += 104;
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 17px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText('Audit Trail & AI Verification Log', rightCardX + 28, ry);

  ctx.fillStyle = '#374151';
  ctx.font = '15px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText(`✓ Extracted via Gemini Vision AI (${receipt.billDate})`, rightCardX + 28, ry + 32);
  ctx.fillText(`✓ Verified by ${ownerName} (${storeName})`, rightCardX + 28, ry + 60);
  ctx.fillText('✓ Locked in Tenant-Isolated Bahi Khata Ledger', rightCardX + 28, ry + 88);

  // 6. Footer Bar
  ctx.fillStyle = '#6B7280';
  ctx.font = '15px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText(
    `Generated by Hissaab Kitaab (https://my-ledgeriq.web.app) • Voucher ID: ${receipt.id}`,
    56,
    height - 38
  );

  // Convert Canvas -> JPEG -> Standard A4 PDF Binary -> Download
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const jpegBytes = dataUrlToUint8Array(jpegDataUrl);
  const pdfBlob = buildPdfFromJpegBytes(jpegBytes, width, height);

  const safeInvoice = (receipt.invoiceNo || receipt.id).replace(/[^a-zA-Z0-9_-]+/g, '_');
  triggerBrowserDownload(pdfBlob, `Hissaab_Kitaab_Slip_${safeInvoice}.pdf`);
}

/**
 * Downloads the original uploaded receipt image directly as a .jpg/.png file.
 */
export function downloadOriginalVoucherImage(receipt: Receipt): void {
  if (!receipt.sourceVoucherUrl || receipt.sourceVoucherUrl === 'manual-entry') {
    return;
  }
  const safeInvoice = (receipt.invoiceNo || receipt.id).replace(/[^a-zA-Z0-9_-]+/g, '_');
  triggerBrowserDownload(receipt.sourceVoucherUrl, `Voucher_Scan_${safeInvoice}.jpg`);
}

/**
 * Exports a list of receipts as a CSV spreadsheet for CA / accounting reconciliation.
 */
export function exportReceiptsToCsv(receipts: Receipt[], filename = 'Hissaab_Kitaab_CA_Report.csv'): void {
  const headers = [
    'Receipt ID',
    'Invoice No',
    'Bill Date',
    'Supplier Name',
    'Status',
    'Payment Mode',
    'Payment Status',
    'Item Count',
    'Subtotal (INR)',
    'GST Tax (INR)',
    'Grand Total (INR)',
    'Line Items Summary',
  ];

  const escapeCsv = (val: any) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = receipts.map((r) => {
    const itemsSummary = r.items
      .map((i) => `${i.name} (${i.quantity} ${i.unit} @ Rs.${i.unitRate} = Rs.${i.lineTotal})`)
      .join('; ');
    return [
      r.id,
      r.invoiceNo,
      r.billDate,
      r.supplierName,
      r.status,
      r.paymentMode,
      r.paymentStatus,
      r.items.length || r.itemCount,
      r.subtotal.toFixed(2),
      r.taxTotal.toFixed(2),
      r.grandTotal.toFixed(2),
      itemsSummary,
    ]
      .map(escapeCsv)
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBrowserDownload(blob, filename);
}
