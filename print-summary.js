
// print-summary.js
document.getElementById('printSummaryBtn').addEventListener('click', async function() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return alert('PDF library not loaded');

  const container = document.querySelector('.govuk-width-container');
  const canvas = await html2canvas(container, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 10;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;

  const imgWmm = maxW;
  const imgHmm = (canvas.height / canvas.width) * imgWmm;

  const finalHmm = (imgHmm > maxH) ? maxH : imgHmm;
  const finalWmm = (imgHmm > maxH) ? (maxH * canvas.width / canvas.height) : imgWmm;

  pdf.addImage(imgData, 'PNG', margin, margin, finalWmm, finalHmm);
  pdf.save('term-calculator-summary.pdf');
});
