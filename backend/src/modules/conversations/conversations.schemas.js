const { z } = require('zod');
const { uuid, bigintId, mediaIds } = require('../../utils/schemas');

const start = z.object({ userId: uuid });

const sendMessage = z
  .object({
    content: z.string().trim().max(4000).optional(),
    mediaIds: mediaIds(1),
  })
  .refine((m) => (m.content && m.content.length > 0) || m.mediaIds.length > 0, {
    message: 'Mesaj boş olamaz',
    path: ['content'],
  });

const markRead = z.object({ messageId: bigintId });

const messageParams = z.object({ id: uuid, messageId: bigintId });

// Soket olayları
const socketSend = sendMessage.and(z.object({ conversationId: uuid }));
const socketTyping = z.object({ conversationId: uuid });
const socketRead = z.object({ conversationId: uuid, messageId: bigintId });

module.exports = { start, sendMessage, markRead, messageParams, socketSend, socketTyping, socketRead };
