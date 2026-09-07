import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useShell } from "@/components/shell/ShellContext";
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
  Droplets,
  Printer,
  Stamp,
  User,
  LogOut,
  Plus,
  Trash2,
  Loader2,
  Search,
  X,
  MapPin,
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
  generateRefillId,
} from "@/lib/firestore";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import { KeyBoardMap } from "@/components/KeyBoardMap";
import { lookupKeyLocation } from "@/lib/keyLocations";

interface KeyInventoryItem {
  id: string;
  model: string;
  // Selling price before tax. Null when unknown (a few sheet rows had none).
  price: number | null;
  // Alternate names for the same blank, from the price list, kept for search.
  notes?: string;
  // Optional staff-set board location / cut code; wins over the board map.
  cutCode?: string;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

// A toner/cartridge refill in the price list. A cartridge can carry up to three
// prices (Black, Colour, XL); some rows on the source sheet pack several models
// or prices into one cell, so priceNote holds that original text verbatim when
// the numeric fields cannot capture it.
interface RefillItem {
  id: string;
  brand: string;
  cartridge: string;
  priceBlack: number | null;
  priceColour: number | null;
  priceXl: number | null;
  priceNote?: string;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

const KEY_INVENTORY_COLLECTION = "keyInventory";
const DELETED_KEY_INVENTORY_COLLECTION = "deletedKeyInventory";
const REFILL_INVENTORY_COLLECTION = "refillInventory";
const DELETED_REFILL_INVENTORY_COLLECTION = "deletedRefillInventory";

// Format a before-tax price. Returns null when there is no numeric price so the
// caller can fall back to a note or an em-free placeholder.
const money = (n: number | null | undefined): string | null =>
  n === null || n === undefined || Number.isNaN(n) ? null : `$${n.toFixed(2)}`;

// Parse a price field from a form: blank means "no price", not zero.
const parsePrice = (raw: string): number | null => {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

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

// Refills get their own icon set, tinted toward inks so a glance tells the two
// tabs apart. Same brand+cartridge => same look across reloads.
const REFILL_ICONS = [Droplets, Printer, Stamp];
const REFILL_GRADIENTS = [
  "from-cyan-400 to-blue-600",
  "from-sky-400 to-indigo-600",
  "from-blue-400 to-violet-600",
  "from-indigo-400 to-purple-600",
  "from-teal-400 to-cyan-600",
  "from-emerald-400 to-teal-600",
  "from-fuchsia-400 to-pink-600",
  "from-violet-400 to-fuchsia-600",
];

const getRefillIconStyle = (label: string) => {
  const h = hashString(label.trim().toLowerCase());
  return {
    Icon: REFILL_ICONS[h % REFILL_ICONS.length],
    gradient: REFILL_GRADIENTS[Math.floor(h / REFILL_ICONS.length) % REFILL_GRADIENTS.length],
  };
};

const StaffInventory = () => {
  const { user, logout } = useAuth();
  const { themeClasses, isDarkMode } = useTheme();
  const { inShell } = useShell();
  const [keys, setKeys] = useState<KeyInventoryItem[]>([]);
  const [refills, setRefills] = useState<RefillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refillsLoading, setRefillsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refillSearch, setRefillSearch] = useState("");
  const newKeyForm = useForm<{ model: string; price: string }>({
    defaultValues: { model: "", price: "" },
  });
  const newRefillForm = useForm<{
    brand: string;
    cartridge: string;
    priceBlack: string;
    priceColour: string;
    priceXl: string;
  }>({
    defaultValues: { brand: "", cartridge: "", priceBlack: "", priceColour: "", priceXl: "" },
  });

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
    const loadRefills = async () => {
      try {
        const data = await getCollection<RefillItem>(REFILL_INVENTORY_COLLECTION, "createdAt");
        setRefills(data);
      } catch (error) {
        console.error("Failed to load refill inventory:", error);
        toast({ title: "Error", description: "Failed to load refills from database" });
      } finally {
        setRefillsLoading(false);
      }
    };
    load();
    loadRefills();
  }, []);

  // Case-insensitive substring match on model name or its alternate names.
  // Memoized so we don't re-filter on every unrelated re-render once large.
  const filteredKeys = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return keys;
    return keys.filter(
      (k) =>
        k.model.toLowerCase().includes(q) ||
        (k.notes ? k.notes.toLowerCase().includes(q) : false),
    );
  }, [keys, searchTerm]);

  // Refills match on brand or cartridge label.
  const filteredRefills = useMemo(() => {
    const q = refillSearch.trim().toLowerCase();
    if (!q) return refills;
    return refills.filter(
      (r) =>
        r.cartridge.toLowerCase().includes(q) || r.brand.toLowerCase().includes(q),
    );
  }, [refills, refillSearch]);

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

  const priceBadgeClass = isDarkMode
    ? "bg-blue-500/20 text-blue-200 border-blue-400/50"
    : "bg-blue-100 text-blue-800 border-blue-300";

  const addKey = async ({ model, price }: { model: string; price: string }) => {
    const trimmed = model.trim();
    if (!trimmed) return;

    const id = generateInventoryId();
    const now = new Date().toISOString();
    const newItem: KeyInventoryItem = {
      id,
      model: trimmed,
      price: parsePrice(price),
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

  const addRefill = async ({
    brand,
    cartridge,
    priceBlack,
    priceColour,
    priceXl,
  }: {
    brand: string;
    cartridge: string;
    priceBlack: string;
    priceColour: string;
    priceXl: string;
  }) => {
    const cart = cartridge.trim();
    if (!cart) return;

    const id = generateRefillId();
    const now = new Date().toISOString();
    const newItem: RefillItem = {
      id,
      brand: brand.trim(),
      cartridge: cart,
      priceBlack: parsePrice(priceBlack),
      priceColour: parsePrice(priceColour),
      priceXl: parsePrice(priceXl),
      inStock: true,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDocument(REFILL_INVENTORY_COLLECTION, id, newItem);
      setRefills((prev) => [newItem, ...prev]);
      newRefillForm.reset();
      toast({ title: "Refill Added", description: `${newItem.brand} ${cart} added` });
    } catch (error) {
      console.error("Failed to add refill:", error);
      toast({ title: "Error", description: "Failed to save refill to database" });
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

  const toggleRefillStock = async (item: RefillItem, nextInStock: boolean) => {
    const updatedAt = new Date().toISOString();
    setRefills((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, inStock: nextInStock, updatedAt } : r)),
    );
    try {
      await updateDocument(REFILL_INVENTORY_COLLECTION, item.id, { inStock: nextInStock, updatedAt });
    } catch (error) {
      console.error("Failed to update refill stock:", error);
      setRefills((prev) => prev.map((r) => (r.id === item.id ? item : r)));
      toast({ title: "Error", description: "Failed to update stock status" });
    }
  };

  // Soft delete: archive the full item into the deleted collection before
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

  const deleteRefill = async (item: RefillItem) => {
    try {
      await setDocument(DELETED_REFILL_INVENTORY_COLLECTION, item.id, {
        ...item,
        deletedAt: new Date().toISOString(),
      });
      await deleteDocument(REFILL_INVENTORY_COLLECTION, item.id);
      setRefills((prev) => prev.filter((r) => r.id !== item.id));
      toast({
        title: "Refill Removed",
        description: `${item.brand} ${item.cartridge} has been moved to deleted inventory`,
      });
    } catch (error) {
      console.error("Failed to delete refill:", error);
      toast({ title: "Error", description: "Failed to delete refill" });
    }
  };

  // The price line for a refill card: the numeric variants when present, else
  // the original note text, else a quiet placeholder.
  const refillPriceParts = (r: RefillItem): string[] => {
    const parts: string[] = [];
    const b = money(r.priceBlack);
    const c = money(r.priceColour);
    const x = money(r.priceXl);
    if (b) parts.push(`Black ${b}`);
    if (c) parts.push(`Colour ${c}`);
    if (x) parts.push(`XL ${x}`);
    return parts;
  };

  const content = (
    <div className={`border rounded-xl p-4 sm:p-6 ${themeClasses.card.primary}`}>
          <Tabs defaultValue="keys" className="w-full">
            <TabsList className={`grid w-full grid-cols-2 mb-8 ${themeClasses.card.secondary}`}>
              <TabsTrigger
                value="keys"
                className="flex items-center space-x-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white"
              >
                <Key className="h-4 w-4" />
                <span>Key Inventory</span>
              </TabsTrigger>
              <TabsTrigger
                value="refills"
                className="flex items-center space-x-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white"
              >
                <Droplets className="h-4 w-4" />
                <span>Refills</span>
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
                    <div className="sm:w-40">
                      <Label className={`sr-only`}>Price</Label>
                      <Input
                        {...newKeyForm.register("price")}
                        inputMode="decimal"
                        placeholder="Price (before tax)"
                        className={`transition-all duration-300 ${themeClasses.input}`}
                      />
                    </div>
                    <Button
                      type="submit"
                      className={`font-semibold rounded-lg transition-colors ${themeClasses.button.primary}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* The physical key board: every slot, its blank, and the empty spots. */}
              <Card className={`mb-6 shadow-lg transition-all duration-300 ${themeClasses.card.secondary}`}>
                <CardContent className="p-4">
                  <KeyBoardMap onSelect={(model) => setSearchTerm(model)} />
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
                <Card className={themeClasses.card.primary}>
                  <CardContent className="p-12 text-center">
                    <Loader2 className={`h-12 w-12 mx-auto mb-4 animate-spin transition-colors duration-300 ${themeClasses.text.muted}`} />
                    <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Loading inventory...</p>
                  </CardContent>
                </Card>
              ) : keys.length === 0 ? (
                <Card className={themeClasses.card.primary}>
                  <CardContent className="p-12 text-center">
                    <Key className={`h-12 w-12 mx-auto mb-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                    <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>No keys yet</h3>
                    <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>
                      Add your first key model above to start tracking stock.
                    </p>
                  </CardContent>
                </Card>
              ) : filteredKeys.length === 0 ? (
                <Card className={themeClasses.card.primary}>
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
                    const priceText = money(item.price);
                    const location = lookupKeyLocation(item);
                    return (
                    <Card key={item.id} className={`shadow-lg transition-all duration-300 ${themeClasses.card.secondary}`}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`bg-gradient-to-br ${gradient} p-2 rounded-lg shadow-md shrink-0`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className={`font-semibold truncate transition-colors duration-300 ${themeClasses.text.primary}`}>
                              {item.model}
                            </p>
                            {item.notes ? (
                              <p className={`text-xs truncate transition-colors duration-300 ${themeClasses.text.muted}`}>
                                {item.notes}
                              </p>
                            ) : null}
                            {location ? (
                              <p className={`mt-0.5 flex items-center gap-1 text-xs font-mono tabular-nums transition-colors duration-300 ${themeClasses.text.secondary}`}>
                                <MapPin className="h-3 w-3 shrink-0 text-orange-500" />
                                {location}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {priceText ? (
                            <Badge variant="outline" className={`${priceBadgeClass} border text-xs font-mono font-semibold tabular-nums`}>
                              {priceText}
                            </Badge>
                          ) : (
                            <span className={`text-xs transition-colors duration-300 ${themeClasses.text.muted}`}>No price</span>
                          )}
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

            <TabsContent value="refills">
              {/* Add new refill form */}
              <Card className={`mb-8 shadow-lg transition-all duration-300 ${themeClasses.card.secondary}`}>
                <CardHeader>
                  <CardTitle className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.primary}`}>
                    <Plus className="h-5 w-5" />
                    <span>Add Refill</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={newRefillForm.handleSubmit(addRefill)}
                    className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-12"
                  >
                    <div className="sm:col-span-3">
                      <Label className={`sr-only`}>Brand</Label>
                      <Input
                        {...newRefillForm.register("brand")}
                        placeholder="Brand (HP)"
                        className={`transition-all duration-300 ${themeClasses.input}`}
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Label className={`sr-only`}>Cartridge</Label>
                      <Input
                        {...newRefillForm.register("cartridge", { required: true })}
                        placeholder="Cartridge (65XL)"
                        className={`transition-all duration-300 ${themeClasses.input}`}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Label className={`sr-only`}>Black price</Label>
                      <Input
                        {...newRefillForm.register("priceBlack")}
                        inputMode="decimal"
                        placeholder="Black"
                        className={`transition-all duration-300 ${themeClasses.input}`}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Label className={`sr-only`}>Colour price</Label>
                      <Input
                        {...newRefillForm.register("priceColour")}
                        inputMode="decimal"
                        placeholder="Colour"
                        className={`transition-all duration-300 ${themeClasses.input}`}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Label className={`sr-only`}>XL price</Label>
                      <Input
                        {...newRefillForm.register("priceXl")}
                        inputMode="decimal"
                        placeholder="XL"
                        className={`transition-all duration-300 ${themeClasses.input}`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        type="submit"
                        className={`w-full font-semibold rounded-lg transition-colors ${themeClasses.button.primary}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Search bar */}
              {!refillsLoading && refills.length > 0 && (
                <div className="relative mb-4">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                  <Input
                    placeholder="Search refills by brand or cartridge..."
                    value={refillSearch}
                    onChange={(e) => setRefillSearch(e.target.value)}
                    className={`pl-10 pr-10 transition-all duration-300 ${themeClasses.input}`}
                  />
                  {refillSearch && (
                    <button
                      type="button"
                      onClick={() => setRefillSearch("")}
                      aria-label="Clear search"
                      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${themeClasses.text.muted} hover:${themeClasses.text.primary}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {!refillsLoading && refills.length > 0 && refillSearch && (
                <p className={`text-sm mb-3 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                  {filteredRefills.length} of {refills.length} {refills.length === 1 ? "refill" : "refills"} match "{refillSearch}"
                </p>
              )}

              {/* List */}
              {refillsLoading ? (
                <Card className={themeClasses.card.primary}>
                  <CardContent className="p-12 text-center">
                    <Loader2 className={`h-12 w-12 mx-auto mb-4 animate-spin transition-colors duration-300 ${themeClasses.text.muted}`} />
                    <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Loading refills...</p>
                  </CardContent>
                </Card>
              ) : refills.length === 0 ? (
                <Card className={themeClasses.card.primary}>
                  <CardContent className="p-12 text-center">
                    <Droplets className={`h-12 w-12 mx-auto mb-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                    <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>No refills yet</h3>
                    <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>
                      Add a cartridge above to start the refill price list.
                    </p>
                  </CardContent>
                </Card>
              ) : filteredRefills.length === 0 ? (
                <Card className={themeClasses.card.primary}>
                  <CardContent className="p-12 text-center">
                    <Search className={`h-12 w-12 mx-auto mb-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                    <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>No matches</h3>
                    <p className={`mb-4 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                      No refills match "{refillSearch}". Try a different search term.
                    </p>
                    <Button
                      variant="ghost"
                      onClick={() => setRefillSearch("")}
                      className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                    >
                      Clear search
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredRefills.map((item) => {
                    const { Icon, gradient } = getRefillIconStyle(`${item.brand} ${item.cartridge}`);
                    const parts = refillPriceParts(item);
                    return (
                      <Card key={item.id} className={`shadow-lg transition-all duration-300 ${themeClasses.card.secondary}`}>
                        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`bg-gradient-to-br ${gradient} p-2 rounded-lg shadow-md shrink-0`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className={`font-semibold truncate transition-colors duration-300 ${themeClasses.text.primary}`}>
                                {item.brand ? `${item.brand} ` : ""}{item.cartridge}
                              </p>
                              {parts.length > 0 ? (
                                <p className={`text-xs truncate font-mono tabular-nums transition-colors duration-300 ${themeClasses.text.secondary}`}>
                                  {parts.join("   ")}
                                </p>
                              ) : item.priceNote ? (
                                <p className={`text-xs truncate transition-colors duration-300 ${themeClasses.text.muted}`}>
                                  {item.priceNote}
                                </p>
                              ) : (
                                <p className={`text-xs transition-colors duration-300 ${themeClasses.text.muted}`}>No price</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className={`${stockBadgeClass(item.inStock)} border text-xs`}>
                              {item.inStock ? "In Stock" : "Out of Stock"}
                            </Badge>

                            <label className={`flex items-center gap-2 text-sm font-medium cursor-pointer select-none transition-colors duration-300 ${themeClasses.text.secondary}`}>
                              <Switch
                                checked={item.inStock}
                                onCheckedChange={(checked) => toggleRefillStock(item, checked)}
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
                                  <AlertDialogTitle>Delete this refill?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove "{item.brand} {item.cartridge}" from the active list.
                                    A copy is kept in deleted inventory so it can be recovered if needed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteRefill(item)}
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
  );

  if (inShell) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${themeClasses.card.secondary}`}>
            <Boxes className={`h-5 w-5 ${themeClasses.text.secondary}`} />
          </span>
          <div>
            <h1 className={`text-xl font-semibold tracking-tight ${themeClasses.text.primary}`}>Inventory</h1>
            <p className={`text-sm ${themeClasses.text.secondary}`}>Keys and refill prices, in stock at a glance</p>
          </div>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${themeClasses.header}`}>
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
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${themeClasses.card.secondary}`}>
                <Boxes className={`h-6 w-6 ${themeClasses.text.secondary}`} />
              </span>
              <div>
                <h1 className={`text-xl lg:text-2xl font-semibold tracking-tight ${themeClasses.text.primary}`}>
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
                className={`rounded-full px-4 py-2 transition-colors ${themeClasses.button.ghost}`}
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
          <h2 className={`text-2xl sm:text-3xl font-semibold tracking-tight ${themeClasses.text.primary}`}>
            Inventory
          </h2>
          <p className={`mt-2 max-w-2xl mx-auto ${themeClasses.text.secondary}`}>
            Keys and refill prices, in stock at a glance.
          </p>
        </div>

        {content}
      </main>
    </div>
  );
};

export default StaffInventory;
