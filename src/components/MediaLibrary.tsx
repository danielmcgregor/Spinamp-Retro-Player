import React, { useState, useRef, useId } from 'react';
import { Track } from '../types';
import { Star, ShieldAlert, Library, History, Award, HeartHandshake, Play, Pause, RotateCcw, HelpCircle, FolderOpen, Music, Search, Info, Volume2 } from 'lucide-react';
import { spinampAudio } from '../utils/audioContext';
import { isAndroidWebView, isAndroid, isIOS } from '../utils/platformDetect';
import { 
  isAndroidFileBridgeAvailable, 
  pickFilesViaAndroidBridge, 
  pickFolderViaAndroidBridge 
} from '../utils/androidFileBridge';

interface MediaLibraryProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  onRateTrack: (id: string, rate: number) => void;
  playHistory: string[]; // ids of played tracks in sequence
  onTriggerLlama: () => void;
  isPlaying: boolean;
  onAddFiles?: (files: FileList | File[]) => void;
  loadingFilesMessage?: string;
  onSetLoadingMessage?: (msg: string | null) => void;
}

export const MediaLibrary = React.memo<MediaLibraryProps>(({
  tracks,
  onSelectTrack,
  onRateTrack,
  playHistory,
  onTriggerLlama,
  isPlaying,
  onAddFiles,
  loadingFilesMessage,
  onSetLoadingMessage,
}) => {
  const fileInputId = useId();
  const folderInputId = useId();
  const isMobile = (typeof navigator !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (typeof navigator.maxTouchPoints !== 'undefined' && navigator.maxTouchPoints > 0)
  )) || isAndroidWebView();
  const [activeTab, setActiveTab] = useState<'local' | 'history' | 'top' | 'about' | 'sfx'>('local');
  const [subTab, setSubTab] = useState<'titles' | 'artists' | 'albums'>('titles');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [crawlKey, setCrawlKey] = useState(0);
  const [isCrawlPaused, setIsCrawlPaused] = useState(false);
  const [crawlDuration, setCrawlDuration] = useState(40);

  // Helper: map history IDs back to track objects
  const historyTracks: Track[] = playHistory
    .map((id) => tracks.find((t) => t.id === id))
    .filter((t): t is Track => !!t);

  const topRatedTracks = tracks.filter((t) => t.rating >= 4);

  // Search filter
  const filteredTracks = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return tracks;
    return tracks.filter((track) => {
      const title = track.title || '';
      const artist = track.artist || '';
      const album = track.album || '';
      const genre = track.genre || '';
      return (
        title.toLowerCase().includes(term) ||
        artist.toLowerCase().includes(term) ||
        album.toLowerCase().includes(term) ||
        genre.toLowerCase().includes(term)
      );
    });
  }, [tracks, searchTerm]);

  // Group by unique artists
  const artistGroups = React.useMemo(() => {
    const groups: Record<string, Track[]> = {};
    filteredTracks.forEach((t) => {
      const art = t.artist || 'Unknown Artist';
      if (!groups[art]) {
        groups[art] = [];
      }
      groups[art].push(t);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredTracks]);

  // Group by unique albums
  const albumGroups = React.useMemo(() => {
    const groups: Record<string, { album: string; artist: string; songs: Track[] }> = {};
    filteredTracks.forEach((t) => {
      const alb = t.album || 'Unknown Album';
      if (!groups[alb]) {
        groups[alb] = {
          album: alb,
          artist: t.artist || 'Unknown Artist',
          songs: []
        };
      }
      groups[alb].songs.push(t);
    });
    return Object.values(groups).sort((a, b) => a.album.localeCompare(b.album));
  }, [filteredTracks]);

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onAddFiles) {
      onAddFiles(e.target.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onAddFiles) {
      onAddFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleAddFilesClick = async () => {
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
        if (files.length > 0 && onAddFiles) {
          onAddFiles(files);
        }
      } catch (err) {
        console.warn('Android file bridge failed, falling back to standard picker:', err);
        document.getElementById(fileInputId)?.click();
      }
    } else {
      document.getElementById(fileInputId)?.click();
    }
  };

  const handleAddFolderClick = async () => {
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
        if (files.length > 0 && onAddFiles) {
          onAddFiles(files);
        }
      } catch (err) {
        console.warn('Android folder bridge failed, falling back to file picker:', err);
        document.getElementById(fileInputId)?.click();
      }
    } else if (!isAndroidWebView()) {
      document.getElementById(folderInputId)?.click();
    } else {
      document.getElementById(fileInputId)?.click();
    }
  };

  const handleRate = (id: string, stars: number) => {
    onRateTrack(id, stars);
  };

  const renderStars = (trackId: string, currentRating: number) => {
    return (
      <div className="flex gap-0.5" id={`stars-container-${trackId}`} role="group" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            id={`star-${trackId}-${star}`}
            onClick={(e) => {
              e.stopPropagation();
              handleRate(trackId, star);
            }}
            className={`cursor-pointer transition-colors ${
              star <= currentRating ? 'text-amber-400 fill-amber-400' : 'text-neutral-750 hover:text-amber-500'
            }`}
            aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
            aria-pressed={star <= currentRating}
          >
            <Star className="w-2.5 h-2.5" />
          </button>
        ))}
      </div>
    );
  };

  const TableSkeletonRow = React.memo<{ index: number }>(({ index }) => {
    const titleWidths = ['w-28', 'w-36', 'w-24', 'w-32'];
    const artistWidths = ['w-20', 'w-16', 'w-24', 'w-18'];

    return (
      <tr className="border-b border-[#202124] animate-pulse select-none">
        <td className="py-2.5 px-3">
          <div className="w-3.5 h-3.5 bg-amber-500/20 rounded flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
          </div>
        </td>
        <td className="py-2.5 px-2">
          <div className={`h-3 bg-[#2a2d38] rounded-sm ${titleWidths[index % 4]}`} />
        </td>
        <td className="py-2.5 px-2">
          <div className={`h-2.5 bg-[#20222b] rounded-sm ${artistWidths[index % 4]}`} />
        </td>
        <td className="py-2.5 px-2 hidden sm:table-cell">
          <div className="h-2.5 bg-[#1c1d24] rounded-sm w-20" />
        </td>
        <td className="py-2.5 px-2 text-center">
          <div className="h-2.5 bg-[#20222b] rounded-sm w-6 mx-auto" />
        </td>
        <td className="py-2.5 px-2">
          <div className="h-2.5 bg-[#20222b] rounded-sm w-12 ml-auto" />
        </td>
      </tr>
    );
  });

  const renderTrackTable = (sourceTracks: Track[]) => {
    if (sourceTracks.length === 0 && !loadingFilesMessage) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-10 text-neutral-500 text-center gap-1.5 font-sans" id="empty-table-view">
          <ShieldAlert className="w-6 h-6 stroke-1.2 text-amber-500/80 mb-1" />
          <p className="text-xs font-semibold">No entries in this view</p>
          <p className="text-[10px] text-neutral-600">Rate/play tracks to populate details.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto w-full custom-scrollbar" id="track-table-container">
        <table className="w-full text-left text-[11px] font-sans border-collapse" id="library-track-table">
          <thead>
            <tr className="border-b border-[#2a2c31] text-neutral-500 uppercase tracking-wider text-[9px] font-bold">
              <th className="py-2 px-3 w-8">Cmd</th>
              <th className="py-2 px-2">Title</th>
              <th className="py-2 px-2">Artist</th>
              <th className="py-2 px-2 hidden sm:table-cell">Album</th>
              <th className="py-2 px-2 w-16 text-center">Plays</th>
              <th className="py-2 px-2 w-20 justify-end">Rating</th>
            </tr>
          </thead>
          <tbody>
            {sourceTracks.map((track, idx) => (
              <tr
                key={activeTab === 'history' ? `${track.id}_hist_${idx}` : track.id}
                onClick={() => onSelectTrack(track)}
                className="border-b border-[#202124] hover:bg-[#1a1b1e] cursor-pointer group transition-colors"
                id={`track-row-${track.id}`}
              >
                <td className="py-2 px-3">
                  <button 
                    className="p-0.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded transition cursor-pointer" 
                    id={`play-btn-${track.id}`}
                    aria-label={`Play ${track.title}`}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </button>
                </td>
                <td className="py-2 px-2 text-neutral-100 font-medium truncate max-w-[120px]" id={`track-title-${track.id}`}>
                  {track.title}
                </td>
                <td className="py-2 px-2 text-neutral-400 truncate max-w-[100px]">{track.artist}</td>
                <td className="py-2 px-2 text-neutral-500 truncate max-w-[120px] hidden sm:table-cell">{track.album}</td>
                <td className="py-2 px-2 text-center text-neutral-400 font-mono text-[10px]">{track.playCount}</td>
                <td className="py-2 px-2">{renderStars(track.id, track.rating)}</td>
              </tr>
            ))}
            {loadingFilesMessage && (
              sourceTracks.length === 0 ? (
                [0, 1, 2, 3, 4].map((i) => <TableSkeletonRow key={`table-skeleton-${i}`} index={i} />)
              ) : (
                [0, 1].map((i) => <TableSkeletonRow key={`table-skeleton-extra-${i}`} index={sourceTracks.length + i} />)
              )
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div id="spinamp-media-library" className="bg-[#101114] border border-[#232428] rounded-lg p-2 md:p-3 flex flex-col md:grid md:grid-cols-[140px_1fr] gap-4 min-h-[220px] max-h-[380px] overflow-hidden select-none">
      {/* Sidebar Nav */}
      <div id="library-sidebar" className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-neutral-800 shrink-0 custom-scrollbar" role="tablist" aria-label="Media Library Tabs">
        <div className="text-[9px] uppercase tracking-wider text-neutral-600 font-bold hidden md:block mb-2 select-none px-1">
          Bento Library
        </div>
        <button
          id="lib-tab-local"
          onClick={() => setActiveTab('local')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition select-none ${
            activeTab === 'local'
              ? 'bg-amber-500 text-neutral-900 font-semibold shadow'
              : 'text-neutral-400 hover:bg-neutral-800/50'
          }`}
          role="tab"
          aria-selected={activeTab === 'local'}
          aria-controls="local-tab-view"
        >
          <Library className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">Local Audio</span>
        </button>
        <button
          id="lib-tab-history"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition select-none ${
            activeTab === 'history'
              ? 'bg-amber-500 text-neutral-900 font-semibold shadow'
              : 'text-neutral-400 hover:bg-neutral-800/50'
          }`}
          role="tab"
          aria-selected={activeTab === 'history'}
          aria-controls="history-tab-view"
        >
          <History className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">Play History</span>
        </button>
        <button
          id="lib-tab-top"
          onClick={() => setActiveTab('top')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition select-none ${
            activeTab === 'top'
              ? 'bg-amber-500 text-neutral-900 font-semibold shadow'
              : 'text-neutral-400 hover:bg-neutral-800/50'
          }`}
          role="tab"
          aria-selected={activeTab === 'top'}
          aria-controls="top-tab-view"
        >
          <Award className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">Top Rated</span>
        </button>
        <button
          id="lib-tab-sfx"
          onClick={() => setActiveTab('sfx')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition select-none ${
            activeTab === 'sfx'
              ? 'bg-amber-500 text-neutral-900 font-semibold shadow'
              : 'text-neutral-400 hover:bg-neutral-800/50'
          }`}
          role="tab"
          aria-selected={activeTab === 'sfx'}
          aria-controls="sfx-soundboard-container"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-500" /> <span className="whitespace-nowrap">SFX Board</span>
        </button>
        <div className="h-px bg-neutral-850 my-1 hidden md:block" />
        <button
          id="lib-tab-about"
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition select-none ${
            activeTab === 'about'
              ? 'bg-amber-500 text-neutral-900 font-bold shadow'
              : 'text-amber-400 hover:bg-neutral-800/50'
          }`}
          role="tab"
          aria-selected={activeTab === 'about'}
          aria-controls="about-app-crawl-view"
        >
          <Info className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">About this app</span>
        </button>
      </div>

      {/* Detail Content Panel */}
      <div id="library-content-area" className="overflow-y-auto flex-1 bg-[#131416]/50 rounded-lg p-1 min-h-[160px] max-h-[300px]">
        {activeTab === 'local' && (
          <div className="animate-fade-in" id="local-tab-view">
            {/* Hidden native inputs using non-nested labels */}
            <input
              aria-label="Upload files"
              id={fileInputId}
              type="file"
              multiple
              accept="audio/*"
              className="sr-only"
              onChange={handleFileChange}
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
              onChange={handleFolderChange}
            />

            {/* Media Library Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 bg-[#15161a] border border-[#232428] rounded-md mb-3" id="library-toolbar">
              <div className="flex items-center gap-1.5" id="library-actions">
                <button
                  id="btn-add-files"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('music-player-diagnostic', { detail: { type: 'file' } }));
                    }
                    handleAddFilesClick();
                  }}
                  className="px-2 py-1 text-[9.5px] font-bold uppercase rounded bg-neutral-800 hover:bg-neutral-750 border border-neutral-700/80 text-neutral-300 hover:text-white transition cursor-pointer flex items-center gap-1 select-none pointer-events-auto"
                  title="Add selected audio files"
                  aria-label="Add selected audio files"
                >
                  <Music className="w-3 h-3 text-neutral-400" /> + Add Files
                </button>
              </div>

              {/* Views Tab: Songs, Artists, Albums */}
              <div className="flex items-center justify-center gap-1 bg-[#0c0d10] p-0.5 border border-neutral-800/80 rounded" id="subtab-selectors" role="tablist" aria-label="Library View Filters">
                {(['titles', 'artists', 'albums'] as const).map((mode) => (
                  <button
                    key={mode}
                    id={`subtab-select-${mode}`}
                    onClick={() => {
                      setSubTab(mode);
                      setSelectedArtist(null);
                      setSelectedAlbum(null);
                    }}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase cursor-pointer transition ${
                      subTab === mode
                        ? 'bg-amber-500 text-neutral-900 font-extrabold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    role="tab"
                    aria-selected={subTab === mode}
                    aria-label={`${mode} view`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Inline Search Bar */}
              <div className="relative flex items-center" id="search-container">
                <Search className="w-3 h-3 text-neutral-500 absolute left-2 pointer-events-none" />
                <label htmlFor="library-search-field" className="sr-only">Search library</label>
                <input
                  type="text"
                  placeholder="Search library..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-[10px] bg-[#0c0d10] border border-neutral-800 rounded pl-7 pr-2 py-1 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500/50"
                  id="library-search-field"
                />
              </div>
            </div>

            {loadingFilesMessage && (
              <div className="flex items-center justify-between px-2.5 py-1.5 mb-3 bg-[#18191e] border border-amber-500/30 rounded-md text-[10.5px] text-amber-400 font-mono font-medium animate-pulse shadow-md">
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

            {/* Sub-tab view layouts */}
            {subTab === 'titles' && (
              <div id="subtab-titles-view" className="animate-fade-in">
                <h5 className="font-bold text-neutral-200 text-xs mb-2 px-1 flex items-center justify-between">
                  <span>Songs Database</span>
                  <span className="text-[10px] text-neutral-500 font-normal">{filteredTracks.length} tracks listed</span>
                </h5>
                {renderTrackTable(filteredTracks)}
              </div>
            )}

            {subTab === 'artists' && (
              <div id="subtab-artists-view" className="animate-fade-in">
                {selectedArtist ? (
                  <div id="artist-drill-down">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-neutral-300">
                        <span className="text-neutral-500">Artists</span>
                        <span className="text-neutral-600">/</span>
                        <span className="text-amber-500 font-bold">{selectedArtist}</span>
                      </div>
                      <button
                        onClick={() => setSelectedArtist(null)}
                        className="px-2 py-0.5 text-[9px] bg-neutral-800 hover:bg-neutral-750 text-neutral-400 font-bold rounded cursor-pointer"
                        id="btn-back-to-artists"
                      >
                        ← Back to Artists
                      </button>
                    </div>
                    {renderTrackTable(filteredTracks.filter(t => t.artist === selectedArtist))}
                  </div>
                ) : (
                  <div id="artists-list-grid">
                    <h5 className="font-bold text-neutral-200 text-xs mb-2 px-1">
                      Artists Browser ({artistGroups.length} total)
                    </h5>
                    {artistGroups.length === 0 ? (
                      <div className="text-center py-6 text-[10px] text-neutral-600 font-sans" id="no-artists-message">
                        No artists found. Try clicking "+ Add Files" above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 px-0.5 pr-1 max-h-[200px] overflow-y-auto" id="artists-scroll-viewport">
                        {artistGroups.map(([artist, songs]) => (
                          <div
                            key={artist}
                            onClick={() => setSelectedArtist(artist)}
                            className="flex justify-between items-center bg-[#15161a] border border-[#232428] hover:border-amber-500/50 hover:bg-[#1f2026] rounded-md py-1.5 px-2.5 cursor-pointer group transition-all"
                            id={`artist-card-${artist.replace(/\s+/g, '-')}`}
                          >
                            <span className="text-[11px] text-neutral-200 font-medium group-hover:text-amber-500 truncate pr-2">
                              {artist}
                            </span>
                            <span className="bg-[#24252a] text-neutral-400 font-mono text-[9px] px-1.5 py-0.5 rounded-full group-hover:bg-amber-500 group-hover:text-neutral-900 font-bold transition-all shrink-0">
                              {songs.length}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {subTab === 'albums' && (
              <div id="subtab-albums-view" className="animate-fade-in">
                {selectedAlbum ? (
                  <div id="album-drill-down">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-neutral-300">
                        <span className="text-neutral-500">Albums</span>
                        <span className="text-neutral-600">/</span>
                        <span className="text-amber-500 font-bold">{selectedAlbum}</span>
                      </div>
                      <button
                        onClick={() => setSelectedAlbum(null)}
                        className="px-2 py-0.5 text-[9px] bg-neutral-800 hover:bg-neutral-750 text-neutral-400 font-bold rounded cursor-pointer"
                        id="btn-back-to-albums"
                      >
                        ← Back to Albums
                      </button>
                    </div>
                    {renderTrackTable(filteredTracks.filter(t => t.album === selectedAlbum))}
                  </div>
                ) : (
                  <div id="albums-list-grid">
                    <h5 className="font-bold text-neutral-200 text-xs mb-2 px-1">
                      Albums Browser ({albumGroups.length} total)
                    </h5>
                    {albumGroups.length === 0 ? (
                      <div className="text-center py-6 text-[10px] text-neutral-600 font-sans" id="no-albums-message">
                        No albums found. Try clicking "+ Add Files" above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 px-0.5 pr-1 max-h-[200px] overflow-y-auto" id="albums-scroll-viewport">
                        {albumGroups.map(({ album, artist, songs }) => (
                          <div
                            key={album}
                            onClick={() => setSelectedAlbum(album)}
                            className="flex flex-col gap-0.5 bg-[#15161a] border border-[#232428] hover:border-amber-500/50 hover:bg-[#1f2026] rounded-md py-1.5 px-2.5 cursor-pointer group transition-all"
                            id={`album-card-${album.replace(/\s+/g, '-')}`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[11px] text-neutral-200 font-bold group-hover:text-amber-500 truncate pr-2">
                                {album}
                              </span>
                              <span className="bg-[#24252a] text-neutral-400 font-mono text-[9px] px-1.5 py-0.5 rounded-full group-hover:bg-amber-500 group-hover:text-neutral-900 font-bold transition-all shrink-0">
                                {songs.length}
                              </span>
                            </div>
                            <span className="text-[9px] text-neutral-500 truncate font-mono">
                              By {artist}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in" id="history-tab-view">
            <h5 className="font-bold text-neutral-200 text-xs mb-2.5 px-1 flex items-center justify-between">
              <span>Recently Played Queue</span>
              <span className="text-[10px] text-neutral-500 font-normal">{historyTracks.length} recordings</span>
            </h5>
            {renderTrackTable(historyTracks)}
          </div>
        )}

        {activeTab === 'top' && (
          <div className="animate-fade-in" id="top-tab-view">
            <h5 className="font-bold text-neutral-200 text-xs mb-2.5 px-1">
              Top Rated Favorites (4+ Stars)
            </h5>
            {renderTrackTable(topRatedTracks)}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="flex flex-col h-full text-center select-none p-1.5" id="about-app-crawl-view">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes starWarsScroll {
                0% {
                  top: 100%;
                  transform: rotateX(23deg) translateY(0);
                  opacity: 0;
                }
                3% {
                  opacity: 1;
                }
                93% {
                  opacity: 1;
                }
                100% {
                  top: -240%;
                  transform: rotateX(25deg) translateY(-540px);
                  opacity: 0;
                }
              }
              .crawl-perspective-deck {
                perspective: 130px;
                perspective-origin: 50% 25%;
              }
              .crawl-animation {
                animation: starWarsScroll ${crawlDuration}s linear infinite;
              }
            `}} />

            {/* Title banner */}
            <div className="flex items-center justify-between mb-2 px-1 border-b border-neutral-800 pb-1.5">
              <span className="text-[10px] font-bold text-amber-500 tracking-wider font-mono">
                ABOUT SPINAMP PLAYER
              </span>
              <div className="flex items-center gap-1">
                {/* Whip Llama fun sound button */}
                <button
                  onClick={onTriggerLlama}
                  className="bg-[#1b1e42] border border-indigo-500/40 px-1.5 py-0.5 rounded text-[8.5px] font-bold text-indigo-300 hover:text-white hover:bg-indigo-900 cursor-pointer flex items-center gap-0.5 transition"
                  title="Hear the legendary llama synthesizer tag — a Winamp classic!"
                  aria-label="Whip the Llama synthesizer tag"
                >
                  📢 Whip Lamest App
                </button>
              </div>
            </div>

            {/* The Cinematic Star Wars Crawl Window */}
            <div className="relative w-full h-[180px] bg-black bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:14px_14px] overflow-hidden rounded border border-neutral-850 crawl-perspective-deck">
              {/* Fade overlays to blend edges like the actual film */}
              <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-black via-black/40 to-transparent pointer-events-none z-10" />
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

              {/* Rolling crawl text container */}
              <div 
                key={crawlKey}
                className="absolute w-[90%] left-[5%] font-sans text-center text-[#ffb938] leading-relaxed crawl-animation"
                style={{
                  animationPlayState: isCrawlPaused ? 'paused' : 'running',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="text-[13px] font-black text-amber-500 uppercase tracking-widest mb-3 select-none">
                  Episode IX &nbsp;•&nbsp; SpinAmp
                </div>
                <div className="text-[11.5px] font-black uppercase text-amber-400 tracking-widest mb-5 select-none-all">
                  THE RETRO EMPIRE REMAINS
                </div>

                <p className="text-[11.5px] font-semibold text-justify mx-auto mb-5 text-[#ffb938] leading-normal font-mono select-none animate-pulse">
                  A long time ago, in a web browser far, far away...
                </p>

                <p className="text-[11px] text-justify mx-auto mb-5 text-[#f5a623] leading-relaxed select-none">
                  The legendary desktop media player, WINAMP, was lost to the annals of computing history, replaced by flat, soulless modern UI templates.
                </p>

                <p className="text-[11px] text-justify mx-auto mb-5 text-[#f5a623] leading-relaxed select-none">
                  But a software rebellion arose! Armed with only React 18, TypeScript, and standard core Web Audio FFT frequency analyzers, a brave developer crafted a secret weapon to restore fully animated desktop skeuomorphic glory.
                </p>

                <p className="text-[11px] text-justify mx-auto mb-5 text-[#f5a623] leading-relaxed select-none">
                  Through days of precise pixel coordination, dual-skin window folding, and slider physics, the glorious SPINAMP is born!
                </p>

                <p className="text-[11px] text-justify mx-auto mb-5 text-[#f5a623] leading-relaxed select-none">
                  With a dedicated sliding hardware Equalizer, instant skin switcher, and neon visual presets, the sacred old-school history remains alive.
                </p>

                <p className="text-[11px] text-justify mx-auto mb-6 text-[#f5a623] leading-relaxed select-none">
                  Now, as high-frequency beats ripple across the galaxy, the whipped llama's ass sings once more, bringing music and nostalgia to developers everywhere....
                </p>

                <div className="text-[10.5px] text-amber-500 font-bold tracking-widest uppercase mb-10 select-none">
                  MAY THE BEATS BE WITH YOU!
                </div>
              </div>
            </div>

            {/* Interactive Spaceship Cockpit controls */}
            <div className="mt-2.5 flex items-center justify-between gap-2 bg-neutral-900/60 p-1.5 rounded-md border border-neutral-850">
              {/* Reset/Pause controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCrawlKey(prev => prev + 1)}
                  className="h-6 w-16 bg-[#16171b] border border-neutral-700 hover:border-amber-500 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 rounded text-[9px] font-bold cursor-pointer transition flex items-center justify-center gap-1"
                  title="Reset the text crawl story of SpinAmp"
                  aria-label="Restart the story crawl"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Restart</span>
                </button>

                <button
                  onClick={() => setIsCrawlPaused(!isCrawlPaused)}
                  className={`h-6 w-16 border rounded text-[9px] font-bold cursor-pointer transition flex items-center justify-center gap-1 ${
                    isCrawlPaused 
                      ? 'bg-amber-500 border-amber-300 text-neutral-950 font-extrabold animate-pulse' 
                      : 'bg-[#16171b] border-neutral-700 hover:border-amber-500 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400'
                  }`}
                  title={isCrawlPaused ? "Resume story crawl" : "Pause story crawl"}
                  aria-label={isCrawlPaused ? "Resume story crawl" : "Pause story crawl"}
                  aria-pressed={isCrawlPaused}
                >
                  {isCrawlPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                  <span>{isCrawlPaused ? "Resume" : "Pause"}</span>
                </button>
              </div>

              {/* Speed Controller Slider */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-800 flex-1">
                <label htmlFor="media-library-speed-slider" className="text-[8.5px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap font-mono select-none block">
                  SPEED:
                </label>
                <input
                  id="media-library-speed-slider"
                  type="range"
                  min="20"
                  max="70"
                  step="5"
                  value={90 - crawlDuration} // transform so higher slider means higher speed
                  onChange={(e) => {
                    const sliderVal = parseInt(e.target.value, 10);
                    // Map back to crawlDuration (smaller duration = faster)
                    setCrawlDuration(90 - sliderVal);
                  }}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  title="Adjust Star Wars story scroll speed"
                  aria-label="Crawl scroll speed"
                  aria-valuemin={20}
                  aria-valuemax={70}
                  aria-valuenow={90 - crawlDuration}
                />
                <span className="text-[8.5px] font-mono text-amber-500 min-w-[20px] text-right font-bold select-none">
                  {Math.round((90 - crawlDuration) / 5)}x
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sfx' && (
          <div className="animate-fade-in p-2 select-none" id="sfx-soundboard-container">
            <h5 className="font-bold text-neutral-200 text-xs mb-1.5 px-0.5 flex justify-between items-center">
              <span>🎹 RETRO CHIPTUNE SOUNDBOARD</span>
              <span className="text-[8.5px] text-amber-500 font-mono uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">LIVE SYNTH</span>
            </h5>
            <p className="text-[9px] text-neutral-500 mb-3 font-sans leading-relaxed">
              Trigger instant 8-bit retro digital audio clips synthesized on-the-fly via Web Audio API. Jam over your tracks or test the active visualizer!
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 animate-fade-in" id="sfx-grid">
              {[
                { 
                  id: 'llama', 
                  title: '📢 Llama Whip Tag', 
                  sub: '"Whips the Lamest App!"', 
                  color: 'from-purple-900/40 to-indigo-900/30 border-purple-500/40 hover:border-purple-400',
                  action: onTriggerLlama 
                },
                { 
                  id: 'laser', 
                  title: '🚀 Sawtooth Laser', 
                  sub: 'Exponential pitch slide', 
                  color: 'from-rose-900/40 to-red-900/30 border-rose-500/40 hover:border-rose-400',
                  action: () => spinampAudio.triggerSFX('laser') 
                },
                { 
                  id: 'coin', 
                  title: '🔔 8-Bit PowerUp', 
                  sub: 'Classic chord gain chime', 
                  color: 'from-amber-900/40 to-yellow-900/30 border-amber-500/40 hover:border-amber-400',
                  action: () => spinampAudio.triggerSFX('coin') 
                },
                { 
                  id: 'zap', 
                  title: '⚡ Cybernetic Zap', 
                  sub: 'High frequency triangle pop', 
                  color: 'from-emerald-950/50 to-teal-900/30 border-emerald-500/40 hover:border-emerald-400',
                  action: () => spinampAudio.triggerSFX('zap') 
                },
                { 
                  id: 'snare', 
                  title: '🥁 Noise Snare Hit', 
                  sub: 'White noise crash decay', 
                  color: 'from-blue-950/50 to-sky-900/30 border-blue-500/40 hover:border-blue-400',
                  action: () => spinampAudio.triggerSFX('snare') 
                },
                { 
                  id: 'boom', 
                  title: '🔊 Sub-Bass Boom', 
                  sub: 'Deep sine frequency sweep', 
                  color: 'from-zinc-800/60 to-neutral-900 border-neutral-700/80 hover:border-amber-500/60',
                  action: () => spinampAudio.triggerSFX('boom') 
                },
              ].map((sfx) => (
                <button
                  key={sfx.id}
                  id={`sfx-pad-${sfx.id}`}
                  onClick={sfx.action}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg bg-gradient-to-br ${sfx.color} border text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97] active:brightness-125 h-16 shadow-md shadow-black/40 group`}
                >
                  <span className="text-[10px] font-black text-white uppercase tracking-wide group-hover:text-amber-400 transition-colors">
                    {sfx.title}
                  </span>
                  <span className="text-[7.5px] text-neutral-400 font-mono truncate max-w-full mt-1">
                    {sfx.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
