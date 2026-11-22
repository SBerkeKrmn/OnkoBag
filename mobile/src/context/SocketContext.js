// Socket.io bağlantısı. Oturum açıkken bağlanır; token süresi dolarsa yenileyip
// yeniden bağlanır. Liste ekranlarının önbelleğini gelen olaylara göre tazeler.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../constants/config';
import { getAccessToken, refreshSession } from '../api/client';
import { queryClient, keys } from '../lib/queryClient';
import { useAuth } from './AuthContext';

const SocketContext = createContext({ socket: null, connected: false });

export function SocketProvider({ children }) {
  const { status } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (status !== 'signedIn') return undefined;

    const s = io(SOCKET_URL, {
      transports: ['websocket'],
      // Her (yeniden) bağlanmada güncel token kullanılsın
      auth: (cb) => cb({ token: getAccessToken() }),
      reconnectionDelayMax: 10_000,
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', async (err) => {
      setConnected(false);
      if (err?.data?.code === 'TOKEN_INVALID') {
        const ok = await refreshSession();
        if (ok) s.connect();
      }
    });

    // Liste ekranlarını güncel tut
    s.on('room:message:new', () => queryClient.invalidateQueries({ queryKey: keys.rooms }));
    s.on('dm:message:new', () => queryClient.invalidateQueries({ queryKey: keys.conversations }));
    s.on('dm:read', () => queryClient.invalidateQueries({ queryKey: keys.conversations }));
    s.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications });
    });

    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [status]);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

/** Bir soket olayına abone olur; handler her render'da güncellenir */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (payload) => ref.current(payload);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}

/** Ack'li soket olayı; { ok, data } | { ok: false, error } döner */
export function emitWithAck(socket, event, payload, timeout = 8000) {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ ok: false, error: { code: 'SOCKET_DISCONNECTED' } });
      return;
    }
    socket.timeout(timeout).emit(event, payload, (err, res) => {
      resolve(err ? { ok: false, error: { code: 'TIMEOUT', message: 'Sunucu yanıt vermedi' } } : res);
    });
  });
}
