-- Add missing DELETE + UPDATE storage policies for portal-files bucket
CREATE POLICY "agency_delete_portal_files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'portal-files' AND is_agency_member(auth.uid()));

CREATE POLICY "agency_update_portal_files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'portal-files' AND is_agency_member(auth.uid()));