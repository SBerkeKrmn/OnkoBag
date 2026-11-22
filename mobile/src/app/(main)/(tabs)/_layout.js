// Alt sekmeler: Akış · Odalar · Paylaş (+) · Mesajlar · Profil
import { Tabs, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { roomsApi, conversationsApi } from '../../../api';
import { keys } from '../../../lib/queryClient';
import { colors, fonts, shadow } from '../../../constants/theme';

const icon = (name) =>
  function TabIcon({ color, focused, size }) {
    return <Ionicons name={focused ? name : `${name}-outline`} size={size ?? 24} color={color} />;
  };

function ComposeButton() {
  return (
    <View style={styles.compose}>
      <Ionicons name="add" size={30} color={colors.textOnPrimary} />
    </View>
  );
}

export default function TabsLayout() {
  const rooms = useQuery({ queryKey: keys.rooms, queryFn: async () => (await roomsApi.mine()).data });
  const conversations = useQuery({
    queryKey: keys.conversations,
    queryFn: async () => (await conversationsApi.list()).data,
  });

  const roomUnread = (rooms.data ?? []).filter((r) => !r.isMuted).reduce((n, r) => n + r.unreadCount, 0);
  const dmUnread = (conversations.data ?? []).filter((c) => !c.isMuted).reduce((n, c) => n + c.unreadCount, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarBadgeStyle: styles.badge,
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Akış', tabBarIcon: icon('home') }} />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Odalar',
          tabBarIcon: icon('chatbubbles'),
          tabBarBadge: roomUnread > 0 ? (roomUnread > 99 ? '99+' : roomUnread) : undefined,
        }}
      />
      <Tabs.Screen
        name="compose"
        options={{
          title: '',
          tabBarAccessibilityLabel: 'Yeni gönderi paylaş',
          tabBarIcon: () => <ComposeButton />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/post/new');
          },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          tabBarIcon: icon('mail'),
          tabBarBadge: dmUnread > 0 ? (dmUnread > 99 ? '99+' : dmUnread) : undefined,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('person-circle') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 64,
    paddingTop: 6,
  },
  label: { fontFamily: fonts.bold, fontSize: 11 },
  badge: { backgroundColor: colors.danger, fontFamily: fonts.bold, fontSize: 10 },
  compose: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...shadow.raised,
  },
});
