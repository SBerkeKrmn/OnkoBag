// Backend uç noktalarının istemci tarafı karşılıkları (bkz. docs/api.md)
import { request, uploadImage } from './client';

const qs = (params = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : '';
};

export const authApi = {
  register: (body) => request('/auth/register', { method: 'POST', body, auth: false }),
  login: (body) => request('/auth/login', { method: 'POST', body, auth: false }),
  social: (body) => request('/auth/social', { method: 'POST', body, auth: false }),
  socialComplete: (body) => request('/auth/social/complete', { method: 'POST', body, auth: false }),
  logout: (refreshToken) => request('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
  verifyEmail: (code) => request('/auth/verify-email', { method: 'POST', body: { code } }),
  resendVerification: () => request('/auth/resend-verification', { method: 'POST' }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body, auth: false }),
  changePassword: (body) => request('/auth/change-password', { method: 'POST', body }),
};

export const usersApi = {
  me: () => request('/users/me'),
  updateMe: (body) => request('/users/me', { method: 'PATCH', body }),
  /** Şifreli hesap: { password }, yalnızca Google/Apple hesabı: { confirm: true } */
  deleteMe: (body) => request('/users/me', { method: 'DELETE', body }),
  addCancerProfile: (body) => request('/users/me/cancer-profiles', { method: 'POST', body }),
  updateCancerProfile: (id, body) => request(`/users/me/cancer-profiles/${id}`, { method: 'PATCH', body }),
  removeCancerProfile: (id) => request(`/users/me/cancer-profiles/${id}`, { method: 'DELETE' }),
  suggestions: (status) => request(`/users/me/suggestions${qs({ status })}`),
  blocks: () => request('/users/me/blocks'),
  search: (q) => request(`/users/search${qs({ q })}`),
  get: (id) => request(`/users/${id}`),
  followers: (id, offset = 0) => request(`/users/${id}/followers${qs({ offset })}`),
  following: (id, offset = 0) => request(`/users/${id}/following${qs({ offset })}`),
  follow: (id) => request(`/users/${id}/follow`, { method: 'POST' }),
  unfollow: (id) => request(`/users/${id}/follow`, { method: 'DELETE' }),
  block: (id) => request(`/users/${id}/block`, { method: 'POST' }),
  unblock: (id) => request(`/users/${id}/block`, { method: 'DELETE' }),
};

export const cancerTypesApi = {
  list: () => request('/cancer-types', { auth: false }),
  get: (id) => request(`/cancer-types/${id}`),
};

export const roomsApi = {
  mine: () => request('/rooms/me'),
  get: (id) => request(`/rooms/${id}`),
  members: (id, offset = 0) => request(`/rooms/${id}/members${qs({ offset })}`),
  messages: (id, before) => request(`/rooms/${id}/messages${qs({ before, limit: 30 })}`),
  send: (id, body) => request(`/rooms/${id}/messages`, { method: 'POST', body }),
  deleteMessage: (id, messageId) => request(`/rooms/${id}/messages/${messageId}`, { method: 'DELETE' }),
  read: (id, messageId) => request(`/rooms/${id}/read`, { method: 'POST', body: { messageId } }),
  mute: (id, muted) => request(`/rooms/${id}/mute`, { method: 'POST', body: { muted } }),
};

export const conversationsApi = {
  list: () => request('/conversations'),
  start: (userId) => request('/conversations', { method: 'POST', body: { userId } }),
  get: (id) => request(`/conversations/${id}`),
  hide: (id) => request(`/conversations/${id}`, { method: 'DELETE' }),
  messages: (id, before) => request(`/conversations/${id}/messages${qs({ before, limit: 30 })}`),
  send: (id, body) => request(`/conversations/${id}/messages`, { method: 'POST', body }),
  deleteMessage: (id, messageId) => request(`/conversations/${id}/messages/${messageId}`, { method: 'DELETE' }),
  read: (id, messageId) => request(`/conversations/${id}/read`, { method: 'POST', body: { messageId } }),
};

export const postsApi = {
  list: (params) => request(`/posts${qs(params)}`),
  feed: (cursor) => request(`/posts/feed${qs({ cursor })}`),
  get: (id) => request(`/posts/${id}`),
  create: (body) => request('/posts', { method: 'POST', body }),
  update: (id, body) => request(`/posts/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  like: (id) => request(`/posts/${id}/like`, { method: 'POST' }),
  unlike: (id) => request(`/posts/${id}/like`, { method: 'DELETE' }),
  comments: (id, cursor) => request(`/posts/${id}/comments${qs({ cursor })}`),
  addComment: (id, body) => request(`/posts/${id}/comments`, { method: 'POST', body }),
};

export const commentsApi = {
  remove: (id) => request(`/comments/${id}`, { method: 'DELETE' }),
  like: (id) => request(`/comments/${id}/like`, { method: 'POST' }),
  unlike: (id) => request(`/comments/${id}/like`, { method: 'DELETE' }),
};

export const notificationsApi = {
  list: (cursor) => request(`/notifications${qs({ cursor })}`),
  unreadCount: () => request('/notifications/unread-count'),
  read: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  readAll: () => request('/notifications/read-all', { method: 'POST' }),
};

export const reportsApi = {
  create: (body) => request('/reports', { method: 'POST', body }),
};

export const mediaApi = { upload: uploadImage };

/** Moderatör/yönetici uç noktaları (yalnızca MODERATOR ve ADMIN rolü) */
export const adminApi = {
  stats: () => request('/admin/stats'),
  reports: (params) => request(`/admin/reports${qs(params)}`),
  updateReport: (id, body) => request(`/admin/reports/${id}`, { method: 'PATCH', body }),
  hideContent: (targetType, targetId, body) =>
    request(`/admin/content/${targetType}/${targetId}/hide`, { method: 'POST', body }),
  restoreContent: (targetType, targetId, body) =>
    request(`/admin/content/${targetType}/${targetId}/restore`, { method: 'POST', body }),
  users: (params) => request(`/admin/users${qs(params)}`),
  suspend: (id, body) => request(`/admin/users/${id}/suspend`, { method: 'POST', body }),
  unsuspend: (id, body) => request(`/admin/users/${id}/unsuspend`, { method: 'POST', body }),
  warn: (id, body) => request(`/admin/users/${id}/warn`, { method: 'POST', body }),
  changeRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
  pendingSurvivors: () => request('/admin/survivor-verifications'),
  verifySurvivor: (profileId) => request(`/admin/cancer-profiles/${profileId}/verify`, { method: 'POST', body: {} }),
  logs: (cursor) => request(`/admin/logs${qs({ cursor })}`),
};
