import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useShell } from "@/components/shell/ShellContext";
import { ToolPage } from "@/components/shell/ToolPage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  const { inShell } = useShell();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

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
        toast({ title: "Couldn't load notes", description: "Check the connection and try again." });
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
      setAdding(false);
      setShowSuccess(true);

      toast({
        title: "Note added",
        description: `"${data.title}" has been saved`,
      });

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to add note:', error);
      toast({ title: "That didn't save", description: "Check the connection and try again." });
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
        setAdding(false);

        toast({
          title: "Note updated",
          description: `"${data.title}" has been updated`,
        });
      } catch (error) {
        console.error('Failed to update note:', error);
        toast({ title: "That didn't save", description: "Check the connection and try again." });
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
        title: "Note deleted",
        description: "Note has been moved to deleted notes",
      });
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast({ title: "That didn't save", description: "Check the connection and try again." });
    }
  };

  const startEditing = (note: Note) => {
    setAdding(true);
    setShowSuccess(false);
    noteValidation.clearErrors();
    setEditingNote(note.id);
    noteForm.setValue('title', note.title);
    noteForm.setValue('content', note.content);
    noteForm.setValue('category', note.category);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    noteForm.reset();
    noteValidation.clearErrors();
    setShowSuccess(false);
    setAdding(false);
  };

  const newNoteButton = (
    <Button onClick={() => { cancelEditing(); setAdding(true); }} className={`min-h-[44px] rounded-full px-4 font-semibold ${themeClasses.button.primary}`}>
      <Plus className="h-4 w-4 mr-2" />
      New note
    </Button>
  );

  const content = (
    <>
      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6">
          <FormSuccessMessage
            message="Note saved successfully!"
            onDismiss={() => setShowSuccess(false)}
          />
        </div>
      )}

      <div className="rounded-xl border p-4 sm:p-6 bg-pub-paper border-pub-edge">
        <div className="flex flex-col gap-6">
          {/* Add/Edit Note Form */}
          {adding && (
            <div>
              <Card className="bg-pub-sunk border-pub-edge rounded-xl shadow-none">
                <CardHeader>
                  <CardTitle className="font-display font-semibold text-pub-ink flex items-center gap-2 text-lg">
                    <Plus className="h-5 w-5" />
                    <span>{editingNote ? 'Edit note' : 'Add new note'}</span>
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
                    <Label className="font-medium text-pub-ink">Title</Label>
                    <ValidatedInput
                      {...noteForm.register('title')}
                      placeholder="Enter note title..."
                      error={noteValidation.errors.title}
                      className={`min-h-[44px] ${themeClasses.input}`}
                    />
                  </div>

                  <div>
                    <Label className="font-medium text-pub-ink">Category</Label>
                    <select
                      {...noteForm.register('category')}
                      className={`min-h-[44px] w-full rounded-lg border px-3 text-sm ${themeClasses.input}`}
                    >
                      <option value="general">General</option>
                      <option value="customer">Customer</option>
                      <option value="inventory">Inventory</option>
                      <option value="shipping">Shipping</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <Label className="font-medium text-pub-ink">Content</Label>
                    <ValidatedTextarea
                      {...noteForm.register('content')}
                      placeholder="Enter note content..."
                      error={noteValidation.errors.content}
                      className={`min-h-[120px] ${themeClasses.input}`}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" onClick={cancelEditing} className={`rounded-full min-h-[44px] ${themeClasses.button.ghost}`}>
                      Cancel
                    </Button>
                    <Button type="submit" size="lg" className={`rounded-full min-h-[44px] font-semibold ${themeClasses.button.primary}`}>
                      {editingNote ? 'Update note' : 'Add note'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
          )}

              {/* Notes List */}
          <div>
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pub-muted" />
                  <Input
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 min-h-[44px] ${themeClasses.input}`}
                  />
                </div>
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`min-h-[44px] w-full rounded-lg border px-3 text-sm sm:w-auto ${themeClasses.input}`}
              >
                <option value="all">All categories</option>
                <option value="general">General</option>
                <option value="customer">Customer</option>
                <option value="inventory">Inventory</option>
                <option value="shipping">Shipping</option>
                <option value="urgent">Urgent</option>
              </select>

            </div>

            {/* Loading State */}
            {loading && (
              <Card className="shadow-none rounded-xl bg-pub-paper border-pub-edge">
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-pub-muted" />
                  <p className="text-pub-muted">Loading notes...</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {!loading && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {filteredNotes.map((note) => (
                  <Card key={note.id} className="shadow-none rounded-xl bg-pub-paper border-pub-edge">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-semibold text-pub-ink text-lg mb-2">
                            {note.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <Badge className={getCategoryColor(note.category)}>
                              <Tag className="h-3 w-3 mr-1" />
                              {note.category}
                            </Badge>
                            <div className="flex items-center text-sm text-pub-muted">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(note.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(note)}
                            aria-label={`Edit ${note.title}`}
                            className={`h-11 w-11 ${themeClasses.button.ghost}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Delete note" className={`min-h-[44px] min-w-[44px] ${themeClasses.button.ghost} hover:text-red-600`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-pub-paper border-pub-edge text-pub-ink">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-display font-semibold text-pub-ink">Delete this note?</AlertDialogTitle>
                                <AlertDialogDescription>This removes the note for everyone. It can't be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteNote(note.id)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <p className="leading-relaxed text-pub-muted">
                        {note.content}
                      </p>

                      {note.updatedAt !== note.createdAt && (
                        <div className="mt-4 pt-3 border-t text-xs text-pub-muted">
                          <span>Updated: {new Date(note.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {filteredNotes.length === 0 && (
                  <Card className="shadow-none rounded-xl border-dashed bg-pub-paper border-pub-edge">
                    <CardContent className="p-12 text-center">
                      <FileText className="h-14 w-14 mx-auto mb-4 text-pub-muted" />
                      <h3 className="font-display font-semibold text-pub-ink text-lg mb-2">
                        {searchQuery || selectedCategory !== "all" ? "Nothing matches that search" : "No notes yet"}
                      </h3>
                      {searchQuery || selectedCategory !== "all" ? (
                        <Button variant="ghost" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }} className={`min-h-[44px] ${themeClasses.button.ghost}`}>Clear search</Button>
                      ) : newNoteButton}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  if (inShell) {
    return <ToolPage tool="notes" subtitle="Keep track of important information and reminders" actions={!adding && newNoteButton}>{content}</ToolPage>;
  }

  return (
    <StaffLayout title="Staff Notes" subtitle="Keep track of important information and reminders" icon={StickyNote} iconColor={'text-pub-muted'}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display font-semibold text-pub-ink text-xl">Staff notes</h2>
        {!adding && newNoteButton}
      </div>
      {content}
    </StaffLayout>
  );
};

export default StaffNotes;
