-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invites" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_events" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "developer_id" TEXT,
    "end_user_id" TEXT,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_members_owner_id_idx" ON "team_members"("owner_id");

-- CreateIndex
CREATE INDEX "team_members_member_id_idx" ON "team_members"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_owner_id_member_id_key" ON "team_members"("owner_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_invites_token_key" ON "team_invites"("token");

-- CreateIndex
CREATE INDEX "team_invites_owner_id_idx" ON "team_invites"("owner_id");

-- CreateIndex
CREATE INDEX "team_invites_token_idx" ON "team_invites"("token");

-- CreateIndex
CREATE INDEX "team_invites_email_idx" ON "team_invites"("email");

-- CreateIndex
CREATE INDEX "auth_events_project_id_idx" ON "auth_events"("project_id");

-- CreateIndex
CREATE INDEX "auth_events_developer_id_idx" ON "auth_events"("developer_id");

-- CreateIndex
CREATE INDEX "auth_events_end_user_id_idx" ON "auth_events"("end_user_id");

-- CreateIndex
CREATE INDEX "auth_events_created_at_idx" ON "auth_events"("created_at");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
