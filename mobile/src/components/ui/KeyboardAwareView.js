// Klavye açıldığında içeriği klavyenin üstüne iten kapsayıcı.
//
// Neden KeyboardAvoidingView değil: Android'de uygulama kenardan kenara (edge-to-edge)
// çizildiği için pencere klavyeyle küçülmüyor ve KeyboardAvoidingView alttaki yazma
// çubuğunu klavyenin altında bırakıyordu; iOS'ta da üstteki başlık yüksekliği kadar
// sapma oluyordu. Burada kapsayıcının ekrandaki alt kenarı ile klavyenin üst kenarı
// arasındaki çakışma ölçülüp tam o kadar alt boşluk veriliyor. Pencere sistem
// tarafından zaten küçültülmüşse çakışma 0 çıkar, boşluk iki kez eklenmez.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, View } from 'react-native';

const KeyboardInsetContext = createContext(0);

/** İçinde bulunulan KeyboardAwareView'in klavye için verdiği alt boşluk (kapalıysa 0) */
export function useKeyboardInset() {
  return useContext(KeyboardInsetContext);
}

export default function KeyboardAwareView({ children, style }) {
  const ref = useRef(null);
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const ios = Platform.OS === 'ios';

    const animate = (e) => {
      if (ios && e?.duration) {
        LayoutAnimation.configureNext({
          duration: e.duration,
          update: { duration: e.duration, type: LayoutAnimation.Types.keyboard },
        });
      }
    };

    const onShow = (e) => {
      const keyboardTop = e?.endCoordinates?.screenY;
      if (keyboardTop == null || !ref.current) return;
      ref.current.measureInWindow((_x, y, _w, height) => {
        // Alt boşluk View'in içinde olduğundan alt kenar boşluktan etkilenmez
        const overlap = Math.max(0, Math.round(y + height - keyboardTop));
        animate(e);
        setInset(overlap);
      });
    };
    const onHide = (e) => {
      animate(e);
      setInset(0);
    };

    const subs = [
      Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', onShow),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', onHide),
    ];
    // iOS'ta klavye türü değişince (emoji, öneri çubuğu) yükseklik değişir
    if (ios) subs.push(Keyboard.addListener('keyboardWillChangeFrame', onShow));
    return () => subs.forEach((s) => s.remove());
  }, []);

  return (
    <KeyboardInsetContext.Provider value={inset}>
      <View ref={ref} style={[{ flex: 1 }, style, { paddingBottom: inset }]}>
        {children}
      </View>
    </KeyboardInsetContext.Provider>
  );
}
