import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ValidatedInput } from "@/components/ui/validated-input";
import { ValidatedTextarea } from "@/components/ui/validated-textarea";
import { FormErrorSummary } from "@/components/ui/form-error-summary";
import { FormSuccessMessage } from "@/components/ui/form-success-message";
import { UndoRedoControls } from "@/components/ui/undo-redo-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  StickyNote, 
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
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { useValidation } from "@/hooks/useValidation";
import { useListUndoRedo } from "@/hooks/useUndoRedo";
import { noteSchema } from "@/utils/validation";
import StaffLayout from "@/components/StaffLayout";

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
  const { isDarkMode, themeClasses } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editingStickyNote, setEditingStickyNote] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const noteForm = useForm<Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'author'>>();
  const stickyForm = useForm<{ content: string; color: StickyNote['color'] }>();
  const noteValidation = useValidation(noteSchema);

  // Mock data for development with undo/redo support
  const initialNotes: Note[] = [
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
  ];

  const notesList = useListUndoRedo(initialNotes, {
    maxHistorySize: 20,
    enableShortcuts: true
  });

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

  const getCategoryColor = (category: Note['category']) => {
    switch (category) {
      case "urgent": return themeClasses.status.error;
      case "customer": return themeClasses.status.info;
      case "inventory": return themeClasses.status.warning;
      case "shipping": return themeClasses.status.success;
      case "general": return themeClasses.status.info;
      default: return themeClasses.status.info;
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
    const validationResult = noteValidation.validateForm(data);
    
    if (!validationResult.isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive"
      });
      return;
    }
    
    const newNote: Note = {
      ...validationResult.data!,
      id: `NOTE-${String(notesList.list.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'dev@inktonermoore.com'
    };
    
    notesList.addItem(newNote, `Added note: "${newNote.title}"`);
    noteForm.reset();
    noteValidation.clearErrors();
    setShowSuccess(true);
    
    toast({
      title: "Note Added",
      description: `"${newNote.title}" has been saved`,
    });
    
    // Auto-hide success message
    setTimeout(() => setShowSuccess(false), 3000);
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
    const noteIndex = notesList.list.findIndex(note => note.id === noteId);
    if (noteIndex !== -1) {
      const noteTitle = notesList.list[noteIndex].title;
      notesList.removeItem(noteIndex, `Deleted note: "${noteTitle}"`);
      toast({
        title: "Note Deleted",
        description: `"${noteTitle}" has been removed`,
      });
    }
  };

  const deleteStickyNote = (noteId: string) => {
    setStickyNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
    toast({
      title: "Sticky Note Deleted",
      description: "Reminder removed",
    });
  };

  const filteredNotes = notesList.list.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || note.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <StaffLayout 
      title="Staff Notes"
      icon={StickyNote}
      iconColor="from-yellow-400 to-orange-600"
    >
      <div className="text-center mb-8">
        <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-all duration-500 ${themeClasses.text.primary}`}>
          Notes & Reminders
        </h2>
        <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-all duration-500 ${themeClasses.text.secondary}`}>
          Keep track of important information and quick reminders
        </p>
      </div>

      {/* Undo/Redo Controls */}
      <div className="flex justify-center mb-8">
        <UndoRedoControls
          canUndo={notesList.canUndo}
          canRedo={notesList.canRedo}
          onUndo={notesList.undo}
          onRedo={notesList.redo}
          onClearHistory={notesList.clearHistory}
          showHistory={true}
          history={notesList.history}
          className="bg-white/10 backdrop-blur-sm rounded-lg p-2"
        />
      </div>

        <Tabs defaultValue="notes" className="w-full">
          <TabsList className={`grid w-full grid-cols-2 mb-8 ${themeClasses.card.secondary} backdrop-blur-sm`}>
            <TabsTrigger 
              value="notes" 
              className={`flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white ${themeClasses.text.secondary}`}
            >
              <FileText className="h-4 w-4" />
              <span>Notes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sticky" 
              className={`flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white ${themeClasses.text.secondary}`}
            >
              <StickyNote className="h-4 w-4" />
              <span>Sticky Notes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes">
            {/* Search and Filter */}
            <div className="mb-6 flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-3 h-4 w-4 ${themeClasses.text.muted}`} />
                <Input
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${themeClasses.input}`}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={categoryFilter === "all" ? "default" : "ghost"}
                  onClick={() => setCategoryFilter("all")}
                  className={`${categoryFilter === "all" ? themeClasses.button.primary : themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                >
                  All
                </Button>
                <Button
                  variant={categoryFilter === "urgent" ? "default" : "ghost"}
                  onClick={() => setCategoryFilter("urgent")}
                  className={`${categoryFilter === "urgent" ? themeClasses.button.primary : themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                >
                  Urgent
                </Button>
                <Button
                  variant={categoryFilter === "customer" ? "default" : "ghost"}
                  onClick={() => setCategoryFilter("customer")}
                  className={`${categoryFilter === "customer" ? themeClasses.button.primary : themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                >
                  Customer
                </Button>
                <Button
                  variant={categoryFilter === "inventory" ? "default" : "ghost"}
                  onClick={() => setCategoryFilter("inventory")}
                  className={`${categoryFilter === "inventory" ? themeClasses.button.primary : themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                >
                  Inventory
                </Button>
                <Button
                  variant={categoryFilter === "shipping" ? "default" : "ghost"}
                  onClick={() => setCategoryFilter("shipping")}
                  className={`${categoryFilter === "shipping" ? themeClasses.button.primary : themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                >
                  Shipping
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Note Form */}
              <Card className={`backdrop-blur-xl shadow-2xl ${themeClasses.card.primary}`}>
                <CardHeader>
                  <CardTitle className={`${themeClasses.text.primary} flex items-center space-x-2`}>
                    <Plus className="h-5 w-5" />
                    <span>Add New Note</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {showSuccess && (
                    <FormSuccessMessage
                      message="Note has been successfully added!"
                      className="mb-4"
                      onDismiss={() => setShowSuccess(false)}
                      autoHide
                    />
                  )}
                  
                  {noteValidation.hasAttemptedSubmit && Object.keys(noteValidation.errors).length > 0 && (
                    <FormErrorSummary
                      errors={noteValidation.errors}
                      className="mb-4"
                      onDismiss={noteValidation.clearErrors}
                      showDismiss
                    />
                  )}
                  
                  <form onSubmit={noteForm.handleSubmit(addNote)} className="space-y-4">
                    <ValidatedInput
                      {...noteForm.register('title', { required: true })}
                      label="Title"
                      placeholder="Note title..."
                      required
                      error={noteValidation.errors.title}
                      hint="Enter a descriptive title for your note (minimum 3 characters)"
                    />
                    
                    <div>
                      <Label className={`${themeClasses.text.primary} font-medium`}>
                        Category <span className="text-red-500">*</span>
                      </Label>
                      <select 
                        {...noteForm.register('category', { required: true })}
                        className={`w-full p-2 rounded-md ${themeClasses.input} ${
                          noteValidation.errors.category ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                        style={{
                          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#111827',
                          borderColor: isDarkMode ? '#475569' : '#9ca3af'
                        }}
                      >
                        <option value="">Select a category...</option>
                        <option value="general" style={{backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827'}}>General</option>
                        <option value="customer" style={{backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827'}}>Customer</option>
                        <option value="inventory" style={{backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827'}}>Inventory</option>
                        <option value="shipping" style={{backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827'}}>Shipping</option>
                        <option value="urgent" style={{backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', color: isDarkMode ? '#ffffff' : '#111827'}}>Urgent</option>
                      </select>
                      {noteValidation.errors.category && (
                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                          {noteValidation.errors.category}
                        </p>
                      )}
                    </div>
                    
                    <ValidatedTextarea
                      {...noteForm.register('content', { required: true })}
                      label="Content"
                      placeholder="Write your note here..."
                      required
                      error={noteValidation.errors.content}
                      hint="Provide detailed information (minimum 10 characters)"
                      showCharacterCount
                      maxLength={1000}
                      className="min-h-[100px]"
                    />
                    
                    <Button
                      type="submit"
                      className={`w-full font-bold rounded-xl ${themeClasses.button.primary} ${themeClasses.interactive.focus}`}
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
    </StaffLayout>
  );
};

export default StaffNotes;