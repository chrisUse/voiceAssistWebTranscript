import { useCallback, useEffect, useRef, useState } from "react";
import { useRecorder } from "./hooks/useRecorder";

interface Doc {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function App() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadDocs = useCallback(async () => {
    const res = await fetch("/api/docs/");
    if (res.ok) setDocs(await res.json());
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const openDoc = useCallback((doc: Doc) => {
    setActiveId(doc.id);
    setTitle(doc.title);
    setContent(doc.content);
    setDirty(false);
  }, []);

  const newDoc = useCallback(async () => {
    const date = new Date().toLocaleDateString("de-DE");
    const res = await fetch("/api/docs/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Dokument ${date}`, content: "" }),
    });
    if (res.ok) {
      const doc = await res.json();
      await loadDocs();
      openDoc(doc);
    }
  }, [loadDocs, openDoc]);

  const saveDoc = useCallback(async () => {
    if (!activeId) return;
    const res = await fetch(`/api/docs/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (res.ok) {
      setDirty(false);
      setStatusMsg("Gespeichert");
      await loadDocs();
      setTimeout(() => setStatusMsg(""), 2000);
    }
  }, [activeId, title, content, loadDocs]);

  const deleteDoc = useCallback(
    async (id: number) => {
      if (!confirm("Dokument wirklich löschen?")) return;
      await fetch(`/api/docs/${id}`, { method: "DELETE" });
      await loadDocs();
      if (activeId === id) {
        setActiveId(null);
        setTitle("");
        setContent("");
        setDirty(false);
      }
    },
    [activeId, loadDocs]
  );

  const exportDoc = useCallback(() => {
    if (!activeId) return;
    window.open(`/api/docs/${activeId}/export`, "_blank");
  }, [activeId]);

  const onTranscript = useCallback((text: string) => {
    setContent((prev) => {
      const sep = prev && !prev.endsWith("\n") ? "\n" : "";
      return prev + sep + text;
    });
    setDirty(true);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    });
  }, []);

  const { state: recState, toggle } = useRecorder(onTranscript);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveDoc();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveDoc]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Diktiergerät</h1>
          <button className="btn-primary" onClick={newDoc}>
            + Neu
          </button>
        </div>
        <ul className="doc-list">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className={`doc-item ${doc.id === activeId ? "active" : ""}`}
              onClick={() => openDoc(doc)}
            >
              <span className="doc-title">{doc.title}</span>
              <button
                className="btn-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteDoc(doc.id);
                }}
                title="Löschen"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="editor">
        {activeId ? (
          <>
            <div className="editor-header">
              <input
                className="title-input"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
                placeholder="Titel"
              />
              <div className="editor-actions">
                {dirty && <span className="dirty-badge">ungespeichert</span>}
                {statusMsg && <span className="status-badge">{statusMsg}</span>}
                <button className="btn-secondary" onClick={exportDoc}>
                  Export .txt
                </button>
                <button className="btn-primary" onClick={saveDoc} disabled={!dirty}>
                  Speichern
                </button>
              </div>
            </div>

            <div className="record-bar">
              <button
                className={`record-btn record-btn--${recState}`}
                onClick={toggle}
                disabled={recState === "transcribing"}
              >
                {recState === "idle" && "Aufnahme starten"}
                {recState === "recording" && "Aufnahme stoppen"}
                {recState === "transcribing" && "Transkribiere..."}
              </button>
              {recState === "recording" && (
                <span className="recording-indicator">
                  <span className="recording-dot" />
                  Sprechen Sie jetzt...
                </span>
              )}
            </div>

            <textarea
              ref={textareaRef}
              className="content-editor"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
              placeholder="Inhalt des Dokuments..."
            />
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🎙</div>
            <p>Wählen Sie ein Dokument oder erstellen Sie ein neues.</p>
            <button className="btn-primary" onClick={newDoc}>
              + Neues Dokument
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
