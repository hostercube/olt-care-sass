import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageCurrencyProvider } from "@/hooks/useLanguageCurrency";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { SuperAdminRoute } from "@/components/layout/SuperAdminRoute";
import { TenantAccessGuard } from "@/components/layout/TenantAccessGuard";
import { ModuleAccessGuard } from "@/components/layout/ModuleAccessGuard";
import { StaffAuthProvider } from "@/hooks/useStaffPermissions";
import { StaffProtectedRoute } from "@/components/layout/StaffProtectedRoute";

// Staff Portal Pages
import StaffLogin from "./pages/StaffPortal/StaffLogin";
import StaffDashboard from "./pages/StaffPortal/StaffDashboard";
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
import SuperAdminSettings from "./pages/SuperAdmin/Settings";
import NotificationSettingsAdmin from "./pages/SuperAdmin/NotificationSettings";
import CampaignManagement from "./pages/SuperAdmin/CampaignManagement";
import SuperAdminCustomDomains from "./pages/SuperAdmin/CustomDomains";

// ISP Billing Pages
import MySubscription from "./pages/Billing/MySubscription";
import MakePayment from "./pages/Billing/MakePayment";
import BillingHistory from "./pages/Billing/BillingHistory";
import RenewSubscription from "./pages/Billing/RenewSubscription";

// ISP Management Pages
import CustomerManagement from "./pages/ISP/CustomerManagement";
import CustomerProfile from "./pages/ISP/CustomerProfile";
import ISPBilling from "./pages/ISP/Billing";
import ISPDashboard from "./pages/ISP/Dashboard";
import ISPPackages from "./pages/ISP/Packages";
import AreasManagement from "./pages/ISP/AreasManagement";
import ResellersManagement from "./pages/ISP/ResellersManagement";
import ResellerBillingHistory from "./pages/ISP/ResellerBillingHistory";
import MikroTikManagement from "./pages/ISP/MikroTikManagement";
import BillingAutomation from "./pages/ISP/BillingAutomation";
import ISPGatewaySettings from "./pages/ISP/GatewaySettings";
import SMSCenter from "./pages/ISP/SMSCenter";
import BkashPayments from "./pages/ISP/BkashPayments";
import POSInventory from "./pages/ISP/POSInventory";
import Staff from "./pages/ISP/Staff";
import RolesManagement from "./pages/ISP/RolesManagement";
import ResellerRolesManagement from "./pages/ISP/ResellerRolesManagement";
import Transactions from "./pages/ISP/Transactions";
import Reports from "./pages/ISP/Reports";
import CustomDomain from "./pages/ISP/CustomDomain";
import ISPCampaignManagement from "./pages/ISP/CampaignManagement";
import CustomerTypes from "./pages/ISP/CustomerTypes";
import RechargeHistory from "./pages/ISP/RechargeHistory";
import BandwidthManagement from "./pages/ISP/BandwidthManagement";
import ISPSMSTemplates from "./pages/ISP/SMSTemplates";
import ISPEmailTemplates from "./pages/ISP/EmailTemplates";

// Customer Portal Pages
import CustomerLogin from "./pages/CustomerPortal/CustomerLogin";
import CustomerPayBill from "./pages/CustomerPortal/CustomerPayBill";
import CustomerPortalLayout from "./components/customer-portal/CustomerPortalLayout";
import CustomerDashboardContent from "./pages/CustomerPortal/CustomerDashboardContent";
import CustomerBills from "./pages/CustomerPortal/CustomerBills";
import CustomerRecharges from "./pages/CustomerPortal/CustomerRecharges";
import CustomerUsage from "./pages/CustomerPortal/CustomerUsage";
import CustomerProfilePage from "./pages/CustomerPortal/CustomerProfile";
import CustomerSupport from "./pages/CustomerPortal/CustomerSupport";

// Reseller Portal Pages
import ResellerLogin from "./pages/ResellerPortal/ResellerLogin";
import ResellerDashboard from "./pages/ResellerPortal/ResellerDashboard";
import ResellerBilling from "./pages/ResellerPortal/ResellerBilling";
import ResellerCustomers from "./pages/ResellerPortal/ResellerCustomers";
import ResellerTransactions from "./pages/ResellerPortal/ResellerTransactions";
import ResellerSubResellers from "./pages/ResellerPortal/ResellerSubResellers";
import ResellerAreas from "./pages/ResellerPortal/ResellerAreas";
import ResellerProfile from "./pages/ResellerPortal/ResellerProfile";
import ResellerReports from "./pages/ResellerPortal/ResellerReports";

// Additional Pages
import Onboarding from "./pages/Onboarding";
import NotificationPreferences from "./pages/NotificationPreferences";
import ActivityLogs from "./pages/ActivityLogs";
import Invoices from "./pages/Invoices";
import NotificationHistory from "./pages/NotificationHistory";
import TenantLogin from "./pages/TenantLogin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <LanguageCurrencyProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Tenant-specific login pages */}
              <Route path="/t/:tenantSlug" element={<TenantLogin />} />
              
              {/* Redirect /dashboard to /isp (ISP Dashboard is the main tenant dashboard) */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <Navigate to="/isp" replace />
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
              <Route path="/admin/settings" element={
                <SuperAdminRoute>
                  <SuperAdminSettings />
                </SuperAdminRoute>
              } />
              <Route path="/admin/notifications" element={
                <SuperAdminRoute>
                  <NotificationSettingsAdmin />
                </SuperAdminRoute>
              } />
              <Route path="/admin/campaigns" element={
                <SuperAdminRoute>
                  <CampaignManagement />
                </SuperAdminRoute>
              } />
              <Route path="/admin/custom-domains" element={
                <SuperAdminRoute>
                  <SuperAdminCustomDomains />
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
              <Route path="/billing/history" element={
                <ProtectedRoute>
                  <BillingHistory />
                </ProtectedRoute>
              } />
              <Route path="/billing/renew" element={
                <ProtectedRoute>
                  <RenewSubscription />
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
              <Route path="/isp/customer-types" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <CustomerTypes />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/customers/:id" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_customers" moduleName="Customer Profile">
                      <CustomerProfile />
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
              <Route path="/isp/recharge-history" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_billing" moduleName="Recharge History">
                      <RechargeHistory />
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
              <Route path="/isp/reseller-billing" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_resellers" moduleName="Reseller Billing">
                      <ResellerBillingHistory />
                    </ModuleAccessGuard>
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/reseller-roles" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_resellers" moduleName="Reseller Roles">
                      <ResellerRolesManagement />
                    </ModuleAccessGuard>
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/sms-templates" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ISPSMSTemplates />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/email-templates" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ISPEmailTemplates />
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
                      <POSInventory />
                    </ModuleAccessGuard>
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />
              <Route path="/isp/pos" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_inventory" moduleName="Inventory Management">
                      <POSInventory />
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
              <Route path="/isp/roles" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <RolesManagement />
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
              <Route path="/isp/bandwidth" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ModuleAccessGuard module="isp_bandwidth_management" moduleName="Bandwidth Management">
                      <BandwidthManagement />
                    </ModuleAccessGuard>
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
              <Route path="/isp/campaigns" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ISPCampaignManagement />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />

              {/* Customer Portal Routes */}
              <Route path="/portal/login" element={<CustomerLogin />} />
              <Route path="/portal" element={<CustomerPortalLayout />}>
                <Route path="dashboard" element={<CustomerDashboardContent />} />
                <Route path="pay" element={<CustomerPayBill />} />
                <Route path="bills" element={<CustomerBills />} />
                <Route path="recharges" element={<CustomerRecharges />} />
                <Route path="usage" element={<CustomerUsage />} />
                <Route path="profile" element={<CustomerProfilePage />} />
                <Route path="support" element={<CustomerSupport />} />
              </Route>

              {/* Reseller Portal Routes */}
              <Route path="/reseller/login" element={<ResellerLogin />} />
              <Route path="/reseller/dashboard" element={<ResellerDashboard />} />
              <Route path="/reseller/billing" element={<ResellerBilling />} />
              <Route path="/reseller/customers" element={<ResellerCustomers />} />
              <Route path="/reseller/areas" element={<ResellerAreas />} />
              <Route path="/reseller/transactions" element={<ResellerTransactions />} />
              <Route path="/reseller/sub-resellers" element={<ResellerSubResellers />} />
              <Route path="/reseller/profile" element={<ResellerProfile />} />
              <Route path="/reseller/reports" element={<ResellerReports />} />

              {/* Staff Portal Routes */}
              <Route path="/staff/login" element={
                <StaffAuthProvider>
                  <StaffLogin />
                </StaffAuthProvider>
              } />
              <Route path="/staff/dashboard" element={
                <StaffAuthProvider>
                  <StaffProtectedRoute>
                    <StaffDashboard />
                  </StaffProtectedRoute>
                </StaffAuthProvider>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
            </LanguageCurrencyProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
