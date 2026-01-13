import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ImageUploader } from './ImageUploader';
import { 
  Sparkles, Type, MousePointer, Image as ImageIcon, Plus, Trash2, 
  GripVertical, ChevronUp, ChevronDown, Loader2, CheckCircle
} from 'lucide-react';

interface HeroSlide {
  url: string;
  title?: string;
  subtitle?: string;
}

interface HeroSectionEditorProps {
  settings: {
    landing_page_hero_title: string;
    landing_page_hero_subtitle: string;
    landing_page_hero_badge_text: string;
    landing_page_hero_primary_button_text: string;
    landing_page_hero_primary_button_url: string;
    landing_page_hero_secondary_button_text: string;
    landing_page_hero_secondary_button_url: string;
    landing_page_hero_background_url: string;
    landing_page_hero_slides: HeroSlide[];
  };
  onSettingsChange: (key: string, value: any) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function HeroSectionEditor({
  settings,
  onSettingsChange,
  onSave,
  saving
}: HeroSectionEditorProps) {
  const [activeTab, setActiveTab] = useState('content');

  const addSlide = () => {
    const newSlides = [
      ...(settings.landing_page_hero_slides || []),
      { url: '', title: '', subtitle: '' }
    ];
    onSettingsChange('landing_page_hero_slides', newSlides);
  };

  const updateSlide = (index: number, field: keyof HeroSlide, value: string) => {
    const updated = [...(settings.landing_page_hero_slides || [])];
    updated[index] = { ...updated[index], [field]: value };
    onSettingsChange('landing_page_hero_slides', updated);
  };

  const removeSlide = (index: number) => {
    const updated = (settings.landing_page_hero_slides || []).filter((_, i) => i !== index);
    onSettingsChange('landing_page_hero_slides', updated);
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const slides = [...(settings.landing_page_hero_slides || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;
    [slides[index], slides[newIndex]] = [slides[newIndex], slides[index]];
    onSettingsChange('landing_page_hero_slides', slides);
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          হিরো সেকশন এডিটর
        </CardTitle>
        <CardDescription>
          ল্যান্ডিং পেজের মূল হিরো সেকশন কাস্টমাইজ করুন
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="content" className="text-xs">
              <Type className="h-3 w-3 mr-1" />
              টেক্সট
            </TabsTrigger>
            <TabsTrigger value="buttons" className="text-xs">
              <MousePointer className="h-3 w-3 mr-1" />
              বাটন
            </TabsTrigger>
            <TabsTrigger value="background" className="text-xs">
              <ImageIcon className="h-3 w-3 mr-1" />
              ব্যাকগ্রাউন্ড
            </TabsTrigger>
            <TabsTrigger value="slider" className="text-xs">
              <GripVertical className="h-3 w-3 mr-1" />
              স্লাইডার
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-2">
              <Label>ব্যাজ টেক্সট (ঐচ্ছিক)</Label>
              <Input
                value={settings.landing_page_hero_badge_text || ''}
                onChange={(e) => onSettingsChange('landing_page_hero_badge_text', e.target.value)}
                placeholder="🚀 নতুন অফার!"
              />
              <p className="text-xs text-muted-foreground">হিরো টাইটেলের উপরে ছোট ব্যাজ দেখাবে</p>
            </div>

            <div className="space-y-2">
              <Label>হিরো টাইটেল</Label>
              <Input
                value={settings.landing_page_hero_title || ''}
                onChange={(e) => onSettingsChange('landing_page_hero_title', e.target.value)}
                placeholder="দ্রুতগতির ইন্টারনেট আপনার দোরগোড়ায়"
              />
            </div>

            <div className="space-y-2">
              <Label>হিরো সাবটাইটেল</Label>
              <Textarea
                value={settings.landing_page_hero_subtitle || ''}
                onChange={(e) => onSettingsChange('landing_page_hero_subtitle', e.target.value)}
                placeholder="ফাইবার অপটিক প্রযুক্তিতে উচ্চ গতির ব্রডব্যান্ড সংযোগ।"
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Buttons Tab */}
          <TabsContent value="buttons" className="space-y-6">
            <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Badge className="bg-primary">Primary</Badge>
                প্রাইমারি বাটন
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>বাটন টেক্সট</Label>
                  <Input
                    value={settings.landing_page_hero_primary_button_text || ''}
                    onChange={(e) => onSettingsChange('landing_page_hero_primary_button_text', e.target.value)}
                    placeholder="এখনই সংযোগ নিন"
                  />
                </div>
                <div className="space-y-2">
                  <Label>বাটন লিংক</Label>
                  <Input
                    value={settings.landing_page_hero_primary_button_url || ''}
                    onChange={(e) => onSettingsChange('landing_page_hero_primary_button_url', e.target.value)}
                    placeholder="#packages বা https://..."
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Badge variant="outline">Secondary</Badge>
                সেকেন্ডারি বাটন
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>বাটন টেক্সট</Label>
                  <Input
                    value={settings.landing_page_hero_secondary_button_text || ''}
                    onChange={(e) => onSettingsChange('landing_page_hero_secondary_button_text', e.target.value)}
                    placeholder="আরও জানুন"
                  />
                </div>
                <div className="space-y-2">
                  <Label>বাটন লিংক</Label>
                  <Input
                    value={settings.landing_page_hero_secondary_button_url || ''}
                    onChange={(e) => onSettingsChange('landing_page_hero_secondary_button_url', e.target.value)}
                    placeholder="#about বা https://..."
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Background Tab */}
          <TabsContent value="background" className="space-y-4">
            <ImageUploader
              label="হিরো ব্যাকগ্রাউন্ড ইমেজ"
              value={settings.landing_page_hero_background_url || ''}
              onChange={(url) => onSettingsChange('landing_page_hero_background_url', url)}
              aspectRatio="21/9"
              folderPath="hero-backgrounds"
            />
            <p className="text-xs text-muted-foreground">
              সর্বোত্তম মাপ: ১৯২০x৮০০ পিক্সেল। ব্যাকগ্রাউন্ড না দিলে টেমপ্লেটের ডিফল্ট গ্রেডিয়েন্ট ব্যবহার হবে।
            </p>
          </TabsContent>

          {/* Slider Tab */}
          <TabsContent value="slider" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">হিরো স্লাইডার</h4>
                <p className="text-xs text-muted-foreground">একাধিক ইমেজ অটো-রোটেট হবে</p>
              </div>
              <Button variant="outline" size="sm" onClick={addSlide}>
                <Plus className="h-4 w-4 mr-1" />
                স্লাইড যোগ করুন
              </Button>
            </div>

            <div className="space-y-4">
              {(settings.landing_page_hero_slides || []).map((slide, index) => (
                <div key={index} className="p-4 rounded-lg border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">স্লাইড #{index + 1}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSlide(index, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSlide(index, 'down')}
                        disabled={index === (settings.landing_page_hero_slides?.length || 0) - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeSlide(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <ImageUploader
                    label="স্লাইড ইমেজ"
                    value={slide.url}
                    onChange={(url) => updateSlide(index, 'url', url)}
                    folderPath="hero-slides"
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">স্লাইড টাইটেল (ঐচ্ছিক)</Label>
                      <Input
                        value={slide.title || ''}
                        onChange={(e) => updateSlide(index, 'title', e.target.value)}
                        placeholder="স্লাইড শিরোনাম"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">স্লাইড সাবটাইটেল (ঐচ্ছিক)</Label>
                      <Input
                        value={slide.subtitle || ''}
                        onChange={(e) => updateSlide(index, 'subtitle', e.target.value)}
                        placeholder="সংক্ষিপ্ত বিবরণ"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {(!settings.landing_page_hero_slides || settings.landing_page_hero_slides.length === 0) && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>কোনো স্লাইড নেই</p>
                  <p className="text-xs">স্লাইডার ব্যবহার করতে স্লাইড যোগ করুন</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            হিরো সেকশন সেভ করুন
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
