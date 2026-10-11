# Android Build & Testing Guide for Ledgerly

## Prerequisites

- **Java Development Kit (JDK)**: OpenJDK 21 (installed via `winget install OpenJDK`). Ensure `JAVA_HOME` points to the JDK directory and `java -version` reports `21`.
- **Android SDK**: Installed as part of Android Studio or via the command line. The build process will automatically download the required **Build‑Tools 35** and **Platform 36** on first Gradle run.
- **Capacitor CLI** (installed globally or as a dev dependency):
  ```powershell
  npm install @capacitor/cli@latest --save-dev
  ```
- **Node.js** (v20 or later) and **npm**.
- **Device / Emulator** with SMS capability (real device recommended for full SMS testing).

## Building the Android App

1. **Generate the static web assets** (Capacitor needs the exported `out` folder):
   ```powershell
   cd C:\Users\shett\Desktop\finace
   npm run build:mobile   # moves API folder, sets CAPACITOR_BUILD=true, builds Next.js export
   ```
   This creates the `out` directory and copies it to `android/app/src/main/assets/public`.

2. **Add the Android platform (only needed once):**
   ```powershell
   npx cap add android
   ```
   The command creates the `android` sub‑project.

3. **Synchronize Capacitor assets:**
   ```powershell
   npx cap sync android
   ```
   This copies the latest web assets and updates native plugin registrations.

4. **Build the debug APK:**
   ```powershell
   cd android
   .\gradlew.bat assembleDebug
   ```
   The APK is generated at:
   `android\app\build\outputs\apk\debug\app-debug.apk`.

## Installing & Running on a Device / Emulator

### Using an Android Emulator
1. Launch Android Studio → **AVD Manager** → create an emulated device that supports **Google Play**. Ensure the **SMS** feature is enabled (most Phone models have it).
2. Start the emulator.
3. Install the debug APK:
   ```powershell
   cd android
   .\gradlew.bat installDebug
   ```
   The app should appear in the emulator’s app drawer.

### Using a Physical Device
1. Enable **Developer options** and **USB debugging** on the device.
2. Connect the device via USB (or use `adb over Wi‑Fi`).
3. Verify the connection:
   ```powershell
   adb devices
   ```
4. Install the debug APK as shown above.

## Testing the SMS Plugin

The native plugin lives in `android/app/src/main/java/com/upipulse/app/SmsReaderPlugin.java` and provides three methods accessible from JavaScript/TypeScript:
- `checkPermissions()` – returns the current permission state.
- `requestPermissions()` – prompts the user for SMS permissions.
- `getHistoricalSms({ days: number })` – fetches SMS messages from the last *n* days.

### Example Usage in the Web App
```typescript
import { Plugins } from '@capacitor/core';
const { SmsReaderPlugin } = Plugins;

async function testSmsPlugin() {
  const status = await SmsReaderPlugin.checkPermissions();
  console.log('Permission status:', status);

  if (status === 'denied') {
    await SmsReaderPlugin.requestPermissions();
  }

  const sms = await SmsReaderPlugin.getHistoricalSms({ days: 30 });
  console.log('Recent SMS:', sms);
}

testSmsPlugin();
```

### Receiving Real‑Time SMS
The `SmsReceiver` broadcast receiver forwards incoming SMS to the plugin, which then emits an event that can be listened to in JavaScript:
```typescript
SmsReaderPlugin.addListener('smsReceived', (msg) => {
  console.log('New SMS:', msg);
});
```
> **Note:** Emulators may not deliver real SMS. Use a physical device or `adb emu sms send` for simulated messages, e.g.:
> ```powershell
> adb emu sms send +1234567890 "Your OTP is 123456"
> ```

## Creating a Signed Release APK (Optional)
1. **Generate a keystore** (run once):
   ```powershell
   keytool -genkeypair -v -keystore my-release-key.jks -alias ledgerly_key \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. **Add signing config** to `android/app/build.gradle` (inside the `android` block):
   ```gradle
   signingConfigs {
       release {
           storeFile file('my-release-key.jks')
           storePassword '<store‑password>'
           keyAlias 'ledgerly_key'
           keyPassword '<key‑password>'
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
           minifyEnabled false
           proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
       }
   }
   ```
   *Replace the placeholder passwords with your actual values or use environment variables for security.*
3. **Assemble the release bundle:**
   ```powershell
   .\gradlew.bat assembleRelease
   ```
   The signed APK appears at `android/app/build/outputs/apk/release/app-release.apk`.

## Common Issues & Troubleshooting

- **"Unsupported class file major version"** – Ensure `JAVA_HOME` points to JDK 21, not a later preview version.
- **Missing Android SDK components** – The first Gradle run will automatically download required Build‑Tools/Platform. If it fails, run `sdkmanager "platforms;android-36" "build-tools;35.0.0"`.
- **Permission denied** – Android 13+ requires runtime permission for `READ_SMS`. Call `requestPermissions()` before attempting to read SMS.
- **No SMS events on emulator** – Use `adb emu sms send` to simulate, or test on a real device.

## Quick Reference Commands
| Task | Command |
|------|---------|
| Build web assets (Capacitor) | `npm run build:mobile` |
| Add Android platform | `npx cap add android` |
| Sync assets | `npx cap sync android` |
| Build debug APK | `cd android && .\gradlew.bat assembleDebug` |
| Install on device/emulator | `cd android && .\gradlew.bat installDebug` |
| Generate release APK | `cd android && .\gradlew.bat assembleRelease` |
| Simulate incoming SMS (emulator) | `adb emu sms send <number> "<text>"` |

---
*This document is version‑controlled alongside the codebase. Update it whenever you change the build process or plugin API.*
