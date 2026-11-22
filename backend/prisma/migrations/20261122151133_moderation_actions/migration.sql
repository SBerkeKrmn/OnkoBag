-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "moderation_action_type" ADD VALUE 'SILENCE_IN_ROOM';
ALTER TYPE "moderation_action_type" ADD VALUE 'UPDATE_ROOM';
ALTER TYPE "moderation_action_type" ADD VALUE 'CREATE_CANCER_TYPE';
ALTER TYPE "moderation_action_type" ADD VALUE 'UPDATE_CANCER_TYPE';
ALTER TYPE "moderation_action_type" ADD VALUE 'RESOLVE_REPORT';
