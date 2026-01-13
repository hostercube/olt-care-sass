import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronUp, ChevronDown, Trash2, Plus, GripVertical, Eye, EyeOff,
  Layout, Palette, Type, Image as ImageIcon, Settings2, Sparkles, 
  AlignLeft, AlignCenter, AlignRight, Grid3X3, Rows, Columns, Move
} from 'lucide-react';
import { CustomSection, LAYOUT_OPTIONS, SECTION_TYPES, SectionLayoutOptions } from '@/types/landingPage';
import { ImageUploader } from './ImageUploader';

interface AdvancedSectionEditorProps {
  section: CustomSection;
  index: number;
  onUpdate: (index: number, updates: Partial<CustomSection>) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onRemove: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}

export function AdvancedSectionEditor({
  section,
  index,
  onUpdate,
  onMove,
  onRemove,
  isFirst,
  isLast
}: AdvancedSectionEditorProps) {
  const [activeTab, setActiveTab] = useState('content');
  
  const updateLayout = (key: keyof SectionLayoutOptions, value: any) => {
    onUpdate(index, {
      layout: {
        ...section.layout,
        [key]: value
      }
    });
  };
  
  const addItem = () => {
    const newItems = [...(section.items || []), { title: '', description: '', imageUrl: '' }];
    onUpdate(index, { items: newItems });
  };
  
  const updateItem = (itemIndex: number, field: string, value: string) => {
    const newItems = [...(section.items || [])];
    newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
    onUpdate(index, { items: newItems });
  };
  
  const removeItem = (itemIndex: number) => {
    const newItems = (section.items || []).filter((_, i) => i !== itemIndex);
    onUpdate(index, { items: newItems });
  };

  const sectionType = SECTION_TYPES.find(t => t.id === section.type);

  return (
    <Card className="border-2 overflow-hidden">
      <CardHeader className="pb-2 bg-muted/30">
        <div className="flex items-center gap-3">
          {/* Move Controls */}
          <div className="flex flex-col gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(index, 'up')} disabled={isFirst}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(index, 'down')} disabled={isLast}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-2 rounded bg-background cursor-grab">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">{sectionType?.labelBn || section.type}</Badge>
              <span className="text-sm font-medium truncate">{section.title || 'Untitled Section'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onUpdate(index, { isVisible: !section.isVisible })}
              title={section.isVisible ? 'Hide section' : 'Show section'}
            >
              {section.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="content" className="text-xs">
              <Type className="h-3 w-3 mr-1" />
              কনটেন্ট
            </TabsTrigger>
            <TabsTrigger value="layout" className="text-xs">
              <Layout className="h-3 w-3 mr-1" />
              লেআউট
            </TabsTrigger>
            <TabsTrigger value="style" className="text-xs">
              <Palette className="h-3 w-3 mr-1" />
              স্টাইল
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs">
              <Settings2 className="h-3 w-3 mr-1" />
              অ্যাডভান্সড
            </TabsTrigger>
          </TabsList>
          
          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>শিরোনাম</Label>
                <Input
                  value={section.title}
                  onChange={(e) => onUpdate(index, { title: e.target.value })}
                  placeholder="সেকশন শিরোনাম"
                />
              </div>
              <div className="space-y-2">
                <Label>সাবটাইটেল</Label>
                <Input
                  value={section.subtitle || ''}
                  onChange={(e) => onUpdate(index, { subtitle: e.target.value })}
                  placeholder="সেকশন সাবটাইটেল"
                />
              </div>
            </div>
            
            {/* Content field for text-based sections */}
            {['text', 'cta', 'custom', 'banner'].includes(section.type) && (
              <div className="space-y-2">
                <Label>কনটেন্ট</Label>
                <Textarea
                  value={section.content || ''}
                  onChange={(e) => onUpdate(index, { content: e.target.value })}
                  placeholder="সেকশন কনটেন্ট..."
                  rows={4}
                />
              </div>
            )}
            
            {/* Image Upload/URL */}
            {['image', 'custom', 'banner', 'cta'].includes(section.type) && (
              <ImageUploader
                label="ইমেজ"
                value={section.imageUrl || ''}
                onChange={(url) => onUpdate(index, { imageUrl: url })}
                folderPath={`sections/${section.id}`}
              />
            )}
            
            {/* Video URL */}
            {section.type === 'video' && (
              <div className="space-y-2">
                <Label>ভিডিও URL (YouTube/Vimeo)</Label>
                <Input
                  value={section.videoUrl || ''}
                  onChange={(e) => onUpdate(index, { videoUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            )}
            
            {/* Button fields */}
            {['cta', 'custom', 'banner'].includes(section.type) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>প্রাইমারি বাটন টেক্সট</Label>
                  <Input
                    value={section.buttonText || ''}
                    onChange={(e) => onUpdate(index, { buttonText: e.target.value })}
                    placeholder="এখনই শুরু করুন"
                  />
                </div>
                <div className="space-y-2">
                  <Label>প্রাইমারি বাটন লিংক</Label>
                  <Input
                    value={section.buttonUrl || ''}
                    onChange={(e) => onUpdate(index, { buttonUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>সেকেন্ডারি বাটন টেক্সট</Label>
                  <Input
                    value={section.secondaryButtonText || ''}
                    onChange={(e) => onUpdate(index, { secondaryButtonText: e.target.value })}
                    placeholder="আরও জানুন"
                  />
                </div>
                <div className="space-y-2">
                  <Label>সেকেন্ডারি বাটন লিংক</Label>
                  <Input
                    value={section.secondaryButtonUrl || ''}
                    onChange={(e) => onUpdate(index, { secondaryButtonUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}
            
            {/* Items for list-based sections */}
            {['features', 'gallery', 'testimonial', 'faq', 'stats', 'team', 'slider'].includes(section.type) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    {section.type === 'features' && 'ফিচার আইটেম'}
                    {section.type === 'gallery' && 'গ্যালারি আইটেম'}
                    {section.type === 'testimonial' && 'টেস্টিমোনিয়াল'}
                    {section.type === 'faq' && 'FAQ আইটেম'}
                    {section.type === 'stats' && 'স্ট্যাটস আইটেম'}
                    {section.type === 'team' && 'টিম মেম্বার'}
                    {section.type === 'slider' && 'স্লাইড'}
                  </Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" />
                    আইটেম যোগ
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {(section.items || []).map((item, itemIndex) => (
                    <div key={itemIndex} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">#{itemIndex + 1}</Badge>
                        <Input
                          value={item.title}
                          onChange={(e) => updateItem(itemIndex, 'title', e.target.value)}
                          placeholder={section.type === 'faq' ? 'প্রশ্ন' : section.type === 'stats' ? 'লেবেল' : 'শিরোনাম'}
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeItem(itemIndex)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      
                      {section.type === 'stats' && (
                        <Input
                          value={item.value || ''}
                          onChange={(e) => updateItem(itemIndex, 'value', e.target.value)}
                          placeholder="মান (যেমন: ১০০০+)"
                        />
                      )}
                      
                      <Textarea
                        value={item.description}
                        onChange={(e) => updateItem(itemIndex, 'description', e.target.value)}
                        placeholder={section.type === 'faq' ? 'উত্তর' : 'বিবরণ'}
                        rows={2}
                      />
                      
                      {['gallery', 'testimonial', 'team', 'slider', 'features'].includes(section.type) && (
                        <Input
                          value={item.imageUrl || ''}
                          onChange={(e) => updateItem(itemIndex, 'imageUrl', e.target.value)}
                          placeholder="ইমেজ URL"
                        />
                      )}
                      
                      {['team', 'features'].includes(section.type) && (
                        <Input
                          value={item.subtitle || ''}
                          onChange={(e) => updateItem(itemIndex, 'subtitle', e.target.value)}
                          placeholder={section.type === 'team' ? 'পদবী' : 'সাবটাইটেল'}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Layout Tab */}
          <TabsContent value="layout" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Container Width */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Move className="h-4 w-4" />
                  কন্টেইনার প্রস্থ
                </Label>
                <Select 
                  value={section.layout?.layout || 'container'}
                  onValueChange={(v) => updateLayout('layout', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.layouts.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.labelBn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Alignment */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <AlignCenter className="h-4 w-4" />
                  কনটেন্ট এলাইনমেন্ট
                </Label>
                <div className="flex gap-2">
                  {LAYOUT_OPTIONS.alignments.map(opt => (
                    <Button
                      key={opt.id}
                      variant={section.layout?.alignment === opt.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateLayout('alignment', opt.id)}
                    >
                      {opt.id === 'left' && <AlignLeft className="h-4 w-4" />}
                      {opt.id === 'center' && <AlignCenter className="h-4 w-4" />}
                      {opt.id === 'right' && <AlignRight className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Grid Columns */}
              {['features', 'gallery', 'testimonial', 'team', 'stats'].includes(section.type) && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    গ্রিড কলাম
                  </Label>
                  <Select 
                    value={String(section.layout?.columns || 3)}
                    onValueChange={(v) => updateLayout('columns', Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LAYOUT_OPTIONS.columns.map(col => (
                        <SelectItem key={col} value={String(col)}>{col} কলাম</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Gap */}
              <div className="space-y-2">
                <Label>আইটেম গ্যাপ</Label>
                <Select 
                  value={section.layout?.gap || 'md'}
                  onValueChange={(v) => updateLayout('gap', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.gaps.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Padding */}
              <div className="space-y-2">
                <Label>প্যাডিং (উপর/নিচে)</Label>
                <Select 
                  value={section.layout?.padding || 'lg'}
                  onValueChange={(v) => updateLayout('padding', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.paddings.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Min Height */}
              <div className="space-y-2">
                <Label>সেকশন উচ্চতা</Label>
                <Select 
                  value={section.layout?.minHeight || 'auto'}
                  onValueChange={(v) => updateLayout('minHeight', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.minHeights.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          
          {/* Style Tab */}
          <TabsContent value="style" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Background Color */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  ব্যাকগ্রাউন্ড কালার
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={section.bgColor || '#ffffff'}
                    onChange={(e) => onUpdate(index, { bgColor: e.target.value })}
                    className="w-14 h-10 p-1"
                  />
                  <Input
                    value={section.bgColor || '#ffffff'}
                    onChange={(e) => onUpdate(index, { bgColor: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>
              
              {/* Text Color */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  টেক্সট কালার
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={section.textColor || '#000000'}
                    onChange={(e) => onUpdate(index, { textColor: e.target.value })}
                    className="w-14 h-10 p-1"
                  />
                  <Input
                    value={section.textColor || '#000000'}
                    onChange={(e) => onUpdate(index, { textColor: e.target.value })}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
              
              {/* Accent Color */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  অ্যাকসেন্ট কালার
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={section.accentColor || '#3b82f6'}
                    onChange={(e) => onUpdate(index, { accentColor: e.target.value })}
                    className="w-14 h-10 p-1"
                  />
                  <Input
                    value={section.accentColor || '#3b82f6'}
                    onChange={(e) => onUpdate(index, { accentColor: e.target.value })}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
              
              {/* Border Radius */}
              <div className="space-y-2">
                <Label>বর্ডার রেডিয়াস</Label>
                <Select 
                  value={section.layout?.borderRadius || 'none'}
                  onValueChange={(v) => updateLayout('borderRadius', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.borderRadius.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Shadow */}
              <div className="space-y-2">
                <Label>শ্যাডো</Label>
                <Select 
                  value={section.layout?.shadow || 'none'}
                  onValueChange={(v) => updateLayout('shadow', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.shadows.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Section Style Preset */}
              <div className="space-y-2">
                <Label>স্টাইল প্রিসেট</Label>
                <Select 
                  value={section.style || 'default'}
                  onValueChange={(v) => onUpdate(index, { style: v as CustomSection['style'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.styles.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.labelBn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Background Style */}
            <div className="space-y-3">
              <Label>ব্যাকগ্রাউন্ড স্টাইল</Label>
              <div className="flex flex-wrap gap-2">
                {['solid', 'gradient', 'image', 'pattern'].map(style => (
                  <Button
                    key={style}
                    variant={section.layout?.backgroundStyle === style ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateLayout('backgroundStyle', style)}
                  >
                    {style === 'solid' && 'সলিড'}
                    {style === 'gradient' && 'গ্রেডিয়েন্ট'}
                    {style === 'image' && 'ইমেজ'}
                    {style === 'pattern' && 'প্যাটার্ন'}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Gradient options */}
            {section.layout?.backgroundStyle === 'gradient' && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>গ্রেডিয়েন্ট ডিরেকশন</Label>
                  <Select 
                    value={section.layout?.gradientDirection || 'to-br'}
                    onValueChange={(v) => updateLayout('gradientDirection', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to-r">ডানে</SelectItem>
                      <SelectItem value="to-l">বামে</SelectItem>
                      <SelectItem value="to-t">উপরে</SelectItem>
                      <SelectItem value="to-b">নিচে</SelectItem>
                      <SelectItem value="to-br">নিচে ডানে</SelectItem>
                      <SelectItem value="to-bl">নিচে বামে</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>শুরুর কালার</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={section.layout?.gradientFrom || '#3b82f6'}
                      onChange={(e) => updateLayout('gradientFrom', e.target.value)}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={section.layout?.gradientFrom || '#3b82f6'}
                      onChange={(e) => updateLayout('gradientFrom', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>শেষের কালার</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={section.layout?.gradientTo || '#8b5cf6'}
                      onChange={(e) => updateLayout('gradientTo', e.target.value)}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={section.layout?.gradientTo || '#8b5cf6'}
                      onChange={(e) => updateLayout('gradientTo', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Background Image */}
            {section.layout?.backgroundStyle === 'image' && (
              <div className="space-y-2">
                <Label>ব্যাকগ্রাউন্ড ইমেজ URL</Label>
                <Input
                  value={section.layout?.backgroundImage || ''}
                  onChange={(e) => updateLayout('backgroundImage', e.target.value)}
                  placeholder="https://..."
                />
                <div className="grid gap-2 grid-cols-2">
                  <Select 
                    value={section.layout?.backgroundPosition || 'center'}
                    onValueChange={(v) => updateLayout('backgroundPosition', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">মধ্যে</SelectItem>
                      <SelectItem value="top">উপরে</SelectItem>
                      <SelectItem value="bottom">নিচে</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={section.layout?.backgroundSize || 'cover'}
                    onValueChange={(v) => updateLayout('backgroundSize', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">কভার</SelectItem>
                      <SelectItem value="contain">কন্টেইন</SelectItem>
                      <SelectItem value="auto">অটো</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Animation */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  এনিমেশন
                </Label>
                <Select 
                  value={section.animation || 'none'}
                  onValueChange={(v) => onUpdate(index, { animation: v as CustomSection['animation'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.animations.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.labelBn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Flex Direction */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Rows className="h-4 w-4" />
                  ফ্লেক্স ডিরেকশন
                </Label>
                <Select 
                  value={section.layout?.direction || 'column'}
                  onValueChange={(v) => updateLayout('direction', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.directions.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.labelBn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div>
                <Label className="font-medium">সেকশন দৃশ্যমান</Label>
                <p className="text-xs text-muted-foreground">ওয়েবসাইটে এই সেকশন দেখাবে</p>
              </div>
              <Switch
                checked={section.isVisible}
                onCheckedChange={(checked) => onUpdate(index, { isVisible: checked })}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
