/* eslint-disable react-hooks/immutability */
import React, { useEffect } from 'react';
import { TextInput, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Create an animated TextInput component that can accept animatedProps
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  style?: TextStyle;
  color?: string;
  duration?: number;
  delay?: number;
}

/**
 * AnimatedCounter - Animates a number from 0 to target value on mount.
 * Uses useSharedValue + withTiming for smooth count-up animation.
 * Renders via an invisible TextInput driven by useAnimatedProps for
 * cross-platform compatibility (web, iOS, Android).
 */
export function AnimatedCounter({
  value,
  suffix = '',
  style,
  color,
  duration = 900,
  delay = 0,
}: AnimatedCounterProps) {
  'use no memo';
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      animatedValue.value = withTiming(value, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [value, duration, delay, animatedValue]);

  const animatedProps = useAnimatedProps(() => {
    return {
      text: `${Math.round(animatedValue.value)}${suffix}`,
      defaultValue: `0${suffix}`,
    };
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      animatedProps={animatedProps}
      style={[
        {
          color: color || '#fff',
          padding: 0,
          margin: 0,
          // Reset TextInput default styling
          borderWidth: 0,
          backgroundColor: 'transparent',
        },
        style,
      ]}
    />
  );
}
