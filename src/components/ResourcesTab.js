import React, { useState } from "react";
import { BookOpen, Plus, Edit2, Trash2, ExternalLink, Search, FolderOpen, Download } from "lucide-react";
import { resourceSeedData } from "../data/resourceSeedData";

function extractSource(url) {
  if (url.startsWith("/resources/")) {
    const ext = url.split(".").pop()?.toLowerCase() || "";
    return ext;
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ResourceForm({ initial, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [url, setUrl] = useState(initial?.url || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!url.trim()) {
      setError("URL is required");
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      setError("Please enter a valid URL (include https://)");
      return;
    }
    setError("");
    onSubmit({ title: title.trim(), url: url.trim(), description: description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-subtle rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(""); }}
          placeholder="Resource title"
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          placeholder="https://..."
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description..."
          rows={2}
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors duration-150"
        >
          {initial ? "Save" : "Add Resource"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const PAGE_SIZE = 20;

export function ResourcesTab({ resources, loading, isAdmin, onAddResource, onUpdateResource, onDeleteResource, onBulkImport }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const handleAdd = async (data) => {
    await onAddResource(data);
    setShowAdd(false);
  };

  const handleUpdate = async (data) => {
    await onUpdateResource(editingResource.id, data);
    setEditingResource(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this resource?")) {
      await onDeleteResource(id);
    }
  };

  const handleSeedResources = async () => {
    if (!onBulkImport) return;
    if (!window.confirm(`Import ${resourceSeedData.length} TDS resources (case files, matterfiles, curriculum)?`)) return;
    setSeeding(true);
    setSeedError("");
    try {
      await onBulkImport(resourceSeedData);
    } catch (err) {
      console.error("Seed failed:", err);
      setSeedError(err.message || "Import failed — check Firestore rules");
    }
    setSeeding(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="glass-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Resources</h2>
          <p className="text-xs text-gray-400">
            {resources.length} resource{resources.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {resources.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                placeholder="Search resources..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 w-full sm:w-64"
              />
            </div>
          )}
          {isAdmin && !showAdd && !editingResource && (
            <>
              {onBulkImport && resources.length === 0 && (
                <button
                  onClick={handleSeedResources}
                  disabled={seeding}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 glass-subtle rounded-lg transition-colors duration-150"
                >
                  <Download className="w-4 h-4" />
                  {seeding ? "Importing..." : "Seed TDS Resources"}
                </button>
              )}
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 glass-subtle rounded-lg transition-colors duration-150"
              >
                <Plus className="w-4 h-4" />
                Add Resource
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <ResourceForm
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Edit form */}
      {editingResource && (
        <ResourceForm
          initial={editingResource}
          onSubmit={handleUpdate}
          onCancel={() => setEditingResource(null)}
        />
      )}

      {seedError && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{seedError}</p>
      )}

      {/* Category filter */}
      {(() => {
        const cats = [...new Set(resources.map((r) => r.category).filter(Boolean))].sort();
        if (cats.length <= 1) return null;
        return (
          <div className="flex flex-wrap gap-1.5">
            {["All", ...cats].map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategoryFilter(cat); setVisibleCount(PAGE_SIZE); }}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors duration-150 ${
                  categoryFilter === cat
                    ? "bg-indigo-500 text-white font-medium"
                    : "glass-subtle text-gray-500 hover:text-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Resources list */}
      {(() => {
        const filtered = resources.filter((r) => {
          if (categoryFilter !== "All" && (r.category || "") !== categoryFilter) return false;
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            (r.title || "").toLowerCase().includes(q) ||
            (r.description || "").toLowerCase().includes(q) ||
            (r.url || "").toLowerCase().includes(q) ||
            (r.category || "").toLowerCase().includes(q)
          );
        });
        const visible = filtered.slice(0, visibleCount);
        const hasMore = visibleCount < filtered.length;

        if (resources.length === 0) return (
          <div className="text-center py-16 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-lg font-medium">No resources yet</p>
            <p className="text-sm mt-1 text-gray-300">
              Check back later for debate guides, articles, and learning materials.
            </p>
          </div>
        );

        if (filtered.length === 0) return (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No resources match your search.</p>
          </div>
        );

        return (
        <div className="space-y-2">
          {visible.map((r) => (
            <div key={r.id} className="glass-subtle rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 transition-colors duration-150"
                  >
                    {r.title}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {r.category && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-xs text-indigo-500">
                        <FolderOpen className="w-2.5 h-2.5 mr-0.5" />
                        {r.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-300">{extractSource(r.url)}</span>
                  </div>
                  {r.description && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{r.description}</p>
                  )}
                  <p className="text-xs text-gray-300 mt-1">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingResource(r)}
                      className="text-gray-400 hover:text-indigo-500 p-1 transition-colors duration-150"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-gray-400 hover:text-red-500 p-1 transition-colors duration-150"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full py-3 text-sm font-medium text-indigo-500 hover:text-indigo-600 glass-subtle rounded-xl transition-colors duration-150"
            >
              Show more ({filtered.length - visibleCount} remaining)
            </button>
          )}
        </div>
        );
      })()}
    </div>
  );
}
