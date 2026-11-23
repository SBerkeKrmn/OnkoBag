// Sohbet durumu: oda (kind="room") veya özel mesaj (kind="dm") için ortak.
// - REST ile geçmişi yükler (eskiye doğru sayfalama)
// - Socket.io olaylarıyla yeni/güncellenen mesajları ekler (id ile tekilleştirir)
// - Gönderimi soket üzerinden yapar; bağlantı yoksa REST'e düşer
// - Karşı taraftan gelen mesajları okundu olarak işaretler
import { useCallback, useEffect, useRef, useState } from 'react';
import { conversationsApi, roomsApi } from '../api';
import { useSocket, useSocketEvent, emitWithAck } from '../context/SocketContext';
import { ApiError } from '../api/client';
import { queryClient, keys } from '../lib/queryClient';

const CONFIG = {
  room: {
    api: roomsApi,
    newEvent: 'room:message:new',
    updatedEvent: 'room:message:updated',
    sendEvent: 'room:send',
    readEvent: 'room:read',
    idField: 'roomId',
    listKey: keys.rooms,
  },
  dm: {
    api: conversationsApi,
    newEvent: 'dm:message:new',
    updatedEvent: 'dm:message:updated',
    sendEvent: 'dm:send',
    readEvent: 'dm:read',
    idField: 'conversationId',
    listKey: keys.conversations,
  },
};

const bigger = (a, b) => BigInt(a) > BigInt(b);

export default function useChat(kind, id, myUserId) {
  const cfg = CONFIG[kind];
  const { socket } = useSocket();

  // Mesajlar en yeniden en eskiye (ters FlatList için)
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState(null);
  const lastReadSent = useRef(null);

  const merge = useCallback((incoming) => {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [String(m.id), m]));
      incoming.forEach((m) => map.set(String(m.id), m));
      return [...map.values()].sort((a, b) => (bigger(a.id, b.id) ? -1 : 1));
    });
  }, []);

  // Okunmamış rozeti (alt sekme + liste) okundu bilgisi sunucuya ulaşır ulaşmaz silinir.
  // Önce önbellek hemen sıfırlanır; sunucu onayından sonra liste yeniden çekilir ki
  // o sırada yolda olan eski bir yanıt rozeti geri getirmesin.
  const clearUnread = useCallback(() => {
    queryClient.setQueryData(cfg.listKey, (list) =>
      Array.isArray(list) ? list.map((x) => (x.id === id ? { ...x, unreadCount: 0 } : x)) : list,
    );
  }, [cfg, id]);

  const markRead = useCallback(
    async (messageId) => {
      if (!messageId || (lastReadSent.current && !bigger(messageId, lastReadSent.current))) return;
      lastReadSent.current = String(messageId);
      clearUnread();
      const payload = { [cfg.idField]: id, messageId: String(messageId) };
      const ack = await emitWithAck(socket, cfg.readEvent, payload);
      if (!ack?.ok) await cfg.api.read(id, String(messageId)).catch(() => {});
      clearUnread();
      queryClient.invalidateQueries({ queryKey: cfg.listKey });
    },
    [socket, cfg, id, clearUnread],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cfg.api.messages(id);
      setMessages([...res.data].reverse());
      setCursor(res.nextCursor);
      const newest = res.data[res.data.length - 1];
      if (newest) markRead(newest.id);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [cfg, id, markRead]);

  useEffect(() => {
    load();
  }, [load]);

  const loadOlder = useCallback(async () => {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await cfg.api.messages(id, cursor);
      merge(res.data);
      setCursor(res.nextCursor);
    } catch {
      // sessizce yoksay; kullanıcı tekrar kaydırınca denenecek
    } finally {
      setLoadingOlder(false);
    }
  }, [cfg, id, cursor, loadingOlder, merge]);

  useSocketEvent(cfg.newEvent, (msg) => {
    if (msg[cfg.idField] !== id) return;
    merge([msg]);
    const senderId = msg.sender?.id ?? msg.senderId;
    if (senderId !== myUserId) markRead(msg.id);
  });

  useSocketEvent(cfg.updatedEvent, (msg) => {
    if (msg[cfg.idField] !== id) return;
    setMessages((prev) => prev.map((m) => (String(m.id) === String(msg.id) ? msg : m)));
  });

  // Bağlantı koptuktan sonra geri gelirse kaçırılan mesajları al
  useEffect(() => {
    if (!socket) return undefined;
    const onReconnect = async () => {
      try {
        const res = await cfg.api.messages(id);
        merge(res.data);
      } catch {
        // yoksay
      }
    };
    socket.io.on('reconnect', onReconnect);
    return () => socket.io.off('reconnect', onReconnect);
  }, [socket, cfg, id, merge]);

  const send = useCallback(
    async ({ content, replyToId, mediaIds }) => {
      const payload = { content: content || undefined, mediaIds: mediaIds ?? [], ...(replyToId ? { replyToId: String(replyToId) } : {}) };
      const ack = await emitWithAck(socket, cfg.sendEvent, { [cfg.idField]: id, ...payload });
      if (ack.ok) {
        merge([ack.data]);
        return ack.data;
      }
      if (ack.error?.code === 'SOCKET_DISCONNECTED' || ack.error?.code === 'TIMEOUT') {
        const { data } = await cfg.api.send(id, payload);
        merge([data]);
        return data;
      }
      throw new ApiError(ack.error?.message ?? 'Mesaj gönderilemedi', { code: ack.error?.code });
    },
    [socket, cfg, id, merge],
  );

  const remove = useCallback(
    async (messageId) => {
      await cfg.api.deleteMessage(id, String(messageId));
      setMessages((prev) =>
        prev.map((m) => (String(m.id) === String(messageId) ? { ...m, status: 'DELETED', content: null, media: [] } : m)),
      );
    },
    [cfg, id],
  );

  return { messages, loading, error, reload: load, loadOlder, hasOlder: Boolean(cursor), loadingOlder, send, remove };
}

/** "X yazıyor…" göstergesi: olay gelince 4 sn boyunca gösterilir */
export function useTypingIndicator(event, matches) {
  const [typing, setTyping] = useState(null);
  const timer = useRef(null);

  useSocketEvent(event, (payload) => {
    if (!matches(payload)) return;
    setTyping(payload);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTyping(null), 4000);
  });

  useEffect(() => () => clearTimeout(timer.current), []);
  return typing;
}

/** Yazıyor bilgisini en fazla 2,5 sn'de bir gönderir */
export function useTypingEmitter(event, payload) {
  const { socket } = useSocket();
  const last = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - last.current < 2500 || !socket?.connected) return;
    last.current = now;
    socket.emit(event, payload);
  }, [socket, event, payload]);
}
