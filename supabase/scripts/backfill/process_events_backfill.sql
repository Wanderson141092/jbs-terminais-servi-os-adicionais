-- Backfill auditável com checkpoints para process_events
DO $$
DECLARE
  v_run_id uuid;
  v_batch integer := 1;
  v_processed integer := 0;
  v_total integer := 0;
BEGIN
  v_run_id := public.migration_start_backfill_run('process_events', jsonb_build_object('batch_size', 1000));

  LOOP
    v_processed := public.backfill_process_events_batch(v_run_id, 1000);
    EXIT WHEN v_processed = 0;
    v_total := v_total + v_processed;
    RAISE NOTICE '[process_events] batch %, processed %, total %', v_batch, v_processed, v_total;
    v_batch := v_batch + 1;
  END LOOP;

  PERFORM public.migration_finish_backfill_run(v_run_id, 'completed', v_total);
  RAISE NOTICE '[process_events] backfill finalizado. run_id=%, total=%', v_run_id, v_total;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM public.migration_finish_backfill_run(v_run_id, 'failed', v_total);
    RAISE;
END $$;
