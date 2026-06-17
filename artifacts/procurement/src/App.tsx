import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/layout/shell";
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

const queryClient = new QueryClient();

function Router() {
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
        <Route component={NotFound} />
      </Switch>
    </Shell>
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
