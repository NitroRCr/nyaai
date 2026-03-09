-- Custom SQL migration file --
INSERT INTO "mergePatchesRule" ("offset", "interval", "gap", "lastTime") VALUES
  (7200000,        600000,        60000,        EXTRACT(EPOCH FROM NOW())::bigint * 1000),
  (172800000,      86400000,      3600000,      EXTRACT(EPOCH FROM NOW())::bigint * 1000),
  (2592000000,     604800000,     86400000,     EXTRACT(EPOCH FROM NOW())::bigint * 1000)
ON CONFLICT DO NOTHING;
