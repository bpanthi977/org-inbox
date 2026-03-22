import React, {useEffect, useState} from 'react';
import {TouchableOpacity, Text, StyleSheet, BackHandler, useColorScheme} from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {InboxScreen} from '../screens/InboxScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {SharePreviewScreen} from '../screens/SharePreviewScreen';
import {Settings} from '../storage/settings';
import type {SharedItem} from '../types';

export type RootStackParamList = {
  Inbox: undefined;
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
  const isDark = useColorScheme() === 'dark';
  const headerBg = isDark ? '#1C1C1E' : '#F2F2F7';
  const headerTint = isDark ? '#FFFFFF' : '#000000';
  const [navigatorReady, setNavigatorReady] = useState(false);

  useEffect(() => {
    if (navigatorReady && initialShareItems?.length && Settings.hasConfiguredPath()) {
      navigationRef.navigate('SharePreview', {items: initialShareItems});
    }
  }, [navigatorReady, initialShareItems]);

  // Start on Settings if launched from share intent but no folder configured;
  // otherwise start on the Inbox home screen.
  const initialRoute =
    initialShareItems?.length && !Settings.hasConfiguredPath()
      ? 'Settings'
      : 'Inbox';

  return (
    <NavigationContainer ref={navigationRef} onReady={() => setNavigatorReady(true)}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {backgroundColor: headerBg},
          headerTitleStyle: {fontSize: 17, fontWeight: '600', color: headerTint},
          headerTintColor: headerTint,
          headerShadowVisible: false,
        }}>

        <Stack.Screen
          name="Inbox"
          options={({
            navigation,
          }: {
            navigation: NativeStackNavigationProp<RootStackParamList, 'Inbox'>;
          }) => ({
            title: 'org-inbox',
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
          {() => <InboxScreen />}
        </Stack.Screen>

        <Stack.Screen
          name="Settings"
          options={{
            title: 'Settings',
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
                } else {
                  props.navigation.goBack();
                }
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="SharePreview"
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
              onSave={() => {
                if (props.navigation.canGoBack()) {
                  props.navigation.goBack();
                } else {
                  BackHandler.exitApp();
                }
              }}
              onCancel={() => {
                if (props.navigation.canGoBack()) {
                  props.navigation.goBack();
                } else {
                  BackHandler.exitApp();
                }
              }}
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
