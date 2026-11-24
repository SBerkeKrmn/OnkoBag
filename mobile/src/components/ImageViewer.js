// Tam ekran görsel görüntüleyici: siyah arka plan, birden çok görselde yana
// kaydırma ve sayaç, iki parmakla / çift dokunuşla yakınlaştırma (iOS ve Android),
// kapatma düğmesi (Android'de geri tuşu da kapatır).
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui';
import ZoomableImage from './ZoomableImage';
import { hitSlop } from '../constants/theme';

/** images: [{ id?, url }], index: açılacak görsel; visible false ise hiçbir şey çizmez */
export default function ImageViewer({ images = [], index = 0, visible, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(index);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrent(index);
      setZoomed(false);
    }
  }, [visible, index]);

  const onZoomChange = useCallback((z) => setZoomed(z), []);

  if (!visible || !images.length) return null;

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait']}>
      {/* Modal ayrı bir pencere olduğundan (Android) hareket kökü burada da gerekir */}
      <GestureHandlerRootView style={styles.root}>
        <StatusBar barStyle="light-content" />
        <FlatList
          data={images}
          keyExtractor={(img, i) => img.id ?? `${img.url}-${i}`}
          horizontal
          pagingEnabled
          // Yakınlaştırılmışken yana kaydırma görseli kaydırır, sonraki görsele geçmez
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => <ZoomableImage uri={item.url} width={width} height={height} onZoomChange={onZoomChange} />}
        />

        <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Pressable onPress={onClose} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Kapat" style={styles.close}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          {images.length > 1 ? (
            <Text variant="label" style={styles.counter}>
              {current + 1} / {images.length}
            </Text>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: { color: '#fff' },
});
