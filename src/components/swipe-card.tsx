import { Image } from 'expo-image';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
import type { DeckCard } from '@/lib/deck';

const { width } = Dimensions.get('window');
const THRESHOLD = Math.min(width, 520) * 0.25;

type Props = {
  card: DeckCard;
  photoUrl?: string;
  sharedTrait?: string | null;
  onDecide: (d: 'like' | 'pass') => void;
};

export function SwipeCard({ card, photoUrl, sharedTrait, onDecide }: Props) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd(() => {
      if (Math.abs(x.value) > THRESHOLD) {
        const dir = x.value > 0 ? 'like' : 'pass';
        x.value = withTiming(Math.sign(x.value) * width * 1.5, { duration: 200 }, () => {
          runOnJS(onDecide)(dir);
        });
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-width, 0, width], [-10, 0, 10])}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, THRESHOLD], [0, 1]) }));
  const passStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-THRESHOLD, 0], [1, 0]) }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.noPhoto]} />
        )}

        <Animated.View style={[styles.stamp, styles.like, likeStyle]}>
          <ThemedText style={styles.stampText}>LIKE</ThemedText>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.pass, passStyle]}>
          <ThemedText style={styles.stampText}>PASS</ThemedText>
        </Animated.View>

        <View style={styles.info}>
          <ThemedText style={styles.name}>
            {card.display_name}
            {card.age ? `, ${card.age}` : ''}
          </ThemedText>
          {card.kit_verified ? (
            <ThemedText type="small" style={styles.verified}>
              ✓ Kit verified
            </ThemedText>
          ) : null}
          {card.location ? (
            <ThemedText type="small" style={styles.meta}>
              {card.location}
              {card.distance_km != null ? ` · ${Math.round(card.distance_km)} km away` : ''}
            </ThemedText>
          ) : null}
          {sharedTrait ? (
            <ThemedText type="small" style={styles.shared}>
              {sharedTrait}
            </ThemedText>
          ) : null}
          {card.bio ? (
            <ThemedText type="small" style={styles.bio} numberOfLines={2}>
              {card.bio}
            </ThemedText>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  photo: { width: '100%', height: '100%' },
  noPhoto: { backgroundColor: '#1A1C20' },
  info: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.two,
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  name: { color: '#fff', fontSize: 22, fontWeight: '700' },
  verified: { color: Brand.gold, fontWeight: '700' },
  meta: { color: '#E8E8EA' },
  shared: { color: Brand.gold },
  bio: { color: '#E8E8EA' },
  stamp: {
    position: 'absolute',
    top: 24,
    borderWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  like: { right: 20, borderColor: Brand.red, transform: [{ rotate: '12deg' }] },
  pass: { left: 20, borderColor: Functional.error, transform: [{ rotate: '-12deg' }] },
  stampText: { fontSize: 28, fontWeight: '900', color: '#fff' },
});
