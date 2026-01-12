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
      ? `\n${format(new Date(item.from_date), 'dd/MM')} - ${format(new Date(item.to_date), 'dd/MM')} (${getDaysCount(item.from_date, item.to_date)} days)`
      : '';
    return [
      (index + 1).toString(),
      item.item_name + daysInfo,
      item.unit,
      item.quantity.toString(),
      `৳${item.rate.toLocaleString()}`,
      item.vat_percent > 0 ? `${item.vat_percent}%` : '-',
      `৳${item.total.toLocaleString()}`,
    ];
  });
  
  if (tableData.length === 0) {
    tableData.push(['1', 'Bandwidth Service', '-', '1', `৳${bill.subtotal.toLocaleString()}`, '-', `৳${bill.subtotal.toLocaleString()}`]);
  }
  
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Item / Description', 'Unit', 'Qty', 'Rate', 'VAT', 'Total']],
    body: tableData,
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      textColor: textColor,
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 30, halign: 'right' },
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
    doc.text(`৳${Math.abs(item.value).toLocaleString()}`, pageWidth - 20, yPos + i * 7, { align: 'right' });
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
  doc.text(`৳${bill.total_amount.toLocaleString()}`, pageWidth - 20, yPos + 4, { align: 'right' });
  
  // Paid & Due
  yPos += 12;
  doc.setFontSize(10);
  doc.setTextColor(...successColor);
  doc.text('Paid:', totalsX, yPos);
  doc.text(`৳${bill.paid_amount.toLocaleString()}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 7;
  doc.setTextColor(...dangerColor);
  doc.text('Due:', totalsX, yPos);
  doc.text(`৳${bill.due_amount.toLocaleString()}`, pageWidth - 20, yPos, { align: 'right' });
  
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
      ? `\n${format(new Date(item.from_date), 'dd/MM')} - ${format(new Date(item.to_date), 'dd/MM')} (${getDaysCount(item.from_date, item.to_date)} days)`
      : '';
    return [
      (index + 1).toString(),
      item.item_name + daysInfo,
      item.unit,
      item.quantity.toString(),
      `৳${item.rate.toLocaleString()}`,
      item.vat_percent > 0 ? `${item.vat_percent}%` : '-',
      `৳${item.total.toLocaleString()}`,
    ];
  });
  
  if (tableData.length === 0) {
    tableData.push(['1', 'Bandwidth Service', '-', '1', `৳${invoice.subtotal.toLocaleString()}`, '-', `৳${invoice.subtotal.toLocaleString()}`]);
  }
  
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Item / Description', 'Unit', 'Qty', 'Rate', 'VAT', 'Total']],
    body: tableData,
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      textColor: textColor,
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 30, halign: 'right' },
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
    doc.text(`৳${Math.abs(item.value).toLocaleString()}`, pageWidth - 20, yPos + i * 7, { align: 'right' });
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
  doc.text(`৳${invoice.total_amount.toLocaleString()}`, pageWidth - 20, yPos + 4, { align: 'right' });
  
  // Paid & Due
  yPos += 12;
  doc.setFontSize(10);
  doc.setTextColor(...successColor);
  doc.text('Paid:', totalsX, yPos);
  doc.text(`৳${invoice.paid_amount.toLocaleString()}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 7;
  doc.setTextColor(...dangerColor);
  doc.text('Due:', totalsX, yPos);
  doc.text(`৳${invoice.due_amount.toLocaleString()}`, pageWidth - 20, yPos, { align: 'right' });
  
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
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${isPurchase ? 'Purchase Bill' : 'Sales Invoice'} - ${data.invoice_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; color: #1f2937; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid ${primaryColor}; }
        .company-info h1 { color: ${primaryColor}; font-size: 24px; margin-bottom: 5px; }
        .company-info p { color: #6b7280; font-size: 12px; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { font-size: 28px; color: #1f2937; margin-bottom: 5px; }
        .invoice-info .invoice-number { color: ${primaryColor}; font-size: 14px; font-weight: 600; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }
        .status.paid { background: #dcfce7; color: #15803d; }
        .status.partial { background: #fef3c7; color: #b45309; }
        .status.due { background: #fee2e2; color: #dc2626; }
        .details-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .detail-box { background: #f9fafb; padding: 20px; border-radius: 8px; }
        .detail-box h3 { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .detail-box .name { font-size: 16px; font-weight: 600; margin-bottom: 5px; }
        .detail-box p { font-size: 13px; color: #4b5563; line-height: 1.6; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .detail-row .label { color: #6b7280; }
        .detail-row .value { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: ${primaryColor}; color: white; padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
        th:first-child { border-radius: 8px 0 0 0; }
        th:last-child { border-radius: 0 8px 0 0; text-align: right; }
        td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        tr:nth-child(even) { background: #f9fafb; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .item-desc { font-size: 11px; color: #6b7280; margin-top: 3px; }
        .totals { display: flex; justify-content: flex-end; }
        .totals-box { background: #f9fafb; padding: 20px; border-radius: 8px; min-width: 280px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
        .total-row.main { border-top: 2px solid ${primaryColor}; margin-top: 10px; padding-top: 15px; font-size: 18px; font-weight: 700; color: ${primaryColor}; }
        .total-row.paid { color: #15803d; }
        .total-row.due { color: #dc2626; }
        .remarks { margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px; }
        .remarks h4 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
        .remarks p { font-size: 13px; line-height: 1.6; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; }
        @media print {
          body { padding: 0; }
          .container { max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-info">
            <h1>${options.companyName || 'Bandwidth Management'}</h1>
            ${options.companyAddress ? `<p>${options.companyAddress}</p>` : ''}
            ${options.companyPhone ? `<p>Phone: ${options.companyPhone}</p>` : ''}
            ${options.companyEmail ? `<p>Email: ${options.companyEmail}</p>` : ''}
          </div>
          <div class="invoice-info">
            <h2>${isPurchase ? 'Purchase Bill' : 'Sales Invoice'}</h2>
            <div class="invoice-number">#${data.invoice_number}</div>
            <div class="status ${data.payment_status}">${data.payment_status}</div>
          </div>
        </div>
        
        <div class="details-section">
          <div class="detail-box">
            <h3>${isPurchase ? 'Provider' : 'Bill To'}</h3>
            <div class="name">${isPurchase ? bill.provider?.name || 'N/A' : invoice.client?.name || 'N/A'}</div>
            <p>${isPurchase ? bill.provider?.company_name || '' : invoice.client?.company_name || ''}</p>
            <p>${isPurchase ? bill.provider?.phone || '' : invoice.client?.phone || ''}</p>
            <p>${isPurchase ? bill.provider?.email || '' : invoice.client?.email || ''}</p>
          </div>
          <div class="detail-box">
            <h3>Invoice Details</h3>
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
              <th style="width: 40px;">#</th>
              <th>Item / Description</th>
              <th style="width: 60px;" class="text-center">Unit</th>
              <th style="width: 50px;" class="text-center">Qty</th>
              <th style="width: 90px;" class="text-right">Rate</th>
              <th style="width: 60px;" class="text-center">VAT</th>
              <th style="width: 100px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.length > 0 ? items.map((item, i) => `
              <tr>
                <td class="text-center">${i + 1}</td>
                <td>
                  ${item.item_name}
                  ${item.from_date && item.to_date ? `<div class="item-desc">${format(new Date(item.from_date), 'dd/MM/yyyy')} - ${format(new Date(item.to_date), 'dd/MM/yyyy')} (${getDaysCount(item.from_date, item.to_date)} days)</div>` : ''}
                </td>
                <td class="text-center">${item.unit}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">৳${item.rate.toLocaleString()}</td>
                <td class="text-center">${item.vat_percent > 0 ? `${item.vat_percent}%` : '-'}</td>
                <td class="text-right">৳${item.total.toLocaleString()}</td>
              </tr>
            `).join('') : `
              <tr>
                <td class="text-center">1</td>
                <td>Bandwidth Service</td>
                <td class="text-center">-</td>
                <td class="text-center">1</td>
                <td class="text-right">৳${data.subtotal.toLocaleString()}</td>
                <td class="text-center">-</td>
                <td class="text-right">৳${data.subtotal.toLocaleString()}</td>
              </tr>
            `}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="totals-box">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>৳${data.subtotal.toLocaleString()}</span>
            </div>
            <div class="total-row">
              <span>VAT:</span>
              <span>৳${data.vat_amount.toLocaleString()}</span>
            </div>
            <div class="total-row">
              <span>Discount:</span>
              <span>-৳${data.discount.toLocaleString()}</span>
            </div>
            <div class="total-row main">
              <span>Total:</span>
              <span>৳${data.total_amount.toLocaleString()}</span>
            </div>
            <div class="total-row paid">
              <span>Paid:</span>
              <span>৳${data.paid_amount.toLocaleString()}</span>
            </div>
            <div class="total-row due">
              <span>Due:</span>
              <span>৳${data.due_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        ${data.remarks ? `
        <div class="remarks">
          <h4>Remarks</h4>
          <p>${data.remarks}</p>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
        </div>
      </div>
      <script>window.print();</script>
    </body>
    </html>
  `;
}
