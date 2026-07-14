import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Check,
  ClipboardList,
  Loader2,
  Package,
  Phone,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import StaffLayout from "@/components/StaffLayout";
import {
  getCollection,
  setDocument,
  deleteDocument,
  generateRequestId,
} from "@/lib/firestore";

interface CustomerRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  item: string;
  createdAt: string;
}

type NewRequestFields = Pick<CustomerRequest, 'customerName' | 'customerPhone' | 'item'>;

const REQUESTS_COLLECTION = 'customerRequests';
const COMPLETED_REQUESTS_COLLECTION = 'completedCustomerRequests';

// Marks a form field as required.
const RequiredMark = () => (
  <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
);

const StaffRequests = () => {
  const { themeClasses } = useTheme();
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const newRequestForm = useForm<NewRequestFields>({
    defaultValues: { customerName: '', customerPhone: '', item: '' },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCollection<CustomerRequest>(REQUESTS_COLLECTION, 'createdAt');
        setRequests(data);
      } catch (error) {
        console.error('Failed to load customer requests:', error);
        toast({ title: "Error", description: "Failed to load requests from database" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (request) =>
        request.customerName.toLowerCase().includes(q) ||
        request.customerPhone.includes(searchTerm.trim()) ||
        request.item.toLowerCase().includes(q),
    );
  }, [requests, searchTerm]);

  const addRequest = async (data: NewRequestFields) => {
    const id = generateRequestId();
    const newRequest: CustomerRequest = {
      id,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      item: data.item.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await setDocument(REQUESTS_COLLECTION, id, newRequest);
      setRequests((prev) => [newRequest, ...prev]);
      newRequestForm.reset();
      toast({
        title: "Request Added",
        description: `Logged ${newRequest.item} for ${newRequest.customerName}`,
      });
    } catch (error) {
      console.error('Failed to add customer request:', error);
      toast({ title: "Error", description: "Failed to save request to database" });
    }
  };

  // Completing a request archives the full doc into `completedCustomerRequests`
  // before removing it from the active list — same soft-delete approach the
  // other mini-apps use. Archived requests are never shown in the UI.
  const completeRequest = async (request: CustomerRequest) => {
    try {
      await setDocument(COMPLETED_REQUESTS_COLLECTION, request.id, {
        ...request,
        completedAt: new Date().toISOString(),
      });
      await deleteDocument(REQUESTS_COLLECTION, request.id);

      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      toast({
        title: "Request Completed",
        description: `${request.customerName}'s request has been closed out`,
      });
    } catch (error) {
      console.error('Failed to complete customer request:', error);
      toast({ title: "Error", description: "Failed to complete request" });
    }
  };

  return (
    <StaffLayout
      title="Customer Requests"
      icon={ClipboardList}
      iconColor="from-rose-500 to-pink-600"
    >
      <div className="text-center mb-12">
        <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-colors duration-300 ${themeClasses.text.primary}`}>
          Customer Requests
        </h2>
        <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-colors duration-300 ${themeClasses.text.secondary}`}>
          Keep track of what customers are waiting to hear back on
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add New Request */}
        <div className="lg:col-span-1">
          <Card className={`shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.primary}`}>
                <Plus className="h-5 w-5" />
                <span>New Request</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={newRequestForm.handleSubmit(addRequest)} className="space-y-4">
                <div>
                  <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>
                    Customer Name<RequiredMark />
                  </Label>
                  <Input
                    {...newRequestForm.register('customerName', { required: true })}
                    placeholder="Enter customer name"
                    className={`transition-all duration-300 ${themeClasses.input}`}
                  />
                </div>

                <div>
                  <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>
                    Phone Number<RequiredMark />
                  </Label>
                  <Input
                    {...newRequestForm.register('customerPhone', { required: true })}
                    placeholder="(403) 555-0123"
                    className={`transition-all duration-300 ${themeClasses.input}`}
                  />
                </div>

                <div>
                  <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>
                    Item<RequiredMark />
                  </Label>
                  <Input
                    {...newRequestForm.register('item', { required: true })}
                    placeholder="e.g. Schlage SC1 key, HP 26A toner"
                    className={`transition-all duration-300 ${themeClasses.input}`}
                  />
                </div>

                <Button
                  type="submit"
                  className={`w-full font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Request List */}
        <div className="lg:col-span-2">
          {/* Search bar — hidden until there's something to search through. */}
          {!loading && requests.length > 0 && (
            <div className="relative mb-6">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
              <Input
                placeholder="Search by customer, phone, or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-10 transition-all duration-300 ${themeClasses.input}`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${themeClasses.text.muted} hover:${themeClasses.text.primary}`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {loading ? (
            <Card className={`shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
              <CardContent className="p-12 text-center">
                <Loader2 className={`h-12 w-12 mx-auto mb-4 animate-spin transition-colors duration-300 ${themeClasses.text.muted}`} />
                <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Loading requests...</p>
              </CardContent>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card className={`shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
              <CardContent className="p-12 text-center">
                <ClipboardList className={`h-12 w-12 mx-auto mb-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>
                  {requests.length === 0 ? "No open requests" : "No matches"}
                </h3>
                <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>
                  {requests.length === 0
                    ? "Add a request when a customer asks for something you need to look into."
                    : `No requests match "${searchTerm}". Try a different search term.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className={`shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 min-w-0">
                      <div className={`flex items-center space-x-2 min-w-0 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                        <User className="h-4 w-4 shrink-0" />
                        <span className={`text-sm font-semibold truncate transition-colors duration-300 ${themeClasses.text.primary}`}>
                          {request.customerName}
                        </span>
                      </div>
                      <div className={`flex items-center space-x-2 min-w-0 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                        <Phone className="h-4 w-4 shrink-0" />
                        <span className="text-sm truncate">{request.customerPhone}</span>
                      </div>
                      <div className={`flex items-center space-x-2 min-w-0 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                        <Package className="h-4 w-4 shrink-0" />
                        <span className="text-sm truncate">{request.item}</span>
                      </div>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          className={`font-semibold rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
                          title="Mark this request complete"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Complete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Mark this request complete?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This closes out {request.customerName}'s request for "{request.item}"
                            and removes it from the list. A copy is kept in completed requests.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => completeRequest(request)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Complete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default StaffRequests;
