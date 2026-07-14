import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ValidatedInput } from "@/components/ui/validated-input";
import { ValidatedTextarea } from "@/components/ui/validated-textarea";
import { FormErrorSummary } from "@/components/ui/form-error-summary";
import { FormSuccessMessage } from "@/components/ui/form-success-message";
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
  StickyNote,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { useValidation } from "@/hooks/useValidation";
import { useListUndoRedo } from "@/hooks/useUndoRedo";
import { noteSchema } from "@/utils/validation";
import StaffLayout from "@/components/StaffLayout";
import {
  getCollection,
  setDocument,
  deleteDocument,
  generateNoteId,
} from "@/lib/firestore";

interface Note {
  id: string;
  title: string;
  content: string;
  category: "general" | "customer" | "inventory" | "shipping" | "urgent";
  createdAt: string;
  updatedAt: string;
}

const NOTES_COLLECTION = 'notes';
const DELETED_NOTES_COLLECTION = 'deletedNotes';

const StaffNotes = () => {
  const { themeClasses } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const noteForm = useForm<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>();
  const noteValidation = useValidation(noteSchema);

  const notesList = useListUndoRedo<Note>([], {
    maxHistorySize: 20,
    enableShortcuts: true
  });

  // Load notes from Firestore on mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const data = await getCollection<Note>(NOTES_COLLECTION, 'createdAt');
        notesList.setList(data);
        notesList.clearHistory();
      } catch (error) {
        console.error('Failed to load notes:', error);
        toast({ title: "Error", description: "Failed to load notes from database" });
      } finally {
        setLoading(false);
      }
    };
    loadNotes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800';
      case 'customer': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800';
      case 'inventory': return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800';
      case 'shipping': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200 dark:border-green-800';
      default: return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600';
    }
  };

  const filteredNotes = notesList.list.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || note.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addNote = async (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const validation = noteValidation.validateForm(data);

    if (!validation.isValid) {
      return;
    }

    const noteId = generateNoteId();
    const newNote: Note = {
      id: noteId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDocument(NOTES_COLLECTION, noteId, newNote);
      notesList.addItem(newNote);
      noteForm.reset();
      setShowSuccess(true);

      toast({
        title: "Note Added",
        description: `"${data.title}" has been saved`,
      });

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to add note:', error);
      toast({ title: "Error", description: "Failed to save note to database" });
    }
  };

  const updateNote = async (id: string, data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const validation = noteValidation.validateForm(data);

    if (!validation.isValid) {
      return;
    }

    const existingNoteIndex = notesList.list.findIndex(note => note.id === id);
    if (existingNoteIndex !== -1) {
      const existingNote = notesList.list[existingNoteIndex];
      const updatedNote = {
        ...existingNote,
        ...data,
        updatedAt: new Date().toISOString()
      };

      try {
        await setDocument(NOTES_COLLECTION, id, updatedNote);
        notesList.updateItem(existingNoteIndex, updatedNote);
        setEditingNote(null);
        noteForm.reset();

        toast({
          title: "Note Updated",
          description: `"${data.title}" has been updated`,
        });
      } catch (error) {
        console.error('Failed to update note:', error);
        toast({ title: "Error", description: "Failed to update note" });
      }
    }
  };

  // Soft delete: archive the full note into `deletedNotes` before removing it
  // from the active collection. Archived notes are never shown in the UI.
  const deleteNote = async (id: string) => {
    const index = notesList.list.findIndex(note => note.id === id);
    if (index === -1) return;

    const note = notesList.list[index];
    try {
      await setDocument(DELETED_NOTES_COLLECTION, id, {
        ...note,
        deletedAt: new Date().toISOString(),
      });
      await deleteDocument(NOTES_COLLECTION, id);
      notesList.removeItem(index);
      toast({
        title: "Note Removed",
        description: "Note has been moved to deleted notes",
      });
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast({ title: "Error", description: "Failed to delete note" });
    }
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
    <StaffLayout
      title="Staff Notes"
      subtitle="Keep track of important information and reminders"
      icon={StickyNote}
      iconColor="from-yellow-500 to-orange-600"
    >
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
                          error={noteValidation.errors.title}
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
                          error={noteValidation.errors.content}
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

                </div>

                {/* Loading State */}
                {loading && (
                  <Card className={`${themeClasses.card.primary}`}>
                    <CardContent className="p-12 text-center">
                      <Loader2 className={`h-12 w-12 mx-auto mb-4 animate-spin transition-colors duration-300 ${themeClasses.text.muted}`} />
                      <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Loading notes...</p>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {!loading && (
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

                          {note.updatedAt !== note.createdAt && (
                            <div className={`mt-4 pt-3 border-t text-xs transition-colors duration-300 ${themeClasses.text.muted}`}>
                              <span>Updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
                            </div>
                          )}
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
                )}
              </div>
            </div>
      </div>
    </StaffLayout>
  );
};

export default StaffNotes;
