import React, { useState, useEffect } from 'react';
import { SkinType, EqPreset } from '../types';
import { spinampAudio, restoreEqFromStorage } from '../utils/audioContext';
import { Save, Trash2, X } from 'lucide-react';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

interface EqualizerProps {
  skin: SkinType;
}

export const EQ_PRESETS: EqPreset[] = [
  { name: 'Flat', preamp: 0, bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Full Bass', preamp: 4, bands: [8, 6, 5, 2, 0, -2, -4, -4, -4, -4] },
  { name: 'Rock', preamp: 2, bands: [5, 3, -1, -3, -1, 2, 4, 5, 5, 5] },
  { name: 'Metal', preamp: 3, bands: [7, 6, 3, -3, -5, -2, 4, 6, 7, 6] },
  { name: 'Punk', preamp: 2, bands: [4, 3, 1, 3, 5, 6, 5, 4, 3, 2] },
  { name: 'Industrial', preamp: 3, bands: [6, 5, 2, -2, -3, 3, 5, 6, 6, 4] },
  { name: 'Dubstep', preamp: 3, bands: [9, 7, 4, -2, -4, -1, 4, 6, 6, 5] },
  { name: 'Techno', preamp: 3, bands: [6, 4, 1, -2, -1, 3, 5, 5, 4, 3] },
  { name: 'Hip Hop', preamp: 3, bands: [7, 6, 4, 1, -1, 2, 3, 4, 3, 2] },
  { name: 'Classical', preamp: 0, bands: [4, 3, 2, 2, -1, -1, -1, 2, 3, 4] },
  { name: 'Pop', preamp: -1, bands: [-2, -1, 2, 4, 3, -1, -2, -2, -1, -1] },
  { name: 'Vocal', preamp: -2, bands: [-4, -3, 1, 4, 5, 4, 2, -1, -2, -3] }
];

const BAND_LABELS = ['60', '170', '310', '600', '1K', '3K', '6K', '12K', '14K', '16K'];

export const Equalizer: React.FC<EqualizerProps> = ({ skin }) => {
  const [isOn, setIsOn] = useState<boolean>(() => {
    const saved = safeGetItem('spinamp_eq_is_on');
    return saved !== 'false';
  });
  const [preamp, setPreamp] = useState<number>(() => {
    const saved = safeGetItem('spinamp_eq_preamp');
    const val = saved ? parseFloat(saved) : 0;
    return isNaN(val) ? 0 : val;
  });
  const [bands, setBands] = useState<number[]>(() => {
    try {
      const saved = safeGetItem('spinamp_eq_bands');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 10) {
          return parsed.map((v) => (typeof v === 'number' && !isNaN(v) ? v : 0));
        }
      }
    } catch (e) {
      console.warn('Error parsing spinamp_eq_bands from storage:', e);
    }
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  });
  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    return safeGetItem('spinamp_eq_selected_preset') || 'Flat';
  });
  const [isOpenDropdown, setIsOpenDropdown] = useState<boolean>(false);
  
  // Custom presets state
  const [isSavingPreset, setIsSavingPreset] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [bassBoost, setBassBoost] = useState<number>(() => {
    const saved = safeGetItem('spinamp_bass_boost');
    return saved !== null ? parseFloat(saved) : spinampAudio.getBassBoost();
  });
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    const saved = safeGetItem('spinamp_playback_rate');
    return saved !== null ? parseFloat(saved) : spinampAudio.getUserPlaybackRate();
  });

  const [customPresets, setCustomPresets] = useState<EqPreset[]>(() => {
    try {
      const saved = safeGetItem('spinamp_eq_custom_presets');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Error reading spinamp_eq_custom_presets:', e);
      return [];
    }
  });

  const handleBassBoostChange = (db: number) => {
    setBassBoost(db);
    spinampAudio.setBassBoost(db);
    safeSetItem('spinamp_bass_boost', db.toString());
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    spinampAudio.setUserPlaybackRate(rate);
    safeSetItem('spinamp_playback_rate', rate.toString());
  };

  // Apply state to audio context on mount or whenever settings change
  useEffect(() => {
    restoreEqFromStorage(); // idempotent — safe to call again when the Equalizer panel is actually opened
  }, []);

  const applyEqState = (eqOn: boolean, pAmp: number, eqBands: number[]) => {
    spinampAudio.updatePreamp(eqOn ? pAmp : 0);
    eqBands.forEach((val, idx) => {
      spinampAudio.updateEqBand(idx, eqOn ? val : 0);
    });
  };

  // Persist settings
  useEffect(() => {
    safeSetItem('spinamp_eq_is_on', isOn.toString());
  }, [isOn]);

  useEffect(() => {
    safeSetItem('spinamp_eq_preamp', preamp.toString());
  }, [preamp]);

  useEffect(() => {
    safeSetItem('spinamp_eq_bands', JSON.stringify(bands));
  }, [bands]);

  useEffect(() => {
    safeSetItem('spinamp_eq_selected_preset', selectedPreset);
  }, [selectedPreset]);

  const handleToggle = () => {
    const nextOn = !isOn;
    setIsOn(nextOn);
    applyEqState(nextOn, preamp, bands);
  };

  const handlePreampChange = (val: number) => {
    setPreamp(val);
    setSelectedPreset('Custom');
    if (isOn) {
      spinampAudio.updatePreamp(val);
    }
  };

  const handleBandChange = (index: number, val: number) => {
    const newBands = [...bands];
    newBands[index] = val;
    setBands(newBands);
    setSelectedPreset('Custom');
    if (isOn) {
      spinampAudio.updateEqBand(index, val);
    }
  };

  const loadPreset = (presetName: string) => {
    const preset = [...EQ_PRESETS, ...customPresets].find((p) => p.name === presetName);
    if (!preset) return;

    setSelectedPreset(preset.name);
    setPreamp(preset.preamp);
    setBands([...preset.bands]);
    applyEqState(isOn, preset.preamp, preset.bands);
  };

  const handleSavePreset = () => {
    const name = newPresetName.trim();
    if (!name) return;

    if (EQ_PRESETS.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      alert("Cannot overwrite factory presets.");
      return;
    }

    const newPreset: EqPreset = {
      name,
      preamp,
      bands: [...bands]
    };

    const updated = [...customPresets.filter(p => p.name.toLowerCase() !== name.toLowerCase()), newPreset];
    setCustomPresets(updated);
    safeSetItem('spinamp_eq_custom_presets', JSON.stringify(updated));
    setSelectedPreset(name);
    setIsSavingPreset(false);
    setNewPresetName('');
  };

  const handleDeletePreset = (name: string) => {
    const updated = customPresets.filter(p => p.name !== name);
    setCustomPresets(updated);
    safeSetItem('spinamp_eq_custom_presets', JSON.stringify(updated));
    if (selectedPreset === name) {
      setSelectedPreset('Flat');
      loadPreset('Flat');
    }
  };

  const renderClassicEq = () => {
    return (
      <div id="classic_eq_panel" className="bg-[#1c1c20] border border-neutral-700/60 p-2.5 rounded font-mono text-[10px] text-zinc-300 w-full select-none shadow-md">
        {/* EQ Top bar */}
        <div className="flex justify-between items-center bg-[#282830] px-1 md:px-2 py-1 border border-neutral-700 rounded mb-2">
          <div className="text-zinc-100 font-bold tracking-widest text-[9px] uppercase text-emerald-400">SPINAMP EQUALIZER</div>
          <div className="flex items-center gap-1.5 h-4">
            <button
              onClick={handleToggle}
              className={`px-1.5 rounded text-[8px] font-bold uppercase transition-all ${
                isOn 
                  ? 'bg-emerald-600 border border-emerald-400 text-white shadow-[0_0_4px_rgba(16,185,129,0.5)]' 
                  : 'bg-neutral-800 border border-neutral-700 text-neutral-500'
              }`}
            >
              ON
            </button>
            <div className="text-[9px] text-zinc-500 font-bold h-full flex items-center relative z-50 gap-1">
              <span>PRESET:</span>
              <button
                id="classic_preset_toggle"
                onClick={() => setIsOpenDropdown(!isOpenDropdown)}
                className="ml-1 bg-black text-amber-400 border border-neutral-700 text-[8px] py-px px-1.5 focus:outline-none rounded flex items-center gap-1 cursor-pointer hover:bg-neutral-900 shadow-inner animate-fade-in"
              >
                <span>{selectedPreset}</span>
                <span className="text-[6px] text-zinc-500">▼</span>
              </button>
              <button
                onClick={() => {
                  setNewPresetName('');
                  setIsSavingPreset(true);
                }}
                className="p-0.5 text-zinc-400 hover:text-amber-400 bg-black border border-neutral-700 rounded transition cursor-pointer hover:bg-neutral-900"
                title="Save Custom Preset"
              >
                <Save className="w-2.5 h-2.5" />
              </button>
              {isOpenDropdown && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpenDropdown(false)} />
                  <div className="absolute top-full right-0 mt-1 bg-[#1c1c20] border border-neutral-700 rounded shadow-lg py-1 z-50 text-[10px] text-zinc-300 w-32 text-left divide-y divide-neutral-800 max-h-48 overflow-y-auto">
                    <div>
                      <div className="px-2 py-0.5 text-[7px] text-zinc-500 uppercase tracking-wider bg-black/20 font-bold">Factory Presets</div>
                      {EQ_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => {
                            loadPreset(p.name);
                            setIsOpenDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1 text-[9px] hover:bg-[#282830] transition-colors flex justify-between items-center ${
                            selectedPreset === p.name ? 'text-amber-400 font-bold' : 'text-zinc-300'
                          }`}
                        >
                          <span>{p.name}</span>
                          {selectedPreset === p.name && <span className="text-[7px]">✔</span>}
                        </button>
                      ))}
                    </div>
                    {customPresets.length > 0 && (
                      <div>
                        <div className="px-2 py-0.5 text-[7px] text-amber-500/80 uppercase tracking-wider bg-black/20 font-bold">User Presets</div>
                        {customPresets.map((p) => (
                          <div
                            key={p.name}
                            className="flex justify-between items-center px-2 py-1 hover:bg-[#282830] transition group cursor-pointer"
                          >
                            <button
                              onClick={() => {
                                loadPreset(p.name);
                                setIsOpenDropdown(false);
                              }}
                              className={`text-left flex-1 text-[9px] hover:text-amber-400 transition flex justify-between items-center ${
                                selectedPreset === p.name ? 'text-amber-400 font-bold' : 'text-zinc-300'
                              }`}
                            >
                              <span>{p.name}</span>
                              {selectedPreset === p.name && <span className="text-[7px]">✔</span>}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePreset(p.name);
                              }}
                              className="text-zinc-500 hover:text-rose-500 p-0.5 ml-1 transition"
                              title="Delete custom preset"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedPreset === 'Custom' && (
                      <div className="w-full text-left px-2 py-1 text-[9px] text-zinc-450 bg-neutral-900 border-t border-neutral-800 flex justify-between items-center">
                        <span>Custom (Unsaved)</span>
                        <span className="text-[7px]">✔</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* EQ Content Grid */}
        <div className="grid grid-cols-[auto_1fr] gap-3">
          {/* Preamp container */}
          <div className="flex flex-col items-center bg-black/40 border border-neutral-800 p-1 rounded w-10">
            <label htmlFor="eq-preamp-slider" className="text-[8px] text-zinc-500 mb-1 block">PRE</label>
            <div className="relative h-20 w-3 flex justify-center">
              {/* slider track line */}
              <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-neutral-800 rounded -translate-x-1/2" />
              <input
                id="eq-preamp-slider"
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={preamp}
                {...({ orient: 'vertical' } as any)}
                onChange={(e) => handlePreampChange(parseFloat(e.target.value))}
                className="w-full h-full opacity-0 cursor-ns-resize absolute inset-0 z-10"
                style={{ WebkitAppearance: 'slider-vertical' } as any}
              />
              {/* Custom Thumb rendering */}
              <div
                className="absolute w-3 h-2 bg-gradient-to-r from-emerald-500 to-emerald-700 border border-emerald-400 rounded-sm shadow pointer-events-none"
                style={{ bottom: `${((preamp + 12) / 24) * 88}%` }}
              />
            </div>
            <span className={`text-[8px] mt-1 text-center font-bold ${preamp === 0 ? 'text-zinc-500' : preamp > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {preamp > 0 ? `+${preamp.toFixed(1)}` : preamp.toFixed(1)}
            </span>
          </div>

          {/* Ten Active EQ Bands */}
          <div className="bg-black/60 border border-neutral-800 p-1.5 rounded flex justify-between items-stretch gap-1">
            {bands.map((val, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 h-full">
                <label htmlFor={`eq-band-slider-${idx}`} className="text-[7px] text-zinc-500 truncate select-none leading-none mb-1 block">
                  {BAND_LABELS[idx]}
                </label>
                <div className="relative h-18 w-2 flex justify-center flex-1">
                  <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-neutral-800/80 -translate-x-1/2" />
                  <input
                    id={`eq-band-slider-${idx}`}
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={val}
                    {...({ orient: 'vertical' } as any)}
                    onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                    className="w-full h-full opacity-0 cursor-ns-resize absolute inset-0 z-10"
                    style={{ WebkitAppearance: 'slider-vertical' } as any}
                  />
                  {/* Thumb indicator code */}
                  <div
                    className={`absolute w-2.5 h-1.5 border rounded-sm shadow pointer-events-none transition-all ${
                      isOn 
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-300' 
                        : 'bg-neutral-600 border-neutral-500'
                    }`}
                    style={{ bottom: `${((val + 12) / 24) * 88}%` }}
                  />
                </div>
                <span className={`text-[6px] mt-1 font-semibold leading-none scale-90 ${val === 0 ? 'text-zinc-600' : val > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BASS BOOST & PLAYBACK SPEED AUX ROW */}
        <div className="mt-2 pt-2 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9px]">
          {/* Bass Boost */}
          <div className="bg-black/40 border border-neutral-800 p-1.5 rounded flex items-center justify-between gap-2">
            <span className="text-amber-500 font-bold tracking-wider">BASS BOOST</span>
            <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
              <input
                id="classic-bass-boost-slider"
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={bassBoost}
                onChange={(e) => handleBassBoostChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-amber-400 font-mono font-bold w-8 text-right">+{bassBoost.toFixed(0)}dB</span>
            </div>
          </div>

          {/* Speed Selector */}
          <div className="bg-black/40 border border-neutral-800 p-1.5 rounded flex items-center justify-between gap-1 overflow-x-auto">
            <span className="text-zinc-400 font-bold shrink-0">SPEED</span>
            <div className="flex gap-1">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handlePlaybackRateChange(rate)}
                  className={`px-1 py-0.5 rounded text-[8px] font-mono transition font-bold cursor-pointer ${
                    playbackRate === rate
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'bg-neutral-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBentoEq = () => {
    return (
      <div id="bento_eq_panel" className="bg-[#1a1b1e] border border-[#2b2d31] p-3 rounded-lg font-sans text-xs text-neutral-300 w-full select-none shadow">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-amber-500 animate-pulse' : 'bg-neutral-600'}`} />
            <h4 className="font-bold text-neutral-100 tracking-wide text-[11px] uppercase">Bento Equalizer Stack</h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              className={`px-2 py-0.5 text-[10px] font-medium rounded border transition ${
                isOn 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-sm' 
                  : 'bg-neutral-800 border-neutral-700 text-neutral-500'
              }`}
            >
              {isOn ? 'Bypass' : 'Enable'}
            </button>
            <div className="flex items-center gap-1.5">
              <div className="relative z-50">
                <button
                  id="bento_preset_toggle"
                  onClick={() => setIsOpenDropdown(!isOpenDropdown)}
                  className="bg-[#24262b] border border-[#2e3035] text-neutral-300 hover:text-amber-500 text-[10px] py-0.5 px-2.5 rounded focus:outline-none flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                >
                  <span className="truncate max-w-[70px] font-medium">{selectedPreset === 'Custom' ? 'Custom Preset' : selectedPreset}</span>
                  <span className="text-[7px] text-neutral-500">▼</span>
                </button>
                {isOpenDropdown && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpenDropdown(false)} />
                    <div className="absolute top-full right-0 mt-1 bg-[#202125] border border-[#2e3035] rounded-md shadow-xl py-1 z-50 text-[11px] text-neutral-300 w-36 text-left divide-y divide-[#2a2c31] max-h-48 overflow-y-auto">
                      <div>
                        <div className="px-2.5 py-1 text-[8px] text-neutral-500 uppercase tracking-wider font-bold bg-black/10">Factory Presets</div>
                        {EQ_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            onClick={() => {
                              loadPreset(p.name);
                              setIsOpenDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 hover:bg-[#2b2d31] hover:text-amber-500 transition flex justify-between items-center ${
                              selectedPreset === p.name ? 'text-amber-500 font-bold' : 'text-neutral-300'
                            }`}
                          >
                            <span>{p.name}</span>
                            {selectedPreset === p.name && <span className="text-[9px] text-amber-500">✔</span>}
                          </button>
                        ))}
                      </div>
                      {customPresets.length > 0 && (
                        <div>
                          <div className="px-2.5 py-1 text-[8px] text-amber-500 uppercase tracking-wider font-bold bg-black/10">User Presets</div>
                          {customPresets.map((p) => (
                            <div
                              key={p.name}
                              className="flex justify-between items-center px-3 py-1.5 hover:bg-[#2b2d31] transition group cursor-pointer"
                            >
                              <button
                                onClick={() => {
                                  loadPreset(p.name);
                                  setIsOpenDropdown(false);
                                }}
                                className={`text-left flex-1 text-[11px] hover:text-amber-500 transition flex justify-between items-center ${
                                  selectedPreset === p.name ? 'text-amber-500 font-bold' : 'text-neutral-300'
                                }`}
                              >
                                <span>{p.name}</span>
                                {selectedPreset === p.name && <span className="text-[9px] text-amber-500">✔</span>}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePreset(p.name);
                                }}
                                className="text-neutral-500 hover:text-rose-500 p-0.5 ml-1 transition"
                                title="Delete custom preset"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedPreset === 'Custom' && (
                        <div className="w-full text-left px-3 py-1.5 text-neutral-400 bg-[#16171a]/50 font-medium flex justify-between items-center">
                          <span>Custom (Unsaved)</span>
                          <span className="text-[9px] text-neutral-500">✔</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setNewPresetName('');
                  setIsSavingPreset(true);
                }}
                className="p-1 text-neutral-400 hover:text-amber-500 rounded bg-[#24262b] border border-[#2e3035] transition cursor-pointer shadow-sm"
                title="Save current sliders as a Custom Preset"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Preamp full slider row */}
          <div className="bg-[#202125] border border-[#2a2c31] px-2.5 py-1.5 rounded-md flex items-center gap-3">
            <label htmlFor="eq-preamp-slider-alt" className="text-[10px] font-bold text-amber-500 w-9 block">PRE-AMP</label>
            <input
              id="eq-preamp-slider-alt"
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={preamp}
              onChange={(e) => handlePreampChange(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[10px] text-zinc-400 font-mono text-right w-8">
              {preamp > 0 ? `+${preamp.toFixed(1)}` : preamp.toFixed(1)} dB
            </span>
          </div>

          {/* Grids of EQ Bands */}
          <div className="bg-[#141517] border border-[#232428] rounded-md p-2 grid grid-cols-5 md:grid-cols-10 gap-x-2 gap-y-3">
            {bands.map((val, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <label htmlFor={`eq-band-slider-alt-${idx}`} className="text-[9px] text-neutral-500 font-medium mb-1 block">{BAND_LABELS[idx]}</label>
                <div className="relative h-14 w-1 bg-neutral-800/80 rounded flex justify-center">
                  <input
                    id={`eq-band-slider-alt-${idx}`}
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={val}
                    {...({ orient: 'vertical' } as any)}
                    onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                    className="w-full h-full opacity-0 cursor-ns-resize absolute inset-0 z-10"
                    style={{ WebkitAppearance: 'slider-vertical' } as any}
                  />
                  {/* Slider head */}
                  <div
                    className={`absolute w-3 h-1.5 rounded-sm shadow pointer-events-none transition-all ${
                      isOn ? 'bg-amber-500' : 'bg-neutral-600'
                    }`}
                    style={{ bottom: `${((val + 12) / 24) * 88}%`, left: '50%', transform: 'translateX(-50%)' }}
                  />
                </div>
                <span className={`text-[8px] font-mono mt-1 ${val === 0 ? 'text-zinc-500' : val > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          {/* Bass Boost & Speed control row in Bento view */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            <div className="bg-[#202125] border border-[#2a2c31] px-2.5 py-1.5 rounded-md flex items-center justify-between gap-2">
              <label htmlFor="bento-bass-boost" className="text-[10px] font-bold text-amber-500 shrink-0">BASS BOOST</label>
              <input
                id="bento-bass-boost"
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={bassBoost}
                onChange={(e) => handleBassBoostChange(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-amber-400 font-mono font-bold text-[10px] w-8 text-right">+{bassBoost.toFixed(0)}dB</span>
            </div>

            <div className="bg-[#202125] border border-[#2a2c31] px-2.5 py-1.5 rounded-md flex items-center justify-between gap-1 overflow-x-auto">
              <span className="text-[10px] font-bold text-neutral-400 shrink-0">SPEED</span>
              <div className="flex gap-1">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handlePlaybackRateChange(rate)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition font-bold cursor-pointer ${
                      playbackRate === rate
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-[#2b2d31] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full">
      {renderBentoEq()}

      {/* Saving Dialog Overlay */}
      {isSavingPreset && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 z-[100] rounded-lg border border-neutral-700 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-850 p-3 rounded-lg w-full max-w-[240px] shadow-xl text-left">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-neutral-800">
              <span className="font-bold text-[10px] text-amber-500 uppercase tracking-wider">Save Custom Preset</span>
              <button onClick={() => setIsSavingPreset(false)} className="text-zinc-500 hover:text-white transition cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2.5">
              <label htmlFor="eq-preset-name-input" className="sr-only">Preset Name</label>
              <input
                id="eq-preset-name-input"
                type="text"
                maxLength={20}
                placeholder="My Preset Name"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="w-full bg-black border border-neutral-800 rounded px-2 py-1 text-[11px] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-amber-500 font-sans"
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setIsSavingPreset(false)}
                  className="px-2 py-1 text-[9px] bg-neutral-800 hover:bg-neutral-750 text-zinc-400 rounded cursor-pointer font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreset}
                  disabled={!newPresetName.trim()}
                  className="px-2 py-1 text-[9px] bg-amber-500 hover:bg-amber-400 text-black rounded cursor-pointer font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
