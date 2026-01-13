import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePublicLocationCapture } from '@/hooks/useCustomerLocation';
import { MapPin, Smartphone, Loader2, CheckCircle, AlertCircle, Monitor } from 'lucide-react';

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

export default function LocationCapture() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const { fetchSettingsByToken, submitLocation, isSubmitting } = usePublicLocationCapture();

  const [step, setStep] = useState<'loading' | 'desktop-warning' | 'capturing' | 'form' | 'success' | 'error'>('loading');
  const [settings, setSettings] = useState<any>(null);
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

  // Strict mobile device detection - prevents desktop browsers with mobile view
  const isTrueMobileDevice = useCallback(() => {
    // Check user agent for mobile devices
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
    const hasMobileUA = mobileKeywords.test(userAgent);
    
    // Check touch capability (most mobiles have touch)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check screen size - mobile devices typically have smaller screens
    const isSmallScreen = window.screen.width <= 768;
    
    // Check if running in a mobile browser (not just responsive mode)
    const isMobileBrowser = /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Must have mobile UA AND (touch + small screen OR be a mobile browser)
    // This prevents desktop Chrome DevTools mobile simulation
    return hasMobileUA && (hasTouch || isMobileBrowser) && isSmallScreen;
  }, []);

  // Additional check for desktop pretending to be mobile
  const isDesktopPretendingMobile = useCallback(() => {
    const ua = navigator.userAgent;
    
    // Check for desktop browser indicators even in mobile view
    const hasDesktopIndicators = 
      (ua.includes('Windows') || ua.includes('Macintosh') || ua.includes('Linux x86')) &&
      !ua.includes('Android') && !ua.includes('iPhone') && !ua.includes('iPad');
    
    // Desktop browsers have larger outer dimensions
    const hasLargeOuterWindow = window.outerWidth > 1024;
    
    return hasDesktopIndicators || hasLargeOuterWindow;
  }, []);

  // Get IP info
  const fetchIpInfo = useCallback(async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      setIpData({
        ip_address: data.ip || null,
        isp_name: data.org || null,
        asn: data.asn || null,
      });
      return data;
    } catch (error) {
      console.error('Failed to fetch IP info:', error);
      return null;
    }
  }, []);

  // Get address from coordinates using reverse geocoding (OpenStreetMap - Free)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          }
        }
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
  const getLocation = useCallback(() => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
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

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      if (!token) {
        setStep('error');
        setError('Invalid link');
        return;
      }

      // Strict mobile check - must be true mobile device
      if (!isTrueMobileDevice() || isDesktopPretendingMobile()) {
        setStep('desktop-warning');
        return;
      }

      // Fetch settings
      try {
        const data = await fetchSettingsByToken(token);
        if (!data) {
          setStep('error');
          setError('This link is invalid or has been disabled');
          return;
        }
        setSettings(data);
        setStep('capturing');
      } catch (err) {
        setStep('error');
        setError('Failed to load. Please try again.');
        return;
      }
    };

    init();
  }, [token, isTrueMobileDevice, isDesktopPretendingMobile, fetchSettingsByToken]);

  // Capture location when on capturing step
  useEffect(() => {
    if (step !== 'capturing' || !settings) return;

    const captureLocation = async () => {
      try {
        // Fetch IP info in parallel
        fetchIpInfo();

        // Get GPS location
        const position = await getLocation();
        const { latitude, longitude } = position.coords;

        // Reverse geocode using OpenStreetMap
        const addressData = await reverseGeocode(latitude, longitude);

        setLocationData({
          latitude,
          longitude,
          full_address: addressData?.full_address || null,
          area: addressData?.area || null,
          district: addressData?.district || null,
          thana: addressData?.thana || null,
        });

        setStep('form');
      } catch (err: any) {
        console.error('Location capture error:', err);
        
        // Still proceed to form even if location fails
        setStep('form');
      }
    };

    captureLocation();
  }, [step, settings, getLocation, reverseGeocode, fetchIpInfo]);

  // Submit location data
  const handleSubmit = async (skipForm: boolean = false) => {
    if (!settings || !token) return;

    try {
      await submitLocation({
        token,
        tenant_id: settings.tenant_id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        full_address: locationData.full_address,
        area: locationData.area,
        district: locationData.district,
        thana: locationData.thana,
        ip_address: ipData.ip_address,
        isp_name: ipData.isp_name,
        asn: ipData.asn,
        device_type: 'mobile',
        name: skipForm ? undefined : formData.name || undefined,
        phone: skipForm ? undefined : formData.phone || undefined,
      });

      setStep('success');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to submit location. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Render based on step
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading...</p>
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
            <CardTitle>Mobile Device Required</CardTitle>
            <CardDescription>
              এই লিংকটি শুধুমাত্র মোবাইল ফোন থেকে ওপেন করতে হবে
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <Smartphone className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Please open this link on your smartphone to capture your GPS location.
                Desktop browsers and emulators are not supported.
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
            <CardTitle>Capturing Location</CardTitle>
            <CardDescription>
              Please allow location access when prompted
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
    const requiresName = settings?.require_name;
    const requiresPhone = settings?.require_phone;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-green-100 p-4 dark:bg-green-900/20">
              <MapPin className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>{settings?.popup_title || 'Location Captured!'}</CardTitle>
            <CardDescription>
              {settings?.popup_description || 'Please provide your details (optional)'}
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
                  Name {requiresName && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="phone">
                  Phone Number {requiresPhone && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={() => handleSubmit(false)} 
                disabled={isSubmitting || (requiresName && !formData.name) || (requiresPhone && !formData.phone)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
              
              {!requiresName && !requiresPhone && (
                <Button 
                  variant="ghost" 
                  onClick={() => handleSubmit(true)}
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
            <CardTitle>ধন্যবাদ! Thank You!</CardTitle>
            <CardDescription>
              Your location has been submitted successfully
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
          <CardTitle>Error</CardTitle>
          <CardDescription>
            {error || 'Something went wrong'}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}