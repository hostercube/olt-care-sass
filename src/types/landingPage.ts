// Landing Page Types and Configurations

export interface CustomMenuItem {
  id: string;
  label: string;
  url: string;
  icon?: string;
  openNewTab?: boolean;
  subMenus?: { id?: string; label: string; url: string }[];
}

export interface FTPServer {
  id: string;
  name: string;
  url: string;
}

export interface LiveTVChannel {
  id: string;
  name: string;
  url: string;
}

// Advanced layout options for custom sections
export interface SectionLayoutOptions {
  layout: 'full' | 'container' | 'narrow' | 'wide';
  alignment: 'left' | 'center' | 'right';
  direction: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  gap: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  columns: 1 | 2 | 3 | 4 | 6;
  padding: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  margin: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  minHeight: 'auto' | 'screen-half' | 'screen-75' | 'screen-full';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  backgroundStyle: 'solid' | 'gradient' | 'image' | 'pattern';
  gradientDirection: 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-br' | 'to-bl' | 'to-tr' | 'to-tl';
  gradientFrom?: string;
  gradientTo?: string;
  backgroundImage?: string;
  backgroundOverlay?: string;
  backgroundPosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backgroundSize: 'cover' | 'contain' | 'auto';
}

// Enhanced custom section with advanced options
export interface CustomSection {
  id: string;
  type: 'hero' | 'text' | 'image' | 'cta' | 'features' | 'custom' | 'gallery' | 'video' | 'testimonial' | 'faq' | 'stats' | 'pricing' | 'team' | 'contact' | 'slider' | 'banner';
  title: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  items?: SectionItem[];
  order: number;
  isVisible: boolean;
  // Advanced layout options
  layout?: Partial<SectionLayoutOptions>;
  animation?: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom' | 'bounce';
  style?: 'default' | 'card' | 'minimal' | 'bold' | 'elegant' | 'modern' | 'retro';
}

export interface SectionItem {
  id?: string;
  title: string;
  description: string;
  icon?: string;
  imageUrl?: string;
  url?: string;
  value?: string;
  subtitle?: string;
}

// Template configurations with unique visual identity
export interface TemplateConfig {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  preview: string;
  category: string;
  features: string[];
  // Header styles
  headerClass: string;
  headerTextClass: string;
  headerLogoClass: string;
  // Hero styles
  heroClass: string;
  heroTextClass: string;
  heroSubtextClass: string;
  heroLayout: 'centered' | 'left' | 'right' | 'split';
  heroAnimation: string;
  // Section styles
  sectionBgClass: string;
  sectionAltBgClass: string;
  // Card styles
  cardClass: string;
  cardHoverClass: string;
  cardBorderClass: string;
  // Button styles
  primaryButtonClass: string;
  secondaryButtonClass: string;
  // Badge styles
  badgeClass: string;
  // Typography
  headingClass: string;
  subheadingClass: string;
  paragraphClass: string;
  // Effects
  glowClass: string;
  shadowClass: string;
  // Theme
  isDark: boolean;
  // Unique features
  hasGlassEffect: boolean;
  hasGradientText: boolean;
  hasAnimatedBg: boolean;
  patternOverlay?: string;
}

// Enhanced templates with distinct visual identities
export const ENHANCED_TEMPLATES: Record<string, TemplateConfig> = {
  'isp-pro-1': {
    id: 'isp-pro-1',
    name: 'NetStream Pro',
    nameBn: 'নেটস্ট্রিম প্রো',
    description: 'Modern professional ISP design with gradient cards',
    descriptionBn: 'আধুনিক ও প্রফেশনাল ISP ডিজাইন',
    preview: 'bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800',
    category: 'professional',
    features: ['Animated Hero', 'Glass Cards', 'Gradient Accents', 'Modern Typography'],
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm',
    headerTextClass: 'text-gray-900',
    headerLogoClass: 'h-12',
    heroClass: 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-blue-200',
    heroLayout: 'centered',
    heroAnimation: 'animate-fade-in',
    sectionBgClass: 'bg-gray-50',
    sectionAltBgClass: 'bg-white',
    cardClass: 'bg-white shadow-xl hover:shadow-2xl transition-all duration-500 border-0 rounded-2xl',
    cardHoverClass: 'hover:-translate-y-2 hover:shadow-blue-200/50',
    cardBorderClass: 'border-t-4 border-t-blue-500',
    primaryButtonClass: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30',
    secondaryButtonClass: 'border-blue-500 text-blue-600 hover:bg-blue-50',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-0',
    headingClass: 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent',
    subheadingClass: 'text-gray-600',
    paragraphClass: 'text-gray-600',
    glowClass: 'shadow-lg shadow-blue-500/20',
    shadowClass: 'shadow-2xl',
    isDark: false,
    hasGlassEffect: true,
    hasGradientText: true,
    hasAnimatedBg: true,
    patternOverlay: 'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.1) 0%, transparent 50%)'
  },
  'isp-corporate': {
    id: 'isp-corporate',
    name: 'Corporate Elite',
    nameBn: 'কর্পোরেট এলিট',
    description: 'Clean corporate style with dark elegance',
    descriptionBn: 'ক্লিন ও প্রফেশনাল কর্পোরেট স্টাইল',
    preview: 'bg-gradient-to-br from-slate-800 via-slate-900 to-black',
    category: 'corporate',
    features: ['Dark Theme', 'Minimal Design', 'Trust Badges', 'Professional Look'],
    headerClass: 'bg-slate-900/95 backdrop-blur-xl border-b border-white/10',
    headerTextClass: 'text-white',
    headerLogoClass: 'h-12 brightness-0 invert',
    heroClass: 'bg-gradient-to-br from-slate-900 via-gray-900 to-black',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-gray-300',
    heroLayout: 'split',
    heroAnimation: 'animate-slide-in',
    sectionBgClass: 'bg-slate-900',
    sectionAltBgClass: 'bg-slate-950',
    cardClass: 'bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all rounded-xl',
    cardHoverClass: 'hover:border-white/30',
    cardBorderClass: 'border-l-4 border-l-cyan-500',
    primaryButtonClass: 'bg-white text-slate-900 hover:bg-gray-100 shadow-lg',
    secondaryButtonClass: 'border-white/30 text-white hover:bg-white/10',
    badgeClass: 'bg-white/10 text-white border-white/20',
    headingClass: 'text-white',
    subheadingClass: 'text-gray-400',
    paragraphClass: 'text-gray-400',
    glowClass: 'shadow-lg shadow-white/5',
    shadowClass: 'shadow-2xl shadow-black/50',
    isDark: true,
    hasGlassEffect: true,
    hasGradientText: false,
    hasAnimatedBg: false
  },
  'isp-vibrant': {
    id: 'isp-vibrant',
    name: 'Vibrant Wave',
    nameBn: 'ভাইব্র্যান্ট ওয়েভ',
    description: 'Bold and colorful theme with wave effects',
    descriptionBn: 'উজ্জ্বল ও আকর্ষণীয় রঙের থিম',
    preview: 'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700',
    category: 'vibrant',
    features: ['Wave Animations', 'Bold Typography', 'Gradient Cards', 'Icon Features'],
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-cyan-100 shadow-sm',
    headerTextClass: 'text-gray-900',
    headerLogoClass: 'h-12',
    heroClass: 'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 relative overflow-hidden',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-cyan-100',
    heroLayout: 'centered',
    heroAnimation: 'animate-fade-in',
    sectionBgClass: 'bg-gradient-to-b from-gray-50 to-white',
    sectionAltBgClass: 'bg-white',
    cardClass: 'bg-white shadow-xl hover:shadow-2xl transition-all border border-gray-100 rounded-3xl overflow-hidden',
    cardHoverClass: 'hover:-translate-y-3 hover:rotate-1',
    cardBorderClass: 'border-t-4 border-t-gradient-to-r from-cyan-500 to-blue-500',
    primaryButtonClass: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/30 rounded-full',
    secondaryButtonClass: 'border-cyan-500 text-cyan-600 hover:bg-cyan-50 rounded-full',
    badgeClass: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-700 border-0',
    headingClass: 'bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent',
    subheadingClass: 'text-gray-600',
    paragraphClass: 'text-gray-600',
    glowClass: 'shadow-lg shadow-cyan-500/30',
    shadowClass: 'shadow-2xl shadow-cyan-500/20',
    isDark: false,
    hasGlassEffect: false,
    hasGradientText: true,
    hasAnimatedBg: true,
    patternOverlay: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1440 320\'%3E%3Cpath fill=\'%23ffffff\' fill-opacity=\'0.1\' d=\'M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,165.3C1248,171,1344,213,1392,234.7L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z\'%3E%3C/path%3E%3C/svg%3E")'
  },
  'isp-gaming': {
    id: 'isp-gaming',
    name: 'Turbo Gamer',
    nameBn: 'টার্বো গেমার',
    description: 'Gaming and tech style with neon effects',
    descriptionBn: 'গেমিং ও টেক স্টাইল ডার্ক থিম',
    preview: 'bg-gradient-to-br from-purple-900 via-violet-900 to-fuchsia-900',
    category: 'gaming',
    features: ['Neon Effects', 'Speed Focus', 'Gamer Friendly', 'Dark Theme'],
    headerClass: 'bg-purple-950/95 backdrop-blur-xl border-b border-purple-500/20',
    headerTextClass: 'text-white',
    headerLogoClass: 'h-12 brightness-0 invert',
    heroClass: 'bg-gradient-to-br from-purple-950 via-violet-950 to-fuchsia-950 relative overflow-hidden',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-purple-200',
    heroLayout: 'left',
    heroAnimation: 'animate-slide-in',
    sectionBgClass: 'bg-purple-950',
    sectionAltBgClass: 'bg-violet-950',
    cardClass: 'bg-purple-900/50 backdrop-blur-md border border-purple-500/20 hover:border-purple-500/50 transition-all rounded-2xl',
    cardHoverClass: 'hover:shadow-lg hover:shadow-purple-500/20',
    cardBorderClass: 'border-l-4 border-l-fuchsia-500',
    primaryButtonClass: 'bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white shadow-lg shadow-purple-500/40 rounded-xl',
    secondaryButtonClass: 'border-purple-400 text-purple-300 hover:bg-purple-500/20 rounded-xl',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    headingClass: 'bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent',
    subheadingClass: 'text-purple-300',
    paragraphClass: 'text-purple-200',
    glowClass: 'shadow-lg shadow-purple-500/30',
    shadowClass: 'shadow-2xl shadow-purple-500/20',
    isDark: true,
    hasGlassEffect: true,
    hasGradientText: true,
    hasAnimatedBg: true,
    patternOverlay: 'radial-gradient(circle at 30% 20%, rgba(168,85,247,0.15) 0%, transparent 40%)'
  },
  'modern-blue': {
    id: 'modern-blue',
    name: 'Classic Blue',
    nameBn: 'ক্লাসিক ব্লু',
    description: 'Timeless blue gradient design',
    descriptionBn: 'ক্লাসিক নীল গ্রেডিয়েন্ট',
    preview: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900',
    category: 'classic',
    features: ['Minimal Design', 'Professional Look', 'Easy to Read'],
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-gray-100',
    headerTextClass: 'text-gray-900',
    headerLogoClass: 'h-12',
    heroClass: 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-blue-100',
    heroLayout: 'centered',
    heroAnimation: 'animate-fade-in',
    sectionBgClass: 'bg-gray-50',
    sectionAltBgClass: 'bg-white',
    cardClass: 'bg-white shadow-xl shadow-gray-200/50 border-0 hover:shadow-2xl transition-shadow rounded-xl',
    cardHoverClass: 'hover:-translate-y-1',
    cardBorderClass: '',
    primaryButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg',
    secondaryButtonClass: 'border-blue-600 text-blue-600 hover:bg-blue-50',
    badgeClass: 'bg-blue-100 text-blue-700',
    headingClass: 'text-gray-900',
    subheadingClass: 'text-gray-600',
    paragraphClass: 'text-gray-600',
    glowClass: '',
    shadowClass: 'shadow-xl',
    isDark: false,
    hasGlassEffect: false,
    hasGradientText: false,
    hasAnimatedBg: false
  },
  'clean-white': {
    id: 'clean-white',
    name: 'Pure White',
    nameBn: 'পিওর হোয়াইট',
    description: 'Minimal and clean light theme',
    descriptionBn: 'মিনিমাল ও ক্লিন লাইট থিম',
    preview: 'bg-gradient-to-br from-gray-100 to-white border-2 border-gray-200',
    category: 'minimal',
    features: ['Light Theme', 'Clean UI', 'Modern Typography'],
    headerClass: 'bg-white shadow-sm border-b border-gray-100',
    headerTextClass: 'text-gray-900',
    headerLogoClass: 'h-12',
    heroClass: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
    heroTextClass: 'text-gray-900',
    heroSubtextClass: 'text-gray-600',
    heroLayout: 'split',
    heroAnimation: 'animate-fade-in',
    sectionBgClass: 'bg-gray-50',
    sectionAltBgClass: 'bg-white',
    cardClass: 'bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow rounded-xl',
    cardHoverClass: 'hover:border-gray-200',
    cardBorderClass: '',
    primaryButtonClass: 'bg-gray-900 hover:bg-gray-800 text-white',
    secondaryButtonClass: 'border-gray-300 text-gray-700 hover:bg-gray-50',
    badgeClass: 'bg-gray-100 text-gray-700',
    headingClass: 'text-gray-900',
    subheadingClass: 'text-gray-600',
    paragraphClass: 'text-gray-600',
    glowClass: '',
    shadowClass: 'shadow-lg',
    isDark: false,
    hasGlassEffect: false,
    hasGradientText: false,
    hasAnimatedBg: false
  },
  'dark-gradient': {
    id: 'dark-gradient',
    name: 'Midnight Elegance',
    nameBn: 'মিডনাইট এলিগ্যান্স',
    description: 'Dark elegant premium theme',
    descriptionBn: 'ডার্ক ও এলিগেন্ট প্রিমিয়াম থিম',
    preview: 'bg-gradient-to-br from-gray-900 via-purple-950 to-black',
    category: 'dark',
    features: ['Dark Mode', 'Purple Accents', 'Premium Feel'],
    headerClass: 'bg-gray-900/95 backdrop-blur-xl border-b border-white/10',
    headerTextClass: 'text-white',
    headerLogoClass: 'h-12 brightness-0 invert',
    heroClass: 'bg-gradient-to-br from-gray-900 via-purple-950 to-black',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-purple-200',
    heroLayout: 'centered',
    heroAnimation: 'animate-fade-in',
    sectionBgClass: 'bg-gray-900',
    sectionAltBgClass: 'bg-gray-950',
    cardClass: 'bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-all rounded-2xl',
    cardHoverClass: 'hover:border-purple-500/30',
    cardBorderClass: '',
    primaryButtonClass: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30',
    secondaryButtonClass: 'border-white/30 text-white hover:bg-white/10',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-0',
    headingClass: 'text-white',
    subheadingClass: 'text-gray-400',
    paragraphClass: 'text-gray-400',
    glowClass: 'shadow-lg shadow-purple-500/20',
    shadowClass: 'shadow-2xl',
    isDark: true,
    hasGlassEffect: true,
    hasGradientText: false,
    hasAnimatedBg: true
  },
  'nature-green': {
    id: 'nature-green',
    name: 'Eco Fresh',
    nameBn: 'ইকো ফ্রেশ',
    description: 'Nature inspired green theme',
    descriptionBn: 'প্রকৃতি অনুপ্রাণিত সবুজ থিম',
    preview: 'bg-gradient-to-br from-emerald-700 via-green-800 to-teal-900',
    category: 'nature',
    features: ['Fresh Colors', 'Natural Feel', 'Trust Building'],
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-emerald-100',
    headerTextClass: 'text-gray-900',
    headerLogoClass: 'h-12',
    heroClass: 'bg-gradient-to-br from-emerald-800 via-green-900 to-teal-900',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-emerald-100',
    heroLayout: 'left',
    heroAnimation: 'animate-fade-in',
    sectionBgClass: 'bg-emerald-50',
    sectionAltBgClass: 'bg-white',
    cardClass: 'bg-white shadow-xl shadow-emerald-200/30 border-0 hover:shadow-2xl transition-shadow rounded-2xl',
    cardHoverClass: 'hover:-translate-y-2',
    cardBorderClass: 'border-t-4 border-t-emerald-500',
    primaryButtonClass: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30',
    secondaryButtonClass: 'border-emerald-500 text-emerald-600 hover:bg-emerald-50',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border-0',
    headingClass: 'text-emerald-800',
    subheadingClass: 'text-gray-600',
    paragraphClass: 'text-gray-600',
    glowClass: 'shadow-lg shadow-emerald-500/20',
    shadowClass: 'shadow-xl shadow-emerald-200/50',
    isDark: false,
    hasGlassEffect: false,
    hasGradientText: false,
    hasAnimatedBg: false
  },
  'sunset-orange': {
    id: 'sunset-orange',
    name: 'Sunset Glow',
    nameBn: 'সানসেট গ্লো',
    description: 'Warm and attractive orange theme',
    descriptionBn: 'উষ্ণ ও আকর্ষণীয় কমলা থিম',
    preview: 'bg-gradient-to-br from-orange-600 via-red-600 to-rose-700',
    category: 'warm',
    features: ['Warm Colors', 'Energetic', 'Attention Grabbing'],
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-orange-100',
    headerTextClass: 'text-gray-900',
    headerLogoClass: 'h-12',
    heroClass: 'bg-gradient-to-br from-orange-600 via-red-600 to-rose-700',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-orange-100',
    heroLayout: 'right',
    heroAnimation: 'animate-slide-in',
    sectionBgClass: 'bg-orange-50',
    sectionAltBgClass: 'bg-white',
    cardClass: 'bg-white shadow-xl shadow-orange-200/30 border-0 hover:shadow-2xl transition-shadow rounded-2xl',
    cardHoverClass: 'hover:-translate-y-2 hover:rotate-1',
    cardBorderClass: 'border-t-4 border-t-orange-500',
    primaryButtonClass: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/30 rounded-full',
    secondaryButtonClass: 'border-orange-500 text-orange-600 hover:bg-orange-50 rounded-full',
    badgeClass: 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-700 border-0',
    headingClass: 'bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent',
    subheadingClass: 'text-gray-600',
    paragraphClass: 'text-gray-600',
    glowClass: 'shadow-lg shadow-orange-500/30',
    shadowClass: 'shadow-xl shadow-orange-200/50',
    isDark: false,
    hasGlassEffect: false,
    hasGradientText: true,
    hasAnimatedBg: true
  },
  'ocean-teal': {
    id: 'ocean-teal',
    name: 'Ocean Breeze',
    nameBn: 'ওশান ব্রিজ',
    description: 'Calm and professional teal theme',
    descriptionBn: 'শান্ত ও পেশাদার টিল থিম',
    preview: 'bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800',
    category: 'cool',
    features: ['Cool Colors', 'Calming', 'Professional'],
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-teal-100',
    headerTextClass: 'text-gray-900',
    headerLogoClass: 'h-12',
    heroClass: 'bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-teal-100',
    heroLayout: 'centered',
    heroAnimation: 'animate-fade-in',
    sectionBgClass: 'bg-teal-50',
    sectionAltBgClass: 'bg-white',
    cardClass: 'bg-white shadow-xl shadow-teal-200/30 border-0 hover:shadow-2xl transition-shadow rounded-2xl',
    cardHoverClass: 'hover:-translate-y-2',
    cardBorderClass: 'border-b-4 border-b-teal-500',
    primaryButtonClass: 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/30',
    secondaryButtonClass: 'border-teal-500 text-teal-600 hover:bg-teal-50',
    badgeClass: 'bg-teal-500/10 text-teal-700 border-0',
    headingClass: 'text-teal-800',
    subheadingClass: 'text-gray-600',
    paragraphClass: 'text-gray-600',
    glowClass: 'shadow-lg shadow-teal-500/20',
    shadowClass: 'shadow-xl shadow-teal-200/50',
    isDark: false,
    hasGlassEffect: false,
    hasGradientText: false,
    hasAnimatedBg: false
  },
};

// Layout option utilities
export const LAYOUT_OPTIONS = {
  layouts: [
    { id: 'full', label: 'Full Width', labelBn: 'সম্পূর্ণ প্রস্থ' },
    { id: 'container', label: 'Container', labelBn: 'কন্টেইনার' },
    { id: 'narrow', label: 'Narrow', labelBn: 'সরু' },
    { id: 'wide', label: 'Wide', labelBn: 'চওড়া' },
  ],
  alignments: [
    { id: 'left', label: 'Left', labelBn: 'বামে' },
    { id: 'center', label: 'Center', labelBn: 'মাঝে' },
    { id: 'right', label: 'Right', labelBn: 'ডানে' },
  ],
  directions: [
    { id: 'row', label: 'Horizontal', labelBn: 'আনুভূমিক' },
    { id: 'column', label: 'Vertical', labelBn: 'উল্লম্ব' },
    { id: 'row-reverse', label: 'Horizontal Reverse', labelBn: 'আনুভূমিক বিপরীত' },
    { id: 'column-reverse', label: 'Vertical Reverse', labelBn: 'উল্লম্ব বিপরীত' },
  ],
  gaps: [
    { id: 'none', label: 'None', value: '0' },
    { id: 'sm', label: 'Small', value: '1rem' },
    { id: 'md', label: 'Medium', value: '1.5rem' },
    { id: 'lg', label: 'Large', value: '2rem' },
    { id: 'xl', label: 'Extra Large', value: '3rem' },
  ],
  columns: [1, 2, 3, 4, 6],
  paddings: [
    { id: 'none', label: 'None', class: 'p-0' },
    { id: 'sm', label: 'Small', class: 'py-8' },
    { id: 'md', label: 'Medium', class: 'py-12' },
    { id: 'lg', label: 'Large', class: 'py-16 lg:py-20' },
    { id: 'xl', label: 'Extra Large', class: 'py-20 lg:py-28' },
  ],
  minHeights: [
    { id: 'auto', label: 'Auto', class: '' },
    { id: 'screen-half', label: '50% Screen', class: 'min-h-[50vh]' },
    { id: 'screen-75', label: '75% Screen', class: 'min-h-[75vh]' },
    { id: 'screen-full', label: 'Full Screen', class: 'min-h-screen' },
  ],
  borderRadius: [
    { id: 'none', label: 'None', class: 'rounded-none' },
    { id: 'sm', label: 'Small', class: 'rounded-sm' },
    { id: 'md', label: 'Medium', class: 'rounded-md' },
    { id: 'lg', label: 'Large', class: 'rounded-lg' },
    { id: 'xl', label: 'XL', class: 'rounded-xl' },
    { id: '2xl', label: '2XL', class: 'rounded-2xl' },
    { id: '3xl', label: '3XL', class: 'rounded-3xl' },
  ],
  shadows: [
    { id: 'none', label: 'None', class: '' },
    { id: 'sm', label: 'Small', class: 'shadow-sm' },
    { id: 'md', label: 'Medium', class: 'shadow-md' },
    { id: 'lg', label: 'Large', class: 'shadow-lg' },
    { id: 'xl', label: 'XL', class: 'shadow-xl' },
    { id: '2xl', label: '2XL', class: 'shadow-2xl' },
  ],
  animations: [
    { id: 'none', label: 'None', labelBn: 'কোন এনিমেশন নেই' },
    { id: 'fade', label: 'Fade In', labelBn: 'ফেড ইন' },
    { id: 'slide-up', label: 'Slide Up', labelBn: 'স্লাইড আপ' },
    { id: 'slide-down', label: 'Slide Down', labelBn: 'স্লাইড ডাউন' },
    { id: 'slide-left', label: 'Slide Left', labelBn: 'স্লাইড লেফট' },
    { id: 'slide-right', label: 'Slide Right', labelBn: 'স্লাইড রাইট' },
    { id: 'zoom', label: 'Zoom In', labelBn: 'জুম ইন' },
    { id: 'bounce', label: 'Bounce', labelBn: 'বাউন্স' },
  ],
  styles: [
    { id: 'default', label: 'Default', labelBn: 'ডিফল্ট' },
    { id: 'card', label: 'Card Style', labelBn: 'কার্ড স্টাইল' },
    { id: 'minimal', label: 'Minimal', labelBn: 'মিনিমাল' },
    { id: 'bold', label: 'Bold', labelBn: 'বোল্ড' },
    { id: 'elegant', label: 'Elegant', labelBn: 'এলিগেন্ট' },
    { id: 'modern', label: 'Modern', labelBn: 'মডার্ন' },
    { id: 'retro', label: 'Retro', labelBn: 'রেট্রো' },
  ],
};

// Section type definitions - icons are string names for flexibility
export const SECTION_TYPES = [
  { id: 'text', label: 'Text', labelBn: 'টেক্সট', iconName: 'Type', description: 'Simple text content' },
  { id: 'image', label: 'Image', labelBn: 'ইমেজ', iconName: 'ImagePlus', description: 'Image with caption' },
  { id: 'cta', label: 'CTA', labelBn: 'CTA', iconName: 'Target', description: 'Call to action section' },
  { id: 'features', label: 'Features', labelBn: 'ফিচার', iconName: 'Zap', description: 'Feature list grid' },
  { id: 'gallery', label: 'Gallery', labelBn: 'গ্যালারি', iconName: 'Image', description: 'Image gallery' },
  { id: 'video', label: 'Video', labelBn: 'ভিডিও', iconName: 'Video', description: 'Embedded video' },
  { id: 'testimonial', label: 'Testimonial', labelBn: 'টেস্টিমোনিয়াল', iconName: 'Users', description: 'Customer reviews' },
  { id: 'faq', label: 'FAQ', labelBn: 'FAQ', iconName: 'FileText', description: 'Frequently asked questions' },
  { id: 'stats', label: 'Stats', labelBn: 'স্ট্যাটস', iconName: 'BarChart3', description: 'Statistics counter' },
  { id: 'team', label: 'Team', labelBn: 'টিম', iconName: 'Users', description: 'Team members' },
  { id: 'slider', label: 'Slider', labelBn: 'স্লাইডার', iconName: 'Image', description: 'Image slider' },
  { id: 'banner', label: 'Banner', labelBn: 'ব্যানার', iconName: 'Layout', description: 'Full-width banner' },
  { id: 'custom', label: 'Custom', labelBn: 'কাস্টম', iconName: 'PenTool', description: 'Custom content' },
];

export const getLayoutClass = (layout?: Partial<SectionLayoutOptions>): string => {
  if (!layout) return 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24';
  
  const classes: string[] = [];
  
  // Container width
  switch (layout.layout) {
    case 'full': classes.push('w-full px-4'); break;
    case 'narrow': classes.push('max-w-4xl mx-auto px-4 sm:px-6'); break;
    case 'wide': classes.push('max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8'); break;
    default: classes.push('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8');
  }
  
  // Padding
  const padding = LAYOUT_OPTIONS.paddings.find(p => p.id === layout.padding);
  classes.push(padding?.class || 'py-16 lg:py-24');
  
  // Min height
  const minHeight = LAYOUT_OPTIONS.minHeights.find(h => h.id === layout.minHeight);
  if (minHeight?.class) classes.push(minHeight.class);
  
  return classes.join(' ');
};

export const getFlexClass = (layout?: Partial<SectionLayoutOptions>): string => {
  if (!layout) return '';
  
  const classes: string[] = ['flex'];
  
  // Direction
  switch (layout.direction) {
    case 'row': classes.push('flex-row'); break;
    case 'column': classes.push('flex-col'); break;
    case 'row-reverse': classes.push('flex-row-reverse'); break;
    case 'column-reverse': classes.push('flex-col-reverse'); break;
  }
  
  // Alignment
  switch (layout.alignment) {
    case 'left': classes.push('items-start'); break;
    case 'center': classes.push('items-center justify-center'); break;
    case 'right': classes.push('items-end'); break;
  }
  
  // Gap
  switch (layout.gap) {
    case 'sm': classes.push('gap-4'); break;
    case 'md': classes.push('gap-6'); break;
    case 'lg': classes.push('gap-8'); break;
    case 'xl': classes.push('gap-12'); break;
  }
  
  return classes.join(' ');
};

export const getGridClass = (columns: number = 3, layout?: Partial<SectionLayoutOptions>): string => {
  const classes: string[] = ['grid'];
  
  // Responsive columns
  switch (columns) {
    case 1: classes.push('grid-cols-1'); break;
    case 2: classes.push('grid-cols-1 md:grid-cols-2'); break;
    case 3: classes.push('grid-cols-1 md:grid-cols-2 lg:grid-cols-3'); break;
    case 4: classes.push('grid-cols-1 md:grid-cols-2 lg:grid-cols-4'); break;
    case 6: classes.push('grid-cols-2 md:grid-cols-3 lg:grid-cols-6'); break;
  }
  
  // Gap
  if (layout) {
    switch (layout.gap) {
      case 'sm': classes.push('gap-4'); break;
      case 'md': classes.push('gap-6'); break;
      case 'lg': classes.push('gap-8'); break;
      case 'xl': classes.push('gap-12'); break;
      default: classes.push('gap-6');
    }
  } else {
    classes.push('gap-6');
  }
  
  return classes.join(' ');
};
