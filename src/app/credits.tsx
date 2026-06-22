import { Image } from 'expo-image';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from 'react-native-reanimated';

const contributors = [
  'React Native & Expo Community',
  'Open Source Contributors',
  'Special Thanks to You!'
];

export default function CreditsScreen() {
  const styles = useThemedStyles(makeStyles);
  // Animation shared values
  const headerY = useSharedValue(0);
  const borderRadius = useSharedValue(0); // 0 = Square, 100 = Circle
  const listOpacity = useSharedValue(0);
  
  // Clean state management for current rendering text
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    // Kickoff the chain reaction
    startIntro();
  }, []);

  // 1. Morph to circle, then slide up
  const startIntro = () => {
    borderRadius.value = withDelay(1000, withTiming(100, { duration: 600 }));
    headerY.value = withDelay(
      1600, 
      withTiming(-150, { duration: 800 }, (finished) => {
        if (finished) {
          // Once slide up is finished, trigger item 0
          runOnJS(animateItem)(0);
        }
      })
    );
  };

  // 2. Recursive function to fade each item in and out sequentially
  const animateItem = (index: number) => {
    if (index < contributors.length) {
      setCurrentIndex(index);
      
      // Fade In
      listOpacity.value = withTiming(1, { duration: 600 }, (finished) => {
        if (finished) {
          // Hold text visible for 1.2 seconds, then Fade Out
          listOpacity.value = withDelay(
            1200, 
            withTiming(0, { duration: 600 }, (outFinished) => {
              if (outFinished) {
                // Move directly to the next item
                runOnJS(animateItem)(index + 1);
              }
            })
          );
        }
      });
    } else {
      // 3. All items complete! Reverse the main setup
      startOutro();
    }
  };

  // 4. Slide back down, morph back to square
  const startOutro = () => {
    headerY.value = withDelay(400, withTiming(0, { duration: 800 }, (finished) => {
      if (finished) {
        borderRadius.value = withTiming(0, { duration: 600 });
      }
    }));
  };

  // Animated styles linked to shared values
  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerY.value }],
  }));

  const animatedImageStyle = useAnimatedStyle(() => ({
    borderRadius: borderRadius.value,
  }));

  const animatedListStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
  }));
  //TODO: when clicked many times (20ish the pfp will spawn a notification that pulls the time from https://hackatime.hackclub.com/api/v1/users/levitkbr/project/Sonex (seconds -> human readable time) and then says a message and tells them how one person made it in x hours whatever)
  return (
    <View style={styles.container}>
      {/* Animated Header Box */}
      <Animated.View style={[styles.centerBox, animatedHeaderStyle]}>
        <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
          <Image
            source={{ uri: 'https://avatars.githubusercontent.com/u/78246775?v=4' }}
            style={styles.avatar}
          />
        </Animated.View>
        <Text style={styles.textTitle}>Created by Levi Brown</Text> 
        <Text style={styles.textSubtitle}>levi@taeson.co</Text>
      </Animated.View>

      {/* Animated List Box */}
      <Animated.View style={[styles.listContainer, animatedListStyle]}>
        <Text style={styles.listHeader}>With thanks to:</Text>
        <Text style={styles.listItem}>
          {currentIndex >= 0 ? contributors[currentIndex] : ''}
        </Text>
      </Animated.View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBox: {
    alignItems: 'center',
    position: 'absolute',
  },
  imageWrapper: {
    width: 200,
    height: 200,
    overflow: 'hidden', // Forces the image to adhere to the changing borderRadius
    marginBottom: 15,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  textTitle: {
    color: c.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  textSubtitle: {
    color: c.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  listContainer: {
    position: 'absolute',
    top: '55%',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  listHeader: {
    color: c.textFaint,
    fontSize: 14,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  listItem: {
    color: c.text,
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
});