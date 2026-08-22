import React, { useState, useRef, useId, useMemo, useCallback } from 'react';
import { Track, SkinType } from '../types';
import { 
  Plus, Trash2, Search, Upload, Play, Music, FolderOpen,
  ChevronUp, ChevronDown, GripVertical, ArrowUpDown
} from 'lucide-react';
import { isAndroidWebView, isAndroid, isIOS } from '../utils/platformDetect';
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

const TrackSkeletonItem = React.memo<{ index: number }>(({ index }) => {
  const titleWidths = ['w-32', 'w-40', 'w-28', 'w-36', 'w-24'];
  const artistWidths = ['w-16', 'w-24', 'w-20', 'w-14', 'w-18'];

  return (
    <div className="flex justify-between items-center py-2 px-2.5 my-1.5 rounded-md border border-[#202227]/80 bg-[#16171a]/90 animate-pulse select-none">
      <div className="flex items-center gap-2 truncate flex-1">
        {/* Drag handle skeleton */}
        <div className="w-2.5 h-3 bg-[#242730] rounded opacity-40 shrink-0" />
        
        {/* Track index skeleton */}
        <div className="w-4 h-3 bg-[#282b35] rounded shrink-0" />
        
        {/* Audio disc skeleton */}
        <div className="w-3.5 h-3.5 rounded-full bg-amber-500/15 shrink-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
        </div>

        {/* Title skeleton */}
        <div className={`h-3 bg-[#2e313d] rounded-sm ${titleWidths[index % 5]} shrink-0`} />

        <span className="text-neutral-700 text-[10px] shrink-0">•</span>

        {/* Artist skeleton */}
        <div className={`h-2.5 bg-[#222530] rounded-sm ${artistWidths[index % 5]} shrink-0`} />
      </div>

      {/* Duration skeleton */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <div className="h-2.5 w-9 bg-[#242730] rounded-sm" />
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
  onSetLoadingMessage?: (msg: string | null) => void;
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
  onSetLoadingMessage,
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
    // Disable touch reorder when search filter is active.
    // Changing order of a filtered list maps to wrong indices on the full list.
    // Mouse drag-and-drop uses track IDs, so it remains safe to use.
    if (searchQuery.trim().length > 0) return;

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
  }, [searchQuery]);

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
        (track.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (track.artist || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tracks, searchQuery]);

  const totalDuration = useMemo(() => {
    return tracks.reduce((acc, t) => acc + t.duration, 0);
  }, [tracks]);

  const formatDurationHelper = (secs: number) => {
    if (!secs || isNaN(secs) || !isFinite(secs) || secs <= 0) return "--:--";
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
    e.target.value = '';
  };

  const handleImportFilesClick = async () => {
    if (isAndroidFileBridgeAvailable()) {
      try {
        const files = await pickFilesViaAndroidBridge((loaded, total, totalBytes) => {
          const sizeStr = (totalBytes && totalBytes > 0) ? ` (${(totalBytes / (1024 * 1024)).toFixed(1)} MB)` : '';
          if (loaded === 0) {
            onSetLoadingMessage?.(`Preparing to load ${total} files${sizeStr} from device...`);
          } else {
            onSetLoadingMessage?.(`Loading ${loaded} of ${total} files${sizeStr} from device...`);
          }
        });
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
        const files = await pickFolderViaAndroidBridge((loaded, total, totalBytes) => {
          const sizeStr = (totalBytes && totalBytes > 0) ? ` (${(totalBytes / (1024 * 1024)).toFixed(1)} MB)` : '';
          if (loaded === 0) {
            onSetLoadingMessage?.(`Preparing to load ${total} files${sizeStr} from device...`);
          } else {
            onSetLoadingMessage?.(`Loading ${loaded} of ${total} files${sizeStr} from device...`);
          }
        });
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

        {/* Playlist Container */}
        <div className="flex-1 overflow-y-auto bg-[#131416] border border-[#202124] rounded-md p-1 custom-scrollbar min-h-32 max-h-[220px]">
          {/* Subtle status indicator bar when processing files */}
          {loadingFilesMessage && (
            <div className="sticky top-0 z-10 flex items-center justify-between px-2.5 py-1.5 mb-1.5 bg-[#18191e] border border-amber-500/30 rounded-md text-[10.5px] text-amber-400 font-mono font-medium animate-pulse shadow-md">
              <div className="flex items-center gap-2 truncate">
                <div className="relative flex items-center justify-center w-2 h-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </div>
                <span className="truncate">{loadingFilesMessage}</span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 ml-2">
                <span className="w-0.5 h-2.5 bg-amber-500/80 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-0.5 h-3.5 bg-amber-500/80 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-0.5 h-2 bg-amber-500/80 rounded-full animate-bounce" />
              </div>
            </div>
          )}

          {loadingFilesMessage && filteredTracks.length === 0 ? (
            /* Skeleton Loading State for playlist tracks during initial import / processing */
            <div className="space-y-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <TrackSkeletonItem key={`skeleton-${i}`} index={i} />
              ))}
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-neutral-600 text-center gap-2">
              <Upload className="w-5 h-5 opacity-40 text-amber-500" />
              <div className="text-xs">Queue is currently empty</div>
              <div className="text-[10px] opacity-75">Drag music files here to load them</div>
            </div>
          ) : (
            <>
              {filteredTracks.map((track, idx) => (
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
              ))}
              {/* If remaining tracks are still being processed/imported, show skeleton placeholders at the end */}
              {loadingFilesMessage && (
                <div className="space-y-1 mt-1">
                  {[0, 1].map((i) => (
                    <TrackSkeletonItem key={`skeleton-extra-${i}`} index={filteredTracks.length + i} />
                  ))}
                </div>
              )}
            </>
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
        accept="audio/*"
        className="sr-only"
        onChange={handleFileInputChange}
      />
      <input
        aria-label="Upload folder"
        id={folderInputId}
        type="file"
        multiple
        accept="audio/*"
        {...(!isAndroidWebView() ? {
          webkitdirectory: "",
          directory: ""
        } : {} as any)}
        className="sr-only"
        onChange={handleFileInputChange}
      />
      {renderBentoPlaylist()}
    </>
  );
});
