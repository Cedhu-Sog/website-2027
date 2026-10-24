// A real one-page PDF with an exact byte size, no student or institutional data.
export function syntheticPdf(size) {
  function build(padding) {
    let text = '%PDF-1.7\n' + (padding >= 2 ? '%' + 'Q'.repeat(padding - 2) + '\n' : '');
    const stream = 'BT /F1 20 Tf 72 750 Td (CEDHU - prueba sintetica) Tj ET';
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    const offsets = [0]; objects.forEach((object, i) => { offsets.push(Buffer.byteLength(text)); text += `${i + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = Buffer.byteLength(text);
    text += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
    text += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(text);
  }
  let padding = Math.max(2, size - build(0).length);
  for (let attempt = 0; attempt < 5; attempt++) { const pdf = build(padding); if (pdf.length === size) return pdf; padding += size - pdf.length; }
  throw Error('synthetic_pdf_size');
}
