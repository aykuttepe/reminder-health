import {Platform} from 'react-native';
import {fetch as nativeFetch} from 'whatwg-fetch';

// Expo SDK 57 replaces global fetch with expo/fetch. Use React Native's
// XMLHttpRequest-backed implementation for the native app, including release
// bundles where an environment-only opt-out may not be inlined.
if (Platform.OS !== 'web') {
  globalThis.fetch = nativeFetch;
}
