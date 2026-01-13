import { ArrowRight, Play, Star, Quote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CustomSection, LAYOUT_OPTIONS, getLayoutClass, getGridClass } from '@/types/landingPage';

interface CustomSectionRendererProps {
  section: CustomSection;
  themeColors: {
    gradient: string;
    text: string;
    lightBg: string;
  };
  isDark: boolean;
  cardClass: string;
}

export function CustomSectionRenderer({
  section,
  themeColors,
  isDark,
  cardClass
}: CustomSectionRendererProps) {
  if (!section.isVisible) return null;
  
  // Build section styles
  const getSectionStyle = () => {
    const style: React.CSSProperties = {};
    
    if (section.layout?.backgroundStyle === 'gradient' && section.layout.gradientFrom && section.layout.gradientTo) {
      const direction = section.layout.gradientDirection?.replace('to-', '') || 'br';
      const directionMap: Record<string, string> = {
        'r': 'to right',
        'l': 'to left',
        't': 'to top',
        'b': 'to bottom',
        'br': 'to bottom right',
        'bl': 'to bottom left',
        'tr': 'to top right',
        'tl': 'to top left'
      };
      style.background = `linear-gradient(${directionMap[direction] || 'to bottom right'}, ${section.layout.gradientFrom}, ${section.layout.gradientTo})`;
    } else if (section.layout?.backgroundStyle === 'image' && section.layout.backgroundImage) {
      style.backgroundImage = `url(${section.layout.backgroundImage})`;
      style.backgroundPosition = section.layout.backgroundPosition || 'center';
      style.backgroundSize = section.layout.backgroundSize || 'cover';
      style.backgroundRepeat = 'no-repeat';
    } else if (section.bgColor) {
      style.backgroundColor = section.bgColor;
    } else {
      style.backgroundColor = isDark ? '#111827' : '#f9fafb';
    }
    
    if (section.textColor) {
      style.color = section.textColor;
    } else {
      style.color = isDark ? '#ffffff' : '#111827';
    }
    
    return style;
  };
  
  const getPaddingClass = () => {
    const padding = LAYOUT_OPTIONS.paddings.find(p => p.id === section.layout?.padding);
    return padding?.class || 'py-16 lg:py-24';
  };
  
  const getMinHeightClass = () => {
    const minHeight = LAYOUT_OPTIONS.minHeights.find(h => h.id === section.layout?.minHeight);
    return minHeight?.class || '';
  };
  
  const getContainerClass = () => {
    switch (section.layout?.layout) {
      case 'full': return 'w-full px-4';
      case 'narrow': return 'max-w-4xl mx-auto px-4 sm:px-6';
      case 'wide': return 'max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8';
      default: return 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
    }
  };
  
  const getAlignmentClass = () => {
    switch (section.layout?.alignment) {
      case 'left': return 'text-left';
      case 'right': return 'text-right';
      default: return 'text-center';
    }
  };
  
  const getAnimationClass = () => {
    switch (section.animation) {
      case 'fade': return 'animate-fade-in';
      case 'slide-up': return 'animate-slide-in';
      case 'zoom': return 'animate-[zoom-in_0.5s_ease-out]';
      default: return '';
    }
  };
  
  const columns = section.layout?.columns || 3;
  const gridClass = getGridClass(columns, section.layout);
  
  // Render different section types with unique styling
  return (
    <section 
      id={`custom-${section.id}`}
      className={`relative overflow-hidden ${getPaddingClass()} ${getMinHeightClass()} ${getAnimationClass()}`}
      style={getSectionStyle()}
    >
      {/* Overlay for image backgrounds */}
      {section.layout?.backgroundStyle === 'image' && section.layout.backgroundOverlay && (
        <div 
          className="absolute inset-0 z-0" 
          style={{ backgroundColor: section.layout.backgroundOverlay }}
        />
      )}
      
      <div className={`relative z-10 ${getContainerClass()}`}>
        {/* Text Section */}
        {section.type === 'text' && (
          <div className={`max-w-4xl ${section.layout?.alignment === 'center' ? 'mx-auto' : ''} ${getAlignmentClass()}`}>
            {section.title && (
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-6">{section.subtitle}</p>
            )}
            {section.content && (
              <div className="prose prose-lg max-w-none" style={{ color: 'inherit' }}>
                <p className="whitespace-pre-wrap leading-relaxed">{section.content}</p>
              </div>
            )}
          </div>
        )}

        {/* Image Section */}
        {section.type === 'image' && (
          <div className={getAlignmentClass()}>
            {section.title && (
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-8">{section.subtitle}</p>
            )}
            {section.imageUrl && (
              <div className="relative group">
                <img 
                  src={section.imageUrl} 
                  alt={section.title || 'Section image'} 
                  className="max-w-full h-auto rounded-2xl shadow-2xl mx-auto transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            {section.content && (
              <p className="mt-6 text-lg opacity-80 max-w-2xl mx-auto">{section.content}</p>
            )}
          </div>
        )}

        {/* CTA Section */}
        {section.type === 'cta' && (
          <div className={`py-8 ${getAlignmentClass()}`}>
            {section.title && (
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto">{section.subtitle}</p>
            )}
            {section.content && (
              <p className="text-lg opacity-70 mb-8 max-w-xl mx-auto">{section.content}</p>
            )}
            <div className="flex flex-wrap gap-4 justify-center">
              {section.buttonText && section.buttonUrl && (
                <a 
                  href={section.buttonUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r ${themeColors.gradient} text-white font-semibold text-lg shadow-lg hover:opacity-90 hover:scale-105 transition-all`}
                >
                  {section.buttonText}
                  <ArrowRight className="h-5 w-5" />
                </a>
              )}
              {section.secondaryButtonText && section.secondaryButtonUrl && (
                <a 
                  href={section.secondaryButtonUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 font-semibold text-lg hover:bg-white/10 transition-all`}
                  style={{ borderColor: section.accentColor || 'currentColor' }}
                >
                  {section.secondaryButtonText}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Banner Section */}
        {section.type === 'banner' && (
          <div className="relative rounded-3xl overflow-hidden">
            {section.imageUrl && (
              <div className="absolute inset-0">
                <img 
                  src={section.imageUrl} 
                  alt={section.title || ''} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
              </div>
            )}
            <div className={`relative z-10 p-8 md:p-12 lg:p-16 ${getAlignmentClass()}`}>
              {section.title && (
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">{section.title}</h2>
              )}
              {section.subtitle && (
                <p className="text-xl text-white/80 mb-6">{section.subtitle}</p>
              )}
              {section.content && (
                <p className="text-lg text-white/70 mb-8 max-w-2xl">{section.content}</p>
              )}
              <div className="flex flex-wrap gap-4">
                {section.buttonText && section.buttonUrl && (
                  <a 
                    href={section.buttonUrl}
                    className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-all`}
                  >
                    {section.buttonText}
                    <ArrowRight className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        {section.type === 'features' && (
          <div>
            {section.title && (
              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-4 ${getAlignmentClass()}`}>{section.title}</h2>
            )}
            {section.subtitle && (
              <p className={`text-xl opacity-80 mb-12 max-w-2xl ${section.layout?.alignment === 'center' ? 'mx-auto' : ''} ${getAlignmentClass()}`}>{section.subtitle}</p>
            )}
            {section.items && section.items.length > 0 && (
              <div className={gridClass}>
                {section.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`group p-6 rounded-2xl transition-all duration-500 hover:-translate-y-2 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white shadow-lg hover:shadow-xl'}`}
                    style={{ borderTop: `4px solid ${section.accentColor || '#3b82f6'}` }}
                  >
                    {item.imageUrl && (
                      <div className="mb-4 overflow-hidden rounded-xl">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-16 h-16 object-cover rounded-xl group-hover:scale-110 transition-transform" 
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    {item.subtitle && (
                      <p className="text-sm opacity-60 mb-2">{item.subtitle}</p>
                    )}
                    <p className="opacity-70">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Section */}
        {section.type === 'stats' && (
          <div>
            {section.title && (
              <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${getAlignmentClass()}`}>{section.title}</h2>
            )}
            {section.subtitle && (
              <p className={`text-xl opacity-80 mb-12 ${getAlignmentClass()}`}>{section.subtitle}</p>
            )}
            {section.items && section.items.length > 0 && (
              <div className={gridClass}>
                {section.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`p-8 rounded-2xl text-center transition-all duration-500 hover:scale-105 ${isDark ? 'bg-white/5' : 'bg-white shadow-xl'}`}
                  >
                    <div 
                      className="text-4xl md:text-5xl font-bold mb-2"
                      style={{ color: section.accentColor || '#3b82f6' }}
                    >
                      {item.value || item.title}
                    </div>
                    <p className="text-lg opacity-80">{item.description || item.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gallery Section */}
        {section.type === 'gallery' && (
          <div>
            {section.title && (
              <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${getAlignmentClass()}`}>{section.title}</h2>
            )}
            {section.subtitle && (
              <p className={`text-xl opacity-80 mb-12 ${getAlignmentClass()}`}>{section.subtitle}</p>
            )}
            {section.items && section.items.length > 0 && (
              <div className={`grid gap-4 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                {section.items.map((item, idx) => (
                  <div key={idx} className="aspect-square rounded-xl overflow-hidden group cursor-pointer">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title || `Gallery item ${idx + 1}`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Slider Section */}
        {section.type === 'slider' && (
          <div>
            {section.title && (
              <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${getAlignmentClass()}`}>{section.title}</h2>
            )}
            {section.items && section.items.length > 0 && (
              <div className="relative overflow-hidden rounded-2xl">
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide">
                  {section.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex-shrink-0 w-[80%] md:w-[60%] lg:w-[40%] snap-center"
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title || `Slide ${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        {(item.title || item.description) && (
                          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                            {item.title && <h4 className="text-white font-bold text-lg">{item.title}</h4>}
                            {item.description && <p className="text-white/80 text-sm">{item.description}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Video Section */}
        {section.type === 'video' && (
          <div className={getAlignmentClass()}>
            {section.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-8">{section.subtitle}</p>
            )}
            {section.videoUrl && (
              <div className="aspect-video max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl">
                <iframe 
                  src={section.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                  title={section.title || 'Video'} 
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )}

        {/* Testimonial Section */}
        {section.type === 'testimonial' && (
          <div>
            {section.title && (
              <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${getAlignmentClass()}`}>{section.title}</h2>
            )}
            {section.subtitle && (
              <p className={`text-xl opacity-80 mb-12 ${getAlignmentClass()}`}>{section.subtitle}</p>
            )}
            {section.items && section.items.length > 0 && (
              <div className={gridClass}>
                {section.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`relative p-8 rounded-2xl transition-all duration-500 hover:-translate-y-2 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white shadow-lg hover:shadow-xl'}`}
                  >
                    <Quote className="absolute top-4 right-4 h-8 w-8 opacity-10" />
                    <div className="flex items-center gap-4 mb-6">
                      {item.imageUrl && (
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-16 h-16 rounded-full object-cover ring-4 ring-offset-2 ring-blue-500"
                        />
                      )}
                      <div>
                        <h4 className="font-bold text-lg">{item.title}</h4>
                        {item.subtitle && (
                          <p className="text-sm opacity-60">{item.subtitle}</p>
                        )}
                      </div>
                    </div>
                    <p className="italic opacity-80 leading-relaxed">"{item.description}"</p>
                    <div className="flex gap-1 mt-4">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Section */}
        {section.type === 'team' && (
          <div>
            {section.title && (
              <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${getAlignmentClass()}`}>{section.title}</h2>
            )}
            {section.subtitle && (
              <p className={`text-xl opacity-80 mb-12 ${getAlignmentClass()}`}>{section.subtitle}</p>
            )}
            {section.items && section.items.length > 0 && (
              <div className={gridClass}>
                {section.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`group text-center p-6 rounded-2xl transition-all duration-500 hover:-translate-y-2 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white shadow-lg hover:shadow-xl'}`}
                  >
                    {item.imageUrl && (
                      <div className="mb-4 mx-auto w-32 h-32 overflow-hidden rounded-full ring-4 ring-blue-500 ring-offset-4 group-hover:ring-offset-8 transition-all">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h4 className="font-bold text-xl mb-1">{item.title}</h4>
                    {item.subtitle && (
                      <p className="text-sm mb-2" style={{ color: section.accentColor || '#3b82f6' }}>{item.subtitle}</p>
                    )}
                    <p className="opacity-70 text-sm">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FAQ Section */}
        {section.type === 'faq' && (
          <div className={`max-w-3xl ${section.layout?.alignment === 'center' ? 'mx-auto' : ''}`}>
            {section.title && (
              <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${getAlignmentClass()}`}>{section.title}</h2>
            )}
            {section.subtitle && (
              <p className={`text-xl opacity-80 mb-12 ${getAlignmentClass()}`}>{section.subtitle}</p>
            )}
            {section.items && section.items.length > 0 && (
              <div className="space-y-4">
                {section.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`p-6 rounded-xl transition-all duration-300 hover:shadow-lg ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white shadow-md'}`}
                    style={{ borderLeft: `4px solid ${section.accentColor || '#3b82f6'}` }}
                  >
                    <h4 className="font-bold text-lg mb-2 flex items-start gap-2">
                      <span style={{ color: section.accentColor || '#3b82f6' }}>Q:</span>
                      {item.title}
                    </h4>
                    <p className="opacity-70 pl-6">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom/Generic Section */}
        {section.type === 'custom' && (
          <div className={getAlignmentClass()}>
            {section.title && (
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-6">{section.subtitle}</p>
            )}
            {section.imageUrl && (
              <img 
                src={section.imageUrl} 
                alt={section.title || 'Custom section'} 
                className="max-w-full h-auto rounded-2xl shadow-xl mx-auto mb-6"
              />
            )}
            {section.content && (
              <div className="prose prose-lg max-w-3xl mx-auto" style={{ color: 'inherit' }}>
                <p className="whitespace-pre-wrap">{section.content}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-4 justify-center mt-8">
              {section.buttonText && section.buttonUrl && (
                <a 
                  href={section.buttonUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r ${themeColors.gradient} text-white font-semibold shadow-lg hover:opacity-90 transition-opacity`}
                >
                  {section.buttonText}
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
              {section.secondaryButtonText && section.secondaryButtonUrl && (
                <a 
                  href={section.secondaryButtonUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 font-semibold hover:bg-white/10 transition-all"
                >
                  {section.secondaryButtonText}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Partners/Clients Logo Section */}
        {section.type === 'partners' && (
          <div className={getAlignmentClass()}>
            {section.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-12">{section.subtitle}</p>
            )}
            {section.items && section.items.length > 0 && (
              <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12">
                {section.items.map((item, idx) => (
                  <div key={idx} className="group">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="h-12 md:h-16 w-auto object-contain grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
                      />
                    ) : (
                      <div className={`px-6 py-4 rounded-xl ${isDark ? 'bg-white/10' : 'bg-gray-100'} font-semibold`}>
                        {item.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timeline Section */}
        {section.type === 'timeline' && (
          <div className="max-w-4xl mx-auto">
            {section.title && (
              <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${getAlignmentClass()}`}>{section.title}</h2>
            )}
            {section.subtitle && (
              <p className={`text-xl opacity-80 mb-12 ${getAlignmentClass()}`}>{section.subtitle}</p>
            )}
            {section.items && section.items.length > 0 && (
              <div className="relative">
                {/* Timeline line */}
                <div className={`absolute left-4 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 ${isDark ? 'bg-white/20' : 'bg-gray-200'}`} />
                
                <div className="space-y-8">
                  {section.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`relative flex items-start gap-6 md:gap-8 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                    >
                      {/* Timeline dot */}
                      <div 
                        className="absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ring-4 ring-offset-2"
                        style={{ 
                          backgroundColor: section.accentColor || '#3b82f6',
                        }}
                      />
                      
                      {/* Content */}
                      <div className={`ml-12 md:ml-0 md:w-1/2 p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white shadow-lg'} ${idx % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                        {item.value && (
                          <Badge className="mb-2" style={{ backgroundColor: section.accentColor || '#3b82f6', color: 'white' }}>
                            {item.value}
                          </Badge>
                        )}
                        <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                        <p className="opacity-70 text-sm">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Services Section */}
        {section.type === 'services' && (
          <div className={getAlignmentClass()}>
            {section.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-12">{section.subtitle}</p>
            )}
            {section.items && section.items.length > 0 && (
              <div className={gridClass}>
                {section.items.map((item, idx) => (
                  <Card key={idx} className={`${cardClass} group overflow-hidden`}>
                    {item.imageUrl && (
                      <div className="h-48 overflow-hidden">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <h4 className="font-bold text-xl mb-2">{item.title}</h4>
                      <p className="opacity-70">{item.description}</p>
                      {item.url && (
                        <a 
                          href={item.url} 
                          className="inline-flex items-center gap-1 mt-4 font-medium text-sm hover:gap-2 transition-all"
                          style={{ color: section.accentColor || '#3b82f6' }}
                        >
                          বিস্তারিত দেখুন
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Download App Section */}
        {section.type === 'download' && (
          <div className="text-center">
            {section.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-8">{section.subtitle}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {section.buttonUrl && (
                <a 
                  href={section.buttonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-6 py-3 rounded-xl bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs opacity-80">Download on the</div>
                    <div className="font-semibold">App Store</div>
                  </div>
                </a>
              )}
              {section.secondaryButtonUrl && (
                <a 
                  href={section.secondaryButtonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-6 py-3 rounded-xl bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.807 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs opacity-80">GET IT ON</div>
                    <div className="font-semibold">Google Play</div>
                  </div>
                </a>
              )}
            </div>
            {section.imageUrl && (
              <div className="mt-12">
                <img 
                  src={section.imageUrl} 
                  alt="App Preview"
                  className="max-w-md mx-auto rounded-3xl shadow-2xl"
                />
              </div>
            )}
          </div>
        )}

        {/* Newsletter Section */}
        {section.type === 'newsletter' && (
          <div className="max-w-2xl mx-auto text-center">
            {section.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-8">{section.subtitle}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
              <input 
                type="email"
                placeholder="আপনার ইমেইল লিখুন"
                className={`flex-1 px-6 py-4 rounded-xl ${isDark ? 'bg-white/10 text-white placeholder:text-white/50' : 'bg-white shadow-lg text-gray-900'} outline-none focus:ring-2 focus:ring-primary`}
              />
              <button
                className={`px-8 py-4 rounded-xl font-semibold text-white shadow-lg transition-opacity hover:opacity-90 bg-gradient-to-r ${themeColors.gradient}`}
              >
                সাবস্ক্রাইব
              </button>
            </div>
          </div>
        )}

        {/* Map Section */}
        {section.type === 'map' && (
          <div className={getAlignmentClass()}>
            {section.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-8">{section.subtitle}</p>
            )}
            {section.content && (
              <div 
                className="rounded-2xl overflow-hidden shadow-2xl aspect-video"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            )}
          </div>
        )}

        {/* Comparison Table Section */}
        {section.type === 'comparison' && (
          <div className={getAlignmentClass()}>
            {section.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-12">{section.subtitle}</p>
            )}
            {section.items && section.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className={`w-full ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <tbody>
                    {section.items.map((item, idx) => (
                      <tr 
                        key={idx}
                        className={`${idx % 2 === 0 ? (isDark ? 'bg-white/5' : 'bg-gray-50') : ''} transition-colors hover:bg-primary/5`}
                      >
                        <td className="px-6 py-4 font-medium">{item.title}</td>
                        <td className="px-6 py-4 text-center">
                          {item.value === 'yes' ? (
                            <span className="text-green-500">✓</span>
                          ) : item.value === 'no' ? (
                            <span className="text-red-500">✗</span>
                          ) : (
                            item.value
                          )}
                        </td>
                        <td className="px-6 py-4 opacity-70">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Pricing Section */}
        {section.type === 'pricing' && (
          <div className={getAlignmentClass()}>
            {section.title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
            )}
            {section.subtitle && (
              <p className="text-xl opacity-80 mb-12">{section.subtitle}</p>
            )}
            {section.items && section.items.length > 0 && (
              <div className={gridClass}>
                {section.items.map((item, idx) => (
                  <Card 
                    key={idx} 
                    className={`${cardClass} relative overflow-hidden ${idx === 1 ? 'ring-2 ring-primary scale-105' : ''}`}
                  >
                    {idx === 1 && (
                      <div 
                        className="absolute top-0 right-0 px-4 py-1 text-xs font-bold text-white rounded-bl-xl"
                        style={{ backgroundColor: section.accentColor || '#3b82f6' }}
                      >
                        জনপ্রিয়
                      </div>
                    )}
                    <CardContent className="p-6 text-center">
                      <h4 className="font-bold text-xl mb-2">{item.title}</h4>
                      {item.value && (
                        <div className="text-4xl font-bold my-4">
                          <span style={{ color: section.accentColor || '#3b82f6' }}>৳{item.value}</span>
                          <span className="text-sm opacity-60">/মাস</span>
                        </div>
                      )}
                      <p className="opacity-70 mb-6">{item.description}</p>
                      {item.url && (
                        <a
                          href={item.url}
                          className={`block w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 transition-opacity`}
                        >
                          শুরু করুন
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
