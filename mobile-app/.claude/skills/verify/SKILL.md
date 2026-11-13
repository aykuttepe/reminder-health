---
name: verify
description: Build the Rutin Android app, install it on the Frenzo_Test emulator and drive screens with adb to capture evidence.
---

# Verify Rutin on the Android emulator

## Build and install
```bash
export PATH=/opt/homebrew/share/android-commandlinetools/platform-tools:$PATH
cd mobile-app/android && ./gradlew assembleGithubRelease -q   # ~1 min incremental
adb install -r app/build/outputs/apk/github/release/app-github-release.apk
adb shell am force-stop com.aykuttepe.rutin
adb shell am start -n com.aykuttepe.rutin/.MainActivity
```
- Emulator: AVD `Frenzo_Test` (emulator-5554, 1080x2400, density 420). Package `com.aykuttepe.rutin`.
- `monkey -p ...` does not open the app here; use `am start`.

## Drive
`ui.sh` next to this file: `ui.sh tap "<text or content-desc substring>"`, `ui.sh dump` (text + bounds), `ui.sh shot NAME` (PNG into `$VERIFY_OUT`, default a temp dir).
- Editor header: ✕ at (76,204), Kaydet via `ui.sh tap Kaydet`.
- Today card menu: `ui.sh tap "<Name>, İlaç seçenekleri"` opens the editor of a saved medicine.
- Replace a field's text: tap it, `adb shell input keycombination 113 29` (select all), `keyevent 67`, `input text "1,5%stablet"` (`%s` = space).
- Calendar sheet: month buttons have content-desc `Önceki Ay` / `Sonraki Ay`; the sheet moves after the first tap, so tap by label, not fixed coordinates.

## Large text
`adb shell settings put system font_scale 1.5` (also 1.3, 2.0). The activity restarts and any open editor closes; reopen it. Always reset to `1.0` afterwards.

## Gotchas
- Back (`keyevent 4`) with an edited form now opens "Değişiklikler kaydedilmedi"; confirm with `ui.sh tap "Sil ve Kapat"`.
- Leave the emulator empty when done: delete test medicines via editor → İlacı Sil → confirm.
- E2E suites (Robot + Appium) live in `tests/e2e`; Appium: `npm --prefix tests/e2e run appium` with ANDROID_HOME=/opt/homebrew/share/android-commandlinetools.
