import React from 'react';
import {TouchableOpacity} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {SettingsScreen} from '../screens/SettingsScreen';
import {SharePreviewScreen} from '../screens/SharePreviewScreen';
import type {SharedItem} from '../types';

export type RootStackParamList = {
  Settings: {showBanner?: boolean};
  SharePreview: {item: SharedItem};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface Props {
  /** Initial item received from a share intent (if app was opened via share) */
  initialShareItem?: SharedItem;
}

function GearIcon({onPress}: {onPress: () => void}) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={8} accessibilityLabel="Settings">
      {/* Simple ⚙ character — swap for an icon library in a later phase */}
      <React.Fragment>
        {/* Using Text as icon placeholder */}
        <TouchableOpacity onPress={onPress} />
      </React.Fragment>
    </TouchableOpacity>
  );
}

export function RootNavigator({initialShareItem}: Props): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialShareItem ? 'SharePreview' : 'Settings'}
        screenOptions={{
          headerStyle: {backgroundColor: '#F2F2F7'},
          headerTitleStyle: {fontSize: 17, fontWeight: '600'},
          headerShadowVisible: false,
        }}>

        <Stack.Screen
          name="Settings"
          options={({navigation}: {navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>}) => ({
            title: 'org-inbox',
            headerRight: () => null, // gear icon lives here when on SharePreview
          })}>
          {props => (
            <SettingsScreen
              {...props.route.params}
              onConfigured={() => {
                // If opened directly (not from share), nothing to navigate to
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="SharePreview"
          options={({navigation}: {navigation: NativeStackNavigationProp<RootStackParamList, 'SharePreview'>}) => ({
            title: 'org-inbox',
            headerLeft: () => null, // no back button — cancel is in the screen
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings', {})}
                hitSlop={8}
                accessibilityLabel="Settings">
                {/* ⚙ placeholder */}
                <React.Fragment />
              </TouchableOpacity>
            ),
          })}>
          {props => (
            <SharePreviewScreen
              item={props.route.params.item}
              onSave={() => props.navigation.goBack()}
              onCancel={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>

      </Stack.Navigator>
    </NavigationContainer>
  );
}
