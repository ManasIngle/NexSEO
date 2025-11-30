import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePdfReport = (summary: any, results: any[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Title
  doc.setFontSize(24);
  doc.setTextColor(30, 41, 59);
  doc.text('UltimateCrawler SEO Audit', pageWidth / 2, 20, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });

  // Executive Summary Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, pageWidth - 28, 40, 3, 3, 'FD');
  
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Executive Summary', 20, 45);
  
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total URLs Crawled: ${summary.total}`, 20, 55);
  doc.text(`Indexable Pages: ${summary.indexable}`, 20, 62);
  doc.text(`Average SEO Score: ${summary.avg_seo_score}/100`, 20, 69);
  
  doc.text(`Errors (4xx/5xx): ${summary.errors}`, pageWidth / 2, 55);
  doc.text(`Broken Links: ${summary.broken_links_count || 0}`, pageWidth / 2, 62);
  doc.text(`Redirects: ${summary.redirects}`, pageWidth / 2, 69);

  let startY = 85;

  // Grade Distribution
  if (summary.grade_distribution) {
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('SEO Grade Distribution', 14, startY);
    startY += 10;
    
    const grades = Object.entries(summary.grade_distribution).map(([grade, count]) => [grade, count]);
    autoTable(doc, {
      startY,
      head: [['Grade', 'Page Count']],
      body: grades as any,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 }
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  }

  // Top Issues
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Critical Action Items', 14, startY);
  startY += 10;
  
  const issuesBody = [
    ['Missing Titles', summary.missing_title],
    ['Missing Meta Descriptions', summary.missing_meta],
    ['Missing H1 Tags', summary.missing_h1],
    ['Images Missing Alt Text', summary.missing_alt],
    ['Broken Internal Links', summary.broken_links_count || 0],
    ['Orphan Pages', summary.orphan_pages_count || 0]
  ].filter(i => (i[1] as number) > 0);
  
  if (issuesBody.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Issue Type', 'Count']],
      body: issuesBody as any,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      margin: { left: 14 }
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text('No critical site-wide issues detected! ✓', 14, startY);
    startY += 15;
  }

  // Next Page: Slow Pages
  const slowPages = results.filter(r => r.response_time > 2.0).map(r => [
    r.url.substring(0, 70) + (r.url.length > 70 ? '...' : ''),
    r.response_time.toFixed(2) + 's'
  ]);
  
  if (slowPages.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Slow Pages (> 2.0s)', 14, 20);
    
    autoTable(doc, {
      startY: 25,
      head: [['URL', 'Response Time']],
      body: slowPages.slice(0, 50), // Cap at 50 to avoid massive PDFs
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] },
      styles: { fontSize: 8 }
    });
  }

  // Next Page: Broken Pages
  const brokenPages = results.filter(r => r.status_code >= 400).map(r => [
    r.url.substring(0, 70) + (r.url.length > 70 ? '...' : ''),
    r.status_code.toString()
  ]);
  
  if (brokenPages.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Error Pages (4xx/5xx)', 14, 20);
    
    autoTable(doc, {
      startY: 25,
      head: [['URL', 'Status Code']],
      body: brokenPages.slice(0, 50),
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 8 }
    });
  }

  doc.save('ultimatecrawler_audit_report.pdf');
};
