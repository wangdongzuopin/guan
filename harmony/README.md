# HarmonyOS packaging

This project keeps React Native business code in the root app, and provides a HarmonyOS packaging scaffold here.

## Prerequisites

1. DevEco Studio 5.x
2. HarmonyOS NEXT SDK
3. `hvigorw` available in `harmony/` path
4. Optional signing config in `harmony/build-profile.json5`

## Build

From repository root:

```bash
npm run build:harmony
```

Or inside `harmony/`:

```bash
./hvigorw clean
./hvigorw assembleHap
```

Generated artifact is under `harmony/app/entry/build/default/outputs/default/entry-default-signed.hap` (path may vary by DevEco version).

## Notes

1. This scaffold is for packaging configuration and build pipeline alignment.
2. To run full React Native on HarmonyOS, integrate RNOH runtime in the `entry` module.
