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

// ISP Billing Pages
import MySubscription from "./pages/Billing/MySubscription";
import MakePayment from "./pages/Billing/MakePayment";

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
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
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
              
              {/* Super Admin Routes - Restricted to super_admin role */}
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

              {/* ISP Billing Routes - Accessible even when subscription expired */}
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
              
              {/* Notification History */}
              <Route path="/notifications/history" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <NotificationHistory />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />

              {/* Activity Logs */}
              <Route path="/activity-logs" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <ActivityLogs />
                  </TenantAccessGuard>
                </ProtectedRoute>
              } />

              {/* Invoices */}
              <Route path="/invoices" element={
                <ProtectedRoute>
                  <TenantAccessGuard>
                    <Invoices />
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
