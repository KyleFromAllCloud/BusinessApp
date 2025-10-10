/**
 * Business Plan App - React Native
 * Integrates with Agentcore AI Business Coach
 *
 * @format
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './src/App';

function MainApp() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

export default MainApp;
