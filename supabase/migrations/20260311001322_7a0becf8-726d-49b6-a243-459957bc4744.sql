
DROP POLICY IF EXISTS "Agency members insert crm_leads" ON crm_leads;
CREATE POLICY "Agency members insert crm_leads" ON crm_leads
  FOR INSERT TO authenticated
  WITH CHECK (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));

DROP POLICY IF EXISTS "Agency members insert crm_pipelines" ON crm_pipelines;
CREATE POLICY "Agency members insert crm_pipelines" ON crm_pipelines
  FOR INSERT TO authenticated
  WITH CHECK (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id));

DROP POLICY IF EXISTS "Agency members insert crm_pipeline_stages" ON crm_pipeline_stages;
CREATE POLICY "Agency members insert crm_pipeline_stages" ON crm_pipeline_stages
  FOR INSERT TO authenticated
  WITH CHECK (is_agency_member(auth.uid()) AND EXISTS (
    SELECT 1 FROM crm_pipelines p WHERE p.id = pipeline_id AND has_client_access(auth.uid(), p.client_id)
  ));

DROP POLICY IF EXISTS "Users with client access can insert crm_external_connections" ON crm_external_connections;
CREATE POLICY "Users with client access can insert crm_external_connections" ON crm_external_connections
  FOR INSERT TO authenticated
  WITH CHECK (is_agency_member(auth.uid()) AND has_client_access(auth.uid(), client_id))
