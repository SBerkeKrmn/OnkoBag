// Tam ekran görsel görüntüleyici: siyah arka plan, birden çok görselde yana
// kaydırma, iOS'ta iki parmakla yakınlaştırma, kapatma düğmesi ve sayaç.
// Ek kütüphane gerektirmez (Expo Go'da da çalışır).
import { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui';
import { hitSlop } from '../constants/theme';

function Page({ uri, width, height }) {
  const image = <Image source={{ uri }} style={{ width, height }} resizeMode="contain" accessibilityLabel="Görsel" />;
  if (Platform.OS !== 'ios') return <View style={{ width, height }}>{image}</View>;
  // iOS'ta ScrollView yerel yakınlaştırmayı destekler
  return (
    <ScrollView
      style={{ width, height }}
      maximumZoomScale={4}
      minimumZoomScale={1}
      centerContent
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      bouncesZoom
    >
      {image}
    </ScrollView>
  );
}

/** images: [{ id?, url }], index: açılacak görsel; visible false ise hiçbir şey çizmez */
export default function ImageViewer({ images = [], index = 0, visible, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(index);
  const listRef = useRef(null);

  useEffect(() => {
    if (visible) setCurrent(index);
  }, [visible, index]);

  if (!visible || !images.length) return null;

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(img, i) => img.id ?? `${img.url}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => <Page uri={item.url} width={width} height={height} />}
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
      </View>
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
