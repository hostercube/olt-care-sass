import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link as LinkIcon, Loader2, X, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  bucketName?: string;
  folderPath?: string;
  maxSizeMB?: number;
  aspectRatio?: string;
  className?: string;
}

export function ImageUploader({
  value,
  onChange,
  label = 'ইমেজ',
  placeholder = 'https://example.com/image.jpg',
  bucketName = 'tenant-assets',
  folderPath = 'landing-sections',
  maxSizeMB = 5,
  aspectRatio,
  className = ''
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`ফাইল সাইজ ${maxSizeMB}MB এর বেশি হতে পারবে না`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('শুধুমাত্র ইমেজ ফাইল আপলোড করা যাবে');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${folderPath}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      onChange(urlData.publicUrl);
      toast.success('ইমেজ আপলোড সফল হয়েছে');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'ইমেজ আপলোড করতে সমস্যা হয়েছে');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearImage = () => {
    onChange('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label>{label}</Label>}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="url" className="text-xs">
            <LinkIcon className="h-3 w-3 mr-1" />
            URL
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-xs">
            <Upload className="h-3 w-3 mr-1" />
            আপলোড
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="url" className="mt-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        </TabsContent>
        
        <TabsContent value="upload" className="mt-2">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  আপলোড হচ্ছে...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  ফাইল সিলেক্ট করুন
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            সর্বোচ্চ {maxSizeMB}MB • JPG, PNG, GIF, WebP
          </p>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      {value && (
        <div className="relative mt-2 group">
          <div 
            className="relative rounded-lg overflow-hidden border bg-muted/30"
            style={{ aspectRatio: aspectRatio || 'auto' }}
          >
            <img 
              src={value} 
              alt="Preview" 
              className="w-full h-32 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={clearImage}
              >
                <X className="h-4 w-4 mr-1" />
                সরান
              </Button>
            </div>
          </div>
        </div>
      )}

      {!value && (
        <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed bg-muted/20">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">কোন ইমেজ নেই</p>
          </div>
        </div>
      )}
    </div>
  );
}
