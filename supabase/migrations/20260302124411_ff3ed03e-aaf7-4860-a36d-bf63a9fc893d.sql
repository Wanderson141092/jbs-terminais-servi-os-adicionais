ALTER TABLE service_routing_rules ALTER COLUMN setor_ids TYPE text[] USING setor_ids::text[];
ALTER TABLE notification_rules ALTER COLUMN setor_ids TYPE text[] USING setor_ids::text[];