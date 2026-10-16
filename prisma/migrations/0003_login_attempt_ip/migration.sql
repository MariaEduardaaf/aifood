-- AlterTable
ALTER TABLE "LoginAttempt" ADD COLUMN "ip" TEXT;

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_created_at_idx" ON "LoginAttempt"("ip", "created_at");
