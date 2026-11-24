// Yakınlaştırılabilir görsel (iOS ve Android):
// - iki parmakla yakınlaştırma (1x–4x), parmakların ortası odak alınır
// - yakınlaştırılmışken tek parmakla kaydırma (görsel kenarının dışına taşmaz)
// - çift dokunuşla 2.5x yakınlaştır / sıfırla
// Yakınlaştırma yokken kaydırma hareketi devre dışıdır; böylece görüntüleyicideki
// yana kaydırma (sonraki görsel) çalışır. onZoomChange(true/false) ile bildirilir.
// react-native-gesture-handler 3 (hook API) + react-native-reanimated 4.
import { Image, StyleSheet } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

export default function ZoomableImage({ uri, width, height, onZoomChange }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const zoomed = useSharedValue(false);

  const clampTranslate = (value, s, size) => {
    'worklet';
    const max = (size * (s - 1)) / 2;
    return Math.min(max, Math.max(-max, value));
  };

  const setZoomed = (next) => {
    'worklet';
    if (zoomed.value !== next) {
      zoomed.value = next;
      if (onZoomChange) scheduleOnRN(onZoomChange, next);
    }
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedScale.value = 1;
    savedTx.value = 0;
    savedTy.value = 0;
    setZoomed(false);
  };

  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      const next = Math.min(MAX_SCALE * 1.2, Math.max(0.8, savedScale.value * e.scale));
      // Odak noktası (parmakların ortası) yerinde kalsın
      const fx = e.focalX - width / 2;
      const fy = e.focalY - height / 2;
      const ratio = next / savedScale.value;
      tx.value = clampTranslate(savedTx.value * ratio + fx * (1 - ratio), next, width);
      ty.value = clampTranslate(savedTy.value * ratio + fy * (1 - ratio), next, height);
      scale.value = next;
      setZoomed(next > 1.01);
    },
    onDeactivate: () => {
      'worklet';
      if (scale.value <= 1.01) {
        reset();
        return;
      }
      const s = Math.min(MAX_SCALE, scale.value);
      scale.value = withTiming(s);
      tx.value = withTiming(clampTranslate(tx.value, s, width));
      ty.value = withTiming(clampTranslate(ty.value, s, height));
      savedScale.value = s;
      savedTx.value = clampTranslate(tx.value, s, width);
      savedTy.value = clampTranslate(ty.value, s, height);
    },
  });

  const pan = usePanGesture({
    enabled: zoomed,
    minPointers: 1,
    maxPointers: 2,
    onUpdate: (e) => {
      'worklet';
      tx.value = clampTranslate(savedTx.value + e.translationX, scale.value, width);
      ty.value = clampTranslate(savedTy.value + e.translationY, scale.value, height);
    },
    onDeactivate: () => {
      'worklet';
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: (e) => {
      'worklet';
      if (scale.value > 1.01) {
        reset();
        return;
      }
      const s = DOUBLE_TAP_SCALE;
      const x = clampTranslate(-(e.x - width / 2) * (s - 1), s, width);
      const y = clampTranslate(-(e.y - height / 2) * (s - 1), s, height);
      scale.value = withTiming(s);
      tx.value = withTiming(x);
      ty.value = withTiming(y);
      savedScale.value = s;
      savedTx.value = x;
      savedTy.value = y;
      setZoomed(true);
    },
  });

  // Hepsi birlikte tanınır: çift dokunuş beklerken iki parmakla yakınlaştırma gecikmesin
  const gesture = useSimultaneousGestures(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, styles.page]} collapsable={false}>
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <Image source={{ uri }} style={{ width, height }} resizeMode="contain" accessibilityLabel="Görsel" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  page: { overflow: 'hidden' },
});
