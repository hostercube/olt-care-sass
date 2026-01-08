import { format } from 'date-fns';

interface InvoiceItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount?: number;
}

interface TenantInfo {
  name: string;
  company_name?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  invoice_header?: string | null;
  invoice_footer?: string | null;
  invoice_terms?: string | null;
}

interface SaleInfo {
  invoice_number: string;
  sale_date: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
  payment_method: string;
  notes?: string | null;
}

interface POSInvoicePrintProps {
  sale: SaleInfo;
  items: InvoiceItem[];
  tenant?: TenantInfo | null;
  type: 'thermal' | 'a4';
  onPrint?: () => void;
}

export function generateThermalInvoiceHTML(
  sale: SaleInfo,
  items: InvoiceItem[],
  tenant?: TenantInfo | null
): string {
  const itemRows = items.map(item => `
    <tr>
      <td>${item.item_name}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">৳${item.total_price}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${sale.invoice_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 10px; 
          width: 80mm; 
          padding: 5mm;
          line-height: 1.3;
        }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
        .header img { max-width: 50px; max-height: 50px; }
        .header h1 { font-size: 14px; margin: 3px 0; }
        .header p { font-size: 9px; }
        .info { margin: 5px 0; font-size: 9px; }
        .info-row { display: flex; justify-content: space-between; }
        table { width: 100%; border-collapse: collapse; margin: 5px 0; }
        th, td { padding: 2px; font-size: 9px; }
        th { border-bottom: 1px dashed #000; text-align: left; }
        .totals { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
        .totals .row { display: flex; justify-content: space-between; font-size: 10px; }
        .totals .total { font-weight: bold; font-size: 12px; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px; }
        .footer { text-align: center; border-top: 1px dashed #000; padding-top: 5px; margin-top: 10px; font-size: 8px; }
        .barcode { text-align: center; margin: 5px 0; font-family: 'Libre Barcode 39', monospace; font-size: 24px; }
      </style>
    </head>
    <body>
      <div class="header">
        ${tenant?.logo_url ? `<img src="${tenant.logo_url}" alt="Logo" />` : ''}
        <h1>${tenant?.company_name || tenant?.name || 'Store'}</h1>
        ${tenant?.address ? `<p>${tenant.address}</p>` : ''}
        ${tenant?.phone ? `<p>Tel: ${tenant.phone}</p>` : ''}
        ${tenant?.invoice_header ? `<p>${tenant.invoice_header}</p>` : ''}
      </div>

      <div class="info">
        <div class="info-row"><span>Invoice:</span><span>${sale.invoice_number}</span></div>
        <div class="info-row"><span>Date:</span><span>${format(new Date(sale.sale_date), 'dd/MM/yy HH:mm')}</span></div>
        ${sale.customer_name ? `<div class="info-row"><span>Customer:</span><span>${sale.customer_name}</span></div>` : ''}
        ${sale.customer_phone ? `<div class="info-row"><span>Phone:</span><span>${sale.customer_phone}</span></div>` : ''}
      </div>

      <table>
        <thead>
          <tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="totals">
        <div class="row"><span>Subtotal:</span><span>৳${sale.subtotal.toLocaleString()}</span></div>
        ${sale.discount > 0 ? `<div class="row"><span>Discount:</span><span>-৳${sale.discount.toLocaleString()}</span></div>` : ''}
        ${sale.tax > 0 ? `<div class="row"><span>Tax:</span><span>+৳${sale.tax.toLocaleString()}</span></div>` : ''}
        <div class="row total"><span>TOTAL:</span><span>৳${sale.total_amount.toLocaleString()}</span></div>
        <div class="row"><span>Paid (${sale.payment_method}):</span><span>৳${sale.paid_amount.toLocaleString()}</span></div>
        ${sale.due_amount > 0 ? `<div class="row"><span>Due:</span><span>৳${sale.due_amount.toLocaleString()}</span></div>` : ''}
      </div>

      <div class="barcode">*${sale.invoice_number}*</div>

      <div class="footer">
        ${tenant?.invoice_footer || 'Thank you for your purchase!'}
        ${tenant?.invoice_terms ? `<p style="margin-top:3px">${tenant.invoice_terms}</p>` : ''}
        <p style="margin-top:5px">Powered by ISP Manager</p>
      </div>
    </body>
    </html>
  `;
}

export function generateA4InvoiceHTML(
  sale: SaleInfo,
  items: InvoiceItem[],
  tenant?: TenantInfo | null
): string {
  const itemRows = items.map((item, idx) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eee">${idx + 1}</td>
      <td style="padding:10px;border-bottom:1px solid #eee">${item.item_name}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:right">৳${item.unit_price.toLocaleString()}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:right">৳${(item.discount || 0).toLocaleString()}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-weight:500">৳${item.total_price.toLocaleString()}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${sale.invoice_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 12px; 
          padding: 30px;
          max-width: 210mm;
          margin: 0 auto;
          color: #333;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .logo-section img { max-width: 120px; max-height: 60px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1a1a1a; margin-top: 10px; }
        .company-info { font-size: 11px; color: #666; margin-top: 5px; }
        .invoice-title { text-align: right; }
        .invoice-title h1 { font-size: 28px; color: #333; letter-spacing: 2px; }
        .invoice-number { font-size: 14px; color: #666; margin-top: 5px; }
        
        .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .party { width: 45%; }
        .party-title { font-weight: bold; color: #666; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; margin-bottom: 10px; }
        .party-details { background: #f8f9fa; padding: 15px; border-radius: 5px; }
        .party-name { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
        
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        thead { background: #f8f9fa; }
        th { padding: 12px 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
        
        .summary { margin-left: auto; width: 300px; margin-top: 20px; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .summary-row.total { border-top: 2px solid #333; border-bottom: none; padding-top: 15px; margin-top: 10px; font-size: 16px; font-weight: bold; }
        .summary-row.due { color: #dc3545; }
        .summary-row.paid { color: #28a745; }
        
        .notes { margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 5px; }
        .notes-title { font-weight: bold; margin-bottom: 5px; }
        
        .footer { margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 11px; }
        
        .status-badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .status-completed { background: #d4edda; color: #155724; }
        .status-partial { background: #fff3cd; color: #856404; }
        .status-pending { background: #f8d7da; color: #721c24; }

        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          ${tenant?.logo_url ? `<img src="${tenant.logo_url}" alt="Logo" />` : ''}
          <div class="company-name">${tenant?.company_name || tenant?.name || 'Company Name'}</div>
          <div class="company-info">
            ${tenant?.address || ''}<br/>
            ${tenant?.phone ? `Tel: ${tenant.phone}` : ''} ${tenant?.email ? `| ${tenant.email}` : ''}
          </div>
        </div>
        <div class="invoice-title">
          <h1>INVOICE</h1>
          <div class="invoice-number">${sale.invoice_number}</div>
          <div style="margin-top:10px">
            <span class="status-badge status-${sale.status}">${sale.status}</span>
          </div>
        </div>
      </div>

      <div class="parties">
        <div class="party">
          <div class="party-title">Bill To</div>
          <div class="party-details">
            <div class="party-name">${sale.customer_name || 'Walk-in Customer'}</div>
            ${sale.customer_phone ? `<div>Phone: ${sale.customer_phone}</div>` : ''}
          </div>
        </div>
        <div class="party">
          <div class="party-title">Invoice Details</div>
          <div class="party-details">
            <div><strong>Date:</strong> ${format(new Date(sale.sale_date), 'dd MMMM yyyy')}</div>
            <div><strong>Time:</strong> ${format(new Date(sale.sale_date), 'HH:mm:ss')}</div>
            <div><strong>Payment:</strong> ${sale.payment_method.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:40px">#</th>
            <th>Item Description</th>
            <th style="text-align:center;width:80px">Qty</th>
            <th style="text-align:right;width:100px">Unit Price</th>
            <th style="text-align:right;width:80px">Discount</th>
            <th style="text-align:right;width:100px">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-row"><span>Subtotal:</span><span>৳${sale.subtotal.toLocaleString()}</span></div>
        ${sale.discount > 0 ? `<div class="summary-row"><span>Discount:</span><span>-৳${sale.discount.toLocaleString()}</span></div>` : ''}
        ${sale.tax > 0 ? `<div class="summary-row"><span>Tax:</span><span>+৳${sale.tax.toLocaleString()}</span></div>` : ''}
        <div class="summary-row total"><span>Grand Total:</span><span>৳${sale.total_amount.toLocaleString()}</span></div>
        <div class="summary-row paid"><span>Paid:</span><span>৳${sale.paid_amount.toLocaleString()}</span></div>
        ${sale.due_amount > 0 ? `<div class="summary-row due"><span>Amount Due:</span><span>৳${sale.due_amount.toLocaleString()}</span></div>` : ''}
      </div>

      ${sale.notes ? `
        <div class="notes">
          <div class="notes-title">Notes:</div>
          <div>${sale.notes}</div>
        </div>
      ` : ''}

      ${tenant?.invoice_terms ? `
        <div class="notes" style="margin-top:15px">
          <div class="notes-title">Terms & Conditions:</div>
          <div>${tenant.invoice_terms}</div>
        </div>
      ` : ''}

      <div class="footer">
        ${tenant?.invoice_footer || 'Thank you for your business!'}
        <p style="margin-top:10px;font-size:10px;color:#999">Generated by ISP Manager</p>
      </div>
    </body>
    </html>
  `;
}

export function printInvoice(
  sale: SaleInfo,
  items: InvoiceItem[],
  tenant?: TenantInfo | null,
  type: 'thermal' | 'a4' = 'a4'
): void {
  const html = type === 'thermal' 
    ? generateThermalInvoiceHTML(sale, items, tenant)
    : generateA4InvoiceHTML(sale, items, tenant);

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
  };
}

export function downloadInvoicePDF(
  sale: SaleInfo,
  items: InvoiceItem[],
  tenant?: TenantInfo | null
): void {
  // This will open print dialog which allows saving as PDF
  printInvoice(sale, items, tenant, 'a4');
}
