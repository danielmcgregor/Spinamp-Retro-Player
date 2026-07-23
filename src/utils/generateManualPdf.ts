import { jsPDF } from 'jspdf';

/**
 * Generates a beautiful retro-style operating manual in PDF format.
 * Utilizes high-contrast technical drafting design inspired by 1970s Technics/BASF operating manuals.
 */
export function generateManualPdf(trackCount: number = 8, activeSkinName: string = 'Classic Steel') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;

  // Colors
  const cCharcoal = [26, 27, 30]; // Primary body text / dark accent (#1a1b1e)
  const cAmber = [217, 119, 6];    // Amber primary accent (#d97706)
  const cOffWhite = [245, 245, 247]; // Soft warm page tint

  // Font choices: built-in standard safe Helvetica/Courier fonts
  const fSansBold = 'Helvetica-Bold';
  const fSansNormal = 'Helvetica';
  const fMonoBold = 'Courier-Bold';
  const fMonoNormal = 'Courier';

  // ---------------- PAGE 1: TITLE & COVER PAGE ----------------
  // Background Tint
  doc.setFillColor(cOffWhite[0], cOffWhite[1], cOffWhite[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Multi-line Outer Drafting Borders
  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20); // main border
  doc.setLineWidth(0.2);
  doc.rect(11.5, 11.5, pageWidth - 23, pageHeight - 23); // fine inner border

  // Top Indexing Header
  doc.setFont(fMonoBold, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.text('MANUAL TYPE: COMPREHENSIVE OPERATING INSTRUCTIONS', 15, 18);
  doc.text('CATALOG NO: SPINAMP-SA-3000R', 135, 18);
  doc.line(15, 20, pageWidth - 15, 20);

  // Big Bold Brand Header
  doc.setFont(fSansBold, 'normal');
  doc.setFontSize(36);
  doc.text('SPINAMP', 15, 45);
  doc.setFontSize(16);
  doc.setFont(fMonoBold, 'normal');
  doc.setTextColor(cAmber[0], cAmber[1], cAmber[2]);
  doc.text('HIGH-FIDELITY RETRO MEDIA STATION', 15, 53);

  // Horizontal Accent Divider Line
  doc.setLineWidth(1.5);
  doc.setDrawColor(cAmber[0], cAmber[1], cAmber[2]);
  doc.line(15, 58, 85, 58);
  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setLineWidth(0.2);

  // Subtitle Metadata Block
  doc.setFont(fSansNormal, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.text([
    'MODEL: SA-3000-RETRO AUDIO ENGINE',
    'SERIES: SOLID STATE WAVE-GRAPH SYSTEM',
    'RELEASE EDITION: PRIMETIME PLATINUM',
    `REVISION: INSTALLED SYSTEM DATA (ACTIVE ENGINE: ${activeSkinName})`
  ], 15, 68);

  // Central Blueprint / Retro Vector illustration: Stylized Turntable Drawing
  const midX = pageWidth / 2;
  const tcY = 155;
  // Platter circle
  doc.setLineWidth(0.4);
  doc.ellipse(midX, tcY, 40, 40, 'D');
  doc.ellipse(midX, tcY, 36, 36, 'D');
  doc.ellipse(midX, tcY, 15, 15, 'D'); // Central record label ring
  
  doc.ellipse(midX, tcY, 38, 38, 'D');

  // Tonearm vector
  doc.setLineWidth(0.8);
  doc.line(midX + 45, tcY - 45, midX + 45, tcY - 10); // Arm vertical post
  doc.line(midX + 45, tcY - 10, midX + 32, tcY + 20); // Main pivot rod
  // Cartridge and headshell
  doc.setLineWidth(1.5);
  doc.line(midX + 32, tcY + 20, midX + 27, tcY + 23); // Headshell
  doc.setLineWidth(0.2);

  // Neon Power Warning Indicator Sticker
  doc.setFillColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.rect(midX - 70, tcY - 60, 140, 10, 'F');
  doc.setFont(fMonoBold, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('WARNING: OPERATING VOLTMETER CONFIGURED FOR EXHAUSTIVE AUDIO FIDELITY', midX - 67, tcY - 53.5);

  // Spinamp stylized lightning bolt shape inside the illustrated center label!
  doc.setFillColor(cAmber[0], cAmber[1], cAmber[2]);
  const bx = midX;
  const by = tcY;
  const bs = 0.28; // scale
  // Points of lightning bolt relative to center (bx, by)
  const lPoints = [
    { x: 52, y: 18 },
    { x: 34, y: 52 },
    { x: 54, y: 52 },
    { x: 44, y: 82 },
    { x: 68, y: 44 },
    { x: 46, y: 44 }
  ];
  // Drawn using simple triangle division or paths
  doc.triangle(
    bx + (52 - 50) * bs, by + (18 - 50) * bs,
    bx + (34 - 50) * bs, by + (52 - 50) * bs,
    bx + (54 - 50) * bs, by + (52 - 50) * bs,
    'F'
  );
  doc.triangle(
    bx + (54 - 50) * bs, by + (52 - 50) * bs,
    bx + (44 - 50) * bs, by + (82 - 50) * bs,
    bx + (68 - 50) * bs, by + (44 - 50) * bs,
    'F'
  );
  doc.triangle(
    bx + (68 - 50) * bs, by + (44 - 50) * bs,
    bx + (46 - 50) * bs, by + (44 - 50) * bs,
    bx + (54 - 50) * bs, by + (52 - 50) * bs,
    'F'
  );

  // Bottom Notice Text
  doc.setFont(fSansNormal, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.text('THIS SYSTEM IS DESIGNED FOR THE REAL-TIME ENJOYMENT OF STEREOPHONIC AUDIOPHILES.', 15, pageHeight - 35);
  doc.setFont(fMonoNormal, 'normal');
  doc.setFontSize(8.5);
  doc.text('EQUIPPED WITH LAB-GRADE VFD OSCILLATION, HARMONIC DETECTORS, AND SLEEP TIMERS.', 15, pageHeight - 30);
  doc.text('CRAFTED IN THE CLOUD WORKSPACE. PRINTABLE RETRO EDITION (2026).', 15, pageHeight - 25);


  // ---------------- PAGE 2: USER CONTROLS, QUICKSTART & SHORTCUTS ----------------
  doc.addPage();
  // Background Tint
  doc.setFillColor(cOffWhite[0], cOffWhite[1], cOffWhite[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Page Border Layout
  doc.setLineWidth(0.4);
  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Header
  doc.setFont(fMonoBold, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(cAmber[0], cAmber[1], cAmber[2]);
  doc.text('SECTION 1.0: SYSTEM CONTROLS & ARCHITECTURE', 15, 17);
  doc.setDrawColor(cAmber[0], cAmber[1], cAmber[2]);
  doc.setLineWidth(0.5);
  doc.line(15, 19, pageWidth - 15, 19);

  // Title
  doc.setFont(fSansBold, 'normal');
  doc.setFontSize(18);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.text('1.0 QUICK START OPERATING PROCEDURE', 15, 27);

  // Paragraph on power/first load
  doc.setFont(fSansNormal, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  const quickStartIntro = 
    `Welcome to the Spinamp Retro Media Station. This application is an exact operational recreation of a solid-state desktop audio receiver, blending the nostalgic tactile feel of 1990s media players with modular HTML layouts and live Web Audio context routing. To initialize the hi-fi circuits, press the prominent [POWER ON PLAYER] switch on the splash landing console. This triggers the auxiliary Llama speech synthesizer chime and boots up the glowing VFD screen layout.`;
  const splitIntro = doc.splitTextToSize(quickStartIntro, pageWidth - 30);
  doc.text(splitIntro, 15, 34);

  // Section 1.1: Schematic Control Definitions
  doc.setFont(fSansBold, 'normal');
  doc.setFontSize(11);
  doc.text('1.1 CONTEXT COMMAND SPECIFICATION TABLE', 15, 58);

  // Drawing a retro table for controls
  const tY = 64;
  doc.setLineWidth(0.2);
  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.line(15, tY, pageWidth - 15, tY); // top header line
  doc.line(15, tY + 7, pageWidth - 15, tY + 7); // header bottom line

  doc.setFont(fMonoBold, 'normal');
  doc.setFontSize(8);
  doc.text('BUTTON/LABEL', 18, tY + 4.5);
  doc.text('HARDWARE DESCRIPTION', 52, tY + 4.5);
  doc.text('CORE FUNCTION / BEHAVIOR', 118, tY + 4.5);

  const rowData = [
    { name: '[POWER ON]', desc: 'Primary toggle switch on splash screen', func: 'Boots main player & initiates intro chime.' },
    { name: '[PLAY/PAUSE]', desc: 'Central tactical chrome buttons', func: 'Toggles AudioContext decode scheduler.' },
    { name: '[NEXT/PREV]', desc: 'Double arrow forward-backward skip keys', func: 'Skips tracks cleanly in the queue buffer.' },
    { name: '[VOLUME SLIDER]', desc: 'Horizontal slider with DB notation', func: 'Manipulates GainNode master volume.' },
    { name: '[TIME TOGGLE]', desc: 'Clock readout on top display screen', func: 'Switches display between elapsed & remaining.' },
    { name: '[SHUFFLE/REP]', desc: 'Compact toggle buttons with LED state', func: 'Alters play index selector sequence logic.' },
    { name: '[SLEEP TIMER]', desc: 'Bento/Classic notification system', func: 'Sets dynamic countdown (1/5/15/30m) with auto-zero.' },
    { name: '[FACTORY RESET]', desc: 'Special operation option in settings', func: 'Clears storage state & returns stats to default.' }
  ];

  let currentY = tY + 7;
  rowData.forEach((row, idx) => {
    doc.setFont(fMonoBold, 'normal');
    doc.setFontSize(7.5);
    doc.text(row.name, 18, currentY + 5);

    doc.setFont(fSansNormal, 'normal');
    doc.setFontSize(7.5);
    doc.text(row.desc, 52, currentY + 5);
    doc.text(row.func, 118, currentY + 5);
    
    currentY += 7.5;
    doc.line(15, currentY, pageWidth - 15, currentY); // row separator
  });

  // Section 1.2 Interactive Skins
  doc.setFont(fSansBold, 'normal');
  doc.setFontSize(11);
  doc.text('1.2 DUAL RETRO SKIN CONFIGURATION', 15, currentY + 12);

  doc.setFont(fSansNormal, 'normal');
  doc.setFontSize(9.5);
  const skinInfo = 
    `The receiver is configured with dual layout mappings that reorganizes the visual layout dynamically:
1. THE BENTO SKIN: A compact, nested grid layout containing unified modular compartments. Features an action header, integrated playlist manager, full-range graphic equalizer panel, and responsive library catalog viewer.
2. THE CLASSIC SKIN: Emulates iconic 1990s standalone units, combining dense silver-plated brush panels, pixelized digital readout segments, compact slide balances, and an expansive separate auxiliary visualizer panel.
Select skin colors directly via the Dropdown menu. Six retro factory presets are accessible: Gray Steel, Midnight Violet, Cobalt Blue, Toxic Matrix, Vespa Gold, and Crimson Ruby.`;
  const splitSkinInfo = doc.splitTextToSize(skinInfo, pageWidth - 30);
  doc.text(splitSkinInfo, 15, currentY + 18);


  // ---------------- PAGE 3: TURNTABLE VISUALIZER & DYNAMIC GRAPHIC FILTER ----------------
  doc.addPage();
  // Background Tint
  doc.setFillColor(cOffWhite[0], cOffWhite[1], cOffWhite[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Page Border Layout
  doc.setLineWidth(0.4);
  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Header
  doc.setFont(fMonoBold, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(cAmber[0], cAmber[1], cAmber[2]);
  doc.text('SECTION 2.0: TURNTABLE VISUALS & GRAPHIC EQUALIZATION', 15, 17);
  doc.setDrawColor(cAmber[0], cAmber[1], cAmber[2]);
  doc.setLineWidth(0.5);
  doc.line(15, 19, pageWidth - 15, 19);

  // Title
  doc.setFont(fSansBold, 'normal');
  doc.setFontSize(18);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.text('2.0 TURNTABLE EMULATOR ENGINE', 15, 27);

  doc.setFont(fSansNormal, 'normal');
  doc.setFontSize(9.5);
  const ttText = 
    `When "Turntable" visualizer mode is selected, the graphic output constructs a highly detailed top-down view of an analog direct-drive record deck. 

The mechanism utilizes high-precision dynamic math coordinates:
1. PRECISION STROBE LIGHT: Designed with dynamic platter radius alignment. The red target light (and strobe light bloom) is positioned strictly corresponding to the spinning vinyl edge, throwing a soft pulsing diagnostic beam across the platter dots.
2. RECORD PLATING ASSEMBLY: Houses a spinning audiophile vinyl slab styled with high-fidelity concentric light reflections that shift with rotation.
3. THE SIGNATURE SPINAMP LABEL: The centerpiece of the vinyl is the official Spinamp custom retro sticker. Styled as a premium obsidian core ringed by golden-amber energy loops, it features a central neon lightning bolt vector, deep burnt amber core transitions, and custom curved typographical branding reading "SPINAMP HI-FI RETRO".
4. THE TONEARM & STYLUS ASSEMBLY: Rebuilds an aluminum-tipped tone-arm that sweeps inwards automatically, calculating the precise angular ratio corresponding to the track's playback progress. When audio is paused, the tone-arm gently rises.`;
  const splitTtText = doc.splitTextToSize(ttText, pageWidth - 30);
  doc.text(splitTtText, 15, 34);

  // Section 2.1 EQ
  doc.setFont(fSansBold, 'normal');
  doc.setFontSize(11);
  doc.text('2.1 THE 10-BAND STEREO GRAPHIC EQUALIZER', 15, 126);

  doc.setFont(fSansNormal, 'normal');
  doc.setFontSize(9.5);
  const eqText = 
    `The machine is built with a sophisticated 10-Band Graphic Equalizer, utilizing digital BiquadFilterNodes chained in series. The frequencies are centered at: 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, and 16kHz. 

Each filter band provides -12.0dB of relative cut up to +12.0dB of amplification boost. The auxiliary PRE-AMP slider adjusts the absolute gain input prior to entering the filter chain. Users can customize band variables manually or choose from built-in preset configurations (Flat, Classical, Club, Dance, Live, Metal, Pop, Rock, Soft, Techno, Vocal, and Laptop speaker boost).`;
  const splitEqText = doc.splitTextToSize(eqText, pageWidth - 30);
  doc.text(splitEqText, 15, 133);

  // Section 2.2 Intelligent BPM Autoextraction
  doc.setFont(fSansBold, 'normal');
  doc.setFontSize(11);
  doc.text('2.2 SMART BPM AUTO-DETECTION', 15, 185);

  doc.setFont(fSansNormal, 'normal');
  doc.setFontSize(9.5);
  const bpmText = 
    `The player boasts a background Digital Signal Processor (DSP) designed to automatically register and calculate a track's Beats Per Minute (BPM) during playback. 

By analyzing local audio frequency packets, identifying peak energy thresholds, and logging periodic beat offsets, it estimates the tempo (displayed as dynamic BPM on the deck panel). If active detection is in progress, the system shows an animated BPM calculator readout on the main media visualizer, updating its local tempo registry database once finalized.`;
  const splitBpmText = doc.splitTextToSize(bpmText, pageWidth - 30);
  doc.text(splitBpmText, 15, 192);


  // ---------------- PAGE 4: TECHNICAL SPECIFICATIONS & SYSTEM SCHEMATIC ----------------
  doc.addPage();
  // Background Tint
  doc.setFillColor(cOffWhite[0], cOffWhite[1], cOffWhite[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Page Border Layout
  doc.setLineWidth(0.4);
  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Header
  doc.setFont(fMonoBold, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(cAmber[0], cAmber[1], cAmber[2]);
  doc.text('SECTION 3.0: SYSTEM SCHEMATICS & SPECIFICATIONS', 15, 17);
  doc.setDrawColor(cAmber[0], cAmber[1], cAmber[2]);
  doc.setLineWidth(0.5);
  doc.line(15, 19, pageWidth - 15, 19);

  // Title
  doc.setFont(fSansBold, 'normal');
  doc.setFontSize(18);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.text('3.0 INTERNAL SYSTEM BLOCK SCHEMATIC', 15, 27);

  // Drawing relative flow chart diagrams!
  // Boxes
  const fsY = 32;
  doc.setLineWidth(0.18);
  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  
  // Column 1: Input source
  doc.rect(15, fsY + 5, 30, 8);
  doc.setFont(fMonoBold, 'normal');
  doc.setFontSize(7);
  doc.text('PLAYLIST QUEUE', 18, fsY + 10.5);

  // Arrow
  doc.line(45, fsY + 9, 53, fsY + 9);
  doc.line(51, fsY + 8, 53, fsY + 9);
  doc.line(51, fsY + 10, 53, fsY + 9);

  // Column 2: Decoder & Gain stage
  doc.rect(53, fsY + 5, 32, 8);
  doc.text('AUDIO CONTEXT DECODE', 55, fsY + 10.5);

  // Arrow
  doc.line(85, fsY + 9, 93, fsY + 9);
  doc.line(91, fsY + 8, 93, fsY + 9);
  doc.line(91, fsY + 10, 93, fsY + 9);

  // Column 3: Preamp
  doc.rect(93, fsY + 5, 24, 8);
  doc.text('PREAMP GAIN NODE', 95, fsY + 10.5);

  // Arrow
  doc.line(117, fsY + 9, 125, fsY + 9);
  doc.line(123, fsY + 8, 125, fsY + 9);
  doc.line(123, fsY + 10, 125, fsY + 9);

  // Column 4: EQ
  doc.rect(125, fsY + 5, 32, 8);
  doc.text('10-BAND EQ FILTER', 127, fsY + 10.5);

  // Arrow
  doc.line(157, fsY + 9, 165, fsY + 9);
  doc.line(163, fsY + 8, 165, fsY + 9);
  doc.line(163, fsY + 10, 165, fsY + 9);

  // Column 5: Analyzer
  doc.rect(165, fsY + 5, 30, 8);
  doc.text('FFT ANALYZER NODE', 167, fsY + 10.5);

  // Vertical Arrow down to speakers & visualizer
  doc.line(180, fsY + 13, 180, fsY + 23);
  doc.line(179, fsY + 21, 180, fsY + 23);
  doc.line(181, fsY + 21, 180, fsY + 23);

  // Dual output boxes (Left Visualizer, Right Speaker Output)
  doc.rect(165, fsY + 23, 30, 8);
  doc.text('MASTER AUDIO OUT', 168.5, fsY + 28.5);

  doc.line(165, fsY + 9, 140, fsY + 9); // secondary split to visualizer panel
  doc.line(140, fsY + 9, 140, fsY + 23);
  doc.line(139, fsY + 21, 140, fsY + 23);
  doc.line(141, fsY + 21, 140, fsY + 23);

  doc.rect(120, fsY + 23, 40, 8);
  doc.text('GLOWING VFD OSCILLOSCOPE', 121.5, fsY + 28.5);

  // Section 3.1 Tech Specifications
  doc.setFont(fSansBold, 'normal');
  doc.setFontSize(11);
  doc.text('3.1 SYSTEM SPECIFICATION DETAILS', 15, 78);

  // Draw technical details card
  doc.setLineWidth(0.15);
  doc.rect(15, 83, pageWidth - 30, 48);
  
  doc.setFont(fMonoBold, 'normal');
  doc.setFontSize(8);
  doc.text([
    'PARAMETER SOURCE       VALUATION METRIC                 TOLERANCE STATUS',
    '------------------------------------------------------------------------',
    'FREQUENCY RESPONSE     20 Hz - 22,000 Hz                +/- 0.12 dB',
    'TOTAL DISTORTION       < 0.00045% (THD+N)               STABLE LAB-GRADE',
    'FFT RESOLUTION SIZE    1024 / 2048 SAMPLES              INTELLIGENT SCALING',
    'BIQUAD CASCADE COEFFS  DOUBLE-PRECISION DIRECT FORM II  ROBUST DIGITAL FILTER',
    'PRE-AMP EQUALIZER      -12.0 dB TO +12.0 dB RANGE       DYNAMIC VOLTAGE STAGE',
    'LATENCY PROFILE        ULTRA-LOW BUFFER SCHEDULE        WEB AUDIO AUTOMATED'
  ], 17, 88);

  // Section 3.2 Troubleshooting/Maintenance
  doc.setFont(fSansBold, 'normal');
  doc.setFontSize(11);
  doc.text('3.2 MAINTENANCE GUIDELINES & RESTORE PROCEDURE', 15, 143);

  doc.setFont(fSansNormal, 'normal');
  doc.setFontSize(9.5);
  const maintText = 
    `1. RESTORING SYSTEM FACTORY DEFAULTS:
If local storage buffers or presets become corrupted or if you desire a clean slate, click the "Restore Defaults" item inside either the Bento skin options dropdown or directly on the main Welcome Power On splash panel. This instantly executes a hard reset coordinates purge: clearing skin selections back to Gray Steel, restoring the queue list back to original high-fidelity demo track configurations, deleting cached statistics data, and turning off the power safely to reset active circuit loops.

2. PREVENTING DIGITAL CLIP BLUR:
If the visualizer oscillates excessively, lower the "VIS SENSITIVITY" slider parameter. This re-indexes the scaling variables of the frequency arrays, providing clean, high-contrast spectrum visual display shapes.`;
  const splitMaintText = doc.splitTextToSize(maintText, pageWidth - 30);
  doc.text(splitMaintText, 15, 150);


  // ---------------- DOUBLE-PASS PAGE NUMBER DRAWING ----------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont(fMonoNormal, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    // Draws standard retro-themed footer on all pages
    doc.text(`SPINAMP RETRO SYSTEM SA-3000R  |  OPERATING MANUAL  |  PAGE ${i} OF ${totalPages}`, 15, pageHeight - 14);
    
    doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setLineWidth(0.12);
    doc.line(15, pageHeight - 16.5, pageWidth - 15, pageHeight - 16.5);
  }

  // Save the PDF
  doc.save('Spinamp_Retro_Player_Operating_Manual.pdf');
}
