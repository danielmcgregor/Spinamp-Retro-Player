# Spinamp Retro Player

Eine liebevolle Hommage an den klassischen Winamp-Player, gebaut als React/TypeScript-
Web-App und als native Android-APK verpackt. Enthält mehrere Skins (Bento, Classic),
einen 10-Band-Equalizer, über 25 Audio-Visualizer-Modi, einen CD-Ripper mit
synthetisierter Audio-Wiedergabe, und einen selbstgeschriebenen nativen Android-Wrapper
mit vollständiger Hintergrund-Wiedergabe (Foreground Service, MediaSession,
Sperrbildschirm-Steuerung, Kopfhörer-Fernbedienung).

## Projektstruktur

```
spinamp-retro-player/
├── src/                  React/TypeScript Web-App (Hauptprojekt)
├── public/                Statische Assets
├── android/                Nativer Android-Wrapper (siehe android/README.md)
├── package.json
├── vite.config.ts
└── index.html
```

## Web-App lokal starten

```bash
npm install
npm run dev
```

Die Web-App läuft dann unter `http://localhost:5173` (oder dem von Vite
angezeigten Port) — allerdings ohne die nativen Android-Funktionen (Datei-/
Ordner-Auswahl per Bridge, Hintergrund-Wiedergabe, Sperrbildschirm-Steuerung).
Diese sind ausschließlich in der gepackten Android-APK verfügbar.

## Web-App bauen

```bash
npm run build
```

Erzeugt die statischen Dateien im `dist/`-Ordner.

## Android-APK bauen

Siehe [`android/README.md`](android/README.md) für die Details zum nativen
Wrapper. Der aktuelle Build-Prozess ist ungewöhnlich (kein Standard-Android-
Studio-Projekt mit Gradle) — die Datei dokumentiert, warum und wie.

## Entwicklungsgeschichte

Die Web-App wurde ursprünglich mit Google AI Studio entwickelt und iterativ
über viele Runden von Prompts erweitert und mit Bugfixes versehen. Der native
Android-Teil (Hintergrund-Wiedergabe, Datei-/Ordner-Bridge, MediaSession,
Lautstärke-Kopplung) wurde separat dazu gebaut, da diese Funktionen außerhalb
dessen liegen, was JavaScript in einer WebView leisten kann.
