begin read only;
-- No names, emails, prices, passenger data or snapshot bodies returned.
select q.id as quotation_id,q.version as current_version,q.version_aceptada,
 (select count(*) from public.reservations r where r.quotation_id=q.id) as linked_reservations,
 (select jsonb_agg(jsonb_build_object('version_id',v.id,'version',v.version,'issued_at',v.emitida_en,
 'has_quotation',v.snapshot ? 'quotation','has_items',v.snapshot ? 'items') order by v.version)
 from public.quotation_versions v where v.quotation_id=q.id) as candidates
from public.quotations q where q.estado='aceptada' and q.version_aceptada is null;
commit;
