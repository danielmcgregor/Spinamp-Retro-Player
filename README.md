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

## 📲 Download for Android

Get the pre-compiled Android APK directly from GitHub Releases:

📦 **[Download Spinamp Retro Player APK (v1.1.0)](https://github.com/danielmcgregor/Spinamp-Retro-Player/releases/tag/v1.1.0)**

---

## 🛠️ Local Development & Build Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)
- [Android Studio / Android SDK](https://developer.android.com/studio) (for building the Android APK)

### 1. Clone the repository

```bash
git clone https://github.com/danielmcgregor/Spinamp-Retro-Player.git
cd Spinamp-Retro-Player
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The web app will run locally at `http://localhost:3000`.

### 4. Build the web production bundle

```bash
npm run build
```

The production output will be generated in `dist/`.

---

## 🤖 Building the Android APK

1. Ensure the web application is built:
   ```bash
   npm run build
   ```

2. Sync assets with Capacitor:
   ```bash
   npx cap sync android
   ```

3. Build the Debug APK using Gradle:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

The output `.apk` file will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## ⚡ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/), [Motion](https://motion.dev/)
- **Audio Processing**: Web Audio API, Canvas 2D Rendering Engine, jsPDF
- **Mobile Container**: [Capacitor 7](https://capacitorjs.com/)

---

## ☕ Support the Project

If you enjoy using **Spinamp Retro Player**, consider supporting the developer! Your support helps fuel further feature development, new visualizers, and mobile performance improvements.

<div align="center">

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Donate-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/danielmcgregor)

**👉 [buymeacoffee.com/danielmcgregor](https://buymeacoffee.com/danielmcgregor)**

</div>

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).