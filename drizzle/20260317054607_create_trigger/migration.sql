-- Custom SQL migration file --

CREATE OR REPLACE FUNCTION update_storage_and_refcount()
RETURNS TRIGGER AS $$
DECLARE
    delta_size bigint;
    target_blob_id text;
    old_root_id text;
    new_root_id text;
BEGIN
    
    IF (TG_OP = 'INSERT' AND NEW."blobId" IS NOT NULL) THEN
        UPDATE blob SET "refCount" = "refCount" + 1 WHERE id = NEW."blobId";
    
    ELSIF (TG_OP = 'DELETE' AND OLD."blobId" IS NOT NULL) THEN
        UPDATE blob SET "refCount" = "refCount" - 1 WHERE id = OLD."blobId";

    ELSIF (TG_OP = 'UPDATE' AND OLD."blobId" IS NULL AND NEW."blobId" IS NOT NULL) THEN
        UPDATE blob SET "refCount" = "refCount" + 1 WHERE id = NEW."blobId";
    END IF;

    target_blob_id := COALESCE(NEW."blobId", OLD."blobId");
    
    IF target_blob_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT size INTO delta_size FROM blob WHERE id = target_blob_id;
    
    IF delta_size IS NULL THEN
        delta_size := 0;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        UPDATE workspace 
        SET "storageUsed" = "storageUsed" + delta_size 
        WHERE id = NEW."rootId" OR "trashId" = NEW."rootId";

    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE workspace 
        SET "storageUsed" = "storageUsed" - delta_size 
        WHERE id = OLD."rootId" OR "trashId" = OLD."rootId";

    ELSIF (TG_OP = 'UPDATE') THEN
        old_root_id := OLD."rootId";
        new_root_id := NEW."rootId";

        IF (OLD."blobId" IS NULL AND NEW."blobId" IS NOT NULL) THEN
             UPDATE workspace 
             SET "storageUsed" = "storageUsed" + delta_size 
             WHERE id = new_root_id OR "trashId" = new_root_id;
        
        ELSIF (old_root_id IS DISTINCT FROM new_root_id AND NEW."blobId" IS NOT NULL) THEN
            UPDATE workspace 
            SET "storageUsed" = "storageUsed" - delta_size 
            WHERE id = old_root_id OR "trashId" = old_root_id;
            
            UPDATE workspace 
            SET "storageUsed" = "storageUsed" + delta_size 
            WHERE id = new_root_id OR "trashId" = new_root_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_item_storage_refcount
AFTER INSERT OR UPDATE OR DELETE ON item
FOR EACH ROW
EXECUTE FUNCTION update_storage_and_refcount();
