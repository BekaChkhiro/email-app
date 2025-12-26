"use client";

import { useState, useEffect } from "react";

interface Note {
  id: string;
  note: string;
  createdBy: string | null;
  createdAt: string | null;
}

interface ClientNotesProps {
  clientId: string;
}

export function ClientNotes({ clientId }: ClientNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/notes`)
      .then((res) => res.json())
      .then(setNotes)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote }),
      });

      if (res.ok) {
        const created = await res.json();
        setNotes([created, ...notes]);
        setNewNote("");
      }
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setNotes(notes.filter((n) => n.id !== noteId));
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-10 w-28 rounded-lg" />
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-20 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a note about this client..."
            rows={3}
            className="input-field resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={!newNote.trim() || isSubmitting}
          className="btn-primary"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Adding...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Note
            </span>
          )}
        </button>
      </form>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="empty-state py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">No notes yet</p>
          <p className="text-slate-400 text-sm mt-1">Add your first note above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all duration-200 group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {note.createdBy && (
                    <>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white text-[10px] font-medium">
                        {note.createdBy.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700">{note.createdBy}</span>
                      <span className="text-slate-300">•</span>
                    </>
                  )}
                  <span>{formatDate(note.createdAt)}</span>
                </div>
                {deleteConfirm === note.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(note.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all duration-200 p-1.5 rounded-lg hover:bg-red-50"
                    title="Delete note"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{note.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
