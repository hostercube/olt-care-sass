import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, differenceInDays, getDaysInMonth } from 'date-fns';

interface BillItem {
  item_name: string;
  description?: string;
  unit: string;
  quantity: number;
  rate: number;
  vat_percent: number;
  vat_amount: number;
  from_date?: string;
  to_date?: string;
  total: number;
}

interface PurchaseBillData {
  invoice_number: string;
  billing_date: string;
  provider?: {
    name: string;
    company_name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  items?: BillItem[];
  subtotal: number;
  vat_amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: string;
  payment_method?: string;
  remarks?: string;
}

interface SalesInvoiceData {
  invoice_number: string;
  billing_date: string;
  due_date?: string;
  client?: {
    name: string;
    company_name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  items?: SalesInvoiceItem[];
  subtotal: number;
  vat_amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: string;
  remarks?: string;
}

interface SalesInvoiceItem extends BillItem {}

interface PDFOptions {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
}

// Calculate pro-rata amount based on date range
export function calculateProRataAmount(rate: number, fromDate: string, toDate: string): number {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  
  // Get total days in the month (based on from date)
  const daysInMonth = getDaysInMonth(from);
  
  // Get actual days in the period
  const actualDays = differenceInDays(to, from) + 1;
  
  // Calculate pro-rata rate
  const dailyRate = rate / daysInMonth;
  return dailyRate * actualDays;
}

// Get days count for display
export function getDaysCount(fromDate: string, toDate: string): number {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  return differenceInDays(to, from) + 1;
}

export function generatePurchaseBillPDF(bill: PurchaseBillData, options: PDFOptions = {}): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
  const textColor: [number, number, number] = [31, 41, 55];
  const mutedColor: [number, number, number] = [107, 114, 128];
  const successColor: [number, number, number] = [34, 197, 94];
  const dangerColor: [number, number, number] = [239, 68, 68];
  
  let yPos = 15;
  
  // Header background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Company Name
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName || 'Bandwidth Management', 15, yPos + 8);
  
  yPos += 15;
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  if (options.companyAddress) doc.text(options.companyAddress, 15, yPos);
  yPos += 4;
  if (options.companyPhone) doc.text(`Phone: ${options.companyPhone}`, 15, yPos);
  if (options.companyEmail) doc.text(`Email: ${options.companyEmail}`, 80, yPos);
  
  // Title
  yPos = 20;
  doc.setFontSize(24);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE BILL', pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 8;
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text(`#${bill.invoice_number}`, pageWidth - 15, yPos, { align: 'right' });
  
  // Status badge
  yPos += 8;
  const statusColor = bill.payment_status === 'paid' ? successColor : bill.payment_status === 'partial' ? [234, 179, 8] as [number, number, number] : dangerColor;
  const statusText = bill.payment_status.toUpperCase();
  const statusWidth = doc.getTextWidth(statusText) + 12;
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - 15 - statusWidth, yPos - 5, statusWidth, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, pageWidth - 15 - statusWidth / 2, yPos, { align: 'center' });
  
  // Separator
  yPos = 55;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.8);
  doc.line(15, yPos, pageWidth - 15, yPos);
  
  // Provider and Details section
  yPos += 12;
  
  // Provider Info Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(15, yPos - 5, 85, 35, 3, 3, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PROVIDER', 20, yPos);
  
  yPos += 7;
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(bill.provider?.name || 'N/A', 20, yPos);
  
  yPos += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (bill.provider?.company_name) doc.text(bill.provider.company_name, 20, yPos);
  yPos += 4;
  if (bill.provider?.phone) doc.text(bill.provider.phone, 20, yPos);
  yPos += 4;
  if (bill.provider?.email) doc.text(bill.provider.email, 20, yPos);
  
  // Invoice Details Box
  yPos = 67;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(105, yPos - 5, 90, 35, 3, 3, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS', 110, yPos);
  
  const detailsY = yPos + 7;
  const details = [
    ['Date:', format(new Date(bill.billing_date), 'dd MMM yyyy')],
    ['Method:', bill.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'],
  ];
  
  details.forEach(([label, value], i) => {
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 110, detailsY + i * 6);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text(value, 140, detailsY + i * 6);
  });
  
  // Items Table
  yPos = 105;
  
  const tableData = (bill.items || []).map((item, index) => {
    const daysInfo = item.from_date && item.to_date 
      ? `${format(new Date(item.from_date), 'dd/MM')} - ${format(new Date(item.to_date), 'dd/MM')} (${getDaysCount(item.from_date, item.to_date)}d)`
      : '';
    return [
      (index + 1).toString(),
      item.item_name,
      item.unit,
      item.quantity.toString(),
      daysInfo,
      `৳${item.rate.toLocaleString('en-IN')}`,
      item.vat_percent > 0 ? `${item.vat_percent}%` : '-',
      `৳${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    ];
  });
  
  if (tableData.length === 0) {
    tableData.push(['1', 'Bandwidth Service', '-', '1', '-', `৳${bill.subtotal.toLocaleString('en-IN')}`, '-', `৳${bill.subtotal.toLocaleString('en-IN')}`]);
  }
  
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Item', 'Unit', 'Qty', 'Period', 'Rate/Mo', 'VAT', 'Total']],
    body: tableData,
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles: {
      textColor: textColor,
      fontSize: 8,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 38, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
    tableLineColor: [229, 231, 235],
    tableLineWidth: 0.1,
  });
  
  // Get final Y position
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
  
  // Totals section
  yPos = finalY + 10;
  const totalsX = pageWidth - 85;
  
  // Totals Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(totalsX - 10, yPos - 5, 80, 55, 3, 3, 'F');
  
  const totals = [
    { label: 'Subtotal:', value: bill.subtotal, color: textColor },
    { label: 'VAT:', value: bill.vat_amount, color: textColor },
    { label: 'Discount:', value: -bill.discount, color: textColor },
  ];
  
  totals.forEach((item, i) => {
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text(item.label, totalsX, yPos + i * 7);
    doc.setTextColor(...item.color);
    doc.text(`৳${Math.abs(item.value).toLocaleString('en-IN')}`, pageWidth - 20, yPos + i * 7, { align: 'right' });
  });
  
  // Total line
  yPos += 25;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 5, yPos - 3, pageWidth - 15, yPos - 3);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Total:', totalsX, yPos + 4);
  doc.text(`৳${bill.total_amount.toLocaleString('en-IN')}`, pageWidth - 20, yPos + 4, { align: 'right' });
  
  // Paid & Due
  yPos += 12;
  doc.setFontSize(10);
  doc.setTextColor(...successColor);
  doc.text('Paid:', totalsX, yPos);
  doc.text(`৳${bill.paid_amount.toLocaleString('en-IN')}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 7;
  doc.setTextColor(...dangerColor);
  doc.text('Due:', totalsX, yPos);
  doc.text(`৳${bill.due_amount.toLocaleString('en-IN')}`, pageWidth - 20, yPos, { align: 'right' });
  
  // Remarks
  if (bill.remarks) {
    yPos += 20;
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'bold');
    doc.text('REMARKS', 15, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    const splitRemarks = doc.splitTextToSize(bill.remarks, pageWidth - 30);
    doc.text(splitRemarks, 15, yPos);
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth / 2, footerY, { align: 'center' });
  
  doc.save(`PurchaseBill-${bill.invoice_number}.pdf`);
}

export function generateSalesInvoicePDF(invoice: SalesInvoiceData, options: PDFOptions = {}): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [16, 185, 129]; // Emerald
  const textColor: [number, number, number] = [31, 41, 55];
  const mutedColor: [number, number, number] = [107, 114, 128];
  const successColor: [number, number, number] = [34, 197, 94];
  const dangerColor: [number, number, number] = [239, 68, 68];
  
  let yPos = 15;
  
  // Header background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Company Name
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName || 'Bandwidth Management', 15, yPos + 8);
  
  yPos += 15;
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  if (options.companyAddress) doc.text(options.companyAddress, 15, yPos);
  yPos += 4;
  if (options.companyPhone) doc.text(`Phone: ${options.companyPhone}`, 15, yPos);
  if (options.companyEmail) doc.text(`Email: ${options.companyEmail}`, 80, yPos);
  
  // Title
  yPos = 20;
  doc.setFontSize(24);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('SALES INVOICE', pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 8;
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text(`#${invoice.invoice_number}`, pageWidth - 15, yPos, { align: 'right' });
  
  // Status badge
  yPos += 8;
  const statusColor = invoice.payment_status === 'paid' ? successColor : invoice.payment_status === 'partial' ? [234, 179, 8] as [number, number, number] : dangerColor;
  const statusText = invoice.payment_status.toUpperCase();
  const statusWidth = doc.getTextWidth(statusText) + 12;
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - 15 - statusWidth, yPos - 5, statusWidth, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, pageWidth - 15 - statusWidth / 2, yPos, { align: 'center' });
  
  // Separator
  yPos = 55;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.8);
  doc.line(15, yPos, pageWidth - 15, yPos);
  
  // Client and Details section
  yPos += 12;
  
  // Client Info Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(15, yPos - 5, 85, 35, 3, 3, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 20, yPos);
  
  yPos += 7;
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.client?.name || 'N/A', 20, yPos);
  
  yPos += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (invoice.client?.company_name) doc.text(invoice.client.company_name, 20, yPos);
  yPos += 4;
  if (invoice.client?.phone) doc.text(invoice.client.phone, 20, yPos);
  yPos += 4;
  if (invoice.client?.email) doc.text(invoice.client.email, 20, yPos);
  
  // Invoice Details Box
  yPos = 67;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(105, yPos - 5, 90, 35, 3, 3, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS', 110, yPos);
  
  const detailsY = yPos + 7;
  const details = [
    ['Invoice Date:', format(new Date(invoice.billing_date), 'dd MMM yyyy')],
    ['Due Date:', invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : 'N/A'],
  ];
  
  details.forEach(([label, value], i) => {
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 110, detailsY + i * 6);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text(value, 145, detailsY + i * 6);
  });
  
  // Items Table
  yPos = 105;
  
  const tableData = (invoice.items || []).map((item, index) => {
    const daysInfo = item.from_date && item.to_date 
      ? `${format(new Date(item.from_date), 'dd/MM')} - ${format(new Date(item.to_date), 'dd/MM')} (${getDaysCount(item.from_date, item.to_date)}d)`
      : '';
    return [
      (index + 1).toString(),
      item.item_name,
      item.unit,
      item.quantity.toString(),
      daysInfo,
      `৳${item.rate.toLocaleString('en-IN')}`,
      item.vat_percent > 0 ? `${item.vat_percent}%` : '-',
      `৳${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    ];
  });
  
  if (tableData.length === 0) {
    tableData.push(['1', 'Bandwidth Service', '-', '1', '-', `৳${invoice.subtotal.toLocaleString('en-IN')}`, '-', `৳${invoice.subtotal.toLocaleString('en-IN')}`]);
  }
  
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Item', 'Unit', 'Qty', 'Period', 'Rate/Mo', 'VAT', 'Total']],
    body: tableData,
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles: {
      textColor: textColor,
      fontSize: 8,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 38, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
    tableLineColor: [229, 231, 235],
    tableLineWidth: 0.1,
  });
  
  // Get final Y position
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
  
  // Totals section
  yPos = finalY + 10;
  const totalsX = pageWidth - 85;
  
  // Totals Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(totalsX - 10, yPos - 5, 80, 55, 3, 3, 'F');
  
  const totals = [
    { label: 'Subtotal:', value: invoice.subtotal, color: textColor },
    { label: 'VAT:', value: invoice.vat_amount, color: textColor },
    { label: 'Discount:', value: -invoice.discount, color: textColor },
  ];
  
  totals.forEach((item, i) => {
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text(item.label, totalsX, yPos + i * 7);
    doc.setTextColor(...item.color);
    doc.text(`৳${Math.abs(item.value).toLocaleString('en-IN')}`, pageWidth - 20, yPos + i * 7, { align: 'right' });
  });
  
  // Total line
  yPos += 25;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 5, yPos - 3, pageWidth - 15, yPos - 3);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Total:', totalsX, yPos + 4);
  doc.text(`৳${invoice.total_amount.toLocaleString('en-IN')}`, pageWidth - 20, yPos + 4, { align: 'right' });
  
  // Paid & Due
  yPos += 12;
  doc.setFontSize(10);
  doc.setTextColor(...successColor);
  doc.text('Paid:', totalsX, yPos);
  doc.text(`৳${invoice.paid_amount.toLocaleString('en-IN')}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 7;
  doc.setTextColor(...dangerColor);
  doc.text('Due:', totalsX, yPos);
  doc.text(`৳${invoice.due_amount.toLocaleString('en-IN')}`, pageWidth - 20, yPos, { align: 'right' });
  
  // Remarks
  if (invoice.remarks) {
    yPos += 20;
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'bold');
    doc.text('REMARKS', 15, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    const splitRemarks = doc.splitTextToSize(invoice.remarks, pageWidth - 30);
    doc.text(splitRemarks, 15, yPos);
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text('Thank you for your business!', pageWidth / 2, footerY - 5, { align: 'center' });
  doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth / 2, footerY, { align: 'center' });
  
  doc.save(`SalesInvoice-${invoice.invoice_number}.pdf`);
}

// Print HTML Generator with beautiful design
export function generatePrintHTML(type: 'purchase' | 'sales', data: PurchaseBillData | SalesInvoiceData, options: PDFOptions = {}): string {
  const isPurchase = type === 'purchase';
  const bill = data as PurchaseBillData;
  const invoice = data as SalesInvoiceData;
  
  const primaryColor = isPurchase ? '#4f46e5' : '#10b981';
  const items = (isPurchase ? bill.items : invoice.items) || [];
  
  const itemsTableRows = items.length > 0 ? items.map((item, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>${item.item_name}</td>
      <td class="text-center">${item.unit}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-center">${item.from_date && item.to_date ? `${format(new Date(item.from_date), 'dd/MM')} - ${format(new Date(item.to_date), 'dd/MM')} (${getDaysCount(item.from_date, item.to_date)}d)` : '-'}</td>
      <td class="text-right">৳${item.rate.toLocaleString('en-IN')}</td>
      <td class="text-center">${item.vat_percent > 0 ? `${item.vat_percent}%` : '-'}</td>
      <td class="text-right font-semibold">৳${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('') : `
    <tr>
      <td class="text-center">1</td>
      <td>Bandwidth Service</td>
      <td class="text-center">-</td>
      <td class="text-center">1</td>
      <td class="text-center">-</td>
      <td class="text-right">৳${data.subtotal.toLocaleString('en-IN')}</td>
      <td class="text-center">-</td>
      <td class="text-right font-semibold">৳${data.subtotal.toLocaleString('en-IN')}</td>
    </tr>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${isPurchase ? 'Purchase Bill' : 'Sales Invoice'} - ${data.invoice_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; color: #1f2937; font-size: 13px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid ${primaryColor}; }
        .company-info { display: flex; align-items: flex-start; gap: 15px; }
        .company-logo { width: 60px; height: 60px; object-fit: contain; border-radius: 8px; }
        .company-details h1 { color: ${primaryColor}; font-size: 22px; margin-bottom: 4px; }
        .company-details p { color: #6b7280; font-size: 11px; line-height: 1.5; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { font-size: 26px; color: #1f2937; margin-bottom: 4px; }
        .invoice-info .invoice-number { color: ${primaryColor}; font-size: 13px; font-weight: 600; }
        .status { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 8px; }
        .status.paid { background: #dcfce7; color: #15803d; }
        .status.partial { background: #fef3c7; color: #b45309; }
        .status.due { background: #fee2e2; color: #dc2626; }
        .details-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        .detail-box { background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .detail-box h3 { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .detail-box .name { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
        .detail-box p { font-size: 12px; color: #4b5563; line-height: 1.5; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .detail-row .label { color: #6b7280; font-size: 12px; }
        .detail-row .value { font-weight: 600; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        th { background: ${primaryColor}; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 600; }
        th:first-child { border-radius: 6px 0 0 0; }
        th:last-child { border-radius: 0 6px 0 0; text-align: right; }
        td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
        tr:nth-child(even) { background: #f9fafb; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-semibold { font-weight: 600; }
        .totals { display: flex; justify-content: flex-end; }
        .totals-box { background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); padding: 18px; border-radius: 10px; min-width: 280px; border: 1px solid #e5e7eb; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .total-row.main { border-top: 2px solid ${primaryColor}; margin-top: 10px; padding-top: 12px; font-size: 18px; font-weight: 700; color: ${primaryColor}; }
        .total-row.paid { color: #15803d; font-weight: 600; }
        .total-row.due { color: #dc2626; font-weight: 600; }
        .remarks { margin-top: 25px; padding: 14px; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b; }
        .remarks h4 { font-size: 10px; text-transform: uppercase; color: #b45309; margin-bottom: 6px; font-weight: 600; }
        .remarks p { font-size: 12px; line-height: 1.6; color: #78350f; }
        .footer { text-align: center; margin-top: 35px; padding-top: 18px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 10px; }
        .footer p { margin-bottom: 3px; }
        @media print {
          body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .container { max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-info">
            ${options.companyLogo ? `<img src="${options.companyLogo}" alt="Logo" class="company-logo" />` : ''}
            <div class="company-details">
              <h1>${options.companyName || 'Bandwidth Management'}</h1>
              ${options.companyAddress ? `<p>${options.companyAddress}</p>` : ''}
              ${options.companyPhone ? `<p>📞 ${options.companyPhone}</p>` : ''}
              ${options.companyEmail ? `<p>✉️ ${options.companyEmail}</p>` : ''}
            </div>
          </div>
          <div class="invoice-info">
            <h2>${isPurchase ? 'Purchase Bill' : 'Sales Invoice'}</h2>
            <div class="invoice-number">#${data.invoice_number}</div>
            <div class="status ${data.payment_status}">${data.payment_status}</div>
          </div>
        </div>
        
        <div class="details-section">
          <div class="detail-box">
            <h3>${isPurchase ? '👤 Provider' : '👤 Bill To'}</h3>
            <div class="name">${isPurchase ? bill.provider?.name || 'N/A' : invoice.client?.name || 'N/A'}</div>
            <p>${isPurchase ? bill.provider?.company_name || '' : invoice.client?.company_name || ''}</p>
            <p>${isPurchase ? bill.provider?.phone || '' : invoice.client?.phone || ''}</p>
            <p>${isPurchase ? bill.provider?.email || '' : invoice.client?.email || ''}</p>
          </div>
          <div class="detail-box">
            <h3>📋 Invoice Details</h3>
            <div class="detail-row">
              <span class="label">Invoice Date:</span>
              <span class="value">${format(new Date(data.billing_date), 'dd MMM yyyy')}</span>
            </div>
            ${!isPurchase && invoice.due_date ? `
            <div class="detail-row">
              <span class="label">Due Date:</span>
              <span class="value">${format(new Date(invoice.due_date), 'dd MMM yyyy')}</span>
            </div>
            ` : ''}
            ${isPurchase && bill.payment_method ? `
            <div class="detail-row">
              <span class="label">Payment Method:</span>
              <span class="value">${bill.payment_method.replace('_', ' ').toUpperCase()}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 35px;">#</th>
              <th>Item</th>
              <th style="width: 55px;" class="text-center">Unit</th>
              <th style="width: 40px;" class="text-center">Qty</th>
              <th style="width: 100px;" class="text-center">Period</th>
              <th style="width: 85px;" class="text-right">Rate/Mo</th>
              <th style="width: 50px;" class="text-center">VAT</th>
              <th style="width: 95px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTableRows}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="totals-box">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>৳${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row">
              <span>VAT:</span>
              <span>৳${data.vat_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row">
              <span>Discount:</span>
              <span>-৳${data.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row main">
              <span>Total:</span>
              <span>৳${data.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row paid">
              <span>Paid:</span>
              <span>৳${data.paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row due">
              <span>Due:</span>
              <span>৳${data.due_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        
        ${data.remarks ? `
        <div class="remarks">
          <h4>📝 Remarks</h4>
          <p>${data.remarks}</p>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>✨ Thank you for your business!</p>
          <p>Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
        </div>
      </div>
      <script>window.print();</script>
    </body>
    </html>
  `;
}
