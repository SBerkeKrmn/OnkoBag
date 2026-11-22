import { useInfiniteQuery } from '@tanstack/react-query';
import { postsApi } from '../api';
import { keys } from '../lib/queryClient';

export default function useUserPosts(userId, enabled = true) {
  return useInfiniteQuery({
    queryKey: keys.userPosts(userId),
    queryFn: ({ pageParam }) => postsApi.list({ authorId: userId, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(userId) && enabled,
  });
}
