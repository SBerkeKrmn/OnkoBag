import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx hatalarında (yetki, bulunamadı) tekrar denemenin anlamı yok
      retry: (failureCount, error) => !(error?.status >= 400 && error?.status < 500) && failureCount < 2,
    },
  },
});

/** Sorgu anahtarları — önbellek geçersiz kılma işlemleri tek yerden yönetilsin */
export const keys = {
  me: ['me'],
  cancerTypes: ['cancer-types'],
  feed: ['posts', 'feed'],
  posts: (params) => ['posts', 'list', params],
  post: (id) => ['posts', 'detail', id],
  comments: (postId) => ['posts', 'comments', postId],
  rooms: ['rooms', 'mine'],
  room: (id) => ['rooms', 'detail', id],
  conversations: ['conversations'],
  conversation: (id) => ['conversations', id],
  user: (id) => ['users', id],
  userPosts: (id) => ['posts', 'list', { authorId: id }],
  suggestions: (status) => ['users', 'suggestions', status],
  blocks: ['users', 'blocks'],
  notifications: ['notifications'],
  unreadCount: ['notifications', 'unread-count'],
};
