import './src/shims/expo-polyfill';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register for Bare React Native CLI (Android Studio / Xcode build)
AppRegistry.registerComponent(appName, () => App);

// Register for Expo Go client (which expects the "main" app key)
AppRegistry.registerComponent('main', () => App);

