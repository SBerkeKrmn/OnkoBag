const { z } = require('zod');
const { uuid, bigintId, mediaIds } = require('../../utils/schemas');

const messageContent = z.string().trim().max(2000);

const sendMessage = z
  .object({
    content: messageContent.optional(),
    replyToId: bigintId.optional(),
    mediaIds: mediaIds(1),
  })
  .refine((m) => (m.content && m.content.length > 0) || m.mediaIds.length > 0, {
    message: 'Mesaj boş olamaz',
    path: ['content'],
  });

const editMessage = z.object({ content: messageContent.min(1) });

const markRead = z.object({ messageId: bigintId });

const roomMessageParams = z.object({ id: uuid, messageId: bigintId });

const mute = z.object({ muted: z.boolean() });

// Soket olayları
const socketSend = sendMessage.and(z.object({ roomId: uuid }));
const socketTyping = z.object({ roomId: uuid });
const socketRead = z.object({ roomId: uuid, messageId: bigintId });

module.exports = { sendMessage, editMessage, markRead, roomMessageParams, mute, socketSend, socketTyping, socketRead };
