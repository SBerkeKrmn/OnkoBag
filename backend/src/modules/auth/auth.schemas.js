const { z } = require('zod');
const { year } = require('../../utils/schemas');

const email = z
  .email({ message: 'Geçerli bir e-posta adresi girin' })
  .max(255)
  .transform((v) => v.trim().toLowerCase());

const password = z
  .string()
  .min(8, 'Şifre en az 8 karakter olmalı')
  .max(72, 'Şifre en fazla 72 karakter olabilir')
  .regex(/[A-Za-zÇĞİÖŞÜçğıöşü]/, 'Şifre en az bir harf içermeli')
  .regex(/\d/, 'Şifre en az bir rakam içermeli');

const username = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_.]{3,30}$/, 'Kullanıcı adı 3-30 karakter olmalı; yalnızca harf, rakam, _ ve . içerebilir');

const code = z.string().trim().regex(/^\d{6}$/, 'Kod 6 haneli olmalı');

/** Kanser profili: aktif hasta veya iyileşen */
const cancerProfileInput = z
  .object({
    cancerTypeId: z.coerce.number().int().positive(),
    status: z.enum(['ACTIVE_TREATMENT', 'SURVIVOR']),
    diagnosisYear: year.optional(),
    remissionYear: year.optional(),
  })
  .refine((p) => p.status === 'SURVIVOR' || p.remissionYear === undefined, {
    message: 'Remisyon yılı yalnızca iyileşenler için girilebilir',
    path: ['remissionYear'],
  })
  .refine((p) => !p.diagnosisYear || !p.remissionYear || p.remissionYear >= p.diagnosisYear, {
    message: 'Remisyon yılı tanı yılından önce olamaz',
    path: ['remissionYear'],
  });

const register = z.object({
  email,
  password,
  username,
  displayName: z.string().trim().min(1).max(60).optional(),
  ageConfirmed: z.literal(true, { message: 'OnkoBağ yalnızca 18 yaş ve üzeri kullanıcılara açıktır' }),
  kvkkConsent: z.literal(true, { message: 'KVKK açık rıza onayı zorunludur' }),
  termsAccepted: z.literal(true, { message: 'Kullanım koşullarının kabulü zorunludur' }),
  cancerProfile: cancerProfileInput,
});

const login = z.object({ email, password: z.string().min(1).max(72) });

const refresh = z.object({ refreshToken: z.string().min(20).max(200) });

const verifyEmail = z.object({ code });

const forgotPassword = z.object({ email });

const resetPassword = z.object({ email, code, newPassword: password });

const social = z.object({
  provider: z.enum(['GOOGLE', 'APPLE']),
  idToken: z.string().min(20).max(5000),
  /** Apple: istemcinin ürettiği ham nonce (Apple'a SHA-256 özeti gönderilir) */
  nonce: z.string().min(16).max(200).optional(),
  /** Apple adı yalnızca ilk girişte istemciye verir */
  fullName: z.string().trim().max(60).optional(),
});

const socialComplete = z.object({
  signupToken: z.string().min(20).max(4000),
  username,
  displayName: z.string().trim().min(1).max(60).optional(),
  ageConfirmed: z.literal(true, { message: 'OnkoBağ yalnızca 18 yaş ve üzeri kullanıcılara açıktır' }),
  kvkkConsent: z.literal(true, { message: 'KVKK açık rıza onayı zorunludur' }),
  termsAccepted: z.literal(true, { message: 'Kullanım koşullarının kabulü zorunludur' }),
  cancerProfile: cancerProfileInput,
});

const changePassword =z.object({ currentPassword: z.string().min(1).max(72), newPassword: password });

module.exports = {
  email,
  password,
  username,
  cancerProfileInput,
  register,
  social,
  socialComplete,
  login,
  refresh,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
};
