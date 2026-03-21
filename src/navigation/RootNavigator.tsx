import React from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {SettingsScreen} from '../screens/SettingsScreen';
import {SharePreviewScreen} from '../screens/SharePreviewScreen';
import {Settings} from '../storage/settings';
import type {SharedItem} from '../types';

export type RootStackParamList = {
  Settings: {showBanner?: boolean} | undefined;
  SharePreview: {items: SharedItem[]};
};

/** Ref used by App.tsx to navigate imperatively from the share intent listener. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();

interface Props {
  initialShareItems?: SharedItem[];
}

export function RootNavigator({initialShareItems}: Props): React.JSX.Element {
  // If app launched from a share but no folder is configured, go to Settings first.
  const startOnSettings =
    !initialShareItems?.length || !Settings.hasConfiguredPath();

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={startOnSettings ? 'Settings' : 'SharePreview'}
        screenOptions={{
          headerStyle: {backgroundColor: '#F2F2F7'},
          headerTitleStyle: {fontSize: 17, fontWeight: '600'},
          headerShadowVisible: false,
        }}>

        <Stack.Screen
          name="Settings"
          options={{
            title: 'org-inbox',
            headerRight: () => null,
          }}>
          {props => (
            <SettingsScreen
              showBanner={
                !!initialShareItems?.length && !Settings.hasConfiguredPath()
              }
              onConfigured={() => {
                if (initialShareItems?.length) {
                  props.navigation.replace('SharePreview', {
                    items: initialShareItems,
                  });
                }
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="SharePreview"
          initialParams={initialShareItems?.length ? {items: initialShareItems} : undefined}
          options={({
            navigation,
          }: {
            navigation: NativeStackNavigationProp<
              RootStackParamList,
              'SharePreview'
            >;
          }) => ({
            title: 'org-inbox',
            headerLeft: () => null,
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                hitSlop={8}
                accessibilityLabel="Settings"
                style={styles.gearButton}>
                <Text style={styles.gearIcon}>⚙</Text>
              </TouchableOpacity>
            ),
          })}>
          {props => (
            <SharePreviewScreen
              items={props.route.params.items}
              onSave={() => props.navigation.goBack()}
              onCancel={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>

      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  gearButton: {padding: 4},
  gearIcon: {fontSize: 20, color: '#007AFF'},
});
