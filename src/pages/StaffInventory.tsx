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
  ClipboardCheck,
  AlertTriangle,
  Copy,
  DollarSign,
  HelpCircle,
  CheckCircle2,
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
import { ToolPage } from "@/components/shell/ToolPage";
import {
  getKeyBoard,
  buildLocationIndex,
  boardLocationFor,
  computeReviews,
  comparePositions,
  type KeyBoardPosition,
} from "@/lib/keyBoard";

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

// Icon + colour per review-alert kind, for the Review tab.
const REVIEW_META: Record<
  string,
  { Icon: typeof Copy; tint: string }
> = {
  duplicate: { Icon: Copy, tint: "bg-amber-100 text-amber-700" },
  no_price: { Icon: DollarSign, tint: "bg-red-100 text-red-700" },
  flagged: { Icon: AlertTriangle, tint: "bg-amber-100 text-amber-700" },
  unidentified: { Icon: HelpCircle, tint: "bg-slate-100 text-slate-600" },
  not_placed: { Icon: MapPin, tint: "bg-blue-100 text-blue-700" },
};

const REVIEW_NAMES: Record<string, string> = {
  duplicate: "In two spots",
  no_price: "No price",
  flagged: "Flagged on the sheet",
  unidentified: "Not identified",
  not_placed: "Priced, not on the board",
};

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

// Keep a stable icon choice for each model.
const KEY_ICONS = [Key, KeyRound, KeySquare];

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
  };
};

// Keep a stable icon choice for each brand and cartridge.
const REFILL_ICONS = [Droplets, Printer, Stamp];

const getRefillIconStyle = (label: string) => {
  const h = hashString(label.trim().toLowerCase());
  return {
    Icon: REFILL_ICONS[h % REFILL_ICONS.length],
  };
};

const StaffInventory = () => {
  const { user, logout } = useAuth();
  const { themeClasses, isDarkMode } = useTheme();
  const { inShell } = useShell();
  const [keys, setKeys] = useState<KeyInventoryItem[]>([]);
  const [refills, setRefills] = useState<RefillItem[]>([]);
  const [board, setBoard] = useState<KeyBoardPosition[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refillsLoading, setRefillsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refillSearch, setRefillSearch] = useState("");
  const [addingKey, setAddingKey] = useState(false);
  const [addingRefill, setAddingRefill] = useState(false);
  const [reviewKind, setReviewKind] = useState("");
  const [shownReviews, setShownReviews] = useState(25);
  const [activeTab, setActiveTab] = useState("keys");
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
        toast({ title: "Couldn't load inventory", description: "Check the connection and try again." });
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
        toast({ title: "Couldn't load inventory", description: "Check the connection and try again." });
      } finally {
        setRefillsLoading(false);
      }
    };
    const loadBoard = async () => {
      try {
        setBoard(await getKeyBoard());
      } catch (error) {
        console.error("Failed to load key board:", error);
      } finally {
        setBoardLoading(false);
      }
    };
    load();
    loadRefills();
    loadBoard();
  }, []);

  // Merge a single edited board position back into state (keeps board order).
  const applyBoardChange = (updated: KeyBoardPosition) => {
    setBoard((prev) => {
      const rest = prev.filter((p) => p.position !== updated.position);
      return [...rest, updated].sort(comparePositions);
    });
  };

  // code -> board positions, for the per-key location badge and the Review tab.
  const locationIndex = useMemo(() => buildLocationIndex(board), [board]);
  const reviews = useMemo(
    () => computeReviews(board, keys.map((k) => ({ model: k.model, price: k.price }))),
    [board, keys],
  );

  const reviewGroups = useMemo(() => Object.keys(REVIEW_META)
    .map((kind) => ({ kind, alerts: reviews.filter((alert) => alert.kind === kind) }))
    .filter((group) => group.alerts.length > 0), [reviews]);
  const selectedReviewKind = reviewGroups.some((group) => group.kind === reviewKind)
    ? reviewKind : reviewGroups[0]?.kind;
  const selectedReviews = reviewGroups.find((group) => group.kind === selectedReviewKind)?.alerts ?? [];
  const reviewWarningCount = reviews.filter((alert) => alert.severity === "warn").length;

  useEffect(() => {
    setShownReviews(25);
  }, [selectedReviewKind]);

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
      setAddingKey(false);
      toast({ title: "Key added", description: `${trimmed} added to inventory` });
    } catch (error) {
      console.error("Failed to add key:", error);
      toast({ title: "That didn't save", description: "Check the connection and try again." });
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
      setAddingRefill(false);
      toast({ title: "Refill added", description: `${newItem.brand} ${cart} added` });
    } catch (error) {
      console.error("Failed to add refill:", error);
      toast({ title: "That didn't save", description: "Check the connection and try again." });
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
      toast({ title: "That didn't save", description: "Check the connection and try again." });
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
      toast({ title: "That didn't save", description: "Check the connection and try again." });
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
        title: "Key deleted",
        description: `${item.model} has been moved to deleted inventory`,
      });
    } catch (error) {
      console.error("Failed to delete key:", error);
      toast({ title: "That didn't save", description: "Check the connection and try again." });
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
        title: "Refill deleted",
        description: `${item.brand} ${item.cartridge} has been moved to deleted inventory`,
      });
    } catch (error) {
      console.error("Failed to delete refill:", error);
      toast({ title: "That didn't save", description: "Check the connection and try again." });
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

  // The shared tab look (same as SegmentedTabs on the other tool pages): the
  // active tab lifts onto the card surface instead of flooding with colour.
  const tabTrigger = `min-h-[44px] shrink-0 gap-2 rounded-lg px-2 sm:px-4 text-sm font-medium data-[state=active]:shadow-sm ${
    isDarkMode
      ? "data-[state=active]:bg-[#171a21] data-[state=active]:text-[#f3f4f6]"
      : "data-[state=active]:bg-white data-[state=active]:text-[#1a1d23]"
  }`;

  const content = (
    <div className={`border rounded-xl p-4 sm:p-6 ${themeClasses.card.primary}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`mb-6 inline-flex h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-xl border p-1 ${themeClasses.card.secondary}`}>
              <TabsTrigger value="keys" className={tabTrigger}>
                <Key className="hidden h-4 w-4 sm:inline" />
                <span>Keys</span>
              </TabsTrigger>
              <TabsTrigger value="board" className={tabTrigger}>
                <MapPin className="hidden h-4 w-4 sm:inline" />
                <span>Key board</span>
              </TabsTrigger>
              <TabsTrigger value="refills" className={tabTrigger}>
                <Droplets className="hidden h-4 w-4 sm:inline" />
                <span>Refills</span>
              </TabsTrigger>
              <TabsTrigger value="review" className={tabTrigger}>
                <ClipboardCheck className="hidden h-4 w-4 sm:inline" />
                <span>Review</span>
                {reviews.some((r) => r.severity === "warn") && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
                    {reviewWarningCount > 99 ? "99+" : reviewWarningCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* The physical key board, on its own tab so the price list stays short. */}
            <TabsContent value="board">
              <KeyBoardMap
                board={board}
                loading={boardLoading}
                onSelect={(model) => {
                  setSearchTerm(model);
                  setActiveTab("keys");
                }}
                onChange={applyBoardChange}
              />
            </TabsContent>

            <TabsContent value="keys">
              {addingKey && (
                <Card className={`mb-6 shadow-none ${themeClasses.card.secondary}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`text-lg font-semibold ${themeClasses.text.primary}`}>Add a key</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={newKeyForm.handleSubmit(addKey)} className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="new-key-model" className={`font-medium ${themeClasses.text.primary}`}>Key</Label>
                          <Input id="new-key-model" {...newKeyForm.register("model", { required: true })} placeholder="e.g. KW1, SC1, Mailbox 1646" className={`min-h-[44px] ${themeClasses.input}`} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="new-key-price" className={`font-medium ${themeClasses.text.primary}`}>Price before tax</Label>
                          <Input id="new-key-price" {...newKeyForm.register("price")} inputMode="decimal" placeholder="0.00" className={`min-h-[44px] ${themeClasses.input}`} />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="ghost" onClick={() => { newKeyForm.reset(); setAddingKey(false); }} className={`min-h-[44px] ${themeClasses.button.ghost}`}>Cancel</Button>
                        <Button type="submit" className={`min-h-[44px] rounded-lg px-4 font-semibold ${themeClasses.button.primary}`}>Add key</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Search and add controls */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                  <Input
                    placeholder="Search keys by model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`min-h-[44px] pl-10 pr-10 transition-all duration-300 ${themeClasses.input}`}
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
                {!addingKey && (
                  <Button type="button" onClick={() => setAddingKey(true)} className={`min-h-[44px] w-full rounded-lg px-4 font-semibold sm:w-auto ${themeClasses.button.primary}`}>
                    <Plus className="mr-2 h-4 w-4" />Add key
                  </Button>
                )}
              </div>

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
                    const { Icon } = getKeyIconStyle(item.model);
                    const priceText = money(item.price);
                    const location =
                      boardLocationFor(item.model, locationIndex) ??
                      (item.cutCode && item.cutCode.trim() ? item.cutCode.trim() : null);
                    return (
                    <Card key={item.id} className={`shadow-none transition-all duration-300 ${themeClasses.card.secondary}`}>
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                            <Icon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="min-w-0">
                            <p className={`font-semibold truncate transition-colors duration-300 ${themeClasses.text.primary} ${item.inStock ? "" : "opacity-60"}`}>
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

                        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-4">
                          {priceText ? (
                            <Badge variant="outline" className={`${priceBadgeClass} border text-xs font-mono font-semibold tabular-nums`}>
                              {priceText}
                            </Badge>
                          ) : (
                            <span className={`text-xs transition-colors duration-300 ${themeClasses.text.muted}`}>No price</span>
                          )}

                          <label className={`ml-auto flex shrink-0 items-center gap-2 text-sm cursor-pointer select-none ${item.inStock ? themeClasses.text.secondary : "text-red-600 dark:text-red-400 font-medium"}`}>
                            <Switch
                              aria-label={`In stock: ${item.model}`}
                              checked={item.inStock}
                              onCheckedChange={(checked) => toggleStock(item, checked)}
                            />
                            <span>{item.inStock ? "In stock" : "Out of stock"}</span>
                          </label>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete key"
                                className={`min-h-[44px] min-w-[44px] ${themeClasses.button.ghost} hover:text-red-600`}
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
              {addingRefill && (
                <Card className={`mb-6 shadow-none ${themeClasses.card.secondary}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`text-lg font-semibold ${themeClasses.text.primary}`}>Add a refill</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={newRefillForm.handleSubmit(addRefill)} className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                        <div className="space-y-1 sm:col-span-3">
                          <Label htmlFor="new-refill-brand" className={`font-medium ${themeClasses.text.primary}`}>Brand</Label>
                          <Input id="new-refill-brand" {...newRefillForm.register("brand")} placeholder="e.g. HP" className={`min-h-[44px] ${themeClasses.input}`} />
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <Label htmlFor="new-refill-cartridge" className={`font-medium ${themeClasses.text.primary}`}>Cartridge</Label>
                          <Input id="new-refill-cartridge" {...newRefillForm.register("cartridge", { required: true })} placeholder="e.g. 65XL" className={`min-h-[44px] ${themeClasses.input}`} />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="new-refill-priceBlack" className={`font-medium ${themeClasses.text.primary}`}>Black price</Label>
                          <Input id="new-refill-priceBlack" {...newRefillForm.register("priceBlack")} inputMode="decimal" placeholder="0.00" className={`min-h-[44px] ${themeClasses.input}`} />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="new-refill-priceColour" className={`font-medium ${themeClasses.text.primary}`}>Colour price</Label>
                          <Input id="new-refill-priceColour" {...newRefillForm.register("priceColour")} inputMode="decimal" placeholder="0.00" className={`min-h-[44px] ${themeClasses.input}`} />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="new-refill-priceXl" className={`font-medium ${themeClasses.text.primary}`}>XL price</Label>
                          <Input id="new-refill-priceXl" {...newRefillForm.register("priceXl")} inputMode="decimal" placeholder="0.00" className={`min-h-[44px] ${themeClasses.input}`} />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="ghost" onClick={() => { newRefillForm.reset(); setAddingRefill(false); }} className={`min-h-[44px] ${themeClasses.button.ghost}`}>Cancel</Button>
                        <Button type="submit" className={`min-h-[44px] rounded-lg px-4 font-semibold ${themeClasses.button.primary}`}>Add refill</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Search bar */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                  <Input
                    placeholder="Search refills by brand or cartridge..."
                    value={refillSearch}
                    onChange={(e) => setRefillSearch(e.target.value)}
                    className={`min-h-[44px] pl-10 pr-10 transition-all duration-300 ${themeClasses.input}`}
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
                {!addingRefill && (
                  <Button type="button" onClick={() => setAddingRefill(true)} className={`min-h-[44px] w-full rounded-lg px-4 font-semibold sm:w-auto ${themeClasses.button.primary}`}>
                    <Plus className="mr-2 h-4 w-4" />Add refill
                  </Button>
                )}
              </div>

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
                    const { Icon } = getRefillIconStyle(`${item.brand} ${item.cartridge}`);
                    const parts = refillPriceParts(item);
                    return (
                      <Card key={item.id} className={`shadow-none transition-all duration-300 ${themeClasses.card.secondary}`}>
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                              <Icon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="min-w-0">
                              <p className={`font-semibold truncate transition-colors duration-300 ${themeClasses.text.primary} ${item.inStock ? "" : "opacity-60"}`}>
                                {item.brand ? `${item.brand} ` : ""}{item.cartridge}
                              </p>

                            </div>
                          </div>

                          <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-4">
                              {parts.length > 0 ? (
                                <p className={`min-w-0 flex-1 truncate text-xs font-mono tabular-nums transition-colors duration-300 ${themeClasses.text.secondary}`}>
                                  {parts.join("   ")}
                                </p>
                              ) : item.priceNote ? (
                                <p className={`min-w-0 flex-1 truncate text-xs transition-colors duration-300 ${themeClasses.text.muted}`}>
                                  {item.priceNote}
                                </p>
                              ) : (
                                <p className={`min-w-0 flex-1 truncate text-xs transition-colors duration-300 ${themeClasses.text.muted}`}>No price</p>
                              )}

                            <label className={`ml-auto flex shrink-0 items-center gap-2 text-sm cursor-pointer select-none ${item.inStock ? themeClasses.text.secondary : "text-red-600 dark:text-red-400 font-medium"}`}>
                              <Switch
                                aria-label={`In stock: ${item.brand} ${item.cartridge}`}
                              checked={item.inStock}
                                onCheckedChange={(checked) => toggleRefillStock(item, checked)}
                              />
                              <span>{item.inStock ? "In stock" : "Out of stock"}</span>
                            </label>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Delete refill"
                                  className={`min-h-[44px] min-w-[44px] ${themeClasses.button.ghost} hover:text-red-600`}
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

            <TabsContent value="review">
              <div className="mb-4">
                <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Things to look at</h3>
                <p className={`text-sm ${themeClasses.text.secondary}`}>
                  Checks that run by themselves across the key board and the price list. Fix one and it drops off this list.
                </p>
              </div>
              {boardLoading || loading ? (
                <Card className={themeClasses.card.primary}>
                  <CardContent className="p-12 text-center">
                    <Loader2 className={`h-10 w-10 mx-auto mb-3 animate-spin ${themeClasses.text.muted}`} />
                    <p className={themeClasses.text.secondary}>Running the checks...</p>
                  </CardContent>
                </Card>
              ) : reviews.length === 0 ? (
                <Card className={themeClasses.card.primary}>
                  <CardContent className="p-12 text-center">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
                    <h4 className={`text-lg font-semibold mb-1 ${themeClasses.text.primary}`}>All clear</h4>
                    <p className={themeClasses.text.secondary}>Nothing on the board needs attention right now.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <div className="mb-4 flex flex-wrap gap-2" aria-label="Review filters">
                    {reviewGroups.map((group) => (
                      <Button key={group.kind} variant="ghost" aria-pressed={selectedReviewKind === group.kind}
                        onClick={() => { setReviewKind(group.kind); setShownReviews(25); }}
                        className={`min-h-[40px] h-auto rounded-full border px-3.5 py-2 text-sm ${selectedReviewKind === group.kind ? themeClasses.button.primary : themeClasses.button.ghost}`}>
                        {REVIEW_NAMES[group.kind]} <span className="ml-2 font-mono tabular-nums">{group.alerts.length}</span>
                      </Button>
                    ))}
                  </div>
                  {selectedReviews.slice(0, shownReviews).map((alert, i) => {
                    const meta = REVIEW_META[alert.kind];
                    return (
                      <Card key={`${alert.kind}-${i}`} className={`shadow-sm ${themeClasses.card.secondary}`}>
                        <CardContent className="flex items-start gap-3 p-4">
                          <div className={`mt-0.5 rounded-lg p-1.5 shrink-0 ${meta.tint}`}>
                            <meta.Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`font-semibold ${themeClasses.text.primary}`}>{alert.title}</p>
                            <p className={`text-sm ${themeClasses.text.secondary}`}>{alert.detail}</p>
                            {alert.positions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {alert.positions.map((pos) => (
                                  <span
                                    key={pos}
                                    className={`rounded border px-1.5 py-0.5 text-[11px] font-mono ${themeClasses.card.primary} ${themeClasses.text.muted}`}
                                  >
                                    {pos}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {alert.model && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="shrink-0"
                              onClick={() => {
                                setSearchTerm(alert.model!);
                                setActiveTab("keys");
                              }}
                            >
                              <Search className="h-3.5 w-3.5 mr-1" />
                              Find
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  <p className={`pt-2 text-sm ${themeClasses.text.muted}`}>Showing {Math.min(shownReviews, selectedReviews.length)} of {selectedReviews.length}</p>
                  {shownReviews < selectedReviews.length && (
                    <Button variant="ghost" onClick={() => setShownReviews((count) => count + 25)} className={`min-h-[44px] ${themeClasses.button.ghost}`}>Show 25 more</Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
    </div>
  );

  if (inShell) {
    return (
      <ToolPage tool="inventory" subtitle="Key and refill prices, and where each key lives on the board">
        {content}
      </ToolPage>
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
                Back to dashboard
              </Link>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${themeClasses.card.secondary}`}>
                <Boxes className={`h-6 w-6 ${themeClasses.text.secondary}`} />
              </span>
              <div>
                <h1 className={`text-xl lg:text-2xl font-semibold tracking-tight ${themeClasses.text.primary}`}>
                  Inventory
                </h1>
                <p className={`text-xs font-medium transition-colors duration-300 ${themeClasses.text.secondary}`}>Staff portal</p>
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
