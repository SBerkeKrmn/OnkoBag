// Gönderi önbelleği yardımcıları.
// Beğeni, yorum ve yeni gönderi sunucu yanıtı beklenmeden tüm listelere (akış,
// keşfet, profil, detay) aynı anda yansıtılır; böylece bir ekranda yapılan işlem
// diğer ekranlara geri dönüldüğünde de güncel görünür.
import { queryClient, keys } from './queryClient';

const isPostQuery = (query) => query.queryKey[0] === 'posts' && ['feed', 'list', 'detail'].includes(query.queryKey[1]);

const mapPages = (data, fn) =>
  data?.pages ? { ...data, pages: data.pages.map((page) => ({ ...page, data: fn(page.data) })) } : data;

/** Gönderiyi önbellekteki her yerde günceller. patch: nesne veya (post) => nesne */
export function patchPost(postId, patch) {
  const apply = (post) => (post?.id === postId ? { ...post, ...(typeof patch === 'function' ? patch(post) : patch) } : post);
  queryClient.setQueriesData({ predicate: isPostQuery }, (data) => {
    if (!data) return data;
    if (data.pages) return mapPages(data, (list) => list.map(apply));
    return apply(data);
  });
}

/** Önbellekteki gönderiyi okur (herhangi bir listeden) */
export function findPost(postId) {
  for (const [, data] of queryClient.getQueriesData({ predicate: isPostQuery })) {
    if (!data) continue;
    if (data.pages) {
      for (const page of data.pages) {
        const found = page.data?.find((p) => p.id === postId);
        if (found) return found;
      }
    } else if (data.id === postId) return data;
  }
  return null;
}

/** Gönderiyi tüm listelerden kaldırır (açık detay ekranı kapanırken boş kalmasın diye detay önbelleğine dokunulmaz) */
export function removePost(postId) {
  queryClient.setQueriesData({ predicate: isPostQuery }, (data) =>
    data?.pages ? mapPages(data, (list) => list.filter((p) => p.id !== postId)) : data,
  );
}

/** Yeni gönderiyi akışın ve kendi profil listemin başına ekler, detay önbelleğini doldurur */
export function addNewPost(post, myUserId) {
  queryClient.setQueryData(keys.post(post.id), post);
  const prepend = (data) =>
    data?.pages?.length
      ? { ...data, pages: [{ ...data.pages[0], data: [post, ...data.pages[0].data] }, ...data.pages.slice(1)] }
      : data;
  queryClient.setQueryData(keys.feed, prepend);
  queryClient.setQueryData(keys.userPosts(myUserId), prepend);
  // Keşfet filtreleri çok çeşitli; arka planda tazelenir
  queryClient.invalidateQueries({ queryKey: ['posts', 'list'], refetchType: 'none' });
}

// Hızlı art arda dokunuşlarda yalnızca en son isteğin yanıtı uygulanır
const likeSeq = new Map();

/** Beğeniyi anında uygular, sunucuya gönderir; hata olursa geri alır */
export async function toggleLikeOptimistic(post, request) {
  const next = !post.likedByMe;
  const seq = (likeSeq.get(post.id) ?? 0) + 1;
  likeSeq.set(post.id, seq);
  patchPost(post.id, (p) => ({ likedByMe: next, likeCount: Math.max(0, p.likeCount + (next ? 1 : -1)) }));
  try {
    const { data } = await request(next);
    if (likeSeq.get(post.id) === seq) patchPost(post.id, { likedByMe: next, likeCount: data.likeCount });
  } catch (err) {
    if (likeSeq.get(post.id) === seq) {
      patchPost(post.id, (p) => ({ likedByMe: !next, likeCount: Math.max(0, p.likeCount + (next ? -1 : 1)) }));
    }
    throw err;
  }
}
