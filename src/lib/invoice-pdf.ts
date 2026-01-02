import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from '@/types/saas';
import { format } from 'date-fns';

interface InvoicePDFOptions {
  invoice: Invoice;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  logoUrl?: string;
}

export function generateInvoicePDF(options: InvoicePDFOptions): void {
  const { invoice, companyName, companyAddress, companyEmail, companyPhone } = options;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const textColor: [number, number, number] = [31, 41, 55]; // Gray-800
  const mutedColor: [number, number, number] = [107, 114, 128]; // Gray-500
  
  let yPos = 20;
  
  // Header with company info
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName || 'OLT Manager', 20, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  if (companyAddress) doc.text(companyAddress, 20, yPos);
  yPos += 5;
  if (companyEmail) doc.text(`Email: ${companyEmail}`, 20, yPos);
  yPos += 5;
  if (companyPhone) doc.text(`Phone: ${companyPhone}`, 20, yPos);
  
  // Invoice title
  yPos = 20;
  doc.setFontSize(28);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${invoice.invoice_number}`, pageWidth - 20, yPos, { align: 'right' });
  
  // Status badge
  yPos += 10;
  const statusColor = invoice.status === 'paid' ? [34, 197, 94] : invoice.status === 'unpaid' ? [239, 68, 68] : [234, 179, 8];
  doc.setFillColor(...(statusColor as [number, number, number]));
  const statusText = invoice.status.toUpperCase();
  const statusWidth = doc.getTextWidth(statusText) + 10;
  doc.roundedRect(pageWidth - 20 - statusWidth, yPos - 5, statusWidth, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, pageWidth - 20 - statusWidth / 2, yPos, { align: 'center' });
  
  // Separator line
  yPos = 55;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  
  // Bill To section
  yPos += 15;
  doc.setFontSize(10);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 20, yPos);
  
  doc.text('INVOICE DETAILS', pageWidth / 2 + 20, yPos);
  
  yPos += 8;
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  
  // Customer info
  const tenantName = invoice.tenant?.company_name || invoice.tenant?.name || 'Customer';
  const tenantEmail = invoice.tenant?.email || '';
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tenantName, 20, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(tenantEmail, 20, yPos);
  
  // Invoice details on the right
  yPos = 78;
  const detailsX = pageWidth / 2 + 20;
  
  const details = [
    ['Invoice Date:', format(new Date(invoice.created_at), 'MMMM d, yyyy')],
    ['Due Date:', format(new Date(invoice.due_date), 'MMMM d, yyyy')],
  ];
  
  if (invoice.paid_at) {
    details.push(['Paid Date:', format(new Date(invoice.paid_at), 'MMMM d, yyyy')]);
  }
  
  details.forEach(([label, value]) => {
    doc.setTextColor(...mutedColor);
    doc.text(label, detailsX, yPos);
    doc.setTextColor(...textColor);
    doc.text(value, detailsX + 35, yPos);
    yPos += 6;
  });
  
  // Line items table
  yPos = 120;
  
  const lineItems = invoice.line_items && invoice.line_items.length > 0 
    ? invoice.line_items 
    : [{ description: 'Subscription', quantity: 1, unit_price: invoice.amount, total: invoice.amount }];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: lineItems.map(item => [
      item.description,
      item.quantity.toString(),
      `৳${item.unit_price.toLocaleString()}`,
      `৳${item.total.toLocaleString()}`,
    ]),
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      textColor: textColor,
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });
  
  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
  
  // Totals section
  yPos = finalY + 15;
  const totalsX = pageWidth - 80;
  
  // Subtotal
  doc.setTextColor(...mutedColor);
  doc.setFontSize(10);
  doc.text('Subtotal:', totalsX, yPos);
  doc.setTextColor(...textColor);
  doc.text(`৳${invoice.amount.toLocaleString()}`, pageWidth - 20, yPos, { align: 'right' });
  
  // Tax
  if (invoice.tax_amount && invoice.tax_amount > 0) {
    yPos += 8;
    doc.setTextColor(...mutedColor);
    doc.text('Tax:', totalsX, yPos);
    doc.setTextColor(...textColor);
    doc.text(`৳${invoice.tax_amount.toLocaleString()}`, pageWidth - 20, yPos, { align: 'right' });
  }
  
  // Total
  yPos += 12;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 10, yPos - 4, pageWidth - 20, yPos - 4);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Total:', totalsX, yPos + 4);
  doc.text(`৳${invoice.total_amount.toLocaleString()}`, pageWidth - 20, yPos + 4, { align: 'right' });
  
  // Notes section
  if (invoice.notes) {
    yPos += 30;
    doc.setFontSize(10);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    
    const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 40);
    doc.text(splitNotes, 20, yPos);
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth / 2, footerY + 5, { align: 'center' });
  
  // Save the PDF
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
}

export function downloadInvoicePDF(invoice: Invoice, systemSettings?: Record<string, any>): void {
  generateInvoicePDF({
    invoice,
    companyName: systemSettings?.company_name || 'OLT Manager',
    companyAddress: systemSettings?.company_address || '',
    companyEmail: systemSettings?.company_email || '',
    companyPhone: systemSettings?.company_phone || '',
  });
}
