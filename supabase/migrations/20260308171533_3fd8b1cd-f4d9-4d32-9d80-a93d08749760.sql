
-- Fix overly permissive storage policies for gos-onboarding-files
-- Drop existing permissive policies
DROP POLICY IF EXISTS "auth_read_onboarding_files" ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_onboarding_files" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_onboarding_files" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_onboarding_files" ON storage.objects;

-- Recreate with proper scoping: only agency members can access
CREATE POLICY "agency_read_onboarding_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'gos-onboarding-files'
    AND is_agency_member(auth.uid())
  );

CREATE POLICY "agency_upload_onboarding_files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'gos-onboarding-files'
    AND is_agency_member(auth.uid())
  );

CREATE POLICY "agency_update_onboarding_files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'gos-onboarding-files'
    AND is_agency_member(auth.uid())
  );

CREATE POLICY "agency_delete_onboarding_files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'gos-onboarding-files'
    AND is_agency_member(auth.uid())
  );
