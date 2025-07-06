import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  StickyNote, 
  User, 
  LogOut, 
  Search,
  Plus,
  Trash2,
  Edit,
  Clock,
  Tag,
  FileText,
  Pin,
  Calendar
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Note {
  id: string;
  title: string;
  content: string;
  category: "general" | "customer" | "inventory" | "shipping" | "urgent";
  createdAt: string;
  updatedAt: string;
  author: string;
}

interface StickyNote {
  id: string;
  content: string;
  color: "yellow" | "pink" | "blue" | "green" | "orange";
  position: { x: number; y: number };
  createdAt: string;
}

const StaffNotes = () => {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editingStickyNote, setEditingStickyNote] = useState<string | null>(null);
  
  const noteForm = useForm<Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'author'>>();
  const stickyForm = useForm<{ content: string; color: StickyNote['color'] }>();

  // Mock data for development
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "NOTE-001",
      title: "Customer Follow-up: John Smith",
      content: "Called about HP 564XL cartridge refill. Need to contact when ready. Phone: 403-555-0123",
      category: "customer",
      createdAt: "2024-01-18T10:30:00Z",
      updatedAt: "2024-01-18T10:30:00Z",
      author: "dev@inktonermoore.com"
    },
    {
      id: "NOTE-002",
      title: "Inventory Alert",
      content: "Running low on Canon PG-245 cartridges. Need to reorder by end of week.",
      category: "inventory",
      createdAt: "2024-01-17T14:15:00Z",
      updatedAt: "2024-01-17T14:15:00Z",
      author: "dev@inktonermoore.com"
    },
    {
      id: "NOTE-003",
      title: "Shipping Process Update",
      content: "New Purolator rates effective Monday. Update pricing calculator accordingly.",
      category: "shipping",
      createdAt: "2024-01-16T09:00:00Z",
      updatedAt: "2024-01-18T11:00:00Z",
      author: "dev@inktonermoore.com"
    }
  ]);

  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([
    {
      id: "STICKY-001",
      content: "Remember to call supplier about bulk discount!",
      color: "yellow",
      position: { x: 50, y: 50 },
      createdAt: "2024-01-18T12:00:00Z"
    },
    {
      id: "STICKY-002",
      content: "Order more key blanks",
      color: "pink",
      position: { x: 250, y: 80 },
      createdAt: "2024-01-18T13:30:00Z"
    },
    {
      id: "STICKY-003",
      content: "Update website banner",
      color: "blue",
      position: { x: 450, y: 120 },
      createdAt: "2024-01-18T14:00:00Z"
    }
  ]);

  const handleLogout = async () => {
    await logout();
  };

  const getCategoryColor = (category: Note['category']) => {
    switch (category) {
      case "urgent": return "bg-red-500/20 text-red-300 border-red-400/50";
      case "customer": return "bg-blue-500/20 text-blue-300 border-blue-400/50";
      case "inventory": return "bg-orange-500/20 text-orange-300 border-orange-400/50";
      case "shipping": return "bg-green-500/20 text-green-300 border-green-400/50";
      case "general": return "bg-purple-500/20 text-purple-300 border-purple-400/50";
      default: return "bg-gray-500/20 text-gray-300 border-gray-400/50";
    }
  };

  const getStickyNoteStyle = (color: StickyNote['color']) => {
    switch (color) {
      case "yellow": return "bg-yellow-200 border-yellow-300 text-yellow-900 shadow-yellow-200/50";
      case "pink": return "bg-pink-200 border-pink-300 text-pink-900 shadow-pink-200/50";
      case "blue": return "bg-blue-200 border-blue-300 text-blue-900 shadow-blue-200/50";
      case "green": return "bg-green-200 border-green-300 text-green-900 shadow-green-200/50";
      case "orange": return "bg-orange-200 border-orange-300 text-orange-900 shadow-orange-200/50";
      default: return "bg-yellow-200 border-yellow-300 text-yellow-900 shadow-yellow-200/50";
    }
  };

  const addNote = (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'author'>) => {
    const newNote: Note = {
      ...data,
      id: `NOTE-${String(notes.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: user?.email || 'Unknown'
    };
    
    setNotes(prevNotes => [newNote, ...prevNotes]);
    noteForm.reset();
    
    toast({
      title: "Note Added",
      description: `"${newNote.title}" has been saved`,
    });
  };

  const addStickyNote = (data: { content: string; color: StickyNote['color'] }) => {
    const newStickyNote: StickyNote = {
      id: `STICKY-${String(stickyNotes.length + 1).padStart(3, '0')}`,
      content: data.content,
      color: data.color,
      position: { 
        x: Math.random() * 300 + 50, 
        y: Math.random() * 200 + 50 
      },
      createdAt: new Date().toISOString()
    };
    
    setStickyNotes(prevNotes => [...prevNotes, newStickyNote]);
    stickyForm.reset();
    
    toast({
      title: "Sticky Note Added",
      description: "New reminder created",
    });
  };

  const deleteNote = (noteId: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
    toast({
      title: "Note Deleted",
      description: `Note ${noteId} has been removed`,
    });
  };

  const deleteStickyNote = (noteId: string) => {
    setStickyNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
    toast({
      title: "Sticky Note Deleted",
      description: "Reminder removed",
    });
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || note.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const isDev = import.meta.env.VITE_NODE_ENV === 'development';
  const bypassAuth = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-blue-900 to-purple-900">
      {/* Background elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="backdrop-blur-xl bg-white/10 border-b border-white/20 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link 
                to="/staff/dashboard"
                className="text-blue-200 hover:text-white transition-colors mr-4 group"
              >
                <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform inline mr-2" />
                Back to Dashboard
              </Link>
              <div className="bg-gradient-to-br from-yellow-400 to-orange-600 p-3 rounded-xl shadow-2xl">
                <StickyNote className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100 drop-shadow-lg">
                  Staff Notes
                </h1>
                <p className="text-xs font-medium text-blue-200">Staff Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isDev && bypassAuth && (
                <div className="text-xs px-2 py-1 bg-orange-500/20 border border-orange-400/50 rounded text-orange-200">
                  DEV MODE
                </div>
              )}
              <div className="flex items-center space-x-2 text-blue-200">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 transition-all duration-300 hover:scale-110"
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
          <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-2xl">
            Notes & Reminders
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto drop-shadow-lg">
            Keep track of important information and quick reminders
          </p>
        </div>

        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/20 backdrop-blur-sm">
            <TabsTrigger 
              value="notes" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white"
            >
              <FileText className="h-4 w-4" />
              <span>Notes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sticky" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
            >
              <StickyNote className="h-4 w-4" />
              <span>Sticky Notes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes">
            {/* Search and Filter */}
            <div className="mb-6 flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                <Input
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={categoryFilter === "all" ? "default" : "ghost"}
                  onClick={() => setCategoryFilter("all")}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  All
                </Button>
                <Button
                  variant={categoryFilter === "urgent" ? "default" : "ghost"}
                  onClick={() => setCategoryFilter("urgent")}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  Urgent
                </Button>
                <Button
                  variant={categoryFilter === "customer" ? "default" : "ghost"}
                  onClick={() => setCategoryFilter("customer")}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  Customer
                </Button>
                <Button
                  variant={categoryFilter === "inventory" ? "default" : "ghost"}
                  onClick={() => setCategoryFilter("inventory")}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  Inventory
                </Button>
                <Button
                  variant={categoryFilter === "shipping" ? "default" : "ghost"}
                  onClick={() => setCategoryFilter("shipping")}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  Shipping
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Note Form */}
              <Card className="backdrop-blur-xl bg-white/15 border-white/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Add New Note</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={noteForm.handleSubmit(addNote)} className="space-y-4">
                    <div>
                      <Label className="text-white font-medium">Title</Label>
                      <Input
                        {...noteForm.register('title', { required: true })}
                        placeholder="Note title..."
                        className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white font-medium">Category</Label>
                      <select 
                        {...noteForm.register('category', { required: true })}
                        className="w-full p-2 rounded-md bg-white/10 border border-white/30 text-white"
                      >
                        <option value="general">General</option>
                        <option value="customer">Customer</option>
                        <option value="inventory">Inventory</option>
                        <option value="shipping">Shipping</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-white font-medium">Content</Label>
                      <Textarea
                        {...noteForm.register('content', { required: true })}
                        placeholder="Write your note here..."
                        className="bg-white/10 border-white/30 text-white placeholder:text-blue-200 min-h-[100px]"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white font-bold rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Notes List */}
              <div className="lg:col-span-2 space-y-4">
                {filteredNotes.map((note) => (
                  <Card key={note.id} className="backdrop-blur-xl bg-white/15 border-white/30 shadow-2xl">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-lg mb-2">{note.title}</CardTitle>
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={`${getCategoryColor(note.category)} border text-xs`}>
                              <Tag className="h-3 w-3 mr-1" />
                              {note.category}
                            </Badge>
                            <div className="flex items-center text-blue-200 text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(note.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNote(editingNote === note.id ? null : note.id)}
                            className="text-blue-200 hover:text-white hover:bg-blue-500/20"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNote(note.id)}
                            className="text-red-300 hover:text-white hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-blue-100 whitespace-pre-wrap">{note.content}</p>
                      <div className="mt-3 text-xs text-blue-300">
                        By {note.author}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredNotes.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-blue-300 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold text-white mb-2">No notes found</h3>
                    <p className="text-blue-200">Create your first note or adjust your search</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sticky">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Add Sticky Note Form */}
              <Card className="backdrop-blur-xl bg-white/15 border-white/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Add Sticky Note</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={stickyForm.handleSubmit(addStickyNote)} className="space-y-4">
                    <div>
                      <Label className="text-white font-medium">Content</Label>
                      <Textarea
                        {...stickyForm.register('content', { required: true })}
                        placeholder="Quick reminder..."
                        className="bg-white/10 border-white/30 text-white placeholder:text-blue-200 min-h-[80px]"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white font-medium">Color</Label>
                      <select 
                        {...stickyForm.register('color', { required: true })}
                        className="w-full p-2 rounded-md bg-white/10 border border-white/30 text-white"
                      >
                        <option value="yellow">Yellow</option>
                        <option value="pink">Pink</option>
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="orange">Orange</option>
                      </select>
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sticky Note
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Sticky Notes Board */}
              <div className="lg:col-span-3">
                <div className="relative min-h-[600px] bg-white/5 rounded-xl border border-white/20 p-6">
                  <div className="absolute top-4 left-4 text-white/60 text-sm flex items-center">
                    <Pin className="h-4 w-4 mr-1" />
                    Sticky Notes Board
                  </div>
                  
                  {stickyNotes.map((stickyNote) => (
                    <div
                      key={stickyNote.id}
                      className={`absolute w-48 h-48 p-4 rounded-lg border-2 ${getStickyNoteStyle(stickyNote.color)} shadow-xl transform rotate-1 hover:rotate-0 transition-transform cursor-move`}
                      style={{
                        left: stickyNote.position.x,
                        top: stickyNote.position.y,
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="w-4 h-4 rounded-full bg-black/20"></div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteStickyNote(stickyNote.id)}
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed break-words overflow-hidden">{stickyNote.content}</p>
                      <div className="absolute bottom-2 right-2 text-xs opacity-60">
                        {new Date(stickyNote.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  
                  {stickyNotes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <StickyNote className="h-16 w-16 text-white/30 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white/60 mb-2">No sticky notes yet</h3>
                        <p className="text-white/40">Add your first quick reminder</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StaffNotes;