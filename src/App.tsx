import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
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
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/olts" element={
                <ProtectedRoute>
                  <OLTManagement />
                </ProtectedRoute>
              } />
              <Route path="/olts/:id" element={
                <ProtectedRoute>
                  <OLTDetails />
                </ProtectedRoute>
              } />
              <Route path="/onus" element={
                <ProtectedRoute>
                  <ONUDevices />
                </ProtectedRoute>
              } />
              <Route path="/alerts" element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              } />
              <Route path="/monitoring" element={
                <ProtectedRoute>
                  <Monitoring />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              } />
              <Route path="/debug" element={
                <ProtectedRoute>
                  <DebugLogs />
                </ProtectedRoute>
              } />
              <Route path="/integrity" element={
                <ProtectedRoute>
                  <DatabaseIntegrity />
                </ProtectedRoute>
              } />
              
              {/* Super Admin Routes */}
              <Route path="/admin/tenants" element={
                <ProtectedRoute>
                  <TenantManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/packages" element={
                <ProtectedRoute>
                  <PackageManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/payments" element={
                <ProtectedRoute>
                  <PaymentManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/gateways" element={
                <ProtectedRoute>
                  <GatewaySettings />
                </ProtectedRoute>
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

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
