-- delivery_assignments: anon/authenticated SELECT 허용 (Realtime 이벤트 수신용)
CREATE POLICY "delivery_assignments_select_for_realtime" ON delivery_assignments
  FOR SELECT TO anon, authenticated
  USING (true);
