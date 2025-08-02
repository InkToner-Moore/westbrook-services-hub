import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ValidatedInput } from "@/components/ui/validated-input";
import { ValidatedTextarea } from "@/components/ui/validated-textarea";
import { FormErrorSummary } from "@/components/ui/form-error-summary";
import { FormSuccessMessage } from "@/components/ui/form-success-message";
import { UndoRedoControls } from "@/components/ui/undo-redo-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Plus,
  Trash2,
  Edit,
  Clock,
  Tag,
  FileText,
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

const StaffNotes = () => {
  const { themeClasses } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const noteForm = useForm<Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'author'>>();
  const noteValidation = useValidation(noteSchema);

  // Mock data for development with undo/redo support
  const initialNotes: Note[] = [
    {
      id: "NOTE-001",
      title: "Daily Inventory Check",
      content: "Check toner levels for HP, Canon, and Epson cartridges. Update low stock alerts in system.",
      category: "inventory",
      createdAt: "2024-01-15T09:30:00Z",
      updatedAt: "2024-01-15T09:30:00Z",
      author: "staff@example.com"
    },
    {
      id: "NOTE-002", 
      title: "Customer Follow-up",
      content: "Call Mrs. Johnson about her special order. Tracking number: UPS123456789",
      category: "customer",
      createdAt: "2024-01-14T14:20:00Z",
      updatedAt: "2024-01-14T14:20:00Z",
      author: "staff@example.com"
    },
    {
      id: "NOTE-003",
      title: "Supplier Meeting Notes",
      content: "Discussed bulk pricing for Q2. New discount structure: 10% on orders over $500, 15% over $1000.",
      category: "general",
      createdAt: "2024-01-13T11:45:00Z",
      updatedAt: "2024-01-13T11:45:00Z",
      author: "manager@example.com"
    }
  ];

  const notesList = useListUndoRedo(initialNotes, {
    maxHistorySize: 20,
    enableShortcuts: true
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'customer': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'inventory': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'shipping': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filteredNotes = notesList.items.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || note.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addNote = (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'author'>) => {
    const validation = noteValidation.validateForm(data);
    
    if (!validation.isValid) {
      return;
    }

    const newNote: Note = {
      id: `NOTE-${String(notesList.items.length + 1).padStart(3, '0')}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: "current-user@example.com"
    };
    
    notesList.addItem(newNote);
    noteForm.reset();
    setShowSuccess(true);
    
    toast({
      title: "Note Added",
      description: `"${data.title}" has been saved`,
    });
    
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const updateNote = (id: string, data: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'author'>) => {
    const validation = noteValidation.validateForm(data);
    
    if (!validation.isValid) {
      return;
    }

    const existingNote = notesList.items.find(note => note.id === id);
    if (existingNote) {
      const updatedNote = {
        ...existingNote,
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      notesList.updateItem(id, updatedNote);
      setEditingNote(null);
      noteForm.reset();
      
      toast({
        title: "Note Updated",
        description: `"${data.title}" has been updated`,
      });
    }
  };

  const deleteNote = (id: string) => {
    notesList.removeItem(id);
    toast({
      title: "Note Deleted",
      description: "Note has been removed",
    });
  };

  const startEditing = (note: Note) => {
    setEditingNote(note.id);
    noteForm.setValue('title', note.title);
    noteForm.setValue('content', note.content);
    noteForm.setValue('category', note.category);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    noteForm.reset();
  };

  return (
    <StaffLayout>
      <div className={`min-h-screen transition-colors duration-300 ${themeClasses.background}`}>
        {/* Background elements */}
        <div className="fixed inset-0 -z-10">
          <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse transition-all duration-300 ${themeClasses.backgroundFloating.purple}`}></div>
          <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000 transition-all duration-300 ${themeClasses.backgroundFloating.blue}`}></div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-colors duration-300 ${themeClasses.text.primary}`}>
              Staff Notes
            </h2>
            <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-colors duration-300 ${themeClasses.text.secondary}`}>
              Keep track of important information and reminders
            </p>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="mb-6">
              <FormSuccessMessage 
                message="Note saved successfully!"
                onDismiss={() => setShowSuccess(false)}
              />
            </div>
          )}

          <div className={`border rounded-3xl p-8 shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Add/Edit Note Form */}
              <div className="lg:col-span-1">
                <Card className={`${themeClasses.card.secondary} shadow-xl`}>
                  <CardHeader>
                    <CardTitle className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.primary}`}>
                      <Plus className="h-5 w-5" />
                      <span>{editingNote ? 'Edit Note' : 'Add New Note'}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form 
                      onSubmit={noteForm.handleSubmit(editingNote ? 
                        (data) => updateNote(editingNote, data) : 
                        addNote
                      )} 
                      className="space-y-6"
                    >
                      <FormErrorSummary errors={noteValidation.errors} />
                      
                      <div>
                        <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Title</Label>
                        <ValidatedInput
                          {...noteForm.register('title')}
                          placeholder="Enter note title..."
                          validation={noteValidation}
                          fieldName="title"
                          className={`transition-all duration-300 ${themeClasses.input}`}
                        />
                      </div>
                      
                      <div>
                        <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Category</Label>
                        <select 
                          {...noteForm.register('category')}
                          className={`w-full p-3 rounded-lg transition-all duration-300 ${themeClasses.input}`}
                        >
                          <option value="general">General</option>
                          <option value="customer">Customer</option>
                          <option value="inventory">Inventory</option>
                          <option value="shipping">Shipping</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Content</Label>
                        <ValidatedTextarea
                          {...noteForm.register('content')}
                          placeholder="Enter note content..."
                          validation={noteValidation}
                          fieldName="content"
                          className={`min-h-[120px] transition-all duration-300 ${themeClasses.input}`}
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button 
                          type="submit" 
                          className={`flex-1 font-semibold transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
                        >
                          {editingNote ? 'Update Note' : 'Add Note'}
                        </Button>
                        
                        {editingNote && (
                          <Button 
                            type="button"
                            variant="ghost"
                            onClick={cancelEditing}
                            className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Notes List */}
              <div className="lg:col-span-2">
                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                      <Input
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`pl-10 transition-all duration-300 ${themeClasses.input}`}
                      />
                    </div>
                  </div>
                  
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${themeClasses.input}`}
                  >
                    <option value="all">All Categories</option>
                    <option value="general">General</option>
                    <option value="customer">Customer</option>
                    <option value="inventory">Inventory</option>
                    <option value="shipping">Shipping</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  
                  <UndoRedoControls 
                    canUndo={notesList.canUndo}
                    canRedo={notesList.canRedo}
                    onUndo={notesList.undo}
                    onRedo={notesList.redo}
                    className={themeClasses.button.ghost}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {filteredNotes.map((note) => (
                    <Card key={note.id} className={`transition-all duration-200 hover:shadow-lg ${themeClasses.card.primary}`}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>
                              {note.title}
                            </h3>
                            <div className="flex items-center space-x-3 mb-3">
                              <Badge className={`${getCategoryColor(note.category)} transition-colors duration-300`}>
                                <Tag className="h-3 w-3 mr-1" />
                                {note.category}
                              </Badge>
                              <div className={`flex items-center text-sm transition-colors duration-300 ${themeClasses.text.muted}`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(note.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(note)}
                              className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNote(note.id)}
                              className={`transition-all duration-300 ${themeClasses.button.danger}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className={`leading-relaxed transition-colors duration-300 ${themeClasses.text.secondary}`}>
                          {note.content}
                        </p>
                        
                        <div className={`mt-4 pt-3 border-t flex justify-between text-xs transition-colors duration-300 ${themeClasses.text.muted}`}>
                          <span>By: {note.author}</span>
                          {note.updatedAt !== note.createdAt && (
                            <span>Updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredNotes.length === 0 && (
                    <Card className={`${themeClasses.card.primary} border-dashed`}>
                      <CardContent className="p-12 text-center">
                        <FileText className={`h-16 w-16 mx-auto mb-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
                        <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>
                          {searchQuery || selectedCategory !== "all" ? "No matching notes" : "No notes yet"}
                        </h3>
                        <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>
                          {searchQuery || selectedCategory !== "all" ? 
                            "Try adjusting your search or filter criteria" : 
                            "Create your first note to get started"
                          }
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </StaffLayout>
  );
};

export default StaffNotes;