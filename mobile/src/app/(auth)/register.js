// Üç adımlı kayıt: 1) hesap bilgileri 2) kanser türü ve durum 3) onaylar
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Alert } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Banner, Button, Checkbox, Header, Screen, Text, TextField } from '../../components/ui';
import CancerTypePicker from '../../components/CancerTypePicker';
import StatusChoice from '../../components/StatusChoice';
import SocialButtons from '../../components/SocialButtons';
import { useAuth } from '../../context/AuthContext';
import { fieldErrors } from '../../lib/errors';
import { clearPendingSignup, getPendingSignup } from '../../lib/pendingSignup';
import { colors, radius, spacing } from '../../constants/theme';

const STEPS = ['Hesabın', 'Yolculuğun', 'Onaylar'];
const USERNAME_RE = /^[a-zA-Z0-9_.]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const thisYear = new Date().getFullYear();

function validateAccount(f, social) {
  const e = {};
  if (!USERNAME_RE.test(f.username.trim())) e.username = '3-30 karakter; harf, rakam, _ ve . kullanabilirsin';
  // Google/Apple ile kayıtta e-posta sağlayıcıdan gelir, şifre gerekmez
  if (social) return e;
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Geçerli bir e-posta adresi gir';
  if (f.password.length < 8) e.password = 'Şifre en az 8 karakter olmalı';
  else if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(f.password) || !/\d/.test(f.password))
    e.password = 'Şifre en az bir harf ve bir rakam içermeli';
  if (f.passwordConfirm !== f.password) e.passwordConfirm = 'Şifreler eşleşmiyor';
  return e;
}

function validateJourney(f) {
  const e = {};
  if (!f.cancerType) e.cancerType = 'Bir kanser türü seç';
  if (!f.status) e.status = 'Durumunu seç';
  const dy = f.diagnosisYear ? Number(f.diagnosisYear) : null;
  const ry = f.remissionYear ? Number(f.remissionYear) : null;
  if (dy !== null && (!Number.isInteger(dy) || dy < 1900 || dy > thisYear)) e.diagnosisYear = 'Geçerli bir yıl gir';
  if (ry !== null && (!Number.isInteger(ry) || ry < 1900 || ry > thisYear)) e.remissionYear = 'Geçerli bir yıl gir';
  if (dy && ry && ry < dy) e.remissionYear = 'Tanı yılından önce olamaz';
  return e;
}

function ProgressBar({ step }) {
  return (
    <View style={styles.progress}>
      {STEPS.map((label, i) => (
        <View key={label} style={{ flex: 1, gap: 6 }}>
          <View style={[styles.progressBar, i <= step && { backgroundColor: colors.primary }]} />
          <Text variant="tiny" tone={i <= step ? 'primary' : 'muted'}>
            {i + 1}. {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const LegalLink = ({ doc, children }) => (
  <Text variant="bodyStrong" tone="primary" onPress={() => router.push(`/legal/${doc}`)} accessibilityRole="link">
    {children}
  </Text>
);

const PROVIDER_NAMES = { GOOGLE: 'Google', APPLE: 'Apple' };

/** Sağlayıcıdan gelen addan kullanıcı adı önerisi üretir: "Ayşe Kaya" → "ayse_kaya" */
function suggestUsername(name) {
  if (!name) return '';
  const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
  const base = name
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (ch) => map[ch])
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return base.length >= 3 ? base : '';
}

export default function RegisterScreen() {
  const { register, completeSocialSignup } = useAuth();
  const params = useLocalSearchParams();
  const social = params.social === '1' ? getPendingSignup() : null;
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    username: suggestUsername(social?.profile?.displayName),
    displayName: social?.profile?.displayName ?? '',
    password: '',
    passwordConfirm: '',
    cancerType: null,
    status: null,
    diagnosisYear: '',
    remissionYear: '',
    ageConfirmed: false,
    termsAccepted: false,
    kvkkConsent: false,
  });
  const refs = { username: useRef(), displayName: useRef(), password: useRef(), passwordConfirm: useRef() };

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const next = () => {
    const e = step === 0 ? validateAccount(form, Boolean(social)) : validateJourney(form);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => s + 1);
  };

  const back = () => (step === 0 ? router.back() : setStep((s) => s - 1));

  const submit = async () => {
    const e = {};
    if (!form.ageConfirmed) e.ageConfirmed = true;
    if (!form.termsAccepted) e.termsAccepted = true;
    if (!form.kvkkConsent) e.kvkkConsent = true;
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setServerError(null);
    const common = {
      username: form.username.trim(),
      displayName: form.displayName.trim() || undefined,
      ageConfirmed: true,
      termsAccepted: true,
      kvkkConsent: true,
      cancerProfile: {
        cancerTypeId: form.cancerType.id,
        status: form.status,
        diagnosisYear: form.diagnosisYear ? Number(form.diagnosisYear) : undefined,
        remissionYear: form.status === 'SURVIVOR' && form.remissionYear ? Number(form.remissionYear) : undefined,
      },
    };
    try {
      if (social) {
        const user = await completeSocialSignup({ ...common, signupToken: social.signupToken });
        clearPendingSignup();
        router.replace(user.emailVerified ? '/feed' : '/verify-email');
      } else {
        await register({ ...common, email: form.email.trim(), password: form.password });
        router.replace('/verify-email');
      }
    } catch (err) {
      if (err.code === 'SIGNUP_TOKEN_INVALID' || err.code === 'ALREADY_REGISTERED' || (social && err.code === 'EMAIL_TAKEN')) {
        clearPendingSignup();
        Alert.alert('Kayıt tamamlanamadı', err.message);
        router.replace('/welcome');
        return;
      }
      // E-posta / kullanıcı adı çakışması ilk adımdaki alana gösterilir
      if (err.code === 'EMAIL_TAKEN') {
        setErrors({ email: err.message });
        setStep(0);
      } else if (err.code === 'USERNAME_TAKEN') {
        setErrors({ username: err.message });
        setStep(0);
      } else {
        const fe = fieldErrors(err);
        if (Object.keys(fe).length) setErrors(fe);
        setServerError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Sosyal kayıt bilgisi bellekte yoksa (ör. uygulama yeniden başlatıldı) baştan başlat
  if (params.social === '1' && !social) return <Redirect href="/welcome" />;

  return (
    <Screen
      scroll
      keyboard
      header={<Header back onBack={back} title={social ? 'Kaydını tamamla' : 'Hesap oluştur'} />}
      footer={
        <View style={styles.footer}>
          {step < 2 ? (
            <Button title="Devam et" iconRight="arrow-forward" onPress={next} />
          ) : (
            <Button title="Hesabımı oluştur" onPress={submit} loading={loading} />
          )}
        </View>
      }
    >
      <ProgressBar step={step} />

      {step === 0 && social ? (
        <View style={styles.section}>
          <View>
            <Text variant="title">Seni tanıyalım</Text>
            <Text variant="body" tone="secondary">
              Toplulukta takma adınla görünürsün; gerçek adını kullanmak zorunda değilsin.
            </Text>
          </View>
          <Banner
            tone="survivor"
            icon="checkmark-circle"
            title={`${PROVIDER_NAMES[social.provider]} hesabınla devam ediyorsun`}
            message={`${social.profile.email} — bu adres hiçbir kullanıcıyla paylaşılmaz.`}
          />
          <TextField
            label="Kullanıcı adı"
            icon="at"
            placeholder="ornek: umut_yolcusu"
            value={form.username}
            onChangeText={set('username')}
            error={errors.username}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            label="Görünen ad (isteğe bağlı)"
            icon="person-outline"
            placeholder="ör. Ayşe K."
            value={form.displayName}
            onChangeText={set('displayName')}
            maxLength={60}
            helper="Gerçek adını göstermek istemiyorsan değiştirebilir veya silebilirsin."
          />
        </View>
      ) : null}

      {step === 0 && !social ? (
        <View style={styles.section}>
          <View>
            <Text variant="title">Seni tanıyalım</Text>
            <Text variant="body" tone="secondary">
              Gerçek adını kullanmak zorunda değilsin; toplulukta takma adınla görünürsün.
            </Text>
          </View>
          <SocialButtons mode="signup" divider />
          <TextField
            label="E-posta"
            icon="mail-outline"
            placeholder="ornek@eposta.com"
            value={form.email}
            onChangeText={set('email')}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => refs.username.current?.focus()}
            helper="Hiçbir kullanıcıyla paylaşılmaz."
          />
          <TextField
            ref={refs.username}
            label="Kullanıcı adı"
            icon="at"
            placeholder="ornek: umut_yolcusu"
            value={form.username}
            onChangeText={set('username')}
            error={errors.username}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            returnKeyType="next"
            onSubmitEditing={() => refs.displayName.current?.focus()}
          />
          <TextField
            ref={refs.displayName}
            label="Görünen ad (isteğe bağlı)"
            icon="person-outline"
            placeholder="ör. Ayşe K."
            value={form.displayName}
            onChangeText={set('displayName')}
            maxLength={60}
            returnKeyType="next"
            onSubmitEditing={() => refs.password.current?.focus()}
          />
          <TextField
            ref={refs.password}
            label="Şifre"
            icon="lock-closed-outline"
            placeholder="En az 8 karakter, harf ve rakam"
            value={form.password}
            onChangeText={set('password')}
            error={errors.password}
            secure
            autoComplete="password-new"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => refs.passwordConfirm.current?.focus()}
          />
          <TextField
            ref={refs.passwordConfirm}
            label="Şifre (tekrar)"
            icon="lock-closed-outline"
            placeholder="Şifreni tekrar gir"
            value={form.passwordConfirm}
            onChangeText={set('passwordConfirm')}
            error={errors.passwordConfirm}
            secure
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={next}
          />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.section}>
          <View>
            <Text variant="title">Yolculuğun</Text>
            <Text variant="body" tone="secondary">
              Seni aynı süreci yaşayan ve yaşamış kişilerle buluşturmamız için gerekli. Daha sonra başka türler de
              ekleyebilirsin.
            </Text>
          </View>

          <Text variant="label" tone="secondary">
            Durumun
          </Text>
          <StatusChoice value={form.status} onChange={set('status')} />
          {errors.status ? (
            <Text variant="caption" tone="danger">
              {errors.status}
            </Text>
          ) : null}

          <View style={styles.years}>
            <TextField
              style={{ flex: 1 }}
              label="Tanı yılı (isteğe bağlı)"
              placeholder={String(thisYear)}
              value={form.diagnosisYear}
              onChangeText={(v) => set('diagnosisYear')(v.replace(/\D/g, '').slice(0, 4))}
              error={errors.diagnosisYear}
              keyboardType="number-pad"
            />
            {form.status === 'SURVIVOR' ? (
              <TextField
                style={{ flex: 1 }}
                label="İyileşme yılı"
                placeholder={String(thisYear)}
                value={form.remissionYear}
                onChangeText={(v) => set('remissionYear')(v.replace(/\D/g, '').slice(0, 4))}
                error={errors.remissionYear}
                keyboardType="number-pad"
              />
            ) : null}
          </View>

          <Text variant="label" tone="secondary">
            Kanser türü
          </Text>
          {errors.cancerType ? (
            <Text variant="caption" tone="danger">
              {errors.cancerType}
            </Text>
          ) : null}
          <CancerTypePicker value={form.cancerType?.id} onChange={set('cancerType')} />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.section}>
          <View>
            <Text variant="title">Son bir adım</Text>
            <Text variant="body" tone="secondary">
              Topluluğumuzu güvenli tutmak için aşağıdakileri onaylamanı istiyoruz.
            </Text>
          </View>

          <Banner
            tone="warning"
            title="OnkoBağ tıbbi tavsiye vermez"
            message="Paylaşımlar kişisel deneyimlerdir. Tedavinle ilgili her kararı hekiminle birlikte ver. Acil durumda 112’yi ara."
          />

          {serverError ? <Banner tone="danger" message={serverError} /> : null}

          <View style={styles.checks}>
            <Checkbox
              checked={form.ageConfirmed}
              onToggle={() => set('ageConfirmed')(!form.ageConfirmed)}
              error={errors.ageConfirmed}
              label="18 yaşından büyük olduğumu onaylıyorum."
            />
            <Checkbox checked={form.termsAccepted} onToggle={() => set('termsAccepted')(!form.termsAccepted)} error={errors.termsAccepted}>
              <Text variant="body">
                <LegalLink doc="terms">Kullanım Şartları</LegalLink>’nı ve <LegalLink doc="community">Topluluk Kuralları</LegalLink>’nı
                okudum, kabul ediyorum. Uygunsuz içerik ve davranışlara sıfır tolerans gösterildiğini biliyorum.
              </Text>
            </Checkbox>
            <Checkbox checked={form.kvkkConsent} onToggle={() => set('kvkkConsent')(!form.kvkkConsent)} error={errors.kvkkConsent}>
              <Text variant="body">
                <LegalLink doc="privacy">KVKK Aydınlatma Metni</LegalLink>’ni okudum. Kanser türüm ve tedavi durumum gibi
                sağlık verilerimin topluluk eşleştirmesi amacıyla işlenmesine ve bu amaçla yurt dışındaki sunucularda
                saklanmasına açık rıza veriyorum.
              </Text>
            </Checkbox>
          </View>
          {errors.ageConfirmed || errors.termsAccepted || errors.kvkkConsent ? (
            <Text variant="caption" tone="danger">
              Devam etmek için tüm onayları işaretlemelisin.
            </Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.xl },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: colors.border },
  section: { gap: spacing.lg },
  years: { flexDirection: 'row', gap: spacing.md },
  checks: { gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
});
