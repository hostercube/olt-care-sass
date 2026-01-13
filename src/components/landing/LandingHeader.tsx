import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Wifi, Menu, X, Home, ChevronRight, ExternalLink, DollarSign,
  UserPlus, ArrowRight, ChevronDown
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  url?: string;
  isExternal?: boolean;
  subItems?: { label: string; url: string }[];
}

interface LandingHeaderProps {
  tenant: {
    company_name: string;
    logo_url: string;
    landing_page_header_style?: string;
    landing_page_show_pay_bill_button?: boolean;
    landing_page_show_register_button?: boolean;
    landing_page_show_login_button?: boolean;
    customer_registration_enabled?: boolean;
  };
  tenantSlug: string;
  template: {
    headerClass: string;
    isDark: boolean;
  };
  themeColors: {
    gradient: string;
    glow: string;
  };
  navItems: NavItem[];
  activeSection: string;
  scrollToSection: (id: string) => void;
  setRegisterModalOpen: (open: boolean) => void;
}

export function LandingHeader({
  tenant,
  tenantSlug,
  template,
  themeColors,
  navItems,
  activeSection,
  scrollToSection,
  setRegisterModalOpen,
}: LandingHeaderProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  const headerStyle = tenant.landing_page_header_style || 'default';

  // Header style configurations
  const getHeaderStyles = () => {
    const baseStyles = {
      default: {
        wrapper: `${template.headerClass} sticky top-0 z-50 shadow-md`,
        container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
        height: 'h-16 lg:h-20',
        layout: 'flex items-center justify-between',
      },
      transparent: {
        wrapper: `bg-transparent backdrop-blur-md border-b border-white/10 sticky top-0 z-50`,
        container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
        height: 'h-16 lg:h-20',
        layout: 'flex items-center justify-between',
      },
      minimal: {
        wrapper: `${template.isDark ? 'bg-gray-900/90' : 'bg-white/90'} backdrop-blur-sm sticky top-0 z-50 border-b ${template.isDark ? 'border-white/5' : 'border-gray-100'}`,
        container: 'max-w-6xl mx-auto px-4',
        height: 'h-14',
        layout: 'flex items-center justify-between',
      },
      centered: {
        wrapper: `${template.headerClass} sticky top-0 z-50 shadow-sm`,
        container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
        height: 'h-20 lg:h-24',
        layout: 'flex flex-col items-center justify-center gap-2 py-2 lg:flex-row lg:justify-between',
      },
      bold: {
        wrapper: `${template.isDark ? 'bg-gray-900' : 'bg-white'} sticky top-0 z-50 shadow-xl border-b-4 ${template.isDark ? 'border-white/20' : 'border-gray-900'}`,
        container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
        height: 'h-20 lg:h-24',
        layout: 'flex items-center justify-between',
      },
      floating: {
        wrapper: `fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-6xl ${template.isDark ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-xl rounded-2xl shadow-2xl border ${template.isDark ? 'border-white/10' : 'border-gray-200'}`,
        container: 'px-6',
        height: 'h-16',
        layout: 'flex items-center justify-between',
      },
      gradient: {
        wrapper: `bg-gradient-to-r ${themeColors.gradient} sticky top-0 z-50 shadow-lg`,
        container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
        height: 'h-16 lg:h-20',
        layout: 'flex items-center justify-between',
      },
      split: {
        wrapper: `sticky top-0 z-50 ${template.isDark ? 'bg-gray-900' : 'bg-white'}`,
        container: 'max-w-7xl mx-auto',
        height: '',
        layout: '',
      },
    };

    return baseStyles[headerStyle as keyof typeof baseStyles] || baseStyles.default;
  };

  const styles = getHeaderStyles();

  // Render logo section
  const renderLogo = () => (
    <div className="flex items-center gap-3">
      {tenant.logo_url ? (
        <img 
          src={tenant.logo_url} 
          alt={tenant.company_name} 
          className={`${headerStyle === 'bold' ? 'h-12 lg:h-14' : 'h-10 lg:h-12'} w-auto max-w-[180px] object-contain`}
        />
      ) : (
        <div className={`${headerStyle === 'bold' ? 'h-12 lg:h-14 w-12 lg:w-14' : 'h-10 lg:h-12 w-10 lg:w-12'} rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center shadow-lg ${themeColors.glow}`}>
          <Wifi className={`${headerStyle === 'bold' ? 'h-7 w-7' : 'h-6 w-6'} text-white`} />
        </div>
      )}
      {/* Home badge - only for certain styles */}
      {['default', 'bold', 'floating'].includes(headerStyle) && (
        <button
          onClick={() => scrollToSection('home')}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeSection === 'home'
              ? `bg-gradient-to-r ${themeColors.gradient} text-white shadow-lg`
              : headerStyle === 'gradient' || template.isDark 
                ? 'bg-white/10 text-white/80 hover:bg-white/20' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Home className="h-3.5 w-3.5" />
          হোম
        </button>
      )}
    </div>
  );

  // Render navigation
  const renderNav = () => {
    const isGradientOrDark = headerStyle === 'gradient' || template.isDark;
    
    return (
      <nav className={`hidden lg:flex items-center ${headerStyle === 'minimal' ? 'gap-0.5' : 'gap-1'}`}>
        {navItems.filter(i => i.id !== 'home').map((item) => (
          <div key={item.id} className="relative group">
            {item.url && !item.subItems?.length ? (
              <a
                href={item.url}
                target={item.isExternal ? '_blank' : '_self'}
                rel={item.isExternal ? 'noopener noreferrer' : undefined}
                className={`${headerStyle === 'minimal' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} font-medium transition-all rounded-lg flex items-center gap-1.5 whitespace-nowrap ${
                  isGradientOrDark 
                    ? 'text-white/90 hover:text-white hover:bg-white/10' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
                {item.isExternal && <ExternalLink className="h-3 w-3 opacity-60" />}
              </a>
            ) : item.subItems && item.subItems.length > 0 ? (
              <>
                <button
                  onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                  onMouseEnter={() => setOpenDropdown(item.id)}
                  className={`${headerStyle === 'minimal' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} font-medium transition-all rounded-lg flex items-center gap-1.5 whitespace-nowrap ${
                    openDropdown === item.id 
                      ? `bg-gradient-to-r ${themeColors.gradient} text-white`
                      : isGradientOrDark 
                        ? 'text-white/90 hover:text-white hover:bg-white/10' 
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === item.id ? 'rotate-180' : ''}`} />
                </button>
                {/* Dropdown */}
                {openDropdown === item.id && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-fade-in"
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    {item.subItems.map((sub, idx) => (
                      <a
                        key={idx}
                        href={sub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-colors"
                      >
                        <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center flex-shrink-0`}>
                          <ExternalLink className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium truncate">{sub.label}</span>
                      </a>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => scrollToSection(item.id)}
                className={`${headerStyle === 'minimal' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} font-medium transition-all rounded-lg whitespace-nowrap ${
                  activeSection === item.id
                    ? `bg-gradient-to-r ${themeColors.gradient} text-white shadow-lg`
                    : isGradientOrDark 
                      ? 'text-white/90 hover:text-white hover:bg-white/10' 
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            )}
          </div>
        ))}
      </nav>
    );
  };

  // Render action buttons
  const renderActions = () => {
    const isGradientOrDark = headerStyle === 'gradient' || template.isDark;
    const buttonSize = headerStyle === 'minimal' ? 'h-8 text-xs' : 'h-9';
    
    return (
      <div className={`hidden md:flex items-center ${headerStyle === 'minimal' ? 'gap-1.5' : 'gap-2 lg:gap-3'}`}>
        {/* Pay Bill Button */}
        {tenant.landing_page_show_pay_bill_button !== false && (
          <Button 
            onClick={() => navigate(`/t/${tenantSlug}`)}
            variant="outline"
            size="sm"
            className={`${buttonSize} border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white font-bold transition-all ${isGradientOrDark ? 'border-green-400 text-green-400' : ''}`}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Pay Bill
          </Button>
        )}
        
        {/* Register Button */}
        {tenant.customer_registration_enabled && tenant.landing_page_show_register_button !== false && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setRegisterModalOpen(true)}
            className={`${buttonSize} font-semibold ${
              isGradientOrDark 
                ? 'border-white/30 text-white hover:bg-white/10' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            রেজিস্টার
          </Button>
        )}

        {/* Login Button */}
        {tenant.landing_page_show_login_button !== false && (
          <Button 
            onClick={() => navigate(`/t/${tenantSlug}`)}
            size="sm"
            className={`${buttonSize} bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white shadow-lg font-bold px-5`}
          >
            লগইন করুন
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  // Render mobile menu button
  const renderMobileButton = () => {
    const isGradientOrDark = headerStyle === 'gradient' || template.isDark;
    
    return (
      <button 
        className={`lg:hidden p-2.5 rounded-xl transition-all ${
          isGradientOrDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
        } ${mobileMenuOpen ? `bg-gradient-to-r ${themeColors.gradient} text-white` : ''}`}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className={`h-6 w-6 ${isGradientOrDark ? 'text-white' : 'text-gray-900'}`} />
        )}
      </button>
    );
  };

  // Render mobile menu
  const renderMobileMenu = () => {
    if (!mobileMenuOpen) return null;

    const isGradientOrDark = headerStyle === 'gradient' || template.isDark;

    return (
      <div className={`lg:hidden ${isGradientOrDark ? 'bg-gray-900/95 backdrop-blur-xl border-t border-white/10' : 'bg-white/95 backdrop-blur-xl border-t shadow-xl'} px-4 py-6 ${headerStyle === 'floating' ? 'rounded-b-2xl' : ''}`}>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <div key={item.id}>
              {item.url && !item.subItems?.length ? (
                <a
                  href={item.url}
                  target={item.isExternal ? '_blank' : '_self'}
                  rel={item.isExternal ? 'noopener noreferrer' : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-left font-medium transition-all ${
                    isGradientOrDark 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                  {item.isExternal && <ExternalLink className="h-4 w-4 opacity-60" />}
                </a>
              ) : item.subItems && item.subItems.length > 0 ? (
                <div className="space-y-1">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-left font-medium transition-all ${
                      openDropdown === item.id
                        ? `bg-gradient-to-r ${themeColors.gradient} text-white`
                        : isGradientOrDark 
                          ? 'text-white hover:bg-white/10' 
                          : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                    <ChevronRight className={`h-4 w-4 transition-transform ${openDropdown === item.id ? 'rotate-90' : ''}`} />
                  </button>
                  {openDropdown === item.id && (
                    <div className="pl-4 space-y-1">
                      {item.subItems.map((sub, idx) => (
                        <a
                          key={idx}
                          href={sub.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${
                            isGradientOrDark 
                              ? 'text-white/80 hover:bg-white/10' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {sub.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { scrollToSection(item.id); setMobileMenuOpen(false); }}
                  className={`flex items-center w-full px-4 py-3 rounded-xl text-left font-medium transition-all ${
                    activeSection === item.id
                      ? `bg-gradient-to-r ${themeColors.gradient} text-white`
                      : isGradientOrDark 
                        ? 'text-white hover:bg-white/10' 
                        : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              )}
            </div>
          ))}
        </nav>
        
        {/* Mobile CTA Buttons */}
        <div className="mt-6 pt-6 space-y-3 border-t border-gray-200/20">
          {tenant.landing_page_show_pay_bill_button !== false && (
            <Button 
              onClick={() => navigate(`/t/${tenantSlug}`)}
              variant="outline"
              className="w-full h-12 border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white font-bold text-base"
            >
              <DollarSign className="h-5 w-5 mr-2" />
              বিল পরিশোধ করুন
            </Button>
          )}
          
          {tenant.customer_registration_enabled && tenant.landing_page_show_register_button !== false && (
            <Button 
              variant="outline" 
              onClick={() => { setMobileMenuOpen(false); setRegisterModalOpen(true); }}
              className="w-full h-12 font-semibold text-base"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              এখনই রেজিস্টার করুন
            </Button>
          )}
          
          {tenant.landing_page_show_login_button !== false && (
            <Button 
              onClick={() => navigate(`/t/${tenantSlug}`)}
              className={`w-full h-12 bg-gradient-to-r ${themeColors.gradient} font-bold text-base`}
            >
              লগইন করুন
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Special layout for split header
  if (headerStyle === 'split') {
    return (
      <header className={styles.wrapper}>
        {/* Top bar with gradient */}
        <div className={`bg-gradient-to-r ${themeColors.gradient} py-2`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="hidden md:flex items-center gap-4 text-white/90 text-sm">
              <span>বাংলাদেশের বিশ্বস্ত ইন্টারনেট সেবা</span>
            </div>
            {renderActions()}
            {renderMobileButton()}
          </div>
        </div>
        {/* Main nav bar */}
        <div className={`${template.isDark ? 'bg-gray-900' : 'bg-white'} shadow-md`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {renderLogo()}
              {renderNav()}
            </div>
          </div>
        </div>
        {renderMobileMenu()}
      </header>
    );
  }

  // Default and other header styles
  return (
    <header className={styles.wrapper}>
      <div className={styles.container}>
        <div className={`${styles.height} ${styles.layout}`}>
          {headerStyle === 'centered' ? (
            <>
              {/* Centered layout */}
              <div className="flex items-center justify-between w-full lg:justify-start lg:w-auto">
                {renderLogo()}
                {renderMobileButton()}
              </div>
              <div className="hidden lg:flex items-center gap-6">
                {renderNav()}
                {renderActions()}
              </div>
            </>
          ) : (
            <>
              {renderLogo()}
              {renderNav()}
              <div className="flex items-center gap-3">
                {renderActions()}
                {renderMobileButton()}
              </div>
            </>
          )}
        </div>
      </div>
      {renderMobileMenu()}
    </header>
  );
}