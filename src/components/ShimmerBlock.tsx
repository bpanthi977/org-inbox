import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, useColorScheme, ViewStyle} from 'react-native';

interface Props {
  width: number | `${number}%`;
  height: number;
  style?: ViewStyle;
}

export function ShimmerBlock({width, height, style}: Props): React.JSX.Element {
  const isDark = useColorScheme() === 'dark';
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 0.7, duration: 600, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 0.3, duration: 600, useNativeDriver: true}),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width: width as any,
          height,
          backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA',
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: 6,
  },
});
