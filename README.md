# App Collection Desktop + Mobile

This project now uses an Electron desktop shell as the primary desktop runtime.
Pure browser mode is no longer the target.

## Core Features

1. App/software scan and list
2. Tap to launch software
3. Accessibility modes: normal, elderly, blind
4. Hot news panel with categories
5. Theme color: `#3982f7`

## Runtime Modes

1. Desktop (recommended): Electron shell + Expo web renderer
2. Android/iOS: Expo native workflow
3. Harmony: packaging scaffold retained

## Install

```bash
npm install
```

Optional desktop cache generation:

```bash
npm run prepare:desktop-cache
```

## Desktop Development

```bash
npm run desktop
```

This command starts:

1. Expo renderer on `http://localhost:8081`
2. Electron shell window

Desktop app launching is handled by Electron main process IPC, not browser `file://`.

## Desktop Packaging (Windows)

```bash
npm run desktop:pack
```

Output directory:

`desktop/dist`

## Mobile

```bash
npm run android
npm run ios
```

## Existing Packaging Commands

```bash
npm run build:android:apk
npm run build:android:aab
npm run build:ios
npm run build:harmony
```
