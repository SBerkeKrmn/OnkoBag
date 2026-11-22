-- =============================================================================
-- OnkoBağ — Prisma şemasında ifade edilemeyen ek kısıtlar
-- -----------------------------------------------------------------------------
-- Prisma CHECK kısıtlarını ve kısmi (partial) unique indeksleri desteklemez.
-- İlk migration oluşturulurken:
--   npx prisma migrate dev --create-only --name init
-- komutuyla üretilen migration.sql dosyasının SONUNA bu dosyanın içeriği
-- eklenir, ardından `npx prisma migrate dev` çalıştırılır.
-- =============================================================================

-- --- Kullanıcılar -------------------------------------------------------------
-- E-posta her zaman küçük harfle saklanır (case-insensitive benzersizlik)
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase_chk" CHECK ("email" = lower("email"));

-- Kullanıcı adı: 3-30 karakter, harf/rakam/alt çizgi/nokta
ALTER TABLE "users"
  ADD CONSTRAINT "users_username_format_chk" CHECK ("username" ~ '^[a-zA-Z0-9_.]{3,30}$');

ALTER TABLE "users"
  ADD CONSTRAINT "users_birth_year_chk" CHECK ("birth_year" IS NULL OR "birth_year" BETWEEN 1900 AND 2100);

-- --- Kanser profilleri ---------------------------------------------------------
-- Kullanıcı başına en fazla bir ana (primary) kanser profili
CREATE UNIQUE INDEX "user_cancer_profiles_one_primary_idx"
  ON "user_cancer_profiles" ("user_id") WHERE "is_primary" = true;

-- Remisyon yılı yalnızca iyileşenler için girilebilir
ALTER TABLE "user_cancer_profiles"
  ADD CONSTRAINT "ucp_remission_only_survivor_chk"
  CHECK ("remission_year" IS NULL OR "status" = 'SURVIVOR');

ALTER TABLE "user_cancer_profiles"
  ADD CONSTRAINT "ucp_years_order_chk"
  CHECK ("diagnosis_year" IS NULL OR "remission_year" IS NULL OR "remission_year" >= "diagnosis_year");

-- Doğrulama bilgisi tutarlılığı
ALTER TABLE "user_cancer_profiles"
  ADD CONSTRAINT "ucp_verified_consistency_chk"
  CHECK ("is_verified" = false OR "verified_at" IS NOT NULL);

-- --- Sohbet odaları ------------------------------------------------------------
-- Her kanser türü için en fazla bir varsayılan oda
CREATE UNIQUE INDEX "chat_rooms_one_default_per_type_idx"
  ON "chat_rooms" ("cancer_type_id") WHERE "is_default" = true;

ALTER TABLE "chat_rooms"
  ADD CONSTRAINT "chat_rooms_capacity_chk"
  CHECK ("max_members" > 0 AND "member_count" >= 0);

-- Metin mesajlarının içeriği boş olamaz
ALTER TABLE "room_messages"
  ADD CONSTRAINT "room_messages_text_content_chk"
  CHECK ("type" <> 'TEXT' OR ("content" IS NOT NULL AND length(trim("content")) > 0));

ALTER TABLE "direct_messages"
  ADD CONSTRAINT "direct_messages_text_content_chk"
  CHECK ("type" <> 'TEXT' OR ("content" IS NOT NULL AND length(trim("content")) > 0));

-- --- Gönderi / yorum sayaçları -------------------------------------------------
ALTER TABLE "posts"
  ADD CONSTRAINT "posts_counters_chk" CHECK ("like_count" >= 0 AND "comment_count" >= 0);

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_counters_chk" CHECK ("like_count" >= 0);

-- --- Medya ---------------------------------------------------------------------
-- Bir medya kaydı en fazla bir hedefe bağlanabilir
ALTER TABLE "media"
  ADD CONSTRAINT "media_single_target_chk"
  CHECK (num_nonnulls("post_id", "room_message_id", "direct_message_id") <= 1);

ALTER TABLE "media"
  ADD CONSTRAINT "media_size_chk" CHECK ("size_bytes" > 0);

-- --- Sosyal ilişkiler ----------------------------------------------------------
-- Kullanıcı kendini takip edemez / engelleyemez
ALTER TABLE "follows"
  ADD CONSTRAINT "follows_no_self_chk" CHECK ("follower_id" <> "following_id");

ALTER TABLE "blocks"
  ADD CONSTRAINT "blocks_no_self_chk" CHECK ("blocker_id" <> "blocked_id");
