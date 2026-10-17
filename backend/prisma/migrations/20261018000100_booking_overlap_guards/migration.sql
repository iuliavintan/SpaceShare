-- Abort rather than alter existing records if an older database has conflicts.
-- No tables are rebuilt: all existing CHECKs and foreign keys are preserved.
BEGIN IMMEDIATE;
CREATE TABLE "_SpaceShareConflictAudit" (
  "valid" INTEGER NOT NULL CONSTRAINT "Existing_reservations_or_blocks_overlap" CHECK ("valid" = 1)
);
INSERT INTO "_SpaceShareConflictAudit" ("valid")
SELECT CASE WHEN
  EXISTS (
    SELECT 1 FROM "Booking" a JOIN "Booking" b
      ON a."resourceId" = b."resourceId" AND a."id" < b."id"
      AND a."startAt" < b."endAt" AND a."endAt" > b."startAt"
    WHERE a."status" IN ('PENDING', 'APPROVED') AND b."status" IN ('PENDING', 'APPROVED')
  ) OR EXISTS (
    SELECT 1 FROM "Booking" b JOIN "ResourceBlock" r
      ON b."resourceId" = r."resourceId" AND b."startAt" < r."endAt" AND b."endAt" > r."startAt"
    WHERE b."status" IN ('PENDING', 'APPROVED')
  ) OR EXISTS (
    SELECT 1 FROM "ResourceBlock" a JOIN "ResourceBlock" b
      ON a."resourceId" = b."resourceId" AND a."id" < b."id"
      AND a."startAt" < b."endAt" AND a."endAt" > b."startAt"
  ) THEN 0 ELSE 1 END;
DROP TABLE "_SpaceShareConflictAudit";

-- Half-open intervals [startAt, endAt): adjacent reservations are valid.
-- Runtime and raw SQL callers must use the existing unixepoch-ms convention.
CREATE TRIGGER "Booking_no_overlap_insert"
AFTER INSERT ON "Booking"
WHEN NEW."status" IN ('PENDING', 'APPROVED')
BEGIN
  SELECT RAISE(ABORT, 'SPACESHARE_BOOKING_CONFLICT') WHERE EXISTS (
    SELECT 1 FROM "Booking" b WHERE b."id" != NEW."id"
      AND b."resourceId" = NEW."resourceId" AND b."status" IN ('PENDING', 'APPROVED')
      AND b."startAt" < NEW."endAt" AND b."endAt" > NEW."startAt"
  ) OR EXISTS (
    SELECT 1 FROM "ResourceBlock" r WHERE r."resourceId" = NEW."resourceId"
      AND r."startAt" < NEW."endAt" AND r."endAt" > NEW."startAt"
  );
END;

CREATE TRIGGER "Booking_no_overlap_update"
AFTER UPDATE OF "resourceId", "startAt", "endAt", "status" ON "Booking"
WHEN NEW."status" IN ('PENDING', 'APPROVED')
BEGIN
  SELECT RAISE(ABORT, 'SPACESHARE_BOOKING_CONFLICT') WHERE EXISTS (
    SELECT 1 FROM "Booking" b WHERE b."id" != NEW."id"
      AND b."resourceId" = NEW."resourceId" AND b."status" IN ('PENDING', 'APPROVED')
      AND b."startAt" < NEW."endAt" AND b."endAt" > NEW."startAt"
  ) OR EXISTS (
    SELECT 1 FROM "ResourceBlock" r WHERE r."resourceId" = NEW."resourceId"
      AND r."startAt" < NEW."endAt" AND r."endAt" > NEW."startAt"
  );
END;

CREATE TRIGGER "ResourceBlock_no_overlap_insert"
AFTER INSERT ON "ResourceBlock"
BEGIN
  SELECT RAISE(ABORT, 'SPACESHARE_BLOCK_CONFLICT') WHERE EXISTS (
    SELECT 1 FROM "Booking" b WHERE b."resourceId" = NEW."resourceId"
      AND b."status" IN ('PENDING', 'APPROVED')
      AND b."startAt" < NEW."endAt" AND b."endAt" > NEW."startAt"
  ) OR EXISTS (
    SELECT 1 FROM "ResourceBlock" r WHERE r."id" != NEW."id" AND r."resourceId" = NEW."resourceId"
      AND r."startAt" < NEW."endAt" AND r."endAt" > NEW."startAt"
  );
END;

CREATE TRIGGER "ResourceBlock_no_overlap_update"
AFTER UPDATE OF "resourceId", "startAt", "endAt" ON "ResourceBlock"
BEGIN
  SELECT RAISE(ABORT, 'SPACESHARE_BLOCK_CONFLICT') WHERE EXISTS (
    SELECT 1 FROM "Booking" b WHERE b."resourceId" = NEW."resourceId"
      AND b."status" IN ('PENDING', 'APPROVED')
      AND b."startAt" < NEW."endAt" AND b."endAt" > NEW."startAt"
  ) OR EXISTS (
    SELECT 1 FROM "ResourceBlock" r WHERE r."id" != NEW."id" AND r."resourceId" = NEW."resourceId"
      AND r."startAt" < NEW."endAt" AND r."endAt" > NEW."startAt"
  );
END;
COMMIT;
