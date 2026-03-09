-- Custom SQL migration file --
INSERT INTO "mergePatchesRule" ("offset", "interval", "gap", "lastTime") VALUES
  (2*60*60*1000,       10*60*1000,        1*60*1000,        EXTRACT(EPOCH FROM NOW())::bigint * 1000),
  (2*24*60*60*1000,    1*24*60*60*1000,   1*60*60*1000,     EXTRACT(EPOCH FROM NOW())::bigint * 1000),
  (30*24*60*60*1000,   7*24*60*60*1000,   1*24*60*60*1000,  EXTRACT(EPOCH FROM NOW())::bigint * 1000)
ON CONFLICT DO NOTHING;
