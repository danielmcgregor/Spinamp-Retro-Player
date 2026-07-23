# Nativer Android-Wrapper

Dieser Ordner enthält den kompletten nativen Android-Code, der die Web-App
(`../src`) in eine funktionierende APK verpackt — mit Funktionen, die reines
JavaScript in einer WebView nicht kann:

- **`MainActivity.java`** — hostet die WebView, JS-Bridges für Datei-/Ordner-
  Auswahl (`AndroidFileBridge`), Wiedergabestatus (`AndroidMediaBridge`) und
  Lautstärke-Kopplung (`AndroidVolumeBridge`); fängt Kopfhörer- und
  Lautstärketasten ab
- **`PlaybackService.java`** — Foreground Service mit echter `MediaSession`,
  persistenter Benachrichtigung (Play/Pause/Next/Previous) und `WakeLock` für
  zuverlässige Hintergrund-Wiedergabe
- **`AndroidManifest.xml`** — alle nötigen Berechtigungen und Komponenten-
  Deklarationen

## ⚠️ Kein Standard-Android-Studio-Projekt

Dieser Code wurde **nicht** mit Android Studio/Gradle gebaut, sondern mit
einer minimalen Werkzeugkette (`aapt2`, `dx`, `apksigner`, `zipalign` direkt
über die Kommandozeile) — ein Ergebnis der Entwicklungsumgebung, in der
dieser Code entstanden ist. Es fehlen bewusst:

- `build.gradle` / `settings.gradle`
- Eine `res/`-Ordnerstruktur mit vollständigen Ressourcen (Icons wurden
  programmatisch erzeugt)
- Ein `AndroidManifest.xml` im Standard-Projektpfad (`app/src/main/`)

**Um dieses Projekt in Android Studio weiterzuentwickeln**, am einfachsten:

1. Neues, leeres Android-Studio-Projekt erstellen (Java, kein Compose nötig,
   „Empty Views Activity")
2. Package-Namen auf `com.spinamp.retroplayer` setzen
3. `MainActivity.java` und `PlaybackService.java` in
   `app/src/main/java/com/spinamp/retroplayer/` einfügen
4. Den Inhalt von `AndroidManifest.xml` in
   `app/src/main/AndroidManifest.xml` übertragen (Berechtigungen und den
   `<service>`-Eintrag nicht vergessen)
5. Den `dist/`-Ordner der Web-App (`npm run build` im Hauptprojekt) nach
   `app/src/main/assets/` kopieren — die App lädt
   `file:///android_asset/index.html`
6. `compileSdkVersion`/`targetSdkVersion` auf mindestens 34 setzen
   (`minSdkVersion` 21)

## Bridge-Verträge (JS ↔ Native)

Falls du an der Web-App weiterarbeitest und wissen willst, welche
JavaScript-Schnittstellen die native Seite bereitstellt:

| Bridge | Methoden | Zweck |
|---|---|---|
| `window.AndroidFileBridge` | `pickFiles()`, `pickFolder()`, `reopenFiles()` | Datei-/Ordner-Auswahl mit dauerhafter Berechtigung |
| `window.AndroidMediaBridge` | `updatePlaybackState()`, `stopPlaybackService()` | Wiedergabestatus an den Foreground Service melden |
| `window.AndroidVolumeBridge` | `getCurrentVolume()`, `setVolume()` | System-Lautstärke lesen/setzen |

Native → JS Callbacks: `onAndroidFilesPicked`, `onAndroidFilesPickCancelled`,
`onAndroidFilesReopened`, `onNativeMediaAction`, `onNativeVolumeChanged`,
`onNativeVolumeStep`, `onNativeAppVisibilityChanged`.
