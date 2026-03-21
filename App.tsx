import React, {useEffect, useState} from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RootNavigator} from './src/navigation/RootNavigator';
import type {SharedItem} from './src/types';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  // Will be populated by share intent handler (wired in Phase 4 & 5)
  const [initialShareItem] = useState<SharedItem | undefined>(undefined);

  useEffect(() => {
    // Share intent listeners are wired in Phase 4 (Android) and Phase 5 (iOS)
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator initialShareItem={initialShareItem} />
    </SafeAreaProvider>
  );
}

export default App;
