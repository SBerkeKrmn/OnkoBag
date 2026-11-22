// Google/Apple ile gelen yeni kullanıcının kayıt tamamlama bilgisi.
// Kayıt token'ı URL parametresine konmaz; yalnızca bellekte tutulur.
let pending = null;

export const setPendingSignup = (value) => {
  pending = value;
};

export const getPendingSignup = () => pending;

export const clearPendingSignup = () => {
  pending = null;
};
