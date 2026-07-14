import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Search,
  ExternalLink,
  Truck,
  Package,
  Settings,
  Shield,
  ArrowLeft,
  User,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Printer,
  Mail,
  FileText,
  Link as LinkIcon,
  Cloud,
  Building,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import {
  getCollection,
  setDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/firestore";

// Firestore collections. Soft-delete pattern matches the rest of the app:
// the full doc is archived into `deletedDirectoryLinks` before being removed.
const DIRECTORY_COLLECTION = "directoryLinks";
const DELETED_DIRECTORY_COLLECTION = "deletedDirectoryLinks";

type Category = "courier" | "admin" | "shipping" | "other";

// Small, curated icon set: the ones already in use plus a few common extras
// for office/shipping links. Storing the key as a string in Firestore keeps
// docs serializable.
const ICON_OPTIONS = {
  globe: { Icon: Globe, label: "Globe" },
  truck: { Icon: Truck, label: "Truck" },
  package: { Icon: Package, label: "Package" },
  shield: { Icon: Shield, label: "Shield" },
  settings: { Icon: Settings, label: "Settings" },
  printer: { Icon: Printer, label: "Printer" },
  mail: { Icon: Mail, label: "Mail" },
  file: { Icon: FileText, label: "Document" },
  link: { Icon: LinkIcon, label: "Link" },
  cloud: { Icon: Cloud, label: "Cloud" },
  building: { Icon: Building, label: "Building" },
} as const;
type IconKey = keyof typeof ICON_OPTIONS;
const ICON_KEYS = Object.keys(ICON_OPTIONS) as IconKey[];

// Color gradients as literal class strings so Tailwind keeps them in the build.
const COLOR_OPTIONS: { key: string; label: string; gradient: string }[] = [
  { key: "blue", label: "Blue", gradient: "from-blue-500 to-blue-600" },
  { key: "purple", label: "Purple", gradient: "from-purple-500 to-purple-600" },
  { key: "green", label: "Green", gradient: "from-green-500 to-green-600" },
  { key: "amber", label: "Amber", gradient: "from-yellow-600 to-amber-600" },
  { key: "red", label: "Red", gradient: "from-red-500 to-red-600" },
  { key: "cyan", label: "Cyan", gradient: "from-cyan-500 to-blue-600" },
  { key: "rose", label: "Rose", gradient: "from-rose-500 to-pink-600" },
  { key: "emerald", label: "Emerald", gradient: "from-emerald-500 to-green-600" },
];
const gradientFor = (colorKey: string) =>
  COLOR_OPTIONS.find((c) => c.key === colorKey)?.gradient ?? COLOR_OPTIONS[0].gradient;

interface DirectoryLink {
  id: string;
  name: string;
  description: string;
  url: string;
  category: Category;
  iconKey: IconKey;
  colorKey: string;
  isAdmin?: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Seed data used the first time the collection is empty. Mirrors the prior
// hard-coded list so the page is never blank on a fresh install.
const SEED_LINKS: Omit<DirectoryLink, "createdAt" | "updatedAt">[] = [
  {
    id: "purolator-admin",
    name: "Purolator Admin",
    description: "Business account management and shipping tools",
    url: "https://eshiponline.purolator.com/",
    category: "admin",
    iconKey: "shield",
    colorKey: "blue",
    isAdmin: true,
    order: 0,
  },
  {
    id: "fedex-admin",
    name: "FedEx Admin",
    description: "FedEx Ship Manager and account tools",
    url: "https://www.fedex.com/shipping/shipEntryAction.do",
    category: "admin",
    iconKey: "shield",
    colorKey: "purple",
    isAdmin: true,
    order: 1,
  },
  {
    id: "clickship",
    name: "ClickShip",
    description: "Multi-carrier shipping platform",
    url: "https://www.clickship.com/",
    category: "shipping",
    iconKey: "package",
    colorKey: "green",
    order: 2,
  },
  {
    id: "ups",
    name: "UPS",
    description: "United Parcel Service shipping and tracking",
    url: "https://www.ups.com/",
    category: "courier",
    iconKey: "truck",
    colorKey: "amber",
    order: 3,
  },
  {
    id: "fedex",
    name: "FedEx",
    description: "FedEx shipping and tracking services",
    url: "https://www.fedex.com/",
    category: "courier",
    iconKey: "truck",
    colorKey: "purple",
    order: 4,
  },
  {
    id: "purolator",
    name: "Purolator",
    description: "Purolator shipping and tracking",
    url: "https://www.purolator.com/",
    category: "courier",
    iconKey: "truck",
    colorKey: "blue",
    order: 5,
  },
];

const generateDirectoryId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "DIR-";
  for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
};

interface LinkFormValues {
  name: string;
  description: string;
  url: string;
  category: Category;
  iconKey: IconKey;
  colorKey: string;
  isAdmin: boolean;
}

const blankForm: LinkFormValues = {
  name: "",
  description: "",
  url: "",
  category: "other",
  iconKey: "link",
  colorKey: "blue",
  isAdmin: false,
};

const StaffDirectory = () => {
  const { user, logout } = useAuth();
  const { themeClasses, isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [links, setLinks] = useState<DirectoryLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DirectoryLink | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DirectoryLink | null>(null);

  // Load from Firestore. If the collection is empty (first run), seed it with
  // the original built-in tiles so staff have something to start from.
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCollection<DirectoryLink>(DIRECTORY_COLLECTION);
        if (data.length === 0) {
          const now = new Date().toISOString();
          const seeded: DirectoryLink[] = SEED_LINKS.map((l) => ({
            ...l,
            createdAt: now,
            updatedAt: now,
          }));
          await Promise.all(seeded.map((l) => setDocument(DIRECTORY_COLLECTION, l.id, l)));
          setLinks(seeded);
        } else {
          setLinks(data);
        }
      } catch (error) {
        console.error("Failed to load directory links:", error);
        toast({ title: "Error", description: "Failed to load directory from database" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sortedLinks = useMemo(
    () => [...links].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [links],
  );

  const filteredLinks = sortedLinks.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || l.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (category: string) => {
    if (isDarkMode) {
      switch (category) {
        case "admin":
          return "bg-red-500/20 text-red-300 border-red-400/50";
        case "shipping":
          return "bg-green-500/20 text-green-300 border-green-400/50";
        case "courier":
          return "bg-blue-500/20 text-blue-300 border-blue-400/50";
        default:
          return "bg-gray-500/20 text-gray-300 border-gray-400/50";
      }
    }
    switch (category) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-400";
      case "shipping":
        return "bg-green-100 text-green-800 border-green-400";
      case "courier":
        return "bg-blue-100 text-blue-800 border-blue-400";
      default:
        return "bg-slate-200 text-slate-700 border-slate-400";
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const saveNew = async (values: LinkFormValues) => {
    const id = generateDirectoryId();
    const now = new Date().toISOString();
    const newLink: DirectoryLink = {
      id,
      name: values.name.trim(),
      description: values.description.trim(),
      url: values.url.trim(),
      category: values.category,
      iconKey: values.iconKey,
      colorKey: values.colorKey,
      isAdmin: values.isAdmin,
      order: (links.reduce((m, l) => Math.max(m, l.order ?? 0), -1)) + 1,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDocument(DIRECTORY_COLLECTION, id, newLink);
      setLinks((prev) => [...prev, newLink]);
      setAdding(false);
      toast({ title: "Link Added", description: `${newLink.name} added to directory` });
    } catch (error) {
      console.error("Failed to add link:", error);
      toast({ title: "Error", description: "Failed to save link to database" });
    }
  };

  const saveEdit = async (target: DirectoryLink, values: LinkFormValues) => {
    const updatedAt = new Date().toISOString();
    const updated: DirectoryLink = {
      ...target,
      name: values.name.trim(),
      description: values.description.trim(),
      url: values.url.trim(),
      category: values.category,
      iconKey: values.iconKey,
      colorKey: values.colorKey,
      isAdmin: values.isAdmin,
      updatedAt,
    };
    try {
      await updateDocument(DIRECTORY_COLLECTION, target.id, {
        name: updated.name,
        description: updated.description,
        url: updated.url,
        category: updated.category,
        iconKey: updated.iconKey,
        colorKey: updated.colorKey,
        isAdmin: updated.isAdmin,
        updatedAt,
      });
      setLinks((prev) => prev.map((l) => (l.id === target.id ? updated : l)));
      setEditing(null);
      toast({ title: "Link Updated", description: `${updated.name} saved` });
    } catch (error) {
      console.error("Failed to update link:", error);
      toast({ title: "Error", description: "Failed to update link" });
    }
  };

  // Soft delete: archive into `deletedDirectoryLinks` before removing.
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    try {
      await setDocument(DELETED_DIRECTORY_COLLECTION, target.id, {
        ...target,
        deletedAt: new Date().toISOString(),
      });
      await deleteDocument(DIRECTORY_COLLECTION, target.id);
      setLinks((prev) => prev.filter((l) => l.id !== target.id));
      toast({ title: "Link Removed", description: `${target.name} has been removed` });
    } catch (error) {
      console.error("Failed to delete link:", error);
      toast({ title: "Error", description: "Failed to delete link" });
    } finally {
      setPendingDelete(null);
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
              <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-3 rounded-xl shadow-2xl">
                <Globe className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className={`text-xl lg:text-2xl font-bold bg-clip-text text-transparent drop-shadow-lg transition-all duration-300 ${themeClasses.gradient.title}`}>
                  Website Directory
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-colors duration-300 ${themeClasses.text.primary}`}>
            Quick Access Directory
          </h2>
          <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-colors duration-300 ${themeClasses.text.secondary}`}>
            Fast access to commonly used shipping and courier websites
          </p>
        </div>

        {/* Search, filter, and add */}
        <div className="mb-8 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-3 h-4 w-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
            <Input
              placeholder="Search websites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 transition-all duration-300 ${themeClasses.input}`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "admin", "shipping", "courier", "other"] as const).map((c) => (
              <Button
                key={c}
                variant={categoryFilter === c ? "default" : "ghost"}
                onClick={() => setCategoryFilter(c)}
                className={`transition-all duration-300 capitalize ${
                  categoryFilter === c ? themeClasses.button.primary : themeClasses.button.ghost
                }`}
              >
                {c}
              </Button>
            ))}
            <Button
              onClick={() => setAdding(true)}
              className={`font-bold rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tile
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.text.secondary}`} />
          </div>
        )}

        {/* Websites Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLinks.map((link) => {
              const { Icon } = ICON_OPTIONS[link.iconKey] ?? ICON_OPTIONS.link;
              return (
                <Card
                  key={link.id}
                  className={`shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer group ${themeClasses.card.primary}`}
                  onClick={() => window.open(link.url, "_blank")}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`bg-gradient-to-r ${gradientFor(link.colorKey)} p-3 rounded-xl shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex items-center space-x-2">
                        {link.isAdmin && (
                          <Badge variant="outline" className={`${getCategoryBadge("admin")} border text-xs`}>
                            Admin
                          </Badge>
                        )}
                        {/* Edit/delete: stopPropagation so they don't trigger the card's open-link click. */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${themeClasses.button.ghost}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(link);
                          }}
                          aria-label={`Edit ${link.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${themeClasses.button.ghost}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDelete(link);
                          }}
                          aria-label={`Delete ${link.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ExternalLink className={`h-4 w-4 group-hover:text-white transition-colors duration-300 ${themeClasses.text.secondary}`} />
                      </div>
                    </div>
                    <CardTitle className={`text-lg drop-shadow-lg transition-colors duration-300 ${themeClasses.text.primary} group-hover:${themeClasses.link}`}>
                      {link.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className={`text-sm mb-3 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                      {link.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`${getCategoryBadge(link.category)} border text-xs capitalize`}>
                        {link.category}
                      </Badge>
                      <div className={`text-xs font-mono truncate max-w-32 transition-colors duration-300 ${themeClasses.text.muted}`}>
                        {link.url.replace("https://", "").replace("http://", "").replace("www.", "")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && filteredLinks.length === 0 && (
          <div className="text-center py-12">
            <Globe className={`h-16 w-16 mx-auto mb-4 opacity-50 transition-colors duration-300 ${themeClasses.text.muted}`} />
            <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>No websites found</h3>
            <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Try adjusting your search terms or filter</p>
          </div>
        )}
      </main>

      {/* Add dialog */}
      <LinkDialog
        open={adding}
        onOpenChange={(v) => setAdding(v)}
        title="Add Directory Tile"
        description="Add a new website tile to the directory."
        initial={blankForm}
        onSubmit={saveNew}
      />

      {/* Edit dialog */}
      <LinkDialog
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        title="Edit Directory Tile"
        description="Update the title, link, icon, or color for this tile."
        initial={
          editing
            ? {
                name: editing.name,
                description: editing.description,
                url: editing.url,
                category: editing.category,
                iconKey: editing.iconKey,
                colorKey: editing.colorKey,
                isAdmin: !!editing.isAdmin,
              }
            : blankForm
        }
        onSubmit={(v) => editing && saveEdit(editing, v)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this tile?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} will be moved to the archived collection and removed from the
              directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Shared add/edit dialog. The form is re-initialized whenever `initial`
// changes (via the `key` on the inner form) so editing different tiles
// doesn't carry over stale values.
interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initial: LinkFormValues;
  onSubmit: (values: LinkFormValues) => void;
}

const LinkDialog = ({ open, onOpenChange, title, description, initial, onSubmit }: LinkDialogProps) => {
  const { themeClasses } = useTheme();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <LinkForm
          key={`${open}-${initial.name}-${initial.url}`}
          initial={initial}
          themeInputClass={themeClasses.input}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

interface LinkFormProps {
  initial: LinkFormValues;
  themeInputClass: string;
  onSubmit: (values: LinkFormValues) => void;
  onCancel: () => void;
}

const LinkForm = ({ initial, themeInputClass, onSubmit, onCancel }: LinkFormProps) => {
  const { register, handleSubmit, watch, setValue } = useForm<LinkFormValues>({
    defaultValues: initial,
  });
  const iconKey = watch("iconKey");
  const colorKey = watch("colorKey");
  const category = watch("category");
  const isAdmin = watch("isAdmin");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Title</Label>
        <Input
          id="name"
          {...register("name", { required: true })}
          placeholder="e.g. UPS"
          className={themeInputClass}
        />
      </div>
      <div>
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          {...register("url", { required: true })}
          placeholder="https://example.com/"
          className={themeInputClass}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={2}
          {...register("description")}
          placeholder="Short description shown on the tile"
          className={themeInputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(v) => setValue("category", v as Category)}
          >
            <SelectTrigger className={themeInputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="courier">Courier</SelectItem>
              <SelectItem value="shipping">Shipping</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setValue("isAdmin", e.target.checked)}
              className="h-4 w-4"
            />
            Show “Admin” badge
          </label>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Icon</Label>
        <div className="grid grid-cols-6 gap-2">
          {ICON_KEYS.map((key) => {
            const { Icon, label } = ICON_OPTIONS[key];
            const selected = iconKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setValue("iconKey", key)}
                title={label}
                aria-label={label}
                className={`h-12 w-full rounded-lg border-2 flex items-center justify-center transition-all ${
                  selected
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-transparent bg-slate-500/10 hover:bg-slate-500/20"
                }`}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Color</Label>
        <div className="grid grid-cols-8 gap-2">
          {COLOR_OPTIONS.map((c) => {
            const selected = colorKey === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setValue("colorKey", c.key)}
                title={c.label}
                aria-label={c.label}
                className={`h-10 w-full rounded-lg bg-gradient-to-r ${c.gradient} ring-offset-2 transition-all ${
                  selected ? "ring-2 ring-offset-background ring-blue-400 scale-105" : "opacity-80 hover:opacity-100"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Live preview so staff can see the tile look before saving. */}
      <div>
        <Label className="mb-2 block">Preview</Label>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-500/20">
          <div className={`bg-gradient-to-r ${gradientFor(colorKey)} p-3 rounded-xl shadow-lg`}>
            {(() => {
              const { Icon } = ICON_OPTIONS[iconKey] ?? ICON_OPTIONS.link;
              return <Icon className="h-5 w-5 text-white" />;
            })()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{watch("name") || "Title"}</div>
            <div className="text-xs text-muted-foreground truncate">{watch("url") || "https://…"}</div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
};

export default StaffDirectory;
