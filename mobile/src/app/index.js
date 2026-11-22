// Açılış yönlendirmesi: oturum durumuna göre karşılama veya ana ekran
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LogoMark } from '../components/Logo';
import { colors } from '../constants/theme';

export default function Index() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <LogoMark size={72} />
      </View>
    );
  }

  return <Redirect href={status === 'signedIn' ? '/feed' : '/welcome'} />;
}
