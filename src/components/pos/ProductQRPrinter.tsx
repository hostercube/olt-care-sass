import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Plus, Minus } from 'lucide-react';

interface ProductQRItem {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  sale_price: number;
  quantity: number; // Quantity of QR codes to print
}

interface ProductQRPrinterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Array<{
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    sale_price: number;
    quantity: number;
  }>;
  tenantName?: string;
}

const QR_SIZES = [
  { value: 'small', label: 'Small (30mm)', size: 80 },
  { value: 'medium', label: 'Medium (40mm)', size: 100 },
  { value: 'large', label: 'Large (50mm)', size: 130 },
];

const COLUMNS_OPTIONS = [
  { value: '3', label: '3 per row' },
  { value: '4', label: '4 per row' },
  { value: '5', label: '5 per row' },
  { value: '6', label: '6 per row' },
];

export function ProductQRPrinter({ open, onOpenChange, products, tenantName }: ProductQRPrinterProps) {
  const [selectedProducts, setSelectedProducts] = useState<ProductQRItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrSize, setQrSize] = useState('medium');
  const [columns, setColumns] = useState('4');
  const [showPrice, setShowPrice] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addProduct = (product: typeof products[0]) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    if (existing) {
      setSelectedProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p)
      );
    } else {
      setSelectedProducts(prev => [...prev, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSelectedProducts(prev =>
      prev.map(p => {
        if (p.id === productId) {
          const newQty = Math.max(1, p.quantity + delta);
          return { ...p, quantity: newQty };
        }
        return p;
      })
    );
  };

  const setQuantity = (productId: string, qty: number) => {
    setSelectedProducts(prev =>
      prev.map(p => p.id === productId ? { ...p, quantity: Math.max(1, qty) } : p)
    );
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const totalQRs = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);

  const generateQRs = () => {
    const qrs: ProductQRItem[] = [];
    selectedProducts.forEach(product => {
      for (let i = 0; i < product.quantity; i++) {
        qrs.push(product);
      }
    });
    return qrs;
  };

  const handlePrint = () => {
    const qrs = generateQRs();
    const sizeConfig = QR_SIZES.find(s => s.value === qrSize) || QR_SIZES[1];
    const cols = parseInt(columns);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrHTML = qrs.map((product, idx) => `
      <div class="qr-item">
        <div class="qr-code">
          <svg width="${sizeConfig.size}" height="${sizeConfig.size}" viewBox="0 0 ${sizeConfig.size} ${sizeConfig.size}">
            ${document.getElementById(`qr-preview-${idx}`)?.innerHTML || ''}
          </svg>
        </div>
        <div class="product-info">
          <div class="product-name">${product.name.slice(0, 25)}${product.name.length > 25 ? '...' : ''}</div>
          ${showSku && product.sku ? `<div class="product-sku">${product.sku}</div>` : ''}
          ${showPrice ? `<div class="product-price">৳${product.sale_price}</div>` : ''}
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes - ${tenantName || 'Products'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            size: A4; 
            margin: 10mm; 
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
          }
          .header h1 { font-size: 14px; }
          .header p { font-size: 10px; color: #666; }
          .qr-grid {
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            gap: 8px;
          }
          .qr-item {
            border: 1px dashed #ccc;
            padding: 8px;
            text-align: center;
            break-inside: avoid;
          }
          .qr-code {
            display: flex;
            justify-content: center;
            margin-bottom: 5px;
          }
          .product-info {
            font-size: 9px;
            line-height: 1.3;
          }
          .product-name {
            font-weight: bold;
            margin-bottom: 2px;
          }
          .product-sku {
            color: #666;
            font-family: monospace;
            font-size: 8px;
          }
          .product-price {
            font-weight: bold;
            color: #333;
            font-size: 11px;
            margin-top: 3px;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${tenantName || 'Product QR Codes'}</h1>
          <p>Total: ${totalQRs} QR codes | Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="qr-grid">
          ${qrHTML}
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const sizeConfig = QR_SIZES.find(s => s.value === qrSize) || QR_SIZES[1];
  const qrsPreview = generateQRs();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Print Product QR Codes</DialogTitle>
          <DialogDescription>Select products and quantity of QR codes to print on A4 paper</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Product Selection */}
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[250px] border rounded-lg p-2">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.sku || product.barcode || 'No code'} - ৳{product.sale_price}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-primary" />
                </div>
              ))}
            </ScrollArea>

            {/* Selected Products */}
            <div className="space-y-2">
              <Label>Selected Products ({selectedProducts.length})</Label>
              <ScrollArea className="h-[150px] border rounded-lg p-2">
                {selectedProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Click products above to add
                  </p>
                ) : (
                  selectedProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-2 border-b">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku || 'No SKU'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={product.quantity}
                          onChange={(e) => setQuantity(product.id, parseInt(e.target.value) || 1)}
                          className="w-14 h-7 text-center"
                          min={1}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeProduct(product.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Preview & Settings */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">QR Size</Label>
                <Select value={qrSize} onValueChange={setQrSize}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QR_SIZES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Columns</Label>
                <Select value={columns} onValueChange={setColumns}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded"
                />
                Show Price
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showSku}
                  onChange={(e) => setShowSku(e.target.checked)}
                  className="rounded"
                />
                Show SKU
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">Total: {totalQRs} QR codes</Badge>
              <Badge variant="outline">~{Math.ceil(totalQRs / (parseInt(columns) * 8))} pages</Badge>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <Label className="text-xs mb-2 block">Preview (first 8)</Label>
              <div 
                ref={printRef}
                className="grid gap-2 bg-white p-2 rounded"
                style={{ gridTemplateColumns: `repeat(${Math.min(parseInt(columns), 4)}, 1fr)` }}
              >
                {qrsPreview.slice(0, 8).map((product, idx) => (
                  <div key={idx} className="border border-dashed p-2 text-center">
                    <div id={`qr-preview-${idx}`} className="flex justify-center">
                      <QRCodeSVG
                        value={product.barcode || product.sku || product.id}
                        size={sizeConfig.size * 0.6}
                        level="M"
                      />
                    </div>
                    <p className="text-[8px] font-medium mt-1 truncate">{product.name}</p>
                    {showSku && product.sku && <p className="text-[7px] text-muted-foreground">{product.sku}</p>}
                    {showPrice && <p className="text-[9px] font-bold">৳{product.sale_price}</p>}
                  </div>
                ))}
              </div>
              {qrsPreview.length > 8 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  +{qrsPreview.length - 8} more QR codes
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePrint} disabled={selectedProducts.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print {totalQRs} QR Codes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
