import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Printer, X, Plus, Minus, Barcode } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface ProductBarcodeItem {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  sale_price: number;
  quantity: number;
}

interface ProductBarcodePrinterProps {
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

const BARCODE_SIZES = [
  { value: 'small', label: 'Small (30mm)', barcodeWidth: 1.2, barcodeHeight: 40 },
  { value: 'medium', label: 'Medium (40mm)', barcodeWidth: 1.5, barcodeHeight: 50 },
  { value: 'large', label: 'Large (50mm)', barcodeWidth: 2, barcodeHeight: 60 },
];

const COLUMNS_OPTIONS = [
  { value: '3', label: '3 per row' },
  { value: '4', label: '4 per row' },
  { value: '5', label: '5 per row' },
  { value: '6', label: '6 per row' },
];

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

export function ProductBarcodePrinter({ open, onOpenChange, products, tenantName }: ProductBarcodePrinterProps) {
  const [selectedProducts, setSelectedProducts] = useState<ProductBarcodeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeSize, setBarcodeSize] = useState('medium');
  const [columns, setColumns] = useState('4');
  const [showPrice, setShowPrice] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showName, setShowName] = useState(true);

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

  const generateBarcodes = () => {
    const barcodes: ProductBarcodeItem[] = [];
    selectedProducts.forEach(product => {
      for (let i = 0; i < product.quantity; i++) {
        barcodes.push({ ...product });
      }
    });
    return barcodes;
  };

  const handlePrint = () => {
    const barcodes = generateBarcodes();
    const sizeConfig = BARCODE_SIZES.find(s => s.value === barcodeSize) || BARCODE_SIZES[1];
    const cols = parseInt(columns);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Pre-generate all barcode SVGs
    const barcodesSVG: string[] = [];
    barcodes.forEach((product) => {
      const codeValue = product.barcode || product.sku || product.id;
      const barcodeValue = codeValue.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'NOCODE';
      barcodesSVG.push(generateBarcodeSVG(barcodeValue, sizeConfig.barcodeWidth, sizeConfig.barcodeHeight));
    });

    // Generate all barcodes HTML
    let barcodesHTML = '';
    barcodes.forEach((product, idx) => {
      barcodesHTML += `
        <div class="barcode-item">
          <div class="barcode-container">
            ${barcodesSVG[idx]}
          </div>
          <div class="product-info">
            ${showName ? `<div class="product-name">${product.name.slice(0, 20)}${product.name.length > 20 ? '...' : ''}</div>` : ''}
            ${showSku && product.sku ? `<div class="product-sku">${product.sku}</div>` : ''}
            ${showPrice ? `<div class="product-price">৳${product.sale_price.toLocaleString()}</div>` : ''}
          </div>
        </div>
      `;
    });

    const totalBarcodesCount = barcodes.length;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcodes - ${tenantName || 'Products'}</title>
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
          .barcode-grid {
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            gap: 8px;
          }
          .barcode-item {
            border: 1px dashed #999;
            padding: 8px;
            text-align: center;
            break-inside: avoid;
            background: #fff;
          }
          .barcode-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 5px;
            min-height: ${sizeConfig.barcodeHeight}px;
          }
          .barcode-container svg {
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
          <h1>Barcodes - ${tenantName || 'Product Barcodes'}</h1>
          <p>Total: ${totalBarcodesCount} barcodes | Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="barcode-grid">
          ${barcodesHTML}
        </div>
        <script>
          // Print immediately since barcodes are already generated
          setTimeout(function() { window.print(); }, 200);
        <\/script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const sizeConfig = BARCODE_SIZES.find(s => s.value === barcodeSize) || BARCODE_SIZES[1];
  const barcodesPreview = generateBarcodes();

  // Generate barcode preview component
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
            <Barcode className="h-5 w-5" />
            Print Product Barcodes
          </DialogTitle>
          <DialogDescription>Select products and quantity of barcodes to print on A4 paper</DialogDescription>
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
            {/* Settings */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Barcode Size</Label>
                <Select value={barcodeSize} onValueChange={setBarcodeSize}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BARCODE_SIZES.map(size => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
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
                    {COLUMNS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Display Options */}
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showName"
                  checked={showName}
                  onCheckedChange={(checked) => setShowName(checked === true)}
                />
                <label htmlFor="showName" className="text-xs cursor-pointer">Product Name</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showPrice"
                  checked={showPrice}
                  onCheckedChange={(checked) => setShowPrice(checked === true)}
                />
                <label htmlFor="showPrice" className="text-xs cursor-pointer">Price</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showSku"
                  checked={showSku}
                  onCheckedChange={(checked) => setShowSku(checked === true)}
                />
                <label htmlFor="showSku" className="text-xs cursor-pointer">SKU</label>
              </div>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Preview</Label>
                <Badge variant="secondary">{totalCodes} barcodes</Badge>
              </div>
              <div
                className="grid gap-2 bg-white p-2 rounded border max-h-[200px] overflow-y-auto"
                style={{ gridTemplateColumns: `repeat(${Math.min(parseInt(columns), 3)}, 1fr)` }}
              >
                {barcodesPreview.slice(0, 8).map((product, idx) => (
                  <div key={idx} className="border border-dashed p-1.5 text-center">
                    <div className="flex justify-center items-center min-h-[40px]">
                      <BarcodePreview
                        value={product.barcode || product.sku || product.id}
                        width={sizeConfig.barcodeWidth}
                        height={sizeConfig.barcodeHeight}
                      />
                    </div>
                    <div className="text-[8px] leading-tight mt-1">
                      {showName && <div className="font-semibold truncate">{product.name}</div>}
                      {showSku && product.sku && <div className="text-muted-foreground font-mono">{product.sku}</div>}
                      {showPrice && <div className="font-bold">৳{product.sale_price}</div>}
                    </div>
                  </div>
                ))}
                {barcodesPreview.length > 8 && (
                  <div className="border border-dashed p-2 flex items-center justify-center text-muted-foreground text-xs">
                    +{barcodesPreview.length - 8} more
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {totalCodes > 0 && `Ready to print ${totalCodes} barcode${totalCodes > 1 ? 's' : ''}`}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={selectedProducts.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print Barcodes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
