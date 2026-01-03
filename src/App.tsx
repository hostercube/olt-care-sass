import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { SuperAdminRoute } from "@/components/layout/SuperAdminRoute";
import { TenantAccessGuard } from "@/components/layout/TenantAccessGuard";
import { ModuleAccessGuard } from "@/components/layout/ModuleAccessGuard";

// Main Pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import OLTManagement from "./pages/OLTManagement";
import OLTDetails from "./pages/OLTDetails";
import ONUDevices from "./pages/ONUDevices";
import Alerts from "./pages/Alerts";
import Monitoring from "./pages/Monitoring";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import DebugLogs from "./pages/DebugLogs";
import DatabaseIntegrity from "./pages/DatabaseIntegrity";
import NotFound from "./pages/NotFound";

// Super Admin Pages
import TenantManagement from "./pages/SuperAdmin/TenantManagement";
import PackageManagement from "./pages/SuperAdmin/PackageManagement";
import PaymentManagement from "./pages/SuperAdmin/PaymentManagement";
import GatewaySettings from "./pages/SuperAdmin/GatewaySettings";
import SMSGatewaySettings from "./pages/SuperAdmin/SMSGatewaySettings";
import EmailGatewaySettings from "./pages/SuperAdmin/EmailGatewaySettings";
import EmailTemplates from "./pages/SuperAdmin/EmailTemplates";
import SMSTemplates from "./pages/SuperAdmin/SMSTemplates";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import SuperAdminSMSCenter from "./pages/SuperAdmin/SMSCenter";

// ISP Billing Pages
import MySubscription from "./pages/Billing/MySubscription";
import MakePayment from "./pages/Billing/MakePayment";

// ISP Management Pages
import CustomerManagement from "./pages/ISP/CustomerManagement";
import ISPBilling from "./pages/ISP/Billing";
import ISPDashboard from "./pages/ISP/Dashboard";
import ISPPackages from "./pages/ISP/Packages";
import AreasManagement from "./pages/ISP/AreasManagement";
import ResellersManagement from "./pages/ISP/ResellersManagement";
import MikroTikManagement from "./pages/ISP/MikroTikManagement";
import BillingAutomation from "./pages/ISP/BillingAutomation";
import ISPGatewaySettings from "./pages/ISP/GatewaySettings";
import SMSCenter from "./pages/ISP/SMSCenter";
import BkashPayments from "./pages/ISP/BkashPayments";
import Inventory from "./pages/ISP/Inventory";
import Staff from "./pages/ISP/Staff";
import Transactions from "./pages/ISP/Transactions";
import Reports from "./pages/ISP/Reports";
import CustomDomain from "./pages/ISP/CustomDomain";

// Additional Pages
import Onboarding from "./pages/Onboarding";
import NotificationPreferences from "./pages/NotificationPreferences";
import ActivityLogs from "./pages/ActivityLogs";
import Invoices from "./pages/Invoices";
import NotificationHistory from "./pages/NotificationHistory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected Dashboard */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <Dashboard />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/olts" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <OLTManagement />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/olts/:id" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <OLTDetails />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/onus" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ONUDevices />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/alerts" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <Alerts />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/monitoring" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <Monitoring />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <Settings />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <UserManagement />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/debug" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <DebugLogs />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/integrity" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <DatabaseIntegrity />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              
              {/* Super Admin Routes */}
              <Route path="/admin" element={
                <SuperAdminRoute>
                  <SuperAdminDashboard />
                </SuperAdminRoute>
              } />
              <Route path="/admin/tenants" element={
                <SuperAdminRoute>
                  <TenantManagement />
                </SuperAdminRoute>
              } />
              <Route path="/admin/packages" element={
                <SuperAdminRoute>
                  <PackageManagement />
                </SuperAdminRoute>
              } />
              <Route path="/admin/payments" element={
                <SuperAdminRoute>
                  <PaymentManagement />
                </SuperAdminRoute>
              } />
              <Route path="/admin/gateways" element={
                <SuperAdminRoute>
                  <GatewaySettings />
                </SuperAdminRoute>
              } />
              <Route path="/admin/sms-gateway" element={
                <SuperAdminRoute>
                  <SMSGatewaySettings />
                </SuperAdminRoute>
              } />
              <Route path="/admin/email-gateway" element={
                <SuperAdminRoute>
                  <EmailGatewaySettings />
                </SuperAdminRoute>
              } />
              <Route path="/admin/email-templates" element={
                <SuperAdminRoute>
                  <EmailTemplates />
                </SuperAdminRoute>
              } />
              <Route path="/admin/sms-templates" element={
                <SuperAdminRoute>
                  <SMSTemplates />
                </SuperAdminRoute>
              } />
              <Route path="/admin/sms-center" element={
                <SuperAdminRoute>
                  <SuperAdminSMSCenter />
                </SuperAdminRoute>
              } />

              {/* ISP Billing Routes */}
              <Route path="/billing/subscription" element={
                <ProtectedRoute>
                  <MySubscription />
                </ProtectedRoute>
              } />
              <Route path="/billing/pay" element={
                <ProtectedRoute>
                  <MakePayment />
                </ProtectedRoute>
              } />

              {/* Onboarding */}
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Notification Settings */}
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <NotificationPreferences />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/notifications/history" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <NotificationHistory />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/activity-logs" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ActivityLogs />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/invoices" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <Invoices />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />

              {/* ISP Management Routes */}
              <Route path="/isp" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ISPDashboard />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/dashboard" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ISPDashboard />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/customers" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_customers" moduleName="Customer Management">
                      <CustomerManagement />
                    </ModuleAccessGuard>
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/billing" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_billing" moduleName="ISP Billing">
                      <ISPBilling />
                    </ModuleAccessGuard>
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/automation" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_billing" moduleName="Billing Automation">
                      <BillingAutomation />
                    </ModuleAccessGuard>
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/packages" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ISPPackages />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/areas" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <AreasManagement />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/resellers" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_resellers" moduleName="Reseller Management">
                      <ResellersManagement />
                    </ModuleAccessGuard>
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/mikrotik" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_mikrotik" moduleName="MikroTik Integration">
                      <MikroTikManagement />
                    </ModuleAccessGuard>
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/gateways" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ISPGatewaySettings />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/sms" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="sms_alerts" moduleName="SMS Center">
                      <SMSCenter />
                    </ModuleAccessGuard>
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/bkash" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <BkashPayments />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/inventory" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_inventory" moduleName="Inventory Management">
                      <Inventory />
                    </ModuleAccessGuard>
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/staff" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <Staff />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/transactions" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <Transactions />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/reports" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <Reports />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/domain" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="custom_domain" moduleName="Custom Domain">
                      <CustomDomain />
                    </ModuleAccessGuard>
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
