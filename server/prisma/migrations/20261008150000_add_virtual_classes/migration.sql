CREATE TABLE "VirtualClassSession" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "meetingUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualClassSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VirtualClassSession_courseId_startsAt_idx" ON "VirtualClassSession"("courseId", "startsAt");

ALTER TABLE "VirtualClassSession" ADD CONSTRAINT "VirtualClassSession_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
