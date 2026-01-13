import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MessageSquare, HelpCircle, Clock, MapPin, Globe, Send, FileQuestion, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function CustomerSupport() {
  const { customer, tenantBranding } = useOutletContext<{ customer: any; tenantBranding: any }>();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    setSending(true);
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Your message has been sent! We will get back to you soon.');
    setMessage('');
    setSending(false);
  };

  const faqs = [
    { 
      question: 'How do I pay my bill?', 
      answer: 'You can pay your bill through the Pay Bill section using bKash, Nagad, or other payment methods.' 
    },
    { 
      question: 'Why is my internet slow?', 
      answer: 'Slow speeds can be caused by many factors. Try restarting your router first. If the issue persists, contact support.' 
    },
    { 
      question: 'How do I check my usage?', 
      answer: 'Visit the Usage & Speed section in your dashboard to view your bandwidth usage and speed tests.' 
    },
    { 
      question: 'When does my subscription expire?', 
      answer: 'You can see your subscription expiry date on your Dashboard or in the My Profile section.' 
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-muted-foreground">Get help and contact your ISP</p>
      </div>

      {/* Contact Options */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Phone className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="font-semibold mb-1">Call Support</h3>
            <p className="text-muted-foreground text-sm mb-3">Talk to our team</p>
            <Badge variant="secondary">24/7 Available</Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="font-semibold mb-1">Live Chat</h3>
            <p className="text-muted-foreground text-sm mb-3">Chat with us now</p>
            <Badge variant="default">Online</Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="font-semibold mb-1">Email Us</h3>
            <p className="text-muted-foreground text-sm mb-3">Get a response</p>
            <Badge variant="secondary">Within 24hrs</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Send Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Send a Message
          </CardTitle>
          <CardDescription>Describe your issue and we'll get back to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe your issue or question..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="bg-muted/50"
          />
          <Button onClick={handleSendMessage} disabled={sending}>
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-start gap-3">
                <FileQuestion className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium mb-1">{faq.question}</p>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ISP Contact Info */}
      {tenantBranding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Your ISP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              {tenantBranding.logo_url ? (
                <img src={tenantBranding.logo_url} alt="ISP Logo" className="h-12 w-12 object-contain" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-semibold text-lg">{tenantBranding.company_name || 'ISP Provider'}</p>
                <p className="text-muted-foreground">{tenantBranding.subtitle || 'Internet Service Provider'}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Support: 24/7</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Status: All Systems Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
