<div align="center">

# 📻 Spinamp Retro Player 🎶

**A nostalgic, feature-packed retro audio player inspired by classic Winamp — built with React 19, TypeScript, Vite, and packaged for Android.**

[![GitHub Release](https://img.shields.io/github/v/release/danielmcgregor/Spinamp-Retro-Player?color=8b5cf6&logo=android&logoColor=white)](https://github.com/danielmcgregor/Spinamp-Retro-Player/releases/tag/v1.1.0)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7.0-119efd?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Donate-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/danielmcgregor)

<br />

<a href="https://buymeacoffee.com/danielmcgregor" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="210" height="60" />
</a>

</div>

---

## ✨ Overview

**Spinamp Retro Player** brings back the golden era of desktop media players with modern web and mobile technology. Designed with high fidelity retro aesthetic skins, interactive canvas audio visualizers, a full 10-band graphic equalizer, local media library management, and native Android background playback.

Whether you're jamming to retro chiptunes, local MP3 collections, or synthesized audio tracks, Spinamp delivers a customizable audio-visual experience on desktop and mobile devices.

---

## 🔥 Key Features

- **📱 Native Android Support**: Packaged with Capacitor 7 for Android. Features background audio playback (Foreground Service), lock screen MediaSession controls, hardware volume keys integration, and custom high-res app icons & splash screen.
- **🎨 Retro Player Skins**:
  - **Bento Skin**: Clean modular layout inspired by Winamp 3 / modern Bento interfaces.
  - **Driving Mode**: Large touch-friendly controls designed for in-car and mobile use.
  - **Custom Themes & Color Pickers**: GIMP-style color picker and palette selector for full UI customization.
- **🎛️ 10-Band Graphic Equalizer**: Precise audio frequency shaping with presets, custom EQ curve saving, and live spectrum feedback.
- **🌌 25+ Interactive Audio Visualizers**:
  - *Aurora*, *Fire*, *Guitar Hero*, *Matrix Rain*, *Vegas Strip*, *Waveform River*, *Album Wall*, *Radial Spectrum*, *Demoscene*, *Keygen*, *Kaleidoscope*, and more!
- **📁 Media Library & Playlist Manager**: Load local audio files, search tracks, parse ID3 tags & embedded album art, calculate BPM, and organize playlists.
- **🎹 Built-in Audio Synthesizer**: Fallback synth mode generating retro-style chiptune tones and demo tracks.
- **📄 Printable User Manual**: Built-in PDF export tool (`jsPDF`) for generating user documentation and shortcuts reference.

---
# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0ca6047d-47ae-4cb4-aa95-a93e2314a4c0

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
