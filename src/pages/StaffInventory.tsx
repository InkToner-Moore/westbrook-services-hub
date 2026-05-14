import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  Boxes,
  Key,
  KeyRound,
  KeySquare,
  User,
  LogOut,
  Plus,
  Trash2,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import {
  getCollection,
  setDocument,
  updateDocument,
  deleteDocument,
  generateInventoryId,
} from "@/lib/firestore";
import ThemeToggleButton from "@/components/ThemeToggleButton";

interface KeyInventoryItem {
  id: string;
  model: string;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

const KEY_INVENTORY_COLLECTION = "keyInventory";
const DELETED_KEY_INVENTORY_COLLECTION = "deletedKeyInventory";

// Per-key icon variety: derive a stable (Icon, gradient) pair from the model
// name with a small FNV-style hash. Same model => same look across reloads.
// All gradient class names appear as literals here so Tailwind keeps them.
const KEY_ICONS = [Key, KeyRound, KeySquare];
const KEY_GRADIENTS = [
  "from-amber-400 to-orange-600",
  "from-yellow-400 to-amber-600",
  "from-orange-400 to-red-600",
  "from-rose-400 to-pink-600",
  "from-fuchsia-400 to-purple-600",
  "from-violet-400 to-indigo-600",
  "from-blue-400 to-cyan-600",
  "from-sky-400 to-blue-600",
  "from-teal-400 to-emerald-600",
  "from-emerald-400 to-green-600",
  "from-lime-400 to-green-600",
  "from-stone-400 to-zinc-600",
];

const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const getKeyIconStyle = (model: string) => {
  const h = hashString(model.trim().toLowerCase());
  return {
    Icon: KEY_ICONS[h % KEY_ICONS.length],
    gradient: KEY_GRADIENTS[Math.floor(h / KEY_ICONS.length) % KEY_GRADIENTS.length],
  };
};

const StaffInventory = () => {
  const { user, logout } = useAuth();
  const { themeClasses, isDarkMode } = useTheme();
  const [keys, setKeys] = useState<KeyInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const newKeyForm = useForm<{ model: string }>({ defaultValues: { model: "" } });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCollection<KeyInventoryItem>(KEY_INVENTORY_COLLECTION, "createdAt");
        setKeys(data);
      } catch (error) {
        console.error("Failed to load key inventory:", error);
        toast({ title: "Error", description: "Failed to load key inventory from database" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Case-insensitive substring match on model name. Memoized so we don't
  // re-filter on every unrelated re-render once the list gets large.
  const filteredKeys = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return keys;
    return keys.filter((k) => k.model.toLowerCase().includes(q));
  }, [keys, searchTerm]);

  const handleLogout = async () => {
    await logout();
  };

  const stockBadgeClass = (inStock: boolean) => {
    if (isDarkMode) {
      return inStock
        ? "bg-green-500/20 text-green-300 border-green-400/50"
        : "bg-red-500/20 text-red-300 border-red-400/50";
    }
    return inStock
      ? "bg-green-100 text-green-800 border-green-400"
      : "bg-red-100 text-red-800 border-red-400";
  };

  const addKey = async ({ model }: { model: string }) => {
    const trimmed = model.trim();
    if (!trimmed) return;

    const id = generateInventoryId();
    const now = new Date().toISOString();
    const newItem: KeyInventoryItem = {
      id,
      model: trimmed,
      inStock: true,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDocument(KEY_INVENTORY_COLLECTION, id, newItem);
      setKeys((prev) => [newItem, ...prev]);
      newKeyForm.reset();
      toast({ title: "Key Added", description: `${trimmed} added to inventory` });
    } catch (error) {
      console.error("Failed to add key:", error);
      toast({ title: "Error", description: "Failed to save key to database" });
    }
  };

  const toggleStock = async (item: KeyInventoryItem, nextInStock: boolean) => {
    const updatedAt = new Date().toISOString();
    // Optimistic update so the switch feels instant.
    setKeys((prev) =>
      prev.map((k) => (k.id === item.id ? { ...k, inStock: nextInStock, updatedAt } : k)),
    );
    try {
      await updateDocument(KEY_INVENTORY_COLLECTION, item.id, { inStock: nextInStock, updatedAt });
    } catch (error) {
      console.error("Failed to update stock:", error);
      // Roll back on failure.
      setKeys((prev) => prev.map((k) => (k.id === item.id ? item : k)));
      toast({ title: "Error", description: "Failed to update stock status" });
    }
  };

  // Soft delete: archive the full item into `deletedKeyInventory` before
  // removing it. Archived items are never shown in the UI.
  const deleteKey = async (item: KeyInventoryItem) => {
    try {
      await setDocument(DELETED_KEY_INVENTORY_COLLECTION, item.id, {
        ...item,
        deletedAt: new Date().toISOString(),
      });
      await deleteDocument(KEY_INVENTORY_COLLECTION, item.id);
      setKeys((prev) => prev.filter((k) => k.id !== item.id));
      toast({
        title: "Key Removed",
        description: `${item.model} has been moved to deleted inventory`,
      });
    } catch (error) {
      console.error("Failed to delete key:", error);
      toast({ title: "Error", description: "Failed to delete key" });
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses.background}`}>
      {/* Background elements */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse transition-all duration-300 ${themeClasses.backgroundFloating.purple}`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000 transition-all duration-300 ${themeClasses.backgroundFloating.blue}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500 transition-all duration-300 ${themeClasses.backgroundFloating.indigo}`}></div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-50 shadow-2xl transition-colors duration-300 ${themeClasses.header}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link
                to="/staff/dashboard"
                className={`transition-colors mr-4 group ${themeClasses.link}`}
              >
                <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform inline mr-2" />
                Back to Dashboard
              </Link>
              <div className="bg-gradient-to-br from-amber-400 to-orange-600 p-3 rounded-xl shadow-2xl">
                <Boxes className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className={`text-xl lg:text-2xl font-bold bg-clip-text text-transparent drop-shadow-lg transition-all duration-300 ${themeClasses.gradient.title}`}>
                  Inventory
                </h1>
                <p className={`text-xs font-medium transition-colors duration-300 ${themeClasses.text.secondary}`}>Staff Portal</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <ThemeToggleButton />
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className={`rounded-full px-4 py-2 transition-all duration-300 hover:scale-110 ${themeClasses.button.ghost}`}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-colors duration-300 ${themeClasses.text.primary}`}>
            Inventory
          </h2>
          <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-colors duration-300 ${themeClasses.text.secondary}`}>
            Track what's in stock at a glance.
          </p>
        </div>

        <div className={`border rounded-3xl p-8 shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
          <Tabs defaultValue="keys" className="w-full">
            <TabsList className={`grid w-full grid-cols-1 mb-8 backdrop-blur-sm transition-all duration-300 ${themeClasses.card.secondary}`}>
              <TabsTrigger
                value="keys"
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
              >
                <Key className="h-4 w-4" />
                <span>Key Inventory</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="keys">
              {/* Add new key form */}
              <Card className={`mb-8 shadow-lg transition-all duration-300 ${themeClasses.card.secondary}`}>
                <CardHeader>
                  <CardTitle className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.primary}`}>
                    <Plus className="h-5 w-5" />
                    <span>Add Key Model</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={newKeyForm.handleSubmit(addKey)}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <div className="flex-1">
                      <Label className={`sr-only`}>Key model</Label>
                      <Input
                        {...newKeyForm.register("model", { required: true })}
                        placeholder="e.g. Kwikset KW1, Schlage SC1, Mailbox 1646"
                        className={`transition-all duration-300 ${themeClasses.input}`}
                      />
                    </div>
                    <Button
                      type="submit"
                      className={`font-bold rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Search bar — hidden until there's something to search through. */}
              {!loading && keys.length > 0 && (
                <div className="relative mb-4">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                  <Input
                    placeholder="Search keys by model..."
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

              {/* Result count when searching, so staff know if there's more to scroll. */}
              {!loading && keys.length > 0 && searchTerm && (
                <p className={`text-sm mb-3 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                  {filteredKeys.length} of {keys.length} {keys.length === 1 ? "key" : "keys"} match "{searchTerm}"
                </p>
              )}

              {/* List */}
              {loading ? (
                <Card className={`shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
                  <CardContent className="p-12 text-center">
                    <Loader2 className={`h-12 w-12 mx-auto mb-4 animate-spin transition-colors duration-300 ${themeClasses.text.muted}`} />
                    <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Loading inventory...</p>
                  </CardContent>
                </Card>
              ) : keys.length === 0 ? (
                <Card className={`shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
                  <CardContent className="p-12 text-center">
                    <Key className={`h-12 w-12 mx-auto mb-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                    <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>No keys yet</h3>
                    <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>
                      Add your first key model above to start tracking stock.
                    </p>
                  </CardContent>
                </Card>
              ) : filteredKeys.length === 0 ? (
                <Card className={`shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
                  <CardContent className="p-12 text-center">
                    <Search className={`h-12 w-12 mx-auto mb-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                    <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>No matches</h3>
                    <p className={`mb-4 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                      No keys match "{searchTerm}". Try a different search term.
                    </p>
                    <Button
                      variant="ghost"
                      onClick={() => setSearchTerm("")}
                      className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                    >
                      Clear search
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredKeys.map((item) => {
                    const { Icon, gradient } = getKeyIconStyle(item.model);
                    return (
                    <Card key={item.id} className={`shadow-lg transition-all duration-300 ${themeClasses.card.secondary}`}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`bg-gradient-to-br ${gradient} p-2 rounded-lg shadow-md shrink-0`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <p className={`font-semibold truncate transition-colors duration-300 ${themeClasses.text.primary}`}>
                            {item.model}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={`${stockBadgeClass(item.inStock)} border text-xs`}>
                            {item.inStock ? "In Stock" : "Out of Stock"}
                          </Badge>

                          <label className={`flex items-center gap-2 text-sm font-medium cursor-pointer select-none transition-colors duration-300 ${themeClasses.text.secondary}`}>
                            <Switch
                              checked={item.inStock}
                              onCheckedChange={(checked) => toggleStock(item, checked)}
                            />
                            <span className="hidden sm:inline">In stock</span>
                          </label>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`transition-all duration-300 ${themeClasses.button.danger}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this key?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove "{item.model}" from the active inventory.
                                  A copy is kept in deleted inventory so it can be recovered if needed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteKey(item)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default StaffInventory;
