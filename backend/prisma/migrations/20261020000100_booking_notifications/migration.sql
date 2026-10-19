-- Add request and reminder notifications, with one notification per user, booking and type.
PRAGMA defer_foreign_keys=ON;

CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" TEXT NOT NULL CHECK ("type" IN ('BOOKING_REQUESTED', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER')),
    "message" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Notification" ("id", "userId", "bookingId", "type", "message", "readAt", "createdAt")
SELECT "id", "userId", "bookingId", "type", "message", "readAt", "createdAt" FROM "Notification";

DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";

CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_bookingId_idx" ON "Notification"("bookingId");
CREATE UNIQUE INDEX "Notification_userId_bookingId_type_key" ON "Notification"("userId", "bookingId", "type");
