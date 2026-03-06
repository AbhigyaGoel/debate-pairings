import React, { useState, useRef } from "react";
import { Play, Plus, Edit2, Trash2, Upload, Search, Trophy, Calendar, X } from "lucide-react";
import { extractYouTubeId } from "../services/videoService";
import { parseCSVLine } from "../utils/helpers";

function VideoForm({ initial, onSubmit, onCancel }) {
  const [url, setUrl] = useState(initial?.youtubeUrl || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [error, setError] = useState("");

  const videoId = extractYouTubeId(url);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!videoId) {
      setError("Please enter a valid YouTube URL");
      return;
    }
    setError("");
    onSubmit({ title: title.trim(), youtubeUrl: url.trim(), description: description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-subtle rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">YouTube URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(""); }}
          placeholder="Video title"
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

      {/* Thumbnail preview */}
      {videoId && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
            alt="Video thumbnail"
            loading="lazy"
            className="w-full max-w-xs aspect-video object-cover rounded-lg"
          />
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors duration-150"
        >
          {initial ? "Save" : "Add Video"}
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

// Extract the motion text from description, stripping "Winner: ..." line
function getMotionText(video) {
  if (!video.description) return null;
  return video.description.replace(/\nWinner:.*$/i, "").trim() || null;
}

function VideoCard({ video, isAdmin, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const motion = getMotionText(video);

  return (
    <div className="glass-subtle rounded-xl p-4">
      {/* Motion text — primary content, fall back to title */}
      {motion ? (
        <p className="text-sm text-gray-700 leading-relaxed italic mb-3">
          "{motion}"
        </p>
      ) : (
        <p className="text-sm font-medium text-gray-700 mb-3">{video.title}</p>
      )}

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-xs font-medium text-indigo-600">
          <Calendar className="w-3 h-3" />
          {video.tournament || video.title}
        </span>
        {video.winner && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-xs font-medium text-emerald-600">
            <Trophy className="w-3 h-3" />
            {video.winner}
          </span>
        )}
        {isAdmin && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => onEdit(video)}
              className="text-gray-400 hover:text-indigo-500 p-1 transition-colors duration-150"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(video.id)}
              className="text-gray-400 hover:text-red-500 p-1 transition-colors duration-150"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Video embed — click to expand/collapse */}
      {expanded ? (
        <div>
          <div className="rounded-lg overflow-hidden aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${video.youtubeVideoId}?autoplay=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors duration-150"
          >
            <X className="w-3.5 h-3.5" />
            Close video
          </button>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-500 hover:text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 transition-colors duration-150"
        >
          <Play className="w-3.5 h-3.5" fill="currentColor" />
          Watch debate
        </button>
      )}
    </div>
  );
}

const PAGE_SIZE = 12;

export function VideosTab({ videos, loading, isAdmin, onAddVideo, onUpdateVideo, onDeleteVideo, onBulkImport }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const fileRef = useRef(null);

  const handleAdd = async (data) => {
    await onAddVideo(data);
    setShowAdd(false);
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onBulkImport) return;
    const text = await file.text();
    // Merge multi-line quoted fields back into single logical rows
    const rawLines = text.split(/\r?\n/);
    const logicalLines = [];
    let buffer = "";
    for (const line of rawLines) {
      buffer = buffer ? buffer + " " + line : line;
      const quoteCount = (buffer.match(/"/g) || []).length;
      if (quoteCount % 2 === 0) {
        logicalLines.push(buffer);
        buffer = "";
      }
    }
    if (buffer) logicalLines.push(buffer);
    // Skip header row, filter empties
    const dataLines = logicalLines.slice(1).filter((l) => l.trim());
    const parsed = dataLines
      .map((line) => {
        const cols = parseCSVLine(line);
        // Columns: Year, Tournament, Motion, Winner, Link, (empty), (notes)
        const [year, tournament, motion, winner, link] = cols;
        if (!link || !extractYouTubeId(link)) return null;
        return {
          title: tournament || `Debate ${year}`,
          description: motion || "",
          youtubeUrl: link,
          year: year || "",
          tournament: tournament || "",
          winner: winner || "",
        };
      })
      .filter(Boolean);
    if (parsed.length === 0) return;
    if (!window.confirm(`Import ${parsed.length} videos?`)) return;
    setImporting(true);
    setImportError("");
    try {
      await onBulkImport(parsed);
    } catch (err) {
      console.error("Bulk import failed:", err);
      setImportError(err.message || "Import failed — check Firestore rules");
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpdate = async (data) => {
    await onUpdateVideo(editingVideo.id, data);
    setEditingVideo(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this video?")) {
      await onDeleteVideo(id);
    }
  };

  const filtered = videos.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (v.description || "").toLowerCase().includes(q) ||
      (v.title || "").toLowerCase().includes(q) ||
      (v.tournament || "").toLowerCase().includes(q) ||
      (v.winner || "").toLowerCase().includes(q)
    );
  });

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
          <h2 className="text-lg font-semibold text-gray-800">Video Library</h2>
          <p className="text-xs text-gray-400">
            {videos.length} debate video{videos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {videos.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                placeholder="Search motions, tournaments..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 w-full sm:w-64"
              />
            </div>
          )}
          {isAdmin && !showAdd && !editingVideo && (
            <>
              {onBulkImport && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 glass-subtle rounded-lg transition-colors duration-150"
                  >
                    <Upload className="w-4 h-4" />
                    {importing ? "Importing..." : "CSV"}
                  </button>
                </>
              )}
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 glass-subtle rounded-lg transition-colors duration-150"
              >
                <Plus className="w-4 h-4" />
                Add Video
              </button>
            </>
          )}
        </div>
      </div>

      {importError && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{importError}</p>
      )}

      {/* Add form */}
      {showAdd && (
        <VideoForm
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Edit form */}
      {editingVideo && (
        <VideoForm
          initial={editingVideo}
          onSubmit={handleUpdate}
          onCancel={() => setEditingVideo(null)}
        />
      )}

      {/* Videos list */}
      {videos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Play className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-lg font-medium">No videos yet</p>
          <p className="text-sm mt-1 text-gray-300">
            Check back later for debate videos and recordings.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No videos match your search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, visibleCount).map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              isAdmin={isAdmin}
              onEdit={setEditingVideo}
              onDelete={handleDelete}
            />
          ))}
          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full py-3 text-sm font-medium text-indigo-500 hover:text-indigo-600 glass-subtle rounded-xl transition-colors duration-150"
            >
              Show more ({filtered.length - visibleCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
