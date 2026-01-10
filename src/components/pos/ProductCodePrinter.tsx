import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Plus, Minus, QrCode, Barcode } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface ProductCodeItem {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  sale_price: number;
  quantity: number;
}

interface ProductCodePrinterProps {
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

const CODE_SIZES = [
  { value: 'small', label: 'Small (30mm)', qrSize: 80, barcodeWidth: 1.2, barcodeHeight: 40 },
  { value: 'medium', label: 'Medium (40mm)', qrSize: 100, barcodeWidth: 1.5, barcodeHeight: 50 },
  { value: 'large', label: 'Large (50mm)', qrSize: 130, barcodeWidth: 2, barcodeHeight: 60 },
];

const COLUMNS_OPTIONS = [
  { value: '3', label: '3 per row' },
  { value: '4', label: '4 per row' },
  { value: '5', label: '5 per row' },
  { value: '6', label: '6 per row' },
];

// Generate SVG string for QR code
function generateQRCodeSVG(value: string, size: number): string {
  const tempContainer = document.createElement('div');
  const root = document.createElement('div');
  tempContainer.appendChild(root);
  
  // Use the actual QRCodeSVG component to generate
  const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgElement.setAttribute('width', size.toString());
  svgElement.setAttribute('height', size.toString());
  svgElement.setAttribute('viewBox', `0 0 ${size} ${size}`);
  
  // Create a canvas for QR generation
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  // We'll use inline rendering in print
  return '';
}

// Generate barcode SVG string
function generateBarcodeSVG(value: string, width: number, height: number): string {
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value, {
      format: 'CODE128',
      width: width,
      height: height,
      displayValue: false,
      margin: 5,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return svg.outerHTML;
  } catch (e) {
    console.error('Barcode generation error:', e);
    return `<svg width="100" height="${height}"><text x="10" y="20" font-size="10">Invalid</text></svg>`;
  }
}

export function ProductCodePrinter({ open, onOpenChange, products, tenantName }: ProductCodePrinterProps) {
  const [selectedProducts, setSelectedProducts] = useState<ProductCodeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [codeSize, setCodeSize] = useState('medium');
  const [columns, setColumns] = useState('4');
  const [codeType, setCodeType] = useState<'qr' | 'barcode'>('qr');
  const [showPrice, setShowPrice] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showName, setShowName] = useState(true);
  const printContainerRef = useRef<HTMLDivElement>(null);

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

  const totalCodes = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);

  const generateCodes = () => {
    const codes: ProductCodeItem[] = [];
    selectedProducts.forEach(product => {
      for (let i = 0; i < product.quantity; i++) {
        codes.push({ ...product });
      }
    });
    return codes;
  };

  const handlePrint = () => {
    const codes = generateCodes();
    const sizeConfig = CODE_SIZES.find(s => s.value === codeSize) || CODE_SIZES[1];
    const cols = parseInt(columns);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Pre-generate all barcode SVGs
    const barcodesSVG: string[] = [];
    if (codeType === 'barcode') {
      codes.forEach((product) => {
        const codeValue = product.barcode || product.sku || product.id;
        const barcodeValue = codeValue.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'NOCODE';
        barcodesSVG.push(generateBarcodeSVG(barcodeValue, sizeConfig.barcodeWidth, sizeConfig.barcodeHeight));
      });
    }

    // Generate all codes HTML
    let codesHTML = '';
    codes.forEach((product, idx) => {
      const codeValue = product.barcode || product.sku || product.id;
      let codeContent = '';
      
      if (codeType === 'barcode') {
        codeContent = barcodesSVG[idx];
      } else {
        // Each QR code gets a unique ID for generation
        codeContent = `<div class="qr-placeholder" id="qr-${idx}" data-value="${encodeURIComponent(codeValue)}" data-size="${sizeConfig.qrSize}"></div>`;
      }
      
      codesHTML += `
        <div class="code-item">
          <div class="code-container">
            ${codeContent}
          </div>
          <div class="product-info">
            ${showName ? `<div class="product-name">${product.name.slice(0, 20)}${product.name.length > 20 ? '...' : ''}</div>` : ''}
            ${showSku && product.sku ? `<div class="product-sku">${product.sku}</div>` : ''}
            ${showPrice ? `<div class="product-price">৳${product.sale_price.toLocaleString()}</div>` : ''}
          </div>
        </div>
      `;
    });

    const totalCodesCount = codes.length;
    const codeTypeName = codeType === 'qr' ? 'QR Codes' : 'Barcodes';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${codeTypeName} - ${tenantName || 'Products'}</title>
        <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"><\/script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            size: A4; 
            margin: 10mm; 
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 0;
            background: #fff;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #333;
          }
          .header h1 { 
            font-size: 16px; 
            color: #000;
            font-weight: bold;
          }
          .header p { 
            font-size: 11px; 
            color: #333; 
          }
          .code-grid {
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            gap: 8px;
          }
          .code-item {
            border: 1px dashed #999;
            padding: 8px;
            text-align: center;
            break-inside: avoid;
            background: #fff;
          }
          .code-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 5px;
            min-height: ${codeType === 'qr' ? sizeConfig.qrSize : sizeConfig.barcodeHeight}px;
          }
          .code-container svg {
            max-width: 100%;
          }
          .product-info {
            font-size: 9px;
            line-height: 1.4;
            color: #000;
          }
          .product-name {
            font-weight: bold;
            margin-bottom: 2px;
            color: #000;
          }
          .product-sku {
            color: #444;
            font-family: monospace;
            font-size: 8px;
          }
          .product-price {
            font-weight: bold;
            color: #000;
            font-size: 11px;
            margin-top: 3px;
          }
          @media print {
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${codeTypeName} - ${tenantName || 'Product Codes'}</h1>
          <p>Total: ${totalCodesCount} ${codeTypeName.toLowerCase()} | Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="code-grid">
          ${codesHTML}
        </div>
        <script>
          // Generate QR codes after page load
          var placeholders = document.querySelectorAll('.qr-placeholder');
          var totalQR = placeholders.length;
          var generated = 0;
          
          if (totalQR === 0) {
            // No QR codes (barcode mode), just print
            setTimeout(function() { window.print(); }, 200);
          } else {
            placeholders.forEach(function(el, index) {
              var value = decodeURIComponent(el.getAttribute('data-value'));
              var size = parseInt(el.getAttribute('data-size')) || 100;
              
              try {
                var qr = qrcode(0, 'M');
                qr.addData(value);
                qr.make();
                
                var moduleCount = qr.getModuleCount();
                var cellSize = Math.floor(size / moduleCount);
                var actualSize = cellSize * moduleCount;
                
                var svg = '<svg width="' + actualSize + '" height="' + actualSize + '" xmlns="http://www.w3.org/2000/svg">';
                svg += '<rect width="100%" height="100%" fill="white"/>';
                
                for (var row = 0; row < moduleCount; row++) {
                  for (var col = 0; col < moduleCount; col++) {
                    if (qr.isDark(row, col)) {
                      svg += '<rect x="' + (col * cellSize) + '" y="' + (row * cellSize) + '" width="' + cellSize + '" height="' + cellSize + '" fill="black"/>';
                    }
                  }
                }
                svg += '</svg>';
                el.innerHTML = svg;
              } catch(e) {
                el.innerHTML = '<div style="font-size:10px;color:red;">Error</div>';
              }
              
              generated++;
              if (generated === totalQR) {
                // All QR codes generated, trigger print
                setTimeout(function() { window.print(); }, 300);
              }
            });
          }
        <\/script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const sizeConfig = CODE_SIZES.find(s => s.value === codeSize) || CODE_SIZES[1];
  const codesPreview = generateCodes();

  // Generate barcode preview
  const BarcodePreview = ({ value, width, height }: { value: string; width: number; height: number }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    
    useEffect(() => {
      if (svgRef.current) {
        try {
          const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'NOCODE';
          JsBarcode(svgRef.current, cleanValue, {
            format: 'CODE128',
            width: width * 0.7,
            height: height * 0.7,
            displayValue: false,
            margin: 2,
            background: '#ffffff',
            lineColor: '#000000',
          });
        } catch (e) {
          console.error('Barcode preview error:', e);
        }
      }
    }, [value, width, height]);
    
    return <svg ref={svgRef}></svg>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {codeType === 'qr' ? <QrCode className="h-5 w-5" /> : <Barcode className="h-5 w-5" />}
            Print Product {codeType === 'qr' ? 'QR Codes' : 'Barcodes'}
          </DialogTitle>
          <DialogDescription>Select products and quantity of codes to print on A4 paper</DialogDescription>
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
            <ScrollArea className="h-[200px] border rounded-lg p-2">
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
              <ScrollArea className="h-[130px] border rounded-lg p-2">
                {selectedProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Click products above to add
                  </p>
                ) : (
                  selectedProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-2 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku || 'No SKU'}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
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
                          className="w-12 h-7 text-center px-1"
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
                          className="h-6 w-6 text-destructive"
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
            {/* Code Type Selection */}
            <div className="flex gap-2">
              <Button
                variant={codeType === 'qr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCodeType('qr')}
                className="flex-1"
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
              <Button
                variant={codeType === 'barcode' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCodeType('barcode')}
                className="flex-1"
              >
                <Barcode className="h-4 w-4 mr-2" />
                Barcode
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Size</Label>
                <Select value={codeSize} onValueChange={setCodeSize}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CODE_SIZES.map(s => (
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

            {/* Display Options */}
            <div className="flex flex-wrap gap-4 p-2 border rounded-lg bg-muted/30">
              <Label className="text-xs font-medium w-full">Display Options:</Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={showName}
                  onCheckedChange={(checked) => setShowName(checked === true)}
                />
                Name
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={showPrice}
                  onCheckedChange={(checked) => setShowPrice(checked === true)}
                />
                Price
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={showSku}
                  onCheckedChange={(checked) => setShowSku(checked === true)}
                />
                SKU
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">Total: {totalCodes} {codeType === 'qr' ? 'QR' : 'Barcode'}s</Badge>
              <Badge variant="outline">~{Math.ceil(totalCodes / (parseInt(columns) * 8))} pages</Badge>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-3 bg-white">
              <Label className="text-xs mb-2 block text-foreground">Preview (first 8)</Label>
              <div 
                ref={printContainerRef}
                className="grid gap-2 bg-white p-2 rounded"
                style={{ gridTemplateColumns: `repeat(${Math.min(parseInt(columns), 4)}, 1fr)` }}
              >
                {codesPreview.slice(0, 8).map((product, idx) => (
                  <div key={idx} className="border border-dashed border-gray-400 p-2 text-center bg-white">
                    <div className="flex justify-center items-center min-h-[50px]">
                      {codeType === 'qr' ? (
                        <QRCodeSVG
                          value={product.barcode || product.sku || product.id}
                          size={sizeConfig.qrSize * 0.5}
                          level="M"
                          bgColor="#ffffff"
                          fgColor="#000000"
                        />
                      ) : (
                        <BarcodePreview 
                          value={product.barcode || product.sku || product.id}
                          width={sizeConfig.barcodeWidth}
                          height={sizeConfig.barcodeHeight}
                        />
                      )}
                    </div>
                    <div className="mt-1">
                      {showName && <p className="text-[8px] font-bold text-black truncate">{product.name}</p>}
                      {showSku && product.sku && <p className="text-[7px] text-gray-600 font-mono">{product.sku}</p>}
                      {showPrice && <p className="text-[9px] font-bold text-black">৳{product.sale_price.toLocaleString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {codesPreview.length > 8 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  +{codesPreview.length - 8} more {codeType === 'qr' ? 'QR codes' : 'barcodes'}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePrint} disabled={selectedProducts.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print {totalCodes} {codeType === 'qr' ? 'QR Codes' : 'Barcodes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Keep backward compatibility export
export { ProductCodePrinter as ProductQRPrinter };
