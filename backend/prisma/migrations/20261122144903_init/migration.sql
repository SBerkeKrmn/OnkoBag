-- CreateEnum
CREATE TYPE "system_role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "dm_permission" AS ENUM ('EVERYONE', 'FOLLOWING', 'NOBODY');

-- CreateEnum
CREATE TYPE "cancer_status" AS ENUM ('ACTIVE_TREATMENT', 'SURVIVOR');

-- CreateEnum
CREATE TYPE "token_type" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "post_category" AS ENUM ('QUESTION', 'EXPERIENCE', 'TREATMENT', 'SIDE_EFFECTS', 'MOTIVATION', 'DAILY_LIFE', 'OTHER');

-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "message_type" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "report_target_type" AS ENUM ('USER', 'POST', 'COMMENT', 'ROOM_MESSAGE', 'DIRECT_MESSAGE');

-- CreateEnum
CREATE TYPE "report_reason" AS ENUM ('SPAM', 'HARASSMENT', 'MISINFORMATION', 'SELF_HARM', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "moderation_action_type" AS ENUM ('HIDE_CONTENT', 'RESTORE_CONTENT', 'DELETE_CONTENT', 'WARN_USER', 'SUSPEND_USER', 'UNSUSPEND_USER', 'VERIFY_SURVIVOR', 'REVOKE_SURVIVOR', 'CHANGE_ROLE', 'CREATE_ROOM', 'CLOSE_ROOM');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('NEW_FOLLOWER', 'POST_LIKED', 'POST_COMMENTED', 'COMMENT_REPLIED', 'COMMENT_LIKED', 'NEW_DIRECT_MESSAGE', 'SURVIVOR_VERIFIED', 'REPORT_RESOLVED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "device_platform" AS ENUM ('ANDROID', 'IOS');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "display_name" VARCHAR(60),
    "bio" VARCHAR(500),
    "avatar_url" VARCHAR(500),
    "birth_year" SMALLINT,
    "gender" "gender",
    "city" VARCHAR(40),
    "role" "system_role" NOT NULL DEFAULT 'USER',
    "status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "dm_permission" "dm_permission" NOT NULL DEFAULT 'EVERYONE',
    "email_verified_at" TIMESTAMPTZ(6),
    "kvkk_consent_at" TIMESTAMPTZ(6) NOT NULL,
    "terms_accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "suspended_until" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "token_type" NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "device_info" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "platform" "device_platform" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancer_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon_name" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cancer_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cancer_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cancer_type_id" INTEGER NOT NULL,
    "status" "cancer_status" NOT NULL,
    "diagnosis_year" SMALLINT,
    "remission_year" SMALLINT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_cancer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" UUID NOT NULL,
    "cancer_type_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "room_number" INTEGER NOT NULL DEFAULT 1,
    "max_members" INTEGER NOT NULL DEFAULT 500,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_memberships" (
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_message_id" BIGINT,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "silenced_until" TIMESTAMPTZ(6),

    CONSTRAINT "room_memberships_pkey" PRIMARY KEY ("room_id","user_id")
);

-- CreateTable
CREATE TABLE "room_messages" (
    "id" BIGSERIAL NOT NULL,
    "room_id" UUID NOT NULL,
    "sender_id" UUID,
    "type" "message_type" NOT NULL DEFAULT 'TEXT',
    "content" VARCHAR(2000),
    "reply_to_id" BIGINT,
    "status" "content_status" NOT NULL DEFAULT 'PUBLISHED',
    "edited_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "direct_key" VARCHAR(80) NOT NULL,
    "last_message_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_message_id" BIGINT,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "hidden_at" TIMESTAMPTZ(6),
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" BIGSERIAL NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID,
    "type" "message_type" NOT NULL DEFAULT 'TEXT',
    "content" VARCHAR(4000),
    "status" "content_status" NOT NULL DEFAULT 'PUBLISHED',
    "edited_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "cancer_type_id" INTEGER NOT NULL,
    "category" "post_category" NOT NULL DEFAULT 'EXPERIENCE',
    "title" VARCHAR(150),
    "content" VARCHAR(5000) NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'PUBLISHED',
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "edited_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "parent_id" UUID,
    "content" VARCHAR(2000) NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'PUBLISHED',
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "edited_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id","user_id")
);

-- CreateTable
CREATE TABLE "comment_likes" (
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("comment_id","user_id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "uploader_id" UUID NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "post_id" UUID,
    "room_message_id" BIGINT,
    "direct_message_id" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID,
    "target_type" "report_target_type" NOT NULL,
    "target_id" VARCHAR(64) NOT NULL,
    "reason" "report_reason" NOT NULL,
    "description" VARCHAR(1000),
    "status" "report_status" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "resolution_note" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_logs" (
    "id" UUID NOT NULL,
    "moderator_id" UUID,
    "action" "moderation_action_type" NOT NULL,
    "target_type" "report_target_type",
    "target_id" VARCHAR(64),
    "target_user_id" UUID,
    "report_id" UUID,
    "reason" VARCHAR(1000),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "actor_id" UUID,
    "type" "notification_type" NOT NULL,
    "entity_id" VARCHAR(64),
    "message" VARCHAR(300),
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_tokens_user_id_type_idx" ON "auth_tokens"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cancer_types_name_key" ON "cancer_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cancer_types_slug_key" ON "cancer_types"("slug");

-- CreateIndex
CREATE INDEX "user_cancer_profiles_cancer_type_id_status_idx" ON "user_cancer_profiles"("cancer_type_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_cancer_profiles_user_id_cancer_type_id_key" ON "user_cancer_profiles"("user_id", "cancer_type_id");

-- CreateIndex
CREATE INDEX "chat_rooms_cancer_type_id_is_active_idx" ON "chat_rooms"("cancer_type_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_cancer_type_id_room_number_key" ON "chat_rooms"("cancer_type_id", "room_number");

-- CreateIndex
CREATE INDEX "room_memberships_user_id_idx" ON "room_memberships"("user_id");

-- CreateIndex
CREATE INDEX "room_messages_room_id_id_idx" ON "room_messages"("room_id", "id" DESC);

-- CreateIndex
CREATE INDEX "room_messages_sender_id_idx" ON "room_messages"("sender_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_direct_key_key" ON "conversations"("direct_key");

-- CreateIndex
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at" DESC);

-- CreateIndex
CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants"("user_id");

-- CreateIndex
CREATE INDEX "direct_messages_conversation_id_id_idx" ON "direct_messages"("conversation_id", "id" DESC);

-- CreateIndex
CREATE INDEX "posts_cancer_type_id_status_created_at_idx" ON "posts"("cancer_type_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_author_id_created_at_idx" ON "posts"("author_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "comments_post_id_created_at_idx" ON "comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");

-- CreateIndex
CREATE INDEX "post_likes_user_id_idx" ON "post_likes"("user_id");

-- CreateIndex
CREATE INDEX "comment_likes_user_id_idx" ON "comment_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_storage_key_key" ON "media"("storage_key");

-- CreateIndex
CREATE INDEX "media_post_id_idx" ON "media"("post_id");

-- CreateIndex
CREATE INDEX "media_room_message_id_idx" ON "media"("room_message_id");

-- CreateIndex
CREATE INDEX "media_direct_message_id_idx" ON "media"("direct_message_id");

-- CreateIndex
CREATE INDEX "media_uploader_id_idx" ON "media"("uploader_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "moderation_logs_target_user_id_idx" ON "moderation_logs"("target_user_id");

-- CreateIndex
CREATE INDEX "moderation_logs_created_at_idx" ON "moderation_logs"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cancer_profiles" ADD CONSTRAINT "user_cancer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cancer_profiles" ADD CONSTRAINT "user_cancer_profiles_cancer_type_id_fkey" FOREIGN KEY ("cancer_type_id") REFERENCES "cancer_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cancer_profiles" ADD CONSTRAINT "user_cancer_profiles_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_cancer_type_id_fkey" FOREIGN KEY ("cancer_type_id") REFERENCES "cancer_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_memberships" ADD CONSTRAINT "room_memberships_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_memberships" ADD CONSTRAINT "room_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "room_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_cancer_type_id_fkey" FOREIGN KEY ("cancer_type_id") REFERENCES "cancer_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_room_message_id_fkey" FOREIGN KEY ("room_message_id") REFERENCES "room_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_direct_message_id_fkey" FOREIGN KEY ("direct_message_id") REFERENCES "direct_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
