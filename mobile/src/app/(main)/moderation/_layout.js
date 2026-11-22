// Moderasyon paneli: yalnızca MODERATOR ve ADMIN rolleri girebilir.
// Asıl yetki kontrolü backend'dedir; bu koruma yalnızca arayüz içindir.
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { isModerator } from '../../../lib/moderation';
import { colors } from '../../../constants/theme';

export default function ModerationLayout() {
  const { user } = useAuth();
  if (!isModerator(user)) return <Redirect href="/feed" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
