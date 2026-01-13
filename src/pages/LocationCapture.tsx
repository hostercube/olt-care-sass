import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Smartphone, Loader2, CheckCircle, AlertCircle, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  full_address: string | null;
  area: string | null;
  district: string | null;
  thana: string | null;
}

interface IpData {
  ip_address: string | null;
  isp_name: string | null;
  asn: string | null;
}

interface SettingsData {
  id: string;
  tenant_id: string;
  unique_token: string;
  is_active: boolean;
  popup_title: string;
  popup_description: string;
  require_name: boolean;
  require_phone: boolean;
}

export default function LocationCapture() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const hasSubmittedRef = useRef(false);

  const [step, setStep] = useState<'loading' | 'desktop-warning' | 'capturing' | 'form' | 'submitting' | 'success' | 'error'>('loading');
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: null,
    longitude: null,
    full_address: null,
    area: null,
    district: null,
    thana: null,
  });
  const [ipData, setIpData] = useState<IpData>({
    ip_address: null,
    isp_name: null,
    asn: null,
  });
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mobile device detection - checks for real mobile hardware
  const isMobileDevice = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for mobile OS indicators
    const hasMobileOS = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);
    
    // Check touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check for mobile-specific features
    const isMobileBrowser = /mobi|android|touch|mini/i.test(navigator.userAgent);
    
    // Must have mobile indicators
    return hasMobileOS || (hasTouch && isMobileBrowser);
  }, []);

  // Check if running on desktop pretending to be mobile
  const isDesktopDevice = useCallback(() => {
    const ua = navigator.userAgent;
    
    // Clear desktop OS indicators without mobile
    const isDesktopOS = (ua.includes('Windows NT') || ua.includes('Macintosh') || ua.includes('Linux x86_64')) 
      && !ua.includes('Android') && !ua.includes('iPhone') && !ua.includes('iPad');
    
    // Check window dimensions - desktop DevTools typically has large outer window
    const hasLargeOuterWindow = window.outerWidth > 1200 && window.innerWidth < 500;
    
    return isDesktopOS || hasLargeOuterWindow;
  }, []);

  // Get IP info
  const fetchIpInfo = useCallback(async (): Promise<IpData> => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return {
        ip_address: data.ip || null,
        isp_name: data.org || null,
        asn: data.asn || null,
      };
    } catch (error) {
      console.error('Failed to fetch IP info:', error);
      return { ip_address: null, isp_name: null, asn: null };
    }
  }, []);

  // Get address from coordinates using OpenStreetMap
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        return {
          full_address: data.display_name || null,
          area: addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || null,
          district: addr.county || addr.state_district || addr.city || addr.town || null,
          thana: addr.town || addr.municipality || addr.city_district || null,
        };
      }
      return null;
    } catch (error) {
      console.error('Reverse geocode failed:', error);
      return null;
    }
  }, []);

  // Get GPS location
  const getLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      });
    });
  }, []);

  // Submit location to database
  const submitLocationData = useCallback(async (
    settingsData: SettingsData,
    location: LocationData,
    ip: IpData,
    form?: { name?: string; phone?: string }
  ) => {
    if (hasSubmittedRef.current) return; // Prevent duplicate submissions
    hasSubmittedRef.current = true;
    
    setIsSubmitting(true);
    setStep('submitting');
    
    try {
      const { error: insertError } = await supabase
        .from('location_visits')
        .insert({
          token: settingsData.unique_token,
          tenant_id: settingsData.tenant_id,
          latitude: location.latitude,
          longitude: location.longitude,
          full_address: location.full_address,
          area: location.area,
          district: location.district,
          thana: location.thana,
          ip_address: ip.ip_address,
          isp_name: ip.isp_name,
          asn: ip.asn,
          device_type: 'mobile',
          name: form?.name || null,
          phone: form?.phone || null,
          verified_status: 'pending',
          visited_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;
      setStep('success');
    } catch (err: any) {
      console.error('Failed to submit location:', err);
      toast({
        title: 'Error',
        description: 'Failed to submit location. Please try again.',
        variant: 'destructive',
      });
      setStep('form');
      hasSubmittedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      if (!token) {
        setStep('error');
        setError('Invalid link');
        return;
      }

      // Check device type
      if (!isMobileDevice() || isDesktopDevice()) {
        setStep('desktop-warning');
        return;
      }

      // Fetch settings directly from Supabase
      try {
        const { data, error: fetchError } = await supabase
          .from('tenant_location_settings')
          .select('*')
          .eq('unique_token', token)
          .eq('is_active', true)
          .maybeSingle();

        if (fetchError) throw fetchError;
        
        if (!data) {
          setStep('error');
          setError('This link is invalid or has been disabled');
          return;
        }
        
        setSettings(data as SettingsData);
        setStep('capturing');
      } catch (err) {
        console.error('Settings fetch error:', err);
        setStep('error');
        setError('Failed to load. Please try again.');
      }
    };

    init();
  }, [token, isMobileDevice, isDesktopDevice]);

  // Capture location when on capturing step
  useEffect(() => {
    if (step !== 'capturing' || !settings) return;

    const captureAndProcess = async () => {
      let capturedLocation: LocationData = { ...locationData };
      let capturedIp: IpData = { ...ipData };

      try {
        // Fetch IP info and GPS in parallel
        const [ipResult, position] = await Promise.all([
          fetchIpInfo(),
          getLocation().catch(err => {
            console.warn('GPS failed:', err);
            return null;
          })
        ]);

        capturedIp = ipResult;
        setIpData(ipResult);

        if (position) {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode
          const addressData = await reverseGeocode(latitude, longitude);

          capturedLocation = {
            latitude,
            longitude,
            full_address: addressData?.full_address || null,
            area: addressData?.area || null,
            district: addressData?.district || null,
            thana: addressData?.thana || null,
          };
          setLocationData(capturedLocation);
        }
      } catch (err) {
        console.error('Location capture error:', err);
      }

      // Check if form is required
      const needsForm = settings.require_name || settings.require_phone;
      
      if (needsForm) {
        // Show form for user to fill
        setStep('form');
      } else {
        // Auto-submit immediately
        await submitLocationData(settings, capturedLocation, capturedIp);
      }
    };

    captureAndProcess();
  }, [step, settings, fetchIpInfo, getLocation, reverseGeocode, submitLocationData, locationData, ipData]);

  // Handle form submit
  const handleFormSubmit = async () => {
    if (!settings) return;
    
    // Validate required fields
    if (settings.require_name && !formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    if (settings.require_phone && !formData.phone.trim()) {
      toast({ title: 'Error', description: 'Phone is required', variant: 'destructive' });
      return;
    }

    await submitLocationData(settings, locationData, ipData, {
      name: formData.name.trim() || undefined,
      phone: formData.phone.trim() || undefined,
    });
  };

  // Render based on step
  if (step === 'loading' || step === 'submitting') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {step === 'submitting' ? 'Submitting your location...' : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'desktop-warning') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-yellow-100 p-4 dark:bg-yellow-900/20">
              <Monitor className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle>মোবাইল ফোন প্রয়োজন</CardTitle>
            <CardDescription>
              এই লিংকটি শুধুমাত্র মোবাইল ফোন থেকে ওপেন করতে হবে
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <Smartphone className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Please open this link on your smartphone to capture your GPS location.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              📱 WhatsApp বা SMS এ আসা লিংকটি সরাসরি আপনার ফোনে ট্যাপ করে ওপেন করুন
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'capturing') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4">
              <MapPin className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <CardTitle>লোকেশন সংগ্রহ করা হচ্ছে</CardTitle>
            <CardDescription>
              অনুগ্রহ করে লোকেশন পারমিশন দিন
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Getting your GPS coordinates...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-green-100 p-4 dark:bg-green-900/20">
              <MapPin className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>{settings?.popup_title || 'লোকেশন সংগ্রহ হয়েছে!'}</CardTitle>
            <CardDescription>
              {settings?.popup_description || 'Please provide your details'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationData.latitude && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">
                  📍 {locationData.full_address || `${locationData.area || ''} ${locationData.district || ''}`.trim() || 'Location captured'}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="name">
                  নাম {settings?.require_name && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="name"
                  placeholder="আপনার নাম লিখুন"
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="phone">
                  মোবাইল নম্বর {settings?.require_phone && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="আপনার মোবাইল নম্বর লিখুন"
                  value={formData.phone}
                  onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={handleFormSubmit} 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    সাবমিট হচ্ছে...
                  </>
                ) : (
                  'সাবমিট করুন'
                )}
              </Button>
              
              {!settings?.require_name && !settings?.require_phone && (
                <Button 
                  variant="ghost" 
                  onClick={() => submitLocationData(settings!, locationData, ipData)}
                  disabled={isSubmitting}
                >
                  Skip
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-green-100 p-4 dark:bg-green-900/20">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>ধন্যবাদ!</CardTitle>
            <CardDescription>
              আপনার লোকেশন সফলভাবে সাবমিট হয়েছে
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              আপনি এই পেজটি বন্ধ করতে পারেন
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/20">
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle>ত্রুটি হয়েছে</CardTitle>
          <CardDescription>
            {error || 'Something went wrong'}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
