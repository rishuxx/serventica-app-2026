import { Platform, Text, TextInput } from 'react-native';

/**
 * Universal Cross-Platform Font Registry & Loader
 * Works seamlessly on:
 * - Bare React Native Android (reads from assets/fonts)
 * - Expo Go on iOS / iPhone (loads via expo-font asynchronously)
 * - Bare React Native iOS (reads from bundled Info.plist UIAppFonts)
 */

// Inject global default font for Text and TextInput across the entire app
try {
  const customTextProps = {
    style: {
      fontFamily: 'Lexend-Regular',
    },
  };
  const customTextInputProps = {
    style: {
      fontFamily: 'Lexend-Regular',
    },
  };

  // Safe prototype & defaultProps augmentation
  const TextComponent = Text as any;
  const TextInputComponent = TextInput as any;

  if (TextComponent.defaultProps == null) {
    TextComponent.defaultProps = {};
  }
  TextComponent.defaultProps.style = [
    { fontFamily: 'Lexend-Regular' },
    TextComponent.defaultProps.style,
  ];

  if (TextInputComponent.defaultProps == null) {
    TextInputComponent.defaultProps = {};
  }
  TextInputComponent.defaultProps.style = [
    { fontFamily: 'Lexend-Regular' },
    TextInputComponent.defaultProps.style,
  ];
} catch (err) {
  // Graceful fallback
}

let isLoaded = false;
let loadPromise: Promise<boolean> | null = null;

export async function ensureFontsLoaded(): Promise<boolean> {
  if (isLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      let ExpoFont: any = null;
      try {
        ExpoFont = require('expo-font');
      } catch {
        // Fallback
      }

      if (ExpoFont && typeof ExpoFont.loadAsync === 'function') {
        await ExpoFont.loadAsync({
          'Lexend-Thin': require('../fonts/Lexend-Thin.ttf'),
          'Lexend-Light': require('../fonts/Lexend-Light.ttf'),
          'Lexend-Regular': require('../fonts/Lexend-Regular.ttf'),
          'Lexend-Medium': require('../fonts/Lexend-Medium.ttf'),
          'Lexend-SemiBold': require('../fonts/Lexend-SemiBold.ttf'),
          'Lexend-Bold': require('../fonts/Lexend-Bold.ttf'),
          'Lexend-ExtraBold': require('../fonts/Lexend-ExtraBold.ttf'),
          'Lexend-Black': require('../fonts/Lexend-Black.ttf'),
          'LexendDeca-Regular': require('../fonts/LexendDeca-Regular.ttf'),
          'LexendDeca-Medium': require('../fonts/LexendDeca-Medium.ttf'),
          'LexendDeca-SemiBold': require('../fonts/LexendDeca-SemiBold.ttf'),
          'LexendDeca-Bold': require('../fonts/LexendDeca-Bold.ttf'),
        });
        isLoaded = true;
        return true;
      }
    } catch (e: any) {
      console.log('[FontLoader] Notice:', e?.message || e);
    }
    isLoaded = true;
    return true;
  })();

  return loadPromise;
}

// Kick off eager font load for Expo Go without blocking render
ensureFontsLoaded().catch(() => {});

