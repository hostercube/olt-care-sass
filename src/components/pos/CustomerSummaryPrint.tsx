import { format } from 'date-fns';

interface CustomerSummaryData {
  customer: {
    name: string;
    customer_code: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    company_name: string | null;
    total_purchase: number;
    due_amount: number;
  };
  sales: Array<{
    invoice_number: string;
    sale_date: string;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    status: string;
  }>;
  payments: Array<{
    payment_date: string;
    amount: number;
    payment_method: string;
  }>;
  tenantInfo?: {
    company_name?: string | null;
    phone?: string | null;
    address?: string | null;
  };
}

export function printCustomerSummary(data: CustomerSummaryData): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const salesRows = data.sales.map((s, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${s.invoice_number}</td>
      <td>${format(new Date(s.sale_date), 'dd/MM/yyyy')}</td>
      <td style="text-align:right">৳${s.total_amount.toLocaleString()}</td>
      <td style="text-align:right">৳${s.paid_amount.toLocaleString()}</td>
      <td style="text-align:right;color:${s.due_amount > 0 ? '#dc2626' : '#16a34a'}">
        ৳${s.due_amount.toLocaleString()}
      </td>
      <td>${s.status}</td>
    </tr>
  `).join('');

  const paymentsRows = data.payments.map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${format(new Date(p.payment_date), 'dd/MM/yyyy HH:mm')}</td>
      <td style="text-align:right;color:#16a34a">৳${p.amount.toLocaleString()}</td>
      <td>${p.payment_method}</td>
    </tr>
  `).join('');

  const totalSales = data.sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalPaid = data.sales.reduce((sum, s) => sum + s.paid_amount, 0);
  const totalPayments = data.payments.reduce((sum, p) => sum + p.amount, 0);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Customer Summary - ${data.customer.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
        
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .company { font-size: 18px; font-weight: bold; }
        .company-info { font-size: 10px; color: #666; }
        .title { font-size: 14px; margin-top: 10px; text-transform: uppercase; }
        
        .customer-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
        .info-section h3 { font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .info-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
        .info-label { color: #666; }
        .info-value { font-weight: 500; }
        
        .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
        .summary-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
        .summary-label { font-size: 10px; color: #666; text-transform: uppercase; }
        .summary-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
        .positive { color: #16a34a; }
        .negative { color: #dc2626; }
        
        .section { margin-bottom: 25px; }
        .section-title { font-size: 13px; font-weight: bold; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #333; }
        
        table { width: 100%; border-collapse: collapse; }
        th { background: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 10px; }
        td { padding: 6px 8px; border: 1px solid #eee; font-size: 10px; }
        tr:nth-child(even) { background: #fafafa; }
        
        .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #666; padding-top: 15px; border-top: 1px solid #ddd; }
        
        @media print { 
          body { padding: 10px; }
          .summary-cards { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company">${data.tenantInfo?.company_name || 'Company'}</div>
        ${data.tenantInfo?.address ? `<div class="company-info">${data.tenantInfo.address}</div>` : ''}
        ${data.tenantInfo?.phone ? `<div class="company-info">Tel: ${data.tenantInfo.phone}</div>` : ''}
        <div class="title">Customer Account Summary</div>
      </div>
      
      <div class="customer-info">
        <div class="info-section">
          <h3>Customer Details</h3>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${data.customer.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Code:</span>
            <span class="info-value">${data.customer.customer_code || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone:</span>
            <span class="info-value">${data.customer.phone || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${data.customer.email || '-'}</span>
          </div>
        </div>
        <div class="info-section">
          <h3>Additional Info</h3>
          <div class="info-row">
            <span class="info-label">Company:</span>
            <span class="info-value">${data.customer.company_name || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Address:</span>
            <span class="info-value">${data.customer.address || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Report Date:</span>
            <span class="info-value">${format(new Date(), 'dd MMM yyyy')}</span>
          </div>
        </div>
      </div>
      
      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-label">Total Purchase</div>
          <div class="summary-value">৳${data.customer.total_purchase.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Paid</div>
          <div class="summary-value positive">৳${(totalPaid + totalPayments).toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Due Balance</div>
          <div class="summary-value ${data.customer.due_amount > 0 ? 'negative' : 'positive'}">
            ৳${data.customer.due_amount.toLocaleString()}
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Invoices</div>
          <div class="summary-value">${data.sales.length}</div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Purchase History (${data.sales.length} invoices)</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Invoice</th>
              <th>Date</th>
              <th style="text-align:right">Total</th>
              <th style="text-align:right">Paid</th>
              <th style="text-align:right">Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${salesRows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#666">No purchases yet</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">Payment History (${data.payments.length} payments)</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date & Time</th>
              <th style="text-align:right">Amount</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            ${paymentsRows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#666">No payments yet</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <div class="footer">
        Report generated on ${format(new Date(), 'dd MMMM yyyy HH:mm')} | ISP Manager
      </div>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}
