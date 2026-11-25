-- KVKK: silinen mesajların metni veritabanında tutulmaz.
-- Önceki kısıt TEXT mesajlarda metni her zaman zorunlu kılıyordu; silinmiş
-- (status = 'DELETED') mesajlarda metin artık boş (NULL) olabilir.
ALTER TABLE "room_messages" DROP CONSTRAINT IF EXISTS "room_messages_text_content_chk";
ALTER TABLE "room_messages"
  ADD CONSTRAINT "room_messages_text_content_chk"
  CHECK ("type" <> 'TEXT' OR "status" = 'DELETED' OR ("content" IS NOT NULL AND length(trim("content")) > 0));

ALTER TABLE "direct_messages" DROP CONSTRAINT IF EXISTS "direct_messages_text_content_chk";
ALTER TABLE "direct_messages"
  ADD CONSTRAINT "direct_messages_text_content_chk"
  CHECK ("type" <> 'TEXT' OR "status" = 'DELETED' OR ("content" IS NOT NULL AND length(trim("content")) > 0));

-- Daha önce silinmiş içeriklerin metinleri de temizlenir
UPDATE "room_messages" SET "content" = NULL WHERE "status" = 'DELETED';
UPDATE "direct_messages" SET "content" = NULL WHERE "status" = 'DELETED';
UPDATE "posts" SET "content" = '', "title" = NULL WHERE "status" = 'DELETED';
UPDATE "comments" SET "content" = '' WHERE "status" = 'DELETED';