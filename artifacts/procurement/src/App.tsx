import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/layout/shell";
import { AuthProvider, useAuth } from "@/context/auth-context";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import Suppliers from "@/pages/suppliers";
import Inquiries from "@/pages/inquiries";
import InquiryDetail from "@/pages/inquiry-detail";
import Quotations from "@/pages/quotations";
import QuotationDetail from "@/pages/quotation-detail";
import CustomerPos from "@/pages/customer-pos";
import CustomerPoDetail from "@/pages/customer-po-detail";
import SupplierPos from "@/pages/supplier-pos";
import SupplierPoDetail from "@/pages/supplier-po-detail";
import SupplierRfqs from "@/pages/supplier-rfqs";
import SupplierRfqDetail from "@/pages/supplier-rfq-detail";
import Accounting from "@/pages/accounting";
import DeliveryNotes from "@/pages/delivery-notes";
import DeliveryNoteDetail from "@/pages/delivery-note-detail";
import Invoices from "@/pages/invoices";
import InvoiceDetail from "@/pages/invoice-detail";
import Reports from "@/pages/reports";
import UsersPage from "@/pages/users";
import SupplierPortal from "@/pages/supplier-portal";
import WhatsAppChats from "@/pages/whatsapp-chats";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.jpeg" alt="AL-KHEDIVI" className="h-16 w-auto object-contain" />
          <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/customers" component={Customers} />
        <Route path="/customers/:id" component={Customers} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/suppliers/:id" component={Suppliers} />
        <Route path="/inquiries" component={Inquiries} />
        <Route path="/inquiries/:id" component={InquiryDetail} />
        <Route path="/quotations" component={Quotations} />
        <Route path="/quotations/:id" component={QuotationDetail} />
        <Route path="/customer-pos" component={CustomerPos} />
        <Route path="/customer-pos/:id" component={CustomerPoDetail} />
        <Route path="/supplier-pos" component={SupplierPos} />
        <Route path="/supplier-pos/:id" component={SupplierPoDetail} />
        <Route path="/supplier-rfqs" component={SupplierRfqs} />
        <Route path="/supplier-rfqs/:id" component={SupplierRfqDetail} />
        <Route path="/delivery-notes" component={DeliveryNotes} />
        <Route path="/delivery-notes/:id" component={DeliveryNoteDetail} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/invoices/:id" component={InvoiceDetail} />
        <Route path="/reports" component={Reports} />
        <Route path="/accounting" component={Accounting} />
        <Route path="/users" component={UsersPage} />
        <Route path="/whatsapp-chats" component={WhatsAppChats} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public — no auth required */}
      <Route path="/portal/:token" component={SupplierPortal} />
      {/* Everything else requires auth */}
      <Route>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
