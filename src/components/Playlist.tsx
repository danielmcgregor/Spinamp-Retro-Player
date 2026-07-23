import React, { useState, useRef, useId, useMemo, useCallback } from 'react';
import { Track, SkinType } from '../types';
import { 
  Plus, Trash2, Search, Upload, Play, Music, FolderOpen,
  ChevronUp, ChevronDown, GripVertical, ArrowUpDown
} from 'lucide-react';
import { isAndroidWebView } from '../utils/platformDetect';
import { 
  isAndroidFileBridgeAvailable, 
  pickFilesViaAndroidBridge, 
  pickFolderViaAndroidBridge 
} from '../utils/androidFileBridge';

const TrackItem = React.memo<{
  track: Track;
  isActive: boolean;
  index: number;
  onSelect: (t: Track) => void;
  onRate?: (id: string, stars: number) => void;
  onRemove?: (id: string) => void;
  skin: SkinType;
  isItemDragged: boolean;
  isItemOver: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onTouchStart: (e: React.TouchEvent, idx: number) => void;
  onReimportTrack?: (id: string) => void;
  formatDurationHelper: (secs: number) => string;
}>(({
  track,
  isActive,
  index,
  onSelect,
  onRate,
  onRemove,
  skin,
  isItemDragged,
  isItemOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onTouchStart,
  onReimportTrack,
  formatDurationHelper
}) => {
  const isNotLoaded = track.file === undefined && track.url === undefined;

  if (skin === 'classic') {
    return (
      <div
        onClick={() => {
          if (isNotLoaded) {
            onReimportTrack?.(track.id);
          } else {
            onSelect(track);
          }
        }}
        data-track-index={index}
        draggable={true}
        onDragStart={(e) => onDragStart(e, track.id)}
        onDragOver={(e) => onDragOver(e, track.id)}
        onDrop={(e) => onDrop(e, track.id)}
        onDragEnd={onDragEnd}
        title={isNotLoaded ? "File not available - click to re-import" : undefined}
        className={`group flex justify-between items-center py-1 px-1.5 rounded hover:bg-neutral-900/60 border cursor-pointer transition-all duration-150 ${
          isNotLoaded
            ? 'border-transparent text-neutral-500 opacity-60 hover:bg-neutral-900/20'
            : isActive
              ? 'bg-neutral-800 text-white font-bold border-neutral-700/50'
              : 'border-transparent text-zinc-400'
        } ${isItemDragged ? 'opacity-35 scale-[0.98] border-emerald-500/30 bg-[#00ff44]/5' : ''} ${
          isItemOver ? 'border-t border-[#00ff44] bg-[#00ff44]/10' : ''
        }`}
      >
        <div className="flex items-center gap-1 truncate flex-1 md:gap-1.5">
          {/* Visual drag grip handle */}
          <div
            onTouchStart={(e) => onTouchStart(e, index)}
            className="touch-none shrink-0"
            role="button"
            aria-label="Drag handle to reorder track"
          >
            <GripVertical className="w-3 h-3 text-neutral-600 opacity-60 md:opacity-40 md:group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity" />
          </div>
          
          <span className="text-[8px] text-zinc-500 font-normal w-4 text-right shrink-0">
            {index + 1}.
          </span>
          
          {isNotLoaded ? (
            <FolderOpen className="w-3 h-3 text-neutral-500 shrink-0" />
          ) : isActive ? (
            <Play className="w-2 h-2 fill-[#00ff44] text-[#00ff44] animate-pulse shrink-0" />
          ) : null}

          <span className="truncate">{track.title}</span>
          <span className="text-[8px] text-zinc-500 font-normal truncate">
            - {track.artist}
          </span>

          {isNotLoaded && (
            <span className="text-[7.5px] text-amber-500 font-mono shrink-0 bg-amber-500/10 px-1 rounded border border-amber-500/20 leading-none py-0.5">
              ⚠️ File not loaded
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {isNotLoaded ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReimportTrack?.(track.id);
              }}
              className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black font-mono text-[8px] font-bold rounded uppercase transition cursor-pointer"
            >
              Re-import
            </button>
          ) : (
            <span className="text-[9px] text-[#00ff44]/75 font-mono">
              {formatDurationHelper(track.duration)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (isNotLoaded) {
          onReimportTrack?.(track.id);
        } else {
          onSelect(track);
        }
      }}
      data-track-index={index}
      draggable={true}
      onDragStart={(e) => onDragStart(e, track.id)}
      onDragOver={(e) => onDragOver(e, track.id)}
      onDrop={(e) => onDrop(e, track.id)}
      onDragEnd={onDragEnd}
      title={isNotLoaded ? "File not available - click to re-import" : undefined}
      className={`group flex justify-between items-center py-1.5 px-2.5 my-1.5 rounded-md border cursor-pointer select-none transition-all duration-150 ${
        isNotLoaded
          ? 'border-transparent text-neutral-500 opacity-60 hover:bg-[#1a1b1e]'
          : isActive
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 font-semibold shadow-sm'
            : 'border-transparent text-neutral-400 hover:bg-[#1a1b1e]'
      } ${isItemDragged ? 'opacity-35 scale-[0.98] border-amber-500/30 bg-amber-500/5' : ''} ${
        isItemOver ? 'border-amber-500/60 bg-amber-500/5' : ''
      }`}
    >
      <div className="flex items-center gap-2 truncate flex-1 animate-fade-in">
        {/* Visual drag handle */}
        <div
          onTouchStart={(e) => onTouchStart(e, index)}
          className="touch-none shrink-0"
          role="button"
          aria-label="Drag handle to reorder track"
        >
          <GripVertical className="w-3.5 h-3.5 text-neutral-600 opacity-60 md:opacity-30 md:group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity" />
        </div>
        
        <span className="text-neutral-600 text-[10px] font-mono w-4 shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>
        
        {isNotLoaded ? (
          <FolderOpen className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
        ) : null}

        <span className="truncate text-xs font-medium">{track.title}</span>
        <span className="text-neutral-500 text-[10px] truncate max-w-[120px]">
          • {track.artist}
        </span>

        {isNotLoaded && (
          <span className="text-[9px] text-amber-500/90 font-mono flex items-center gap-0.5 shrink-0 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">
            ⚠️ File not loaded
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-3 shrink-0 ml-2">
        {isNotLoaded ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReimportTrack?.(track.id);
            }}
            className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black font-mono text-[9px] font-bold rounded uppercase transition cursor-pointer"
          >
            Re-import
          </button>
        ) : (
          <span className="text-[10px] font-mono text-neutral-500">
            {formatDurationHelper(track.duration)}
          </span>
        )}
      </div>
    </div>
  );
});

interface PlaylistProps {
  skin: SkinType;
  tracks: Track[];
  currentTrack: Track | null;
  onSelectTrack: (track: Track) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveTrack: (id: string) => void;
  onClearPlaylist: () => void;
  onReorderTracks: (tracks: Track[]) => void;
  loadingFilesMessage?: string;
  onReimportTrack?: (id: string) => void;
}

export const Playlist = React.memo<PlaylistProps>(({
  skin,
  tracks,
  currentTrack,
  onSelectTrack,
  onAddFiles,
  onRemoveTrack,
  onClearPlaylist,
  onReorderTracks,
  loadingFilesMessage,
  onReimportTrack,
}) => {
  const fileInputId = useId();
  const folderInputId = useId();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const isMobile = (typeof navigator !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (typeof navigator.maxTouchPoints !== 'undefined' && navigator.maxTouchPoints > 0)
  )) || isAndroidWebView();

  const handleItemDragStart = useCallback((e: React.DragEvent, trackId: string) => {
    setDraggedTrackId(trackId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', trackId);
  }, []);

  const handleItemDragOver = useCallback((e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    if (draggedTrackId && draggedTrackId !== trackId) {
      setDragOverTrackId(trackId);
    }
  }, [draggedTrackId]);

  const handleItemDrop = useCallback((e: React.DragEvent, targetTrackId: string) => {
    e.preventDefault();
    setDragOverTrackId(null);
    if (!draggedTrackId || draggedTrackId === targetTrackId) return;

    const sourceIdx = tracks.findIndex((t) => t.id === draggedTrackId);
    const targetIdx = tracks.findIndex((t) => t.id === targetTrackId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const updated = [...tracks];
    const [movedItem] = updated.splice(sourceIdx, 1);
    if (movedItem) {
      updated.splice(targetIdx, 0, movedItem);
      onReorderTracks(updated);
    }
    setDraggedTrackId(null);
  }, [draggedTrackId, tracks, onReorderTracks]);

  const handleItemDragEnd = useCallback(() => {
    setDraggedTrackId(null);
    setDragOverTrackId(null);
  }, []);

  const [touchActiveIdx, setTouchActiveIdx] = useState<number | null>(null);
  const touchActiveRef = useRef<number | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const onReorderTracksRef = useRef(onReorderTracks);
  onReorderTracksRef.current = onReorderTracks;
  const trackRectsCacheRef = useRef<{ idx: number; top: number; bottom: number }[]>([]);

  React.useEffect(() => {
    const handleDocumentTouchMove = (e: TouchEvent) => {
      if (touchActiveRef.current !== null) {
        // Prevent default browser scrolling entirely when dragging
        if (e.cancelable) {
          e.preventDefault();
        }

        const touch = e.touches[0];
        if (!touch) return;

        const targetEntry = trackRectsCacheRef.current.find(
          (entry) => touch.clientY >= entry.top && touch.clientY <= entry.bottom
        );

        if (targetEntry) {
          const targetIdx = targetEntry.idx;
          const activeIdx = touchActiveRef.current;
          if (targetIdx !== activeIdx && !isNaN(targetIdx)) {
            const updated = [...tracksRef.current];
            const [movedItem] = updated.splice(activeIdx, 1);
            if (movedItem) {
              updated.splice(targetIdx, 0, movedItem);
              onReorderTracksRef.current(updated);
              touchActiveRef.current = targetIdx;
              setTouchActiveIdx(targetIdx);

              // Re-measure after reorder since positions shifted
              requestAnimationFrame(() => {
                const elements = Array.from(document.querySelectorAll('[data-track-index]'));
                trackRectsCacheRef.current = elements
                  .map((el) => {
                    const rect = el.getBoundingClientRect();
                    const idxAttr = el.getAttribute('data-track-index');
                    return idxAttr !== null && rect.height > 0
                      ? { idx: parseInt(idxAttr, 10), top: rect.top, bottom: rect.bottom }
                      : null;
                  })
                  .filter((x): x is { idx: number; top: number; bottom: number } => x !== null);
              });
            }
          }
        }
      }
    };

    const handleDocumentTouchEnd = () => {
      touchActiveRef.current = null;
      setTouchActiveIdx(null);
    };

    // Attach with { passive: false } to allow e.preventDefault() to cancel scrolling
    window.addEventListener('touchmove', handleDocumentTouchMove, { passive: false });
    window.addEventListener('touchend', handleDocumentTouchEnd);
    window.addEventListener('touchcancel', handleDocumentTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleDocumentTouchMove);
      window.removeEventListener('touchend', handleDocumentTouchEnd);
      window.removeEventListener('touchcancel', handleDocumentTouchEnd);
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, idx: number) => {
    touchActiveRef.current = idx;
    setTouchActiveIdx(idx);

    // Cache all visible track positions once, instead of querying on every touchmove
    const elements = Array.from(document.querySelectorAll('[data-track-index]'));
    trackRectsCacheRef.current = elements
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const idxAttr = el.getAttribute('data-track-index');
        return idxAttr !== null && rect.height > 0
          ? { idx: parseInt(idxAttr, 10), top: rect.top, bottom: rect.bottom }
          : null;
      })
      .filter((x): x is { idx: number; top: number; bottom: number } => x !== null);
  }, []);

  const handleShiftTrack = (trackId: string, direction: 'up' | 'down') => {
    const idx = tracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= tracks.length) return;

    const updated = [...tracks];
    const temp = updated[idx]!;
    updated[idx] = updated[targetIdx]!;
    updated[targetIdx] = temp;
    onReorderTracks(updated);
  };

  const handleSortTracks = (criteria: 'title' | 'artist' | 'duration' | 'rating') => {
    const sorted = [...tracks].sort((a, b) => {
      if (criteria === 'duration') {
        return a.duration - b.duration;
      }
      if (criteria === 'rating') {
        return b.rating - a.rating;
      }
      return a[criteria].localeCompare(b[criteria]);
    });
    onReorderTracks(sorted);
    setIsSortMenuOpen(false);
  };
  const filteredTracks = useMemo(() => {
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tracks, searchQuery]);

  const totalDuration = useMemo(() => {
    return tracks.reduce((acc, t) => acc + t.duration, 0);
  }, [tracks]);

  const formatDurationHelper = (secs: number) => {
    if (secs === 0) return "--:--";
    const mins = Math.floor(secs / 60);
    const remainSecs = Math.floor(secs % 60);
    return `${mins}:${remainSecs < 10 ? '0' : ''}${remainSecs}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
  };

  const handleImportFilesClick = async () => {
    if (isAndroidFileBridgeAvailable()) {
      try {
        const files = await pickFilesViaAndroidBridge();
        if (files.length > 0) {
          onAddFiles(files);
        }
        return;
      } catch (err) {
        console.warn('Android file bridge failed, falling back to standard picker:', err);
      }
    }
    document.getElementById(fileInputId)?.click();
  };

  const handleImportFolderClick = async () => {
    if (isAndroidFileBridgeAvailable()) {
      try {
        const files = await pickFolderViaAndroidBridge();
        if (files.length > 0) {
          onAddFiles(files);
        }
        return;
      } catch (err) {
        console.warn('Android folder bridge failed, falling back to standard picker:', err);
      }
    }
    if (isAndroidWebView()) {
      document.getElementById(fileInputId)?.click();
    } else {
      document.getElementById(folderInputId)?.click();
    }
  };

  const renderClassicPlaylist = () => {
    return (
      <div
        id="classic_playlist_panel"
        className={`bg-black/95 border border-neutral-700/60 p-2 rounded flex flex-col h-full font-mono text-[10px] text-[#00ff44] select-none shadow-lg ${
          isDragging ? 'border-dashed border-emerald-400 bg-emerald-950/20' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header bar */}
        <div className="flex justify-between items-center bg-[#1c1c22] border border-neutral-800 px-2 py-1.5 rounded mb-2 text-zinc-300">
          <div className="font-bold text-[9px] text-[#00ff44] tracking-widest uppercase">
            SPINAMP PLAYLIST EDITOR
          </div>
          <div className="text-[9px] text-zinc-500 font-bold uppercase">
            {tracks.length} TRACK{tracks.length === 1 ? '' : 'S'}
          </div>
        </div>

        {/* Action controllers */}
        <div className="flex gap-1 mb-2 shrink-0 flex-wrap">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('music-player-diagnostic', { detail: { type: 'file' } }));
              }
              handleImportFilesClick();
            }}
            className="flex items-center gap-1 bg-[#26262e] border border-neutral-700 hover:border-zinc-400 active:bg-neutral-800 text-zinc-300 py-1 px-1.5 rounded cursor-pointer leading-none text-[8px] uppercase select-none pointer-events-auto"
            aria-label="Add file to playlist"
          >
            <Plus className="w-2 h-2 text-[#00ff44]" /> ADD FILE
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('music-player-diagnostic', { detail: { type: isMobile ? 'file' : 'folder' } }));
              }
              handleImportFolderClick();
            }}
            className="flex items-center gap-1 bg-[#26262e] border border-neutral-700 hover:border-zinc-400 active:bg-neutral-800 text-zinc-300 py-1 px-1.5 rounded cursor-pointer leading-none text-[8px] uppercase select-none pointer-events-auto"
            title="Import folder (falls back to files on mobile)"
            aria-label="Add folder to playlist"
          >
            <FolderOpen className="w-2.5 h-2.5 text-amber-500" /> {isAndroidFileBridgeAvailable() || !isAndroidWebView() ? "ADD DIR" : "ADD FILES"}
          </button>
          <div className="relative">
            <button
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              className="flex items-center gap-1 bg-[#26262e] border border-neutral-700 hover:border-zinc-400 active:bg-neutral-800 text-zinc-300 py-1 px-1.5 rounded cursor-pointer leading-none text-[8px] uppercase"
              title="Sort Playlist"
              aria-label="Sort Playlist options"
              aria-haspopup="listbox"
              aria-expanded={isSortMenuOpen}
            >
              <ArrowUpDown className="w-2 h-2 text-amber-500" /> SORT
            </button>
            {isSortMenuOpen && (
              <div className="absolute left-0 top-6 bg-[#1a1b1e] border border-neutral-700 rounded shadow-xl z-50 flex flex-col min-w-[90px] text-[8px] font-mono p-1 gap-0.5 text-zinc-300" role="listbox" aria-label="Sort options">
                <button onClick={() => handleSortTracks('title')} className="px-1.5 py-0.5 hover:bg-neutral-800 hover:text-white text-[#00ff44] text-left cursor-pointer w-full uppercase" role="option">TITLE A-Z</button>
                <button onClick={() => handleSortTracks('artist')} className="px-1.5 py-0.5 hover:bg-neutral-800 hover:text-white text-[#00ff44] text-left cursor-pointer w-full uppercase" role="option">ARTIST A-Z</button>
                <button onClick={() => handleSortTracks('duration')} className="px-1.5 py-0.5 hover:bg-neutral-800 hover:text-white text-[#00ff44] text-left cursor-pointer w-full uppercase" role="option">DURATION</button>
                <button onClick={() => handleSortTracks('rating')} className="px-1.5 py-0.5 hover:bg-neutral-800 hover:text-white text-[#00ff44] text-left cursor-pointer w-full uppercase" role="option">RATING</button>
              </div>
            )}
          </div>
          <button
            onClick={onClearPlaylist}
            disabled={tracks.length === 0}
            className="flex items-center gap-0.5 bg-[#26262e] border border-neutral-700 hover:text-rose-400 hover:border-rose-950 active:bg-neutral-800 text-zinc-400 py-1 px-1 rounded cursor-pointer leading-none text-[8px] uppercase disabled:opacity-45 disabled:cursor-not-allowed"
            title="Clear entire playlist"
            aria-label="Clear entire playlist"
          >
            <Trash2 className="w-2.5 h-2.5 text-rose-500" /> CLEAR
          </button>
          <button
            onClick={() => currentTrack && onRemoveTrack(currentTrack.id)}
            disabled={!currentTrack}
            className="flex items-center gap-0.5 bg-[#26262e] border border-neutral-700 hover:text-red-400 hover:border-red-950 active:bg-neutral-800 text-zinc-400 py-1 px-1 rounded cursor-pointer leading-none text-[8px] uppercase disabled:opacity-45 disabled:cursor-not-allowed"
            title="Delete selected track"
            aria-label="Delete selected track"
          >
            <Trash2 className="w-2 h-2 text-rose-500" /> DEL FILE
          </button>
          <button
            onClick={() => currentTrack && handleShiftTrack(currentTrack.id, 'up')}
            disabled={!currentTrack || tracks.findIndex((t) => t.id === currentTrack.id) === 0}
            className="flex items-center gap-0.5 bg-[#26262e] border border-neutral-700 hover:border-zinc-400 active:bg-neutral-800 text-zinc-300 py-1 px-1 rounded cursor-pointer leading-none text-[8px] uppercase disabled:opacity-45 disabled:cursor-not-allowed"
            title="Move Selected Up"
            aria-label="Move selected track up"
          >
            <ChevronUp className="w-2 h-2 text-[#00ff44]" /> MOVE UP
          </button>
          <button
            onClick={() => currentTrack && handleShiftTrack(currentTrack.id, 'down')}
            disabled={!currentTrack || tracks.findIndex((t) => t.id === currentTrack.id) === tracks.length - 1}
            className="flex items-center gap-0.5 bg-[#26262e] border border-neutral-700 hover:border-zinc-400 active:bg-neutral-800 text-zinc-300 py-1 px-1 rounded cursor-pointer leading-none text-[8px] uppercase disabled:opacity-45 disabled:cursor-not-allowed"
            title="Move Selected Down"
            aria-label="Move selected track down"
          >
            <ChevronDown className="w-2 h-2 text-[#00ff44]" /> MOVE DOWN
          </button>
          <div className="relative flex-1 min-w-[70px]">
            <label htmlFor="playlist-search-input" className="sr-only">Search Playlist</label>
            <input
              id="playlist-search-input"
              type="text"
              placeholder="Search Playlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121216] border border-neutral-800 text-[#00ff44] placeholder-neutral-600 pl-5 pr-1 py-0.5 rounded text-[8.5px] focus:outline-none focus:border-neutral-700"
            />
            <Search className="w-2 h-2 text-neutral-600 absolute left-1.5 top-1.5" />
          </div>
        </div>

        {loadingFilesMessage && (
          <div className="bg-[#00ff44]/10 border border-[#00ff44]/30 rounded p-1.5 mb-2 flex items-center justify-between text-[9px] text-[#00ff44] font-mono animate-pulse shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ff44] animate-ping" />
              {loadingFilesMessage.toUpperCase()}
            </span>
          </div>
        )}

        {/* Playlist Items */}
        <div className="flex-1 overflow-y-auto bg-black border border-neutral-900 rounded p-1 custom-scrollbar min-h-32 max-h-[220px]">
          {filteredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-6 text-neutral-600 text-center gap-1.5">
              <Upload className="w-4 h-4 opacity-50 stroke-[1.5]" />
              <div>Playlist is empty.</div>
              <div className="text-[8px] opacity-75">Drag & Drop audio files here</div>
            </div>
          ) : (
            filteredTracks.map((track, idx) => (
              <TrackItem
                key={track.id}
                track={track}
                isActive={currentTrack?.id === track.id}
                index={idx}
                onSelect={onSelectTrack}
                skin="classic"
                isItemDragged={draggedTrackId === track.id || touchActiveIdx === idx}
                isItemOver={dragOverTrackId === track.id}
                onDragStart={handleItemDragStart}
                onDragOver={handleItemDragOver}
                onDrop={handleItemDrop}
                onDragEnd={handleItemDragEnd}
                onTouchStart={handleTouchStart}
                onReimportTrack={onReimportTrack}
                formatDurationHelper={formatDurationHelper}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const renderBentoPlaylist = () => {
    return (
      <div
        id="bento_playlist_panel"
        className={`bg-[#1a1b1e] border border-[#2b2d31] p-3 rounded-lg flex flex-col h-full font-sans text-xs text-neutral-300 select-none shadow ${
          isDragging ? 'border-dashed border-amber-500/80 bg-amber-500/5' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-amber-500" />
            <h4 className="font-bold text-neutral-100 tracking-wide text-[11px] uppercase">Playlist Editor</h4>
          </div>
          <div className="text-[10px] text-neutral-500 font-medium font-mono">
            {tracks.length} Songs | Total:{' '}
            {formatDurationHelper(totalDuration)}
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-2.5 shrink-0">
          <div className="relative w-full">
            <label htmlFor="playlist-search-input-alt" className="sr-only">Search queue</label>
            <input
              id="playlist-search-input-alt"
              type="text"
              placeholder="Search queue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131416] border border-[#26282c] text-neutral-100 placeholder-neutral-600 pl-8 pr-3 py-1.5 rounded-md text-xs focus:outline-none focus:border-amber-500"
            />
            <Search className="w-3.5 h-3.5 text-neutral-600 absolute left-2.5 top-2.5" />
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('music-player-diagnostic', { detail: { type: 'file' } }));
                }
                handleImportFilesClick();
              }}
              className="flex items-center gap-1.5 bg-[#25272a] hover:bg-[#2c2f33] text-neutral-200 border border-[#2f3136] py-1.5 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer whitespace-nowrap select-none pointer-events-auto"
              aria-label="Import files to playlist"
              title="Import Files"
            >
              <Plus className="w-3.5 h-3.5 text-amber-500" /> Import
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('music-player-diagnostic', { detail: { type: isMobile ? 'file' : 'folder' } }));
                }
                handleImportFolderClick();
              }}
              className="flex items-center gap-1.5 bg-[#25272a] hover:bg-[#2c2f33] text-neutral-200 border border-[#2f3136] py-1.5 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer whitespace-nowrap select-none pointer-events-auto"
              aria-label="Add folder to playlist"
              title="Add Folder"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> + Add Folder
            </button>
            
            <div className="relative">
              <button
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className="flex items-center gap-1.5 bg-[#25272a] hover:bg-[#2c2f33] text-neutral-200 border border-[#2f3136] py-1.5 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                title="Sort Tracks"
                aria-label="Sort Playlist options"
                aria-haspopup="listbox"
                aria-expanded={isSortMenuOpen}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-500" /> Sort
              </button>
              {isSortMenuOpen && (
                <div className="absolute left-0 top-10 bg-[#1e2024] border border-[#2f3136] rounded shadow-2xl z-50 flex flex-col min-w-[120px] text-xs p-1 gap-1 text-neutral-200" role="listbox" aria-label="Sort options">
                  <button onClick={() => handleSortTracks('title')} className="px-2 py-1.5 hover:bg-[#2a2d32] text-left rounded cursor-pointer w-full transition" role="option">Title A-Z</button>
                  <button onClick={() => handleSortTracks('artist')} className="px-2 py-1.5 hover:bg-[#2a2d32] text-left rounded cursor-pointer w-full transition" role="option">Artist A-Z</button>
                  <button onClick={() => handleSortTracks('duration')} className="px-2 py-1.5 hover:bg-[#2a2d32] text-left rounded cursor-pointer w-full transition" role="option">Duration</button>
                  <button onClick={() => handleSortTracks('rating')} className="px-2 py-1.5 hover:bg-[#2a2d32] text-left rounded cursor-pointer w-full transition" role="option">Rating</button>
                </div>
              )}
            </div>

            <button
              onClick={onClearPlaylist}
              disabled={tracks.length === 0}
              className="flex items-center gap-1.5 bg-[#25272a] hover:bg-[#2c2f33] text-neutral-200 hover:text-rose-400 border border-[#2f3136] hover:border-rose-950/40 py-1.5 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:text-neutral-500 disabled:hover:bg-[#25272a] disabled:border-[#2f3136]"
              title="Clear all songs"
              aria-label="Clear all songs in playlist"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Clear
            </button>
            <button
              onClick={() => currentTrack && onRemoveTrack(currentTrack.id)}
              disabled={!currentTrack}
              className="flex items-center gap-1.5 bg-[#25272a] hover:bg-[#2c2f33] text-neutral-200 hover:text-rose-400 border border-[#2f3136] hover:border-rose-950/40 py-1.5 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:text-neutral-500 disabled:hover:bg-[#25272a] disabled:border-[#2f3136]"
              title="Delete currently selected song"
              aria-label="Delete currently selected song"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete File
            </button>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => currentTrack && handleShiftTrack(currentTrack.id, 'up')}
                disabled={!currentTrack || tracks.findIndex((t) => t.id === currentTrack.id) === 0}
                className="flex items-center gap-1.5 bg-[#25272a] hover:bg-[#2c2f33] text-neutral-200 hover:text-amber-500 border border-[#2f3136] hover:border-amber-500/20 py-1.5 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:text-neutral-500 disabled:hover:bg-[#25272a] disabled:border-[#2f3136]"
                title="Move selected song up"
                aria-label="Move selected song up"
              >
                <ChevronUp className="w-3.5 h-3.5 text-amber-500" /> Move Up
              </button>
              <button
                onClick={() => currentTrack && handleShiftTrack(currentTrack.id, 'down')}
                disabled={!currentTrack || tracks.findIndex((t) => t.id === currentTrack.id) === tracks.length - 1}
                className="flex items-center gap-1.5 bg-[#25272a] hover:bg-[#2c2f33] text-neutral-200 hover:text-amber-500 border border-[#2f3136] hover:border-amber-500/20 py-1.5 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:text-neutral-500 disabled:hover:bg-[#25272a] disabled:border-[#2f3136]"
                title="Move selected song down"
                aria-label="Move selected song down"
              >
                <ChevronDown className="w-3.5 h-3.5 text-amber-500" /> Move Down
              </button>
            </div>
          </div>
        </div>

        {loadingFilesMessage && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 mb-3 flex items-center justify-between text-[11px] text-amber-500 font-sans animate-pulse shrink-0">
            <span className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              {loadingFilesMessage}
            </span>
          </div>
        )}

        {/* Playlist Container */}
        <div className="flex-1 overflow-y-auto bg-[#131416] border border-[#202124] rounded-md p-1 custom-scrollbar min-h-32 max-h-[220px]">
          {filteredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-neutral-600 text-center gap-2">
              <Upload className="w-5 h-5 opacity-40 text-amber-500" />
              <div className="text-xs">Queue is currently empty</div>
              <div className="text-[10px] opacity-75">Drag music files here to load them</div>
            </div>
          ) : (
            filteredTracks.map((track, idx) => (
              <TrackItem
                key={track.id}
                track={track}
                isActive={currentTrack?.id === track.id}
                index={idx}
                onSelect={onSelectTrack}
                skin="bento"
                isItemDragged={draggedTrackId === track.id || touchActiveIdx === idx}
                isItemOver={dragOverTrackId === track.id}
                onDragStart={handleItemDragStart}
                onDragOver={handleItemDragOver}
                onDrop={handleItemDrop}
                onDragEnd={handleItemDragEnd}
                onTouchStart={handleTouchStart}
                onReimportTrack={onReimportTrack}
                formatDurationHelper={formatDurationHelper}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <input
        aria-label="Upload files"
        id={fileInputId}
        type="file"
        multiple
        accept="audio/*, .mp3, .wav, .m4a, .flac, .ogg, .aac, .opus, .webm, .mp4, .mka"
        className="sr-only"
        onChange={handleFileInputChange}
      />
      <input
        aria-label="Upload folder"
        id={folderInputId}
        type="file"
        multiple
        accept="audio/*, .mp3, .wav, .m4a, .flac, .ogg, .aac, .opus, .webm, .mp4, .mka"
        {...(!isAndroidWebView() ? {
          webkitdirectory: "",
          directory: ""
        } : {} as any)}
        className="sr-only"
        onChange={handleFileInputChange}
      />
      {skin === 'classic' ? renderClassicPlaylist() : renderBentoPlaylist()}
    </>
  );
});
