-- viatour production schema snapshot (public + storage policies). Structure only: no rows, no secrets.
-- Generated from a READ ONLY metadata query at 2026-10-24T00:38:06.274662+00:00 (PostgreSQL 17.6).
-- Migration history table: none (schema is managed by reviewed files in docs/sql).
-- Reference only. Do NOT run against production. Order: types, sequences, tables, keys, indexes, views, functions, triggers, RLS, grants, storage.

create sequence public.admin_audit_log_id_seq;
create sequence public.payment_receipt_number;

create table public.admin_audit_log (
  id bigint generated always as identity not null,
  at timestamp with time zone default now() not null,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid not null,
  reference text,
  details jsonb default '{}'::jsonb not null
);
create table public.admins (
  user_id uuid not null,
  created_at timestamp with time zone default now() not null,
  role text default 'agent'::text not null
);
create table public.airline_catalog (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  iata text,
  icao text,
  pais text,
  operadora text,
  notas_internas text,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  creado_por uuid,
  actualizado_por uuid
);
create table public.airline_fare_presets (
  id uuid default gen_random_uuid() not null,
  airline_id uuid not null,
  nombre text not null,
  cabina text,
  tipo_tarifa text,
  aplica_a text,
  equipaje jsonb default '{}'::jsonb not null,
  cambios text,
  cancelacion text,
  reembolso text,
  asientos text,
  restricciones text,
  otras_inclusiones text,
  fuente text,
  verificado_en date,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  creado_por uuid,
  actualizado_por uuid
);
create table public.blog_posts (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  slug text not null,
  titulo text not null,
  categoria text,
  tipo text default 'post'::text not null,
  extracto text,
  cuerpo text,
  cover_url text,
  autor text default 'viatour'::text,
  meta_titulo text,
  meta_descripcion text,
  destacado boolean default false not null,
  publicado boolean default false not null,
  publicado_en date,
  orden integer default 0
);
create table public.customers (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  email text,
  telefono text,
  notas text,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
create table public.destinations (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  slug text not null,
  nombre text not null,
  titulo_seo text,
  meta_descripcion text,
  intro text,
  cuerpo text,
  mejor_epoca text,
  faqs jsonb,
  imagen_url text,
  destacado boolean default false not null,
  publicado boolean default true not null,
  orden integer default 0,
  galeria text[]
);
create table public.faqs (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  pregunta text not null,
  respuesta text not null,
  categoria text,
  publicado boolean default true not null,
  orden integer default 0
);
create table public.hotel_catalog (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  cadena text,
  pais text,
  ciudad text,
  destino text,
  direccion text,
  ubicacion text,
  telefono text,
  email text,
  sitio_web text,
  descripcion text,
  estrellas smallint,
  fotos jsonb default '[]'::jsonb not null,
  amenidades jsonb default '[]'::jsonb not null,
  habitaciones jsonb default '[]'::jsonb not null,
  planes jsonb default '[]'::jsonb not null,
  inclusiones jsonb default '[]'::jsonb not null,
  check_in time without time zone,
  check_out time without time zone,
  politicas text,
  cancelacion text,
  impuestos text,
  cargo_resort text,
  referencia_proveedor text,
  notas_internas text,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  creado_por uuid,
  actualizado_por uuid
);
create table public.invoices (
  id uuid default gen_random_uuid() not null,
  numero text default ((('FAC-'::text || to_char(now(), 'YYYY'::text)) || '-'::text) || upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 6))) not null,
  reservation_id uuid not null,
  cliente_nombre text not null,
  moneda text default 'USD'::text not null,
  total numeric(12,2) default 0 not null,
  estado text default 'emitida'::text not null,
  fecha_emision date default CURRENT_DATE not null,
  fecha_vencimiento date,
  notas text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  items jsonb default '[]'::jsonb not null,
  cliente_email text,
  cliente_telefono text,
  commercial_snapshot jsonb
);
create table public.leads (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  servicio text not null,
  nombre text,
  origen text,
  destino text,
  fechas text,
  pasajeros text,
  clase text,
  presupuesto text,
  moneda text,
  notas text,
  payload jsonb,
  estado text default 'nuevo'::text not null,
  user_agent text,
  telefono text,
  email text,
  referencia text,
  origen_web jsonb,
  segmento text,
  motivo_perdida text
);
create table public.newsletter_subscribers (
  id uuid default gen_random_uuid() not null,
  email text not null,
  nombre text,
  consent boolean default true not null,
  created_at timestamp with time zone default now() not null
);
create table public.packages (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  slug text not null,
  nombre text not null,
  destino text not null,
  resumen text,
  descripcion text,
  incluye text[],
  duracion text,
  precio_desde numeric,
  moneda text default 'USD'::text,
  imagen_url text,
  destacado boolean default false not null,
  publicado boolean default true not null,
  orden integer default 0,
  destination_id uuid,
  itinerario text,
  galeria text[],
  categoria text,
  etiquetas text[],
  no_incluye text[]
);
create table public.passenger_profiles (
  id uuid default gen_random_uuid() not null,
  customer_id uuid not null,
  nombre text not null,
  otros_nombres text default ''::text not null,
  apellidos text not null,
  categoria text default 'adulto'::text not null,
  nacionalidad text default ''::text not null,
  tipo_documento text default 'pasaporte'::text not null,
  pais_emision text default ''::text not null,
  vence_documento date,
  documento_final text default ''::text not null,
  privado text,
  foto_path text,
  pasaporte_path text,
  pasaporte_borrar_despues date,
  creado_por uuid default auth.uid(),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
create table public.payment_receipts (
  id uuid default gen_random_uuid() not null,
  payment_id uuid not null,
  reservation_id uuid not null,
  number text default ('REC-'::text || lpad((nextval('payment_receipt_number'::regclass))::text, 8, '0'::text)) not null,
  snapshot jsonb not null,
  created_by uuid not null,
  created_at timestamp with time zone default now() not null
);
create table public.payment_recording_requests (
  request_id uuid not null,
  reservation_id uuid not null,
  payment_id uuid not null,
  payload jsonb not null,
  created_by uuid not null,
  created_at timestamp with time zone default now() not null
);
create table public.payments (
  id uuid default gen_random_uuid() not null,
  reservation_id uuid not null,
  monto numeric(12,2) not null,
  moneda text default 'USD'::text not null,
  metodo text not null,
  referencia text,
  fecha_pago date default CURRENT_DATE not null,
  registrado_por uuid,
  notas text,
  created_at timestamp with time zone default now() not null,
  tipo text default 'pago'::text not null,
  revierte_a uuid,
  motivo text
);
create table public.portal_otps (
  id uuid default gen_random_uuid() not null,
  reservation_id uuid not null,
  code_hash text not null,
  expires_at timestamp with time zone not null,
  attempts integer default 0 not null,
  created_at timestamp with time zone default now() not null
);
create table public.promo_spins (
  id uuid default gen_random_uuid() not null,
  code text not null,
  estado text default 'pendiente'::text not null,
  premio_id text,
  premio_label text,
  cliente_nombre text,
  reservation_ref text,
  created_at timestamp with time zone default now() not null,
  used_at timestamp with time zone,
  expires_at timestamp with time zone not null
);
create table public.quotation_items (
  id uuid default gen_random_uuid() not null,
  quotation_id uuid not null,
  descripcion text not null,
  tipo text,
  cantidad integer default 1 not null,
  precio_unitario numeric(12,2) default 0 not null,
  orden integer default 0 not null
);
create table public.quotation_shares (
  id uuid default gen_random_uuid() not null,
  quotation_id uuid not null,
  version_id uuid not null,
  canal text not null,
  telefono text,
  mensaje text,
  plantilla text default 'cotizacion_v1'::text not null,
  token_hash text not null,
  estado text default 'preparado'::text not null,
  proveedor_id text,
  expira_en timestamp with time zone not null,
  creado_por uuid default auth.uid(),
  created_at timestamp with time zone default now() not null,
  confirmado_en timestamp with time zone,
  confirmado_por uuid,
  cerrado_en timestamp with time zone,
  abierto_en timestamp with time zone,
  aperturas integer default 0 not null
);
create table public.quotation_versions (
  id uuid default gen_random_uuid() not null,
  quotation_id uuid not null,
  version integer not null,
  snapshot jsonb not null,
  emitida_en timestamp with time zone default now() not null,
  emitida_por uuid default auth.uid()
);
create table public.quotations (
  id uuid default gen_random_uuid() not null,
  codigo text default ((('COT-'::text || to_char(now(), 'YYYY'::text)) || '-'::text) || upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 6))) not null,
  customer_id uuid,
  cliente_nombre text not null,
  cliente_email text,
  cliente_telefono text,
  destino text,
  moneda text default 'USD'::text not null,
  estado text default 'borrador'::text not null,
  validez date,
  notas text,
  total numeric(12,2) default 0 not null,
  agente_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  lead_id uuid,
  tipo text default 'general'::text not null,
  detalles jsonb default '{}'::jsonb not null,
  vence_en timestamp with time zone,
  version integer default 0 not null,
  version_aceptada integer,
  aceptada_en timestamp with time zone,
  aceptada_por uuid,
  aceptacion_notas text,
  accepted_version_id uuid,
  sent_version_id uuid,
  motivo_rechazo text,
  rechazada_en timestamp with time zone,
  enmienda_de uuid,
  reemplazada_por uuid,
  reemplazada_en timestamp with time zone
);
create table public.rate_limits (
  bucket text not null,
  window_start timestamp with time zone default now() not null,
  count integer default 0 not null
);
create table public.reservation_items (
  id uuid default gen_random_uuid() not null,
  reservation_id uuid not null,
  descripcion text not null,
  tipo text,
  cantidad integer default 1 not null,
  precio_unitario numeric(12,2) default 0 not null,
  orden integer default 0 not null
);
create table public.reservation_message_attachments (
  id uuid default gen_random_uuid() not null,
  message_id uuid not null,
  reservation_id uuid not null,
  path text not null,
  name text not null,
  mime text not null,
  size integer not null,
  uploaded_by text default 'cliente'::text not null,
  created_at timestamp with time zone default now() not null
);
create table public.reservation_messages (
  id uuid default gen_random_uuid() not null,
  reservation_id uuid not null,
  sender text not null,
  topic text,
  body text not null,
  admin_id uuid,
  customer_read_at timestamp with time zone,
  agency_read_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);
create table public.reservation_travel (
  reservation_id uuid not null,
  revision integer not null,
  public_data jsonb not null,
  encrypted_private text not null,
  private_context uuid not null,
  updated_by uuid not null,
  updated_at timestamp with time zone default now() not null
);
create table public.reservation_travel_history (
  reservation_id uuid not null,
  revision integer not null,
  public_data jsonb not null,
  changed_by uuid not null,
  created_at timestamp with time zone default now() not null
);
create table public.reservations (
  id uuid default gen_random_uuid() not null,
  codigo text default ('VT-'::text || upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 8))) not null,
  quotation_id uuid,
  customer_id uuid,
  cliente_nombre text not null,
  cliente_apellido text,
  cliente_email text,
  cliente_telefono text,
  destino text,
  estado text default 'pendiente'::text not null,
  moneda text default 'USD'::text not null,
  total numeric(12,2) default 0 not null,
  fecha_inicio date,
  fecha_fin date,
  notas text,
  agente_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  comision numeric(12,2),
  segmento text,
  accepted_version_id uuid,
  accepted_snapshot jsonb,
  prerreserva boolean default false not null,
  supplier_status text default 'pendiente'::text not null,
  supplier_reference text,
  promoted_at timestamp with time zone,
  promoted_by uuid,
  cancelacion_motivo text,
  cancelada_en timestamp with time zone,
  cancelada_por uuid
);
create table public.review_invitations (
  id uuid default gen_random_uuid() not null,
  email text not null,
  nombre text not null,
  token text not null,
  estado text default 'enviada'::text not null,
  created_at timestamp with time zone default now() not null,
  used_at timestamp with time zone
);
create table public.reviews (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  nombre text not null,
  email text not null,
  calificacion integer not null,
  texto text not null,
  destino text,
  numero_reserva text,
  foto_path text,
  fecha_original date,
  fuente text default 'formulario'::text not null,
  estado text default 'pendiente'::text not null,
  verificada boolean default false not null,
  updated_at timestamp with time zone default now() not null
);
create table public.service_catalog (
  id uuid default gen_random_uuid() not null,
  tipo text not null,
  nombre text not null,
  operador text,
  destino text,
  descripcion text,
  lugar text,
  duracion text,
  modalidad text,
  inclusiones jsonb default '[]'::jsonb not null,
  cancelacion text,
  cambios text,
  equipaje_incluido text,
  equipaje_adicional text,
  embarque text,
  documentos text,
  notas_internas text,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  creado_por uuid,
  actualizado_por uuid
);
create table public.support_tickets (
  id uuid default gen_random_uuid() not null,
  reservation_id uuid not null,
  asunto text not null,
  mensaje text not null,
  estado text default 'abierto'::text not null,
  respuesta text,
  responded_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);
create table public.travel_deliveries (
  id uuid default gen_random_uuid() not null,
  reservation_id uuid not null,
  revision integer,
  receipt_id uuid,
  recipient text not null,
  status text default 'preparado'::text not null,
  pdf_base64 text not null,
  calendar text,
  provider_id text,
  created_by uuid not null,
  created_at timestamp with time zone default now() not null
);
create table public.trip_feedback (
  id uuid default gen_random_uuid() not null,
  reservation_id uuid not null,
  rating smallint not null,
  comment text default ''::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone
);
create table public.trip_service_requests (
  id uuid default gen_random_uuid() not null,
  reservation_id uuid not null,
  service text not null,
  note text default ''::text not null,
  destination text default ''::text not null,
  trip_start date,
  trip_end date,
  travelers smallint,
  status text default 'nueva'::text not null,
  staff_note text,
  handled_by uuid,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

alter table public.admin_audit_log add constraint admin_audit_log_pkey PRIMARY KEY (id);
alter table public.admins add constraint admins_pkey PRIMARY KEY (user_id);
alter table public.airline_catalog add constraint airline_catalog_pkey PRIMARY KEY (id);
alter table public.airline_fare_presets add constraint airline_fare_presets_pkey PRIMARY KEY (id);
alter table public.blog_posts add constraint blog_posts_pkey PRIMARY KEY (id);
alter table public.customers add constraint customers_pkey PRIMARY KEY (id);
alter table public.destinations add constraint destinations_pkey PRIMARY KEY (id);
alter table public.faqs add constraint faqs_pkey PRIMARY KEY (id);
alter table public.hotel_catalog add constraint hotel_catalog_pkey PRIMARY KEY (id);
alter table public.invoices add constraint invoices_pkey PRIMARY KEY (id);
alter table public.leads add constraint leads_pkey PRIMARY KEY (id);
alter table public.newsletter_subscribers add constraint newsletter_subscribers_pkey PRIMARY KEY (id);
alter table public.packages add constraint packages_pkey PRIMARY KEY (id);
alter table public.passenger_profiles add constraint passenger_profiles_pkey PRIMARY KEY (id);
alter table public.payment_receipts add constraint payment_receipts_pkey PRIMARY KEY (id);
alter table public.payment_recording_requests add constraint payment_recording_requests_pkey PRIMARY KEY (request_id);
alter table public.payments add constraint payments_pkey PRIMARY KEY (id);
alter table public.portal_otps add constraint portal_otps_pkey PRIMARY KEY (id);
alter table public.promo_spins add constraint promo_spins_pkey PRIMARY KEY (id);
alter table public.quotation_items add constraint quotation_items_pkey PRIMARY KEY (id);
alter table public.quotation_shares add constraint quotation_shares_pkey PRIMARY KEY (id);
alter table public.quotation_versions add constraint quotation_versions_pkey PRIMARY KEY (id);
alter table public.quotations add constraint quotations_pkey PRIMARY KEY (id);
alter table public.rate_limits add constraint rate_limits_pkey PRIMARY KEY (bucket);
alter table public.reservation_items add constraint reservation_items_pkey PRIMARY KEY (id);
alter table public.reservation_message_attachments add constraint reservation_message_attachments_pkey PRIMARY KEY (id);
alter table public.reservation_messages add constraint reservation_messages_pkey PRIMARY KEY (id);
alter table public.reservation_travel add constraint reservation_travel_pkey PRIMARY KEY (reservation_id);
alter table public.reservation_travel_history add constraint reservation_travel_history_pkey PRIMARY KEY (reservation_id, revision);
alter table public.reservations add constraint reservations_pkey PRIMARY KEY (id);
alter table public.review_invitations add constraint review_invitations_pkey PRIMARY KEY (id);
alter table public.reviews add constraint reviews_pkey PRIMARY KEY (id);
alter table public.service_catalog add constraint service_catalog_pkey PRIMARY KEY (id);
alter table public.support_tickets add constraint support_tickets_pkey PRIMARY KEY (id);
alter table public.travel_deliveries add constraint travel_deliveries_pkey PRIMARY KEY (id);
alter table public.trip_feedback add constraint trip_feedback_pkey PRIMARY KEY (id);
alter table public.trip_service_requests add constraint trip_service_requests_pkey PRIMARY KEY (id);
alter table public.blog_posts add constraint blog_posts_slug_key UNIQUE (slug);
alter table public.destinations add constraint destinations_slug_key UNIQUE (slug);
alter table public.invoices add constraint invoices_numero_key UNIQUE (numero);
alter table public.newsletter_subscribers add constraint newsletter_subscribers_email_key UNIQUE (email);
alter table public.packages add constraint packages_slug_key UNIQUE (slug);
alter table public.payment_receipts add constraint payment_receipts_number_key UNIQUE (number);
alter table public.payment_receipts add constraint payment_receipts_payment_id_key UNIQUE (payment_id);
alter table public.payment_recording_requests add constraint payment_recording_requests_payment_id_key UNIQUE (payment_id);
alter table public.promo_spins add constraint promo_spins_code_key UNIQUE (code);
alter table public.quotation_shares add constraint quotation_shares_token_hash_key UNIQUE (token_hash);
alter table public.quotation_versions add constraint quotation_versions_quotation_id_version_key UNIQUE (quotation_id, version);
alter table public.quotations add constraint quotations_codigo_key UNIQUE (codigo);
alter table public.reservation_message_attachments add constraint reservation_message_attachments_path_key UNIQUE (path);
alter table public.reservation_messages add constraint reservation_messages_id_reservation_key UNIQUE (id, reservation_id);
alter table public.reservations add constraint reservations_codigo_key UNIQUE (codigo);
alter table public.review_invitations add constraint review_invitations_token_key UNIQUE (token);
alter table public.travel_deliveries add constraint travel_deliveries_receipt_id_key UNIQUE (receipt_id);
alter table public.travel_deliveries add constraint travel_deliveries_reservation_id_revision_key UNIQUE (reservation_id, revision);
alter table public.trip_feedback add constraint trip_feedback_reservation_id_key UNIQUE (reservation_id);
alter table public.admin_audit_log add constraint admin_audit_log_action_check CHECK (((action ~ '^[a-z_]+\.[a-z_]+$'::text) AND (length(action) <= 80)));
alter table public.admin_audit_log add constraint admin_audit_log_details_check CHECK ((pg_column_size(details) <= 4096));
alter table public.admin_audit_log add constraint admin_audit_log_entity_check CHECK ((entity = ANY (ARRAY['quotation'::text, 'reservation'::text, 'invoice'::text, 'payment'::text, 'receipt'::text, 'travel'::text, 'admin'::text, 'passenger_profile'::text])));
alter table public.admin_audit_log add constraint admin_audit_log_reference_check CHECK ((length(reference) <= 80));
alter table public.admins add constraint admins_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'agent'::text])));
alter table public.airline_catalog add constraint airline_catalog_iata_check CHECK ((iata ~ '^[A-Z0-9]{2}$'::text));
alter table public.airline_catalog add constraint airline_catalog_icao_check CHECK ((icao ~ '^[A-Z]{3}$'::text));
alter table public.airline_catalog add constraint airline_catalog_nombre_check CHECK (((char_length(btrim(nombre)) >= 1) AND (char_length(btrim(nombre)) <= 120)));
alter table public.airline_catalog add constraint airline_catalog_notas_internas_check CHECK ((char_length(notas_internas) <= 3000));
alter table public.airline_catalog add constraint airline_catalog_operadora_check CHECK ((char_length(operadora) <= 600));
alter table public.airline_catalog add constraint airline_catalog_pais_check CHECK ((char_length(pais) <= 80));
alter table public.airline_fare_presets add constraint airline_fare_presets_aplica_a_check CHECK ((char_length(aplica_a) <= 300));
alter table public.airline_fare_presets add constraint airline_fare_presets_asientos_check CHECK ((char_length(asientos) <= 300));
alter table public.airline_fare_presets add constraint airline_fare_presets_cabina_check CHECK ((char_length(cabina) <= 60));
alter table public.airline_fare_presets add constraint airline_fare_presets_cambios_check CHECK ((char_length(cambios) <= 400));
alter table public.airline_fare_presets add constraint airline_fare_presets_cancelacion_check CHECK ((char_length(cancelacion) <= 400));
alter table public.airline_fare_presets add constraint airline_fare_presets_equipaje_check CHECK (((jsonb_typeof(equipaje) = 'object'::text) AND (pg_column_size(equipaje) <= 8192)));
alter table public.airline_fare_presets add constraint airline_fare_presets_fuente_check CHECK ((char_length(fuente) <= 300));
alter table public.airline_fare_presets add constraint airline_fare_presets_nombre_check CHECK (((char_length(btrim(nombre)) >= 1) AND (char_length(btrim(nombre)) <= 120)));
alter table public.airline_fare_presets add constraint airline_fare_presets_otras_inclusiones_check CHECK ((char_length(otras_inclusiones) <= 600));
alter table public.airline_fare_presets add constraint airline_fare_presets_reembolso_check CHECK ((reembolso = ANY (ARRAY['reembolsable'::text, 'no_reembolsable'::text, 'parcial'::text])));
alter table public.airline_fare_presets add constraint airline_fare_presets_restricciones_check CHECK ((char_length(restricciones) <= 600));
alter table public.airline_fare_presets add constraint airline_fare_presets_tipo_tarifa_check CHECK ((char_length(tipo_tarifa) <= 80));
alter table public.hotel_catalog add constraint hotel_catalog_amenidades_check CHECK ((jsonb_typeof(amenidades) = 'array'::text));
alter table public.hotel_catalog add constraint hotel_catalog_cadena_check CHECK ((char_length(cadena) <= 120));
alter table public.hotel_catalog add constraint hotel_catalog_cancelacion_check CHECK ((char_length(cancelacion) <= 1000));
alter table public.hotel_catalog add constraint hotel_catalog_cargo_resort_check CHECK ((char_length(cargo_resort) <= 300));
alter table public.hotel_catalog add constraint hotel_catalog_ciudad_check CHECK ((char_length(ciudad) <= 120));
alter table public.hotel_catalog add constraint hotel_catalog_descripcion_check CHECK ((char_length(descripcion) <= 2000));
alter table public.hotel_catalog add constraint hotel_catalog_destino_check CHECK ((char_length(destino) <= 160));
alter table public.hotel_catalog add constraint hotel_catalog_direccion_check CHECK ((char_length(direccion) <= 300));
alter table public.hotel_catalog add constraint hotel_catalog_email_check CHECK ((char_length(email) <= 254));
alter table public.hotel_catalog add constraint hotel_catalog_estrellas_check CHECK (((estrellas >= 1) AND (estrellas <= 5)));
alter table public.hotel_catalog add constraint hotel_catalog_fotos_check CHECK ((jsonb_typeof(fotos) = 'array'::text));
alter table public.hotel_catalog add constraint hotel_catalog_habitaciones_check CHECK ((jsonb_typeof(habitaciones) = 'array'::text));
alter table public.hotel_catalog add constraint hotel_catalog_impuestos_check CHECK ((impuestos = ANY (ARRAY['incluidos'::text, 'no_incluidos'::text, 'parcial'::text])));
alter table public.hotel_catalog add constraint hotel_catalog_inclusiones_check CHECK ((jsonb_typeof(inclusiones) = 'array'::text));
alter table public.hotel_catalog add constraint hotel_catalog_json_size CHECK ((((((pg_column_size(fotos) + pg_column_size(amenidades)) + pg_column_size(habitaciones)) + pg_column_size(planes)) + pg_column_size(inclusiones)) <= 131072));
alter table public.hotel_catalog add constraint hotel_catalog_nombre_check CHECK (((char_length(btrim(nombre)) >= 1) AND (char_length(btrim(nombre)) <= 160)));
alter table public.hotel_catalog add constraint hotel_catalog_notas_internas_check CHECK ((char_length(notas_internas) <= 3000));
alter table public.hotel_catalog add constraint hotel_catalog_pais_check CHECK ((char_length(pais) <= 80));
alter table public.hotel_catalog add constraint hotel_catalog_planes_check CHECK ((jsonb_typeof(planes) = 'array'::text));
alter table public.hotel_catalog add constraint hotel_catalog_politicas_check CHECK ((char_length(politicas) <= 1500));
alter table public.hotel_catalog add constraint hotel_catalog_referencia_proveedor_check CHECK ((char_length(referencia_proveedor) <= 160));
alter table public.hotel_catalog add constraint hotel_catalog_sitio_web_check CHECK (((char_length(sitio_web) <= 300) AND (sitio_web ~* '^https://'::text)));
alter table public.hotel_catalog add constraint hotel_catalog_telefono_check CHECK ((char_length(telefono) <= 60));
alter table public.hotel_catalog add constraint hotel_catalog_ubicacion_check CHECK ((char_length(ubicacion) <= 500));
alter table public.invoices add constraint invoices_estado_check CHECK ((estado = ANY (ARRAY['borrador'::text, 'emitida'::text, 'pagada'::text, 'anulada'::text])));
alter table public.invoices add constraint invoices_moneda_check CHECK ((moneda = ANY (ARRAY['USD'::text, 'HNL'::text])));
alter table public.leads add constraint leads_estado_check CHECK ((estado = ANY (ARRAY['nuevo'::text, 'contactado'::text, 'ganado'::text, 'perdido'::text, 'cerrado'::text])));
alter table public.passenger_profiles add constraint passenger_profiles_apellidos_check CHECK (((char_length(btrim(apellidos)) >= 1) AND (char_length(btrim(apellidos)) <= 120)));
alter table public.passenger_profiles add constraint passenger_profiles_categoria_check CHECK ((categoria = ANY (ARRAY['adulto'::text, 'nino'::text, 'infante'::text])));
alter table public.passenger_profiles add constraint passenger_profiles_check CHECK (((pasaporte_path IS NULL) OR (pasaporte_borrar_despues IS NOT NULL)));
alter table public.passenger_profiles add constraint passenger_profiles_documento_final_check CHECK ((documento_final ~ '^[A-Z0-9]{0,4}$'::text));
alter table public.passenger_profiles add constraint passenger_profiles_foto_path_check CHECK ((foto_path ~ '^[0-9a-f-]{36}/foto-[0-9a-f]{32}\.jpg$'::text));
alter table public.passenger_profiles add constraint passenger_profiles_nacionalidad_check CHECK ((char_length(nacionalidad) <= 60));
alter table public.passenger_profiles add constraint passenger_profiles_nombre_check CHECK (((char_length(btrim(nombre)) >= 1) AND (char_length(btrim(nombre)) <= 120)));
alter table public.passenger_profiles add constraint passenger_profiles_otros_nombres_check CHECK ((char_length(otros_nombres) <= 120));
alter table public.passenger_profiles add constraint passenger_profiles_pais_emision_check CHECK ((char_length(pais_emision) <= 60));
alter table public.passenger_profiles add constraint passenger_profiles_pasaporte_path_check CHECK ((pasaporte_path ~ '^[0-9a-f-]{36}/pasaporte-[0-9a-f]{32}\.jpg$'::text));
alter table public.passenger_profiles add constraint passenger_profiles_privado_check CHECK ((privado ~ '^v1\.'::text));
alter table public.passenger_profiles add constraint passenger_profiles_tipo_documento_check CHECK ((tipo_documento = ANY (ARRAY['ninguno'::text, 'pasaporte'::text, 'identidad'::text, 'otro'::text])));
alter table public.payments add constraint payments_metodo_check CHECK ((metodo = ANY (ARRAY['tarjeta'::text, 'transferencia'::text, 'efectivo'::text, 'otro'::text])));
alter table public.payments add constraint payments_moneda_check CHECK ((moneda = ANY (ARRAY['USD'::text, 'HNL'::text])));
alter table public.payments add constraint payments_monto_check CHECK ((((tipo = 'pago'::text) AND (monto > (0)::numeric)) OR ((tipo <> 'pago'::text) AND (monto < (0)::numeric))));
alter table public.payments add constraint payments_movimiento_check CHECK ((((tipo = 'reverso'::text) = (revierte_a IS NOT NULL)) AND ((tipo = 'pago'::text) OR ((char_length(btrim(COALESCE(motivo, ''::text))) >= 3) AND (char_length(btrim(COALESCE(motivo, ''::text))) <= 500)))));
alter table public.payments add constraint payments_tipo_check CHECK ((tipo = ANY (ARRAY['pago'::text, 'reembolso'::text, 'reverso'::text])));
alter table public.portal_otps add constraint portal_otps_attempts_check CHECK ((attempts >= 0));
alter table public.promo_spins add constraint promo_spins_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'usada'::text, 'expirada'::text])));
alter table public.quotation_items add constraint quotation_items_cantidad_check CHECK ((cantidad > 0));
alter table public.quotation_items add constraint quotation_items_tipo_check CHECK (((tipo IS NULL) OR (tipo = ANY (ARRAY['vuelo'::text, 'hotel'::text, 'tour'::text, 'traslado'::text, 'paquete'::text, 'otro'::text, 'Tarifa aérea'::text, 'Impuestos y tasas'::text, 'Hotel'::text, 'Ferry'::text, 'Paquete'::text, 'Traslado'::text, 'Tour'::text, 'Seguro'::text, 'Asistencia'::text, 'Equipaje'::text, 'Cargo por servicio'::text, 'Descuento'::text, 'Otro'::text]))));
alter table public.quotation_shares add constraint quotation_shares_aperturas_check CHECK ((aperturas >= 0));
alter table public.quotation_shares add constraint quotation_shares_canal_check CHECK ((canal = ANY (ARRAY['whatsapp_manual'::text, 'whatsapp_api'::text, 'correo'::text])));
alter table public.quotation_shares add constraint quotation_shares_check CHECK (((expira_en > created_at) AND (expira_en <= (created_at + '90 days'::interval))));
alter table public.quotation_shares add constraint quotation_shares_estado_check CHECK ((estado = ANY (ARRAY['preparado'::text, 'confirmado'::text, 'cancelado'::text, 'revocado'::text, 'enviado'::text, 'entregado'::text, 'leido'::text, 'fallido'::text])));
alter table public.quotation_shares add constraint quotation_shares_mensaje_check CHECK ((char_length(mensaje) <= 1000));
alter table public.quotation_shares add constraint quotation_shares_plantilla_check CHECK ((char_length(plantilla) <= 60));
alter table public.quotation_shares add constraint quotation_shares_telefono_check CHECK ((telefono ~ '^\+[1-9][0-9]{7,14}$'::text));
alter table public.quotation_shares add constraint quotation_shares_token_hash_check CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text));
alter table public.quotation_versions add constraint quotation_versions_version_check CHECK ((version > 0));
alter table public.quotations add constraint quotations_detalles_size CHECK ((pg_column_size(detalles) <= 262144));
alter table public.quotations add constraint quotations_estado_check CHECK ((estado = ANY (ARRAY['borrador'::text, 'enviada'::text, 'aceptada'::text, 'rechazada'::text, 'expirada'::text, 'reemplazada'::text])));
alter table public.quotations add constraint quotations_moneda_check CHECK ((moneda = ANY (ARRAY['USD'::text, 'HNL'::text])));
alter table public.quotations add constraint quotations_rechazo_motivo CHECK (((estado <> 'rechazada'::text) OR ((char_length(btrim(COALESCE(motivo_rechazo, ''::text))) >= 3) AND (char_length(btrim(COALESCE(motivo_rechazo, ''::text))) <= 500)))) NOT VALID;
alter table public.quotations add constraint quotations_reemplazo CHECK ((((estado = 'reemplazada'::text) = (reemplazada_por IS NOT NULL)) AND ((enmienda_de IS NULL) OR (enmienda_de <> id)))) NOT VALID;
alter table public.quotations add constraint quotations_tipo_check CHECK ((tipo = ANY (ARRAY['general'::text, 'vuelo'::text, 'hotel'::text, 'ferry'::text, 'paquete'::text, 'combinado'::text])));
alter table public.quotations add constraint quotations_version_check CHECK ((version >= 0));
alter table public.reservation_items add constraint reservation_items_cantidad_check CHECK ((cantidad > 0));
alter table public.reservation_message_attachments add constraint reservation_message_attachments_check CHECK ((split_part(path, '/'::text, 1) = (reservation_id)::text));
alter table public.reservation_message_attachments add constraint reservation_message_attachments_mime_check CHECK ((mime = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'application/pdf'::text])));
alter table public.reservation_message_attachments add constraint reservation_message_attachments_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120)));
alter table public.reservation_message_attachments add constraint reservation_message_attachments_path_check CHECK ((path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/mensajes/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'::text));
alter table public.reservation_message_attachments add constraint reservation_message_attachments_size_check CHECK (((size >= 1) AND (size <= 4194304)));
alter table public.reservation_message_attachments add constraint reservation_message_attachments_uploaded_by_check CHECK ((uploaded_by = ANY (ARRAY['cliente'::text, 'agencia'::text])));
alter table public.reservation_messages add constraint reservation_messages_body_text_check CHECK (((char_length(body) <= 2000) AND ((sender = 'cliente'::text) OR (char_length(btrim(body)) >= 1))));
alter table public.reservation_messages add constraint reservation_messages_check CHECK (((sender = 'agencia'::text) = (admin_id IS NOT NULL)));
alter table public.reservation_messages add constraint reservation_messages_sender_check CHECK ((sender = ANY (ARRAY['cliente'::text, 'agencia'::text])));
alter table public.reservation_messages add constraint reservation_messages_topic_check CHECK (((topic IS NULL) OR (topic = ANY (ARRAY['vuelo'::text, 'hotel'::text, 'documentos'::text, 'cambios'::text, 'pagos'::text, 'otro'::text]))));
alter table public.reservation_travel add constraint reservation_travel_revision_check CHECK ((revision > 0));
alter table public.reservations add constraint reservations_cancelacion_motivo CHECK (((estado <> 'cancelada'::text) OR ((char_length(btrim(COALESCE(cancelacion_motivo, ''::text))) >= 3) AND (char_length(btrim(COALESCE(cancelacion_motivo, ''::text))) <= 500)))) NOT VALID;
alter table public.reservations add constraint reservations_comision_check CHECK (((comision IS NULL) OR (comision >= (0)::numeric)));
alter table public.reservations add constraint reservations_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'confirmada'::text, 'en_curso'::text, 'completada'::text, 'cancelada'::text])));
alter table public.reservations add constraint reservations_moneda_check CHECK ((moneda = ANY (ARRAY['USD'::text, 'HNL'::text])));
alter table public.reservations add constraint reservations_supplier_status_check CHECK ((supplier_status = ANY (ARRAY['pendiente'::text, 'parcial'::text, 'confirmada'::text, 'emitida'::text])));
alter table public.review_invitations add constraint review_invitations_estado_check CHECK ((estado = ANY (ARRAY['enviada'::text, 'usada'::text])));
alter table public.reviews add constraint reviews_calificacion_check CHECK (((calificacion >= 1) AND (calificacion <= 5)));
alter table public.service_catalog add constraint service_catalog_cambios_check CHECK ((char_length(cambios) <= 400));
alter table public.service_catalog add constraint service_catalog_cancelacion_check CHECK ((char_length(cancelacion) <= 800));
alter table public.service_catalog add constraint service_catalog_descripcion_check CHECK ((char_length(descripcion) <= 400));
alter table public.service_catalog add constraint service_catalog_destino_check CHECK ((char_length(destino) <= 160));
alter table public.service_catalog add constraint service_catalog_documentos_check CHECK ((char_length(documentos) <= 400));
alter table public.service_catalog add constraint service_catalog_duracion_check CHECK ((char_length(duracion) <= 80));
alter table public.service_catalog add constraint service_catalog_embarque_check CHECK ((char_length(embarque) <= 400));
alter table public.service_catalog add constraint service_catalog_equipaje_adicional_check CHECK ((char_length(equipaje_adicional) <= 300));
alter table public.service_catalog add constraint service_catalog_equipaje_incluido_check CHECK ((char_length(equipaje_incluido) <= 300));
alter table public.service_catalog add constraint service_catalog_inclusiones_check CHECK (((jsonb_typeof(inclusiones) = 'array'::text) AND (pg_column_size(inclusiones) <= 16384)));
alter table public.service_catalog add constraint service_catalog_lugar_check CHECK ((char_length(lugar) <= 200));
alter table public.service_catalog add constraint service_catalog_modalidad_check CHECK ((modalidad = ANY (ARRAY['compartido'::text, 'privado'::text])));
alter table public.service_catalog add constraint service_catalog_nombre_check CHECK (((char_length(btrim(nombre)) >= 1) AND (char_length(btrim(nombre)) <= 160)));
alter table public.service_catalog add constraint service_catalog_notas_internas_check CHECK ((char_length(notas_internas) <= 3000));
alter table public.service_catalog add constraint service_catalog_operador_check CHECK ((char_length(operador) <= 120));
alter table public.service_catalog add constraint service_catalog_tipo_check CHECK ((tipo = ANY (ARRAY['ferry'::text, 'traslado'::text, 'tour'::text, 'actividad'::text, 'seguro'::text, 'asistencia'::text, 'otro'::text])));
alter table public.support_tickets add constraint support_tickets_asunto_check CHECK (((char_length(asunto) >= 1) AND (char_length(asunto) <= 160)));
alter table public.support_tickets add constraint support_tickets_estado_check CHECK ((estado = ANY (ARRAY['abierto'::text, 'en_revision'::text, 'resuelto'::text, 'cerrado'::text])));
alter table public.support_tickets add constraint support_tickets_mensaje_check CHECK (((char_length(mensaje) >= 1) AND (char_length(mensaje) <= 4000)));
alter table public.support_tickets add constraint support_tickets_respuesta_check CHECK (((respuesta IS NULL) OR (char_length(respuesta) <= 4000)));
alter table public.travel_deliveries add constraint travel_deliveries_check CHECK ((((revision IS NOT NULL) AND (receipt_id IS NULL)) OR ((revision IS NULL) AND (receipt_id IS NOT NULL))));
alter table public.travel_deliveries add constraint travel_deliveries_status_check CHECK ((status = ANY (ARRAY['preparado'::text, 'aceptado'::text, 'fallido'::text, 'incierto'::text])));
alter table public.trip_feedback add constraint trip_feedback_comment_check CHECK ((char_length(comment) <= 1000));
alter table public.trip_feedback add constraint trip_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
alter table public.trip_service_requests add constraint trip_service_requests_destination_check CHECK ((char_length(destination) <= 160));
alter table public.trip_service_requests add constraint trip_service_requests_note_check CHECK ((char_length(note) <= 600));
alter table public.trip_service_requests add constraint trip_service_requests_service_check CHECK ((service = ANY (ARRAY['hotel'::text, 'traslado'::text, 'auto'::text, 'tour'::text, 'seguro'::text, 'equipaje'::text, 'vuelo'::text, 'a_medida'::text])));
alter table public.trip_service_requests add constraint trip_service_requests_staff_note_check CHECK (((staff_note IS NULL) OR (char_length(staff_note) <= 600)));
alter table public.trip_service_requests add constraint trip_service_requests_status_check CHECK ((status = ANY (ARRAY['nueva'::text, 'en_cotizacion'::text, 'cotizada'::text, 'confirmada'::text, 'cerrada'::text])));
alter table public.trip_service_requests add constraint trip_service_requests_travelers_check CHECK (((travelers IS NULL) OR ((travelers >= 0) AND (travelers <= 99))));
alter table public.admins add constraint admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.airline_fare_presets add constraint airline_fare_presets_airline_id_fkey FOREIGN KEY (airline_id) REFERENCES airline_catalog(id) ON DELETE CASCADE;
alter table public.customers add constraint customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.invoices add constraint invoices_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id);
alter table public.packages add constraint packages_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL;
alter table public.passenger_profiles add constraint passenger_profiles_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id);
alter table public.passenger_profiles add constraint passenger_profiles_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;
alter table public.payment_receipts add constraint payment_receipts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id);
alter table public.payment_receipts add constraint payment_receipts_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id);
alter table public.payment_recording_requests add constraint payment_recording_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.payment_recording_requests add constraint payment_recording_requests_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id);
alter table public.payment_recording_requests add constraint payment_recording_requests_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id);
alter table public.payments add constraint payments_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id);
alter table public.payments add constraint payments_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE;
alter table public.payments add constraint payments_revierte_a_fkey FOREIGN KEY (revierte_a) REFERENCES payments(id);
alter table public.portal_otps add constraint portal_otps_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE;
alter table public.quotation_items add constraint quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;
alter table public.quotation_shares add constraint quotation_shares_confirmado_por_fkey FOREIGN KEY (confirmado_por) REFERENCES auth.users(id);
alter table public.quotation_shares add constraint quotation_shares_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id);
alter table public.quotation_shares add constraint quotation_shares_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;
alter table public.quotation_shares add constraint quotation_shares_version_id_fkey FOREIGN KEY (version_id) REFERENCES quotation_versions(id);
alter table public.quotation_versions add constraint quotation_versions_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;
alter table public.quotations add constraint quotations_accepted_version_id_fkey FOREIGN KEY (accepted_version_id) REFERENCES quotation_versions(id);
alter table public.quotations add constraint quotations_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES auth.users(id);
alter table public.quotations add constraint quotations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);
alter table public.quotations add constraint quotations_enmienda_de_fkey FOREIGN KEY (enmienda_de) REFERENCES quotations(id);
alter table public.quotations add constraint quotations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
alter table public.quotations add constraint quotations_reemplazada_por_fkey FOREIGN KEY (reemplazada_por) REFERENCES quotations(id);
alter table public.quotations add constraint quotations_sent_version_id_fkey FOREIGN KEY (sent_version_id) REFERENCES quotation_versions(id);
alter table public.reservation_items add constraint reservation_items_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE;
alter table public.reservation_message_attachments add constraint reservation_message_attachments_message_id_reservation_id_fkey FOREIGN KEY (message_id, reservation_id) REFERENCES reservation_messages(id, reservation_id) ON DELETE RESTRICT;
alter table public.reservation_message_attachments add constraint reservation_message_attachments_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE RESTRICT;
alter table public.reservation_messages add constraint reservation_messages_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE RESTRICT;
alter table public.reservation_travel add constraint reservation_travel_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id);
alter table public.reservation_travel_history add constraint reservation_travel_history_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id);
alter table public.reservations add constraint reservations_accepted_version_id_fkey FOREIGN KEY (accepted_version_id) REFERENCES quotation_versions(id);
alter table public.reservations add constraint reservations_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES auth.users(id);
alter table public.reservations add constraint reservations_cancelada_por_fkey FOREIGN KEY (cancelada_por) REFERENCES auth.users(id);
alter table public.reservations add constraint reservations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);
alter table public.reservations add constraint reservations_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES quotations(id);
alter table public.support_tickets add constraint support_tickets_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE;
alter table public.travel_deliveries add constraint travel_deliveries_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES payment_receipts(id);
alter table public.travel_deliveries add constraint travel_deliveries_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id);
alter table public.travel_deliveries add constraint travel_deliveries_reservation_id_revision_fkey FOREIGN KEY (reservation_id, revision) REFERENCES reservation_travel_history(reservation_id, revision);
alter table public.trip_feedback add constraint trip_feedback_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE RESTRICT;
alter table public.trip_service_requests add constraint trip_service_requests_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE RESTRICT;

CREATE INDEX admin_audit_log_at_idx ON public.admin_audit_log USING btree (at DESC);
CREATE INDEX admin_audit_log_entity_idx ON public.admin_audit_log USING btree (entity, entity_id, at DESC);
CREATE UNIQUE INDEX airline_catalog_iata_unique ON public.airline_catalog USING btree (iata) WHERE ((iata IS NOT NULL) AND activo);
CREATE UNIQUE INDEX airline_catalog_nombre_unique ON public.airline_catalog USING btree (lower(btrim(nombre)));
CREATE INDEX airline_fare_presets_airline_idx ON public.airline_fare_presets USING btree (airline_id);
CREATE UNIQUE INDEX airline_fare_presets_nombre_unique ON public.airline_fare_presets USING btree (airline_id, lower(btrim(nombre)));
CREATE INDEX hotel_catalog_activo_idx ON public.hotel_catalog USING btree (activo, nombre);
CREATE UNIQUE INDEX hotel_catalog_nombre_ciudad_unique ON public.hotel_catalog USING btree (lower(btrim(nombre)), lower(COALESCE(btrim(ciudad), ''::text)));
CREATE UNIQUE INDEX invoices_commercial_active_unique ON public.invoices USING btree (reservation_id) WHERE ((commercial_snapshot IS NOT NULL) AND (estado <> 'anulada'::text));
CREATE INDEX leads_estado_created_idx ON public.leads USING btree (estado, created_at DESC);
CREATE UNIQUE INDEX leads_referencia_key ON public.leads USING btree (referencia) WHERE (referencia IS NOT NULL);
CREATE INDEX passenger_profiles_customer_idx ON public.passenger_profiles USING btree (customer_id);
CREATE INDEX passenger_profiles_retention_idx ON public.passenger_profiles USING btree (pasaporte_borrar_despues) WHERE (pasaporte_path IS NOT NULL);
CREATE UNIQUE INDEX payments_revierte_a_unique ON public.payments USING btree (revierte_a) WHERE (revierte_a IS NOT NULL);
CREATE INDEX portal_otps_reservation_created_idx ON public.portal_otps USING btree (reservation_id, created_at DESC);
CREATE INDEX quotation_shares_quotation_idx ON public.quotation_shares USING btree (quotation_id, created_at DESC);
CREATE INDEX quotations_enmienda_de_idx ON public.quotations USING btree (enmienda_de) WHERE (enmienda_de IS NOT NULL);
CREATE INDEX quotations_lead_id_idx ON public.quotations USING btree (lead_id);
CREATE INDEX quotations_ref_creacion_idx ON public.quotations USING btree (((detalles ->> 'refCreacion'::text))) WHERE (detalles ? 'refCreacion'::text);
CREATE INDEX quotations_vence_en_idx ON public.quotations USING btree (vence_en);
CREATE INDEX reservation_message_attachments_message_idx ON public.reservation_message_attachments USING btree (message_id);
CREATE INDEX reservation_message_attachments_reservation_idx ON public.reservation_message_attachments USING btree (reservation_id, created_at);
CREATE INDEX reservation_messages_reservation_created_idx ON public.reservation_messages USING btree (reservation_id, created_at);
CREATE INDEX reservation_messages_unread_agency_idx ON public.reservation_messages USING btree (reservation_id) WHERE ((sender = 'cliente'::text) AND (agency_read_at IS NULL));
CREATE INDEX reservations_created_at_idx ON public.reservations USING btree (created_at DESC);
CREATE INDEX reservations_fecha_inicio_idx ON public.reservations USING btree (fecha_inicio);
CREATE UNIQUE INDEX reservations_quotation_unique ON public.reservations USING btree (quotation_id) WHERE (quotation_id IS NOT NULL);
CREATE INDEX review_invitations_estado_idx ON public.review_invitations USING btree (estado, created_at DESC);
CREATE INDEX service_catalog_tipo_idx ON public.service_catalog USING btree (tipo, activo, nombre);
CREATE UNIQUE INDEX service_catalog_unique ON public.service_catalog USING btree (tipo, lower(btrim(nombre)), lower(COALESCE(btrim(operador), ''::text)));
CREATE INDEX support_tickets_estado_created_idx ON public.support_tickets USING btree (estado, created_at DESC);
CREATE INDEX support_tickets_reservation_created_idx ON public.support_tickets USING btree (reservation_id, created_at DESC);
CREATE INDEX trip_service_requests_reservation_idx ON public.trip_service_requests USING btree (reservation_id, created_at DESC);
CREATE INDEX trip_service_requests_status_idx ON public.trip_service_requests USING btree (status, created_at DESC);

create view public.reviews_publicas as
SELECT id,
    nombre,
    calificacion,
    texto,
    destino,
    foto_path,
    COALESCE(fecha_original, created_at::date) AS fecha,
    verificada,
    created_at
   FROM reviews
  WHERE estado = 'aprobada'::text;
create view public.reviews_resumen as
SELECT count(*)::integer AS total,
    round(avg(calificacion), 1) AS promedio,
    count(*) FILTER (WHERE calificacion = 5)::integer AS c5,
    count(*) FILTER (WHERE calificacion = 4)::integer AS c4,
    count(*) FILTER (WHERE calificacion = 3)::integer AS c3,
    count(*) FILTER (WHERE calificacion = 2)::integer AS c2,
    count(*) FILTER (WHERE calificacion = 1)::integer AS c1
   FROM reviews
  WHERE estado = 'aprobada'::text;

CREATE OR REPLACE FUNCTION public.accept_quotation(p_id uuid, p_version_id uuid, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q public.quotations; v public.quotation_versions;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict q from public.quotations where id = p_id for update;
  if q.estado = 'aceptada' and q.accepted_version_id = p_version_id then return p_version_id; end if;
  if q.estado='aceptada' and q.accepted_version_id is null and q.version_aceptada is not null then
    select * into strict v from public.quotation_versions where id=p_version_id and quotation_id=p_id and version=q.version_aceptada;
    if length(btrim(coalesce(p_notes,''))) < 5 then raise exception 'Registre la referencia de revisión de la aceptación anterior.' using errcode='23514'; end if;
    update public.quotations set accepted_version_id=v.id,aceptada_en=now(),aceptada_por=auth.uid(),aceptacion_notas='Revisión de aceptación anterior: ' || p_notes where id=p_id;
    return v.id;
  end if;
  if q.estado <> 'enviada' then raise exception 'Solo puede aceptar una cotización enviada.' using errcode = '23514'; end if;
  select * into strict v from public.quotation_versions where id = p_version_id and quotation_id = p_id;
  if (q.sent_version_id is not null and q.sent_version_id is distinct from p_version_id)
    or (q.sent_version_id is null and (length(btrim(coalesce(p_notes,''))) < 5 or v.snapshot->>'origen' = 'aceptacion')) then
    raise exception 'Revise la versión enviada y registre la referencia del envío anterior.' using errcode = '23514';
  end if;
  if coalesce((v.snapshot->'quotation'->>'vence_en')::timestamptz,
      ((v.snapshot->'quotation'->>'validez')::date + time '23:59:59') at time zone 'America/Tegucigalpa') < now() then
    raise exception 'La versión enviada venció. Prepare una nueva cotización.' using errcode = '23514';
  end if;
  if jsonb_array_length(v.snapshot->'items') < 1 or length(coalesce(p_notes,'')) > 2000 then
    raise exception 'Versión o referencia inválida.' using errcode = '23514';
  end if;
  if (v.snapshot#>>'{quotation,total}')::numeric is null or (v.snapshot#>>'{quotation,total}')::numeric < 0
    or (v.snapshot#>>'{quotation,total}')::numeric is distinct from
      (select sum(case when lower(btrim(x->>'tipo'))='descuento' then -1 else 1 end * round((x->>'cantidad')::numeric*(x->>'precio_unitario')::numeric,2)) from jsonb_array_elements(v.snapshot->'items') x)
    or exists(select 1 from jsonb_array_elements(v.snapshot->'items') x where coalesce((x->>'cantidad')::numeric,0)<=0 or coalesce((x->>'precio_unitario')::numeric,-1)<0) then
    raise exception 'Revise los importes de la versión enviada antes de aceptarla.' using errcode='23514';
  end if;
  update public.quotations set estado = 'aceptada', version_aceptada = v.version,
    accepted_version_id = v.id, aceptada_en = now(), aceptada_por = auth.uid(), aceptacion_notas = nullif(btrim(p_notes),'') where id = p_id;
  -- step 3: an accepted amendment replaces its original (and moves its reservation) in this same transaction.
  perform public.apply_quotation_amendment(p_id);
  return v.id;
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_audit_log_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception 'El registro de actividad no se puede modificar.' using errcode = '23514';
end; $function$;

CREATE OR REPLACE FUNCTION public.apply_quotation_amendment(p_amendment uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare a public.quotations; o public.quotations; v public.quotation_versions; r public.reservations; s jsonb; amount numeric; paid numeric;
  start_date date; end_date date;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict a from public.quotations where id = p_amendment;
  if a.enmienda_de is null then return null; end if;
  if a.estado <> 'aceptada' or a.accepted_version_id is null then
    raise exception 'Acepte la enmienda antes de aplicarla.' using errcode = '23514'; end if;
  select * into strict o from public.quotations where id = a.enmienda_de for update;
  if o.estado = 'reemplazada' and o.reemplazada_por = a.id then
    return (select id from public.reservations where quotation_id = a.id);
  end if;
  if o.estado <> 'aceptada' then
    raise exception 'La cotización % ya no está vigente; enmiende la versión vigente.', o.codigo using errcode = '23514'; end if;
  select * into strict v from public.quotation_versions where id = a.accepted_version_id and quotation_id = a.id;
  s := v.snapshot->'quotation';
  amount := (s->>'total')::numeric;
  select * into r from public.reservations where quotation_id = o.id for update;
  if r.id is not null then
    if r.estado in ('cancelada','completada') then
      raise exception 'La reserva % está %: no admite enmiendas.', r.codigo, r.estado using errcode = '23514'; end if;
    if s->>'moneda' is distinct from r.moneda then
      raise exception 'La enmienda debe estar en %, la moneda de la reserva %.', r.moneda, r.codigo using errcode = '23514'; end if;
    if a.customer_id is distinct from r.customer_id then
      raise exception 'La enmienda debe ser del mismo cliente que la reserva %.', r.codigo using errcode = '23514'; end if;
    select coalesce(sum(monto), 0) into paid from public.payments where reservation_id = r.id;
    if paid > amount then
      raise exception 'El cliente ya pagó % %, más que el nuevo total de % %. Registre primero la devolución.', paid, r.moneda, amount, r.moneda using errcode = '23514'; end if;
  end if;

  update public.quotations set estado = 'reemplazada', reemplazada_por = a.id, reemplazada_en = now() where id = o.id;
  if r.id is null then return null; end if;

  start_date := nullif(s#>>'{detalles,fechaSalida}','')::date;
  end_date := nullif(s#>>'{detalles,fechaRegreso}','')::date;
  update public.reservations set quotation_id = a.id, accepted_version_id = v.id, accepted_snapshot = v.snapshot, total = amount,
    destino = s->>'destino', fecha_inicio = coalesce(start_date, r.fecha_inicio), fecha_fin = coalesce(end_date, r.fecha_fin)
    where id = r.id;
  perform set_config('viatour.amending_reservation', r.id::text, true);
  delete from public.reservation_items where reservation_id = r.id;
  perform set_config('viatour.amending_reservation', '', true);
  insert into public.reservation_items(reservation_id,descripcion,tipo,cantidad,precio_unitario,orden)
    select r.id,x->>'descripcion',x->>'tipo',(x->>'cantidad')::numeric,(x->>'precio_unitario')::numeric,(n-1)::int
    from jsonb_array_elements(v.snapshot->'items') with ordinality as lines(x,n);
  return r.id;
end; $function$;

CREATE OR REPLACE FUNCTION public.audit_invoice_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), 'invoice.created', 'invoice', new.id, new.numero, jsonb_build_object('estado', new.estado, 'total', new.total, 'moneda', new.moneda, 'reservation_id', new.reservation_id));
  elsif new.estado is distinct from old.estado then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), case new.estado when 'anulada' then 'invoice.annulled' when 'pagada' then 'invoice.paid' when 'emitida' then 'invoice.issued' else 'invoice.status_changed' end,
        'invoice', new.id, new.numero, jsonb_build_object('from', old.estado, 'to', new.estado, 'reservation_id', new.reservation_id));
  end if;
  return null;
end; $function$;

CREATE OR REPLACE FUNCTION public.audit_passenger_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare changed text[];
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), 'passenger.created', 'passenger_profile', new.id, jsonb_build_object('customer_id', new.customer_id));
  elsif tg_op = 'DELETE' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), 'passenger.deleted', 'passenger_profile', old.id, jsonb_build_object('customer_id', old.customer_id));
  else
    select array_agg(key order by key) into changed from jsonb_each(to_jsonb(new)) n
      where key not in ('updated_at') and n.value is distinct from to_jsonb(old)->key;
    if changed is not null then
      insert into public.admin_audit_log (actor, action, entity, entity_id, details)
        values (auth.uid(), case when 'pasaporte_path' = any(changed) and new.pasaporte_path is null then 'passenger.passport_image_removed' else 'passenger.updated' end,
          'passenger_profile', new.id, jsonb_build_object('customer_id', new.customer_id, 'campos', to_jsonb(changed)));
    end if;
  end if;
  return null;
end; $function$;

CREATE OR REPLACE FUNCTION public.audit_payment_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), case new.tipo when 'reembolso' then 'payment.refunded' when 'reverso' then 'payment.reversed' else 'payment.recorded' end, 'payment', new.id,
        jsonb_strip_nulls(jsonb_build_object('reservation_id', new.reservation_id, 'monto', new.monto, 'moneda', new.moneda, 'metodo', new.metodo, 'fecha_pago', new.fecha_pago, 'tipo', new.tipo, 'revierte_a', new.revierte_a)));
  elsif tg_op = 'UPDATE' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), 'payment.edited', 'payment', new.id, jsonb_build_object('reservation_id', new.reservation_id, 'monto', jsonb_build_array(old.monto, new.monto), 'moneda', jsonb_build_array(old.moneda, new.moneda), 'fecha_pago', jsonb_build_array(old.fecha_pago, new.fecha_pago)));
  else
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), 'payment.deleted', 'payment', old.id, jsonb_build_object('reservation_id', old.reservation_id, 'monto', old.monto, 'moneda', old.moneda, 'fecha_pago', old.fecha_pago));
  end if;
  return null;
end; $function$;

CREATE OR REPLACE FUNCTION public.audit_quotation_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), 'quotation.created', 'quotation', new.id, new.codigo, jsonb_build_object('estado', new.estado, 'moneda', new.moneda));
  elsif new.estado is distinct from old.estado or new.sent_version_id is distinct from old.sent_version_id or new.accepted_version_id is distinct from old.accepted_version_id or new.agente_id is distinct from old.agente_id then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), case when new.estado is distinct from old.estado then 'quotation.status_changed' when new.agente_id is distinct from old.agente_id then 'quotation.reassigned' else 'quotation.version_linked' end,
        'quotation', new.id, new.codigo,
        jsonb_strip_nulls(jsonb_build_object('from', old.estado, 'to', new.estado, 'version', new.version,
          'sent_version_id', new.sent_version_id, 'accepted_version_id', new.accepted_version_id,
          'agente_from', case when new.agente_id is distinct from old.agente_id then old.agente_id end,
          'agente_to', case when new.agente_id is distinct from old.agente_id then new.agente_id end)));
  end if;
  return null;
end; $function$;

CREATE OR REPLACE FUNCTION public.audit_quotation_share()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), 'quotation.share_prepared', 'quotation', new.quotation_id, null,
        jsonb_build_object('share_id', new.id, 'canal', new.canal, 'version_id', new.version_id, 'plantilla', new.plantilla));
  elsif new.estado is distinct from old.estado then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), 'quotation.share_' || new.estado, 'quotation', new.quotation_id, null,
        jsonb_build_object('share_id', new.id, 'canal', new.canal, 'version_id', new.version_id, 'from', old.estado));
  end if;
  return null;
end; $function$;

CREATE OR REPLACE FUNCTION public.audit_receipt_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
    values (auth.uid(), 'receipt.created', 'receipt', new.id, new.number, jsonb_build_object('payment_id', new.payment_id, 'reservation_id', new.reservation_id));
  return null;
end; $function$;

CREATE OR REPLACE FUNCTION public.audit_reservation_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare changes jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), 'reservation.created', 'reservation', new.id, new.codigo,
        jsonb_strip_nulls(jsonb_build_object('estado', new.estado, 'prerreserva', new.prerreserva, 'total', new.total, 'moneda', new.moneda, 'quotation_id', new.quotation_id)));
    return null;
  end if;
  if new.estado is distinct from old.estado then changes := changes || jsonb_build_object('estado', jsonb_build_array(old.estado, new.estado)); end if;
  if new.supplier_status is distinct from old.supplier_status then changes := changes || jsonb_build_object('supplier_status', jsonb_build_array(old.supplier_status, new.supplier_status)); end if;
  if new.supplier_reference is distinct from old.supplier_reference then changes := changes || jsonb_build_object('supplier_reference_changed', true); end if;
  if new.prerreserva is distinct from old.prerreserva then changes := changes || jsonb_build_object('prerreserva', jsonb_build_array(old.prerreserva, new.prerreserva)); end if;
  if new.total is distinct from old.total then changes := changes || jsonb_build_object('total', jsonb_build_array(old.total, new.total)); end if;
  if new.fecha_inicio is distinct from old.fecha_inicio or new.fecha_fin is distinct from old.fecha_fin then changes := changes || jsonb_build_object('fechas', jsonb_build_array(jsonb_build_array(old.fecha_inicio, old.fecha_fin), jsonb_build_array(new.fecha_inicio, new.fecha_fin))); end if;
  if new.cliente_apellido is distinct from old.cliente_apellido then changes := changes || jsonb_build_object('portal_access_changed', true); end if;
  if changes <> '{}'::jsonb then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), case when new.estado = 'cancelada' and old.estado <> 'cancelada' then 'reservation.cancelled'
                              when new.estado is distinct from old.estado then 'reservation.status_changed'
                              when new.prerreserva is distinct from old.prerreserva then 'reservation.promoted'
                              when new.supplier_status is distinct from old.supplier_status then 'reservation.supplier_changed'
                              else 'reservation.updated' end,
        'reservation', new.id, new.codigo, changes);
  end if;
  return null;
end; $function$;

CREATE OR REPLACE FUNCTION public.audit_travel_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.admin_audit_log (actor, action, entity, entity_id, details)
    values (auth.uid(), 'travel.revised', 'travel', new.reservation_id, jsonb_build_object('revision', new.revision, 'status', new.public_data->>'status'));
  return null;
end; $function$;

CREATE OR REPLACE FUNCTION public.cancel_reservation(p_id uuid, p_reason text, p_annul_invoices boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.reservations; annulled integer := 0; received numeric;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict r from public.reservations where id = p_id for update;
  if r.estado = 'cancelada' then return jsonb_build_object('estado', 'cancelada', 'ya_cancelada', true); end if;
  if r.estado = 'completada' then raise exception 'Una reserva completada no se cancela.' using errcode = '23514'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then raise exception 'Indique el motivo de la cancelación.' using errcode = '23514'; end if;
  update public.reservations set estado = 'cancelada', cancelacion_motivo = btrim(p_reason), cancelada_en = now(), cancelada_por = auth.uid() where id = r.id;
  if p_annul_invoices then
    update public.invoices set estado = 'anulada' where reservation_id = r.id and estado in ('borrador', 'emitida');
    get diagnostics annulled = row_count;
  end if;
  select coalesce(sum(monto), 0) into received from public.payments where reservation_id = r.id and moneda = r.moneda;
  return jsonb_build_object('estado', 'cancelada', 'facturas_anuladas', annulled, 'recibido', received, 'moneda', r.moneda);
end; $function$;

CREATE OR REPLACE FUNCTION public.catalog_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.creado_por := auth.uid();
  else
    new.created_at := old.created_at;
    new.creado_por := old.creado_por;
  end if;
  new.updated_at := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_quotation_share(p_share uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare s public.quotation_shares; q public.quotations;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict s from public.quotation_shares where id = p_share for update;
  if s.estado = 'confirmado' then return s.version_id; end if;
  if s.estado <> 'preparado' then raise exception 'Este envío ya no está pendiente (%).', s.estado using errcode = '23514'; end if;
  if s.expira_en < now() then raise exception 'El enlace de este envío ya venció. Prepare uno nuevo.' using errcode = '23514'; end if;
  select * into strict q from public.quotations where id = s.quotation_id for update;
  if q.estado not in ('borrador', 'enviada') then
    raise exception 'La cotización está %; ya no se registra como enviada.', q.estado using errcode = '23514'; end if;
  update public.quotation_shares set estado = 'confirmado', confirmado_en = now(), confirmado_por = auth.uid() where id = s.id;
  update public.quotations set estado = 'enviada', sent_version_id = s.version_id where id = q.id;
  return s.version_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.convert_accepted_quotation(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q public.quotations; v public.quotation_versions; s jsonb; r uuid; amount numeric; start_date date; end_date date;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict q from public.quotations where id = p_id for update;
  select id into r from public.reservations where quotation_id = p_id;
  if r is not null then return r; end if;
  if q.estado <> 'aceptada' or q.accepted_version_id is distinct from p_version_id then
    raise exception 'Revise la versión aceptada.' using errcode = '23514'; end if;
  select * into strict v from public.quotation_versions where id = p_version_id and quotation_id = p_id;
  s := v.snapshot->'quotation';
  if q.customer_id is null or q.customer_id::text is distinct from s->>'customer_id' then
    raise exception 'La versión aceptada debe estar vinculada al cliente correcto.' using errcode = '23514'; end if;
  if btrim(coalesce(p_lastname,'')) = '' or length(p_lastname) > 120 or (nullif(btrim(coalesce(s->>'cliente_email','')),'') is not null and btrim(s->>'cliente_email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'Revise el apellido de acceso y el correo del cliente.' using errcode = '23514'; end if;
  if jsonb_typeof(v.snapshot->'items') is distinct from 'array' or jsonb_array_length(v.snapshot->'items') not between 1 and 50 then
    raise exception 'Faltan servicios.' using errcode = '23514'; end if;
  if exists (select 1 from jsonb_array_elements(v.snapshot->'items') x where
    coalesce(x->>'descripcion','') = '' or coalesce((x->>'cantidad')::numeric,0) <= 0 or coalesce((x->>'precio_unitario')::numeric,-1) < 0) then
    raise exception 'Conceptos inválidos.' using errcode = '23514'; end if;
  select sum(case when lower(btrim(x->>'tipo')) = 'descuento' then -1 else 1 end * round((x->>'cantidad')::numeric * (x->>'precio_unitario')::numeric,2))
    into amount from jsonb_array_elements(v.snapshot->'items') x;
  if amount < 0 or amount is distinct from (s->>'total')::numeric or s->>'moneda' not in ('USD','HNL') then
    raise exception 'El total no coincide con la versión aceptada.' using errcode = '23514'; end if;
  start_date := nullif(s#>>'{detalles,fechaSalida}','')::date;
  end_date := nullif(s#>>'{detalles,fechaRegreso}','')::date;
  if start_date is null or end_date is null then
    select coalesce(start_date,min(d::date)), coalesce(end_date,max(d::date)) into start_date,end_date
    from (select value #>> '{}' as d from unnest(array['salidaFecha','llegadaFecha','checkIn','checkOut','fecha','fechaFin']) field cross join lateral jsonb_path_query(s, ('$.detalles.**.' || field)::jsonpath) value) dates
    where d ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
  end if;
  insert into public.reservations(codigo,quotation_id,customer_id,cliente_nombre,cliente_email,cliente_telefono,cliente_apellido,destino,moneda,total,estado,fecha_inicio,fecha_fin,notas,agente_id,accepted_version_id,accepted_snapshot,prerreserva)
    values ('RES-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),q.id,q.customer_id,s->>'cliente_nombre',nullif(btrim(coalesce(s->>'cliente_email','')),''),s->>'cliente_telefono',btrim(p_lastname),s->>'destino',s->>'moneda',amount,'pendiente',start_date,end_date,null,q.agente_id,v.id,v.snapshot,p_prereservation) returning id into r;
  insert into public.reservation_items(reservation_id,descripcion,tipo,cantidad,precio_unitario,orden)
    select r,x->>'descripcion',x->>'tipo',(x->>'cantidad')::numeric,(x->>'precio_unitario')::numeric,(n-1)::int
    from jsonb_array_elements(v.snapshot->'items') with ordinality as lines(x,n);
  return r;
end; $function$;

CREATE OR REPLACE FUNCTION public.convert_quotation_with_passengers(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text, p_public jsonb, p_encrypted text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare result uuid;
begin
 if not public.is_admin() then raise exception 'forbidden';end if;
 if p_public->>'status' is distinct from 'pendiente' then raise exception 'initial_ticketing_pending';end if;
 result:=public.convert_accepted_quotation(p_id,p_version_id,p_prereservation,p_lastname);
 if not exists(select 1 from public.reservation_travel where reservation_id=result) then perform public.save_reservation_travel(result,0,p_public,p_encrypted,p_id);end if;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.create_payment_receipt(p_payment uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare p public.payments; r public.reservations; receipt uuid; paid numeric;
begin
 if not public.is_admin() then raise exception 'forbidden';end if;
 select * into p from public.payments where id=p_payment;
 if not found then raise exception 'payment_not_found';end if;
 select * into r from public.reservations where id=p.reservation_id for update;
 -- All receipt creation on one reservation is serialized; re-read and lock payment after reservation.
 select * into p from public.payments where id=p_payment for update;
 if not found or p.reservation_id<>r.id or coalesce(p.monto,0)<=0 or p.moneda is distinct from r.moneda then raise exception 'invalid_payment_currency_or_amount';end if;
 if p.fecha_pago is null or p.fecha_pago>(now() at time zone 'America/Tegucigalpa')::date then raise exception 'future_payment_cannot_be_receipted';end if;
 select id into receipt from public.payment_receipts where payment_id=p_payment;
 if found then return receipt;end if;
 select coalesce(sum(monto),0) into paid from public.payments where reservation_id=r.id and moneda=r.moneda;
 insert into public.payment_receipts(payment_id,reservation_id,created_by,snapshot) values(p.id,r.id,auth.uid(),jsonb_build_object('customer',r.cliente_nombre,'reservation',r.codigo,'amount',p.monto,'currency',p.moneda,'method',p.metodo,'reference',p.referencia,'date',p.fecha_pago,'balance',r.total-paid)) returning id into receipt;
 return receipt;
end $function$;

CREATE OR REPLACE FUNCTION public.create_quotation_copy(p_source uuid, p_amendment boolean, p_row jsonb, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare src public.quotations; open_code text; new_id uuid; amount numeric;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict src from public.quotations where id = p_source;
  if jsonb_typeof(p_row) is distinct from 'object' or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 50 then
    raise exception 'Copia inválida.' using errcode = '23514'; end if;
  if p_amendment then
    if src.estado = 'reemplazada' then
      raise exception 'La cotización % ya fue reemplazada por %. Enmiende la versión vigente.', src.codigo, (select codigo from public.quotations where id = src.reemplazada_por) using errcode = '23514'; end if;
    if src.estado <> 'aceptada' then
      raise exception 'Solo se enmienda una cotización aceptada; esta todavía se puede editar.' using errcode = '23514'; end if;
    select codigo into open_code from public.quotations where enmienda_de = src.id and estado in ('borrador','enviada') limit 1;
    if open_code is not null then
      raise exception 'Ya existe la enmienda % en curso. Ábrala para continuar.', open_code using errcode = '23514'; end if;
  end if;
  insert into public.quotations (codigo, customer_id, cliente_nombre, cliente_email, cliente_telefono, destino, moneda, validez, notas,
      agente_id, estado, tipo, detalles, lead_id, enmienda_de, total)
    values (p_row->>'codigo', nullif(p_row->>'customer_id','')::uuid, p_row->>'cliente_nombre', nullif(p_row->>'cliente_email',''),
      nullif(p_row->>'cliente_telefono',''), p_row->>'destino', coalesce(p_row->>'moneda', src.moneda), nullif(p_row->>'validez','')::date,
      p_row->>'notas', auth.uid(), 'borrador', coalesce(p_row->>'tipo', src.tipo), coalesce(p_row->'detalles', '{}'::jsonb), src.lead_id,
      case when p_amendment then src.id end, 0)
    returning id into new_id;
  insert into public.quotation_items (quotation_id, descripcion, tipo, cantidad, precio_unitario, orden)
    select new_id, x->>'descripcion', x->>'tipo', (x->>'cantidad')::integer, (x->>'precio_unitario')::numeric, (n - 1)::int
    from jsonb_array_elements(p_items) with ordinality as lines(x, n);
  select coalesce(sum(case when lower(btrim(tipo)) = 'descuento' then -1 else 1 end * round(cantidad * precio_unitario, 2)), 0)
    into amount from public.quotation_items where quotation_id = new_id;
  update public.quotations set total = amount where id = new_id;
  return new_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.create_reservation_invoice(p_id uuid, p_due date)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.reservations; i uuid; lines jsonb; amount numeric;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict r from public.reservations where id = p_id for update;
  select id into i from public.invoices where reservation_id = p_id and estado <> 'anulada' order by created_at limit 1;
  if i is not null then return i; end if;
  if r.estado = 'cancelada' or r.prerreserva or p_due is null or p_due < current_date then raise exception 'Revise la reserva y el vencimiento.' using errcode = '23514'; end if;
  select jsonb_agg(jsonb_build_object('descripcion',descripcion,'tipo',tipo,'cantidad',cantidad,'precio_unitario',precio_unitario,'orden',orden) order by orden),
    sum(case when lower(btrim(tipo))='descuento' then -1 else 1 end * round(cantidad * precio_unitario,2)) into lines,amount from public.reservation_items where reservation_id = p_id;
  if lines is null or amount is distinct from r.total or amount < 0 then raise exception 'Revise los importes de la reserva.' using errcode = '23514'; end if;
  insert into public.invoices(reservation_id,numero,cliente_nombre,cliente_email,cliente_telefono,items,total,moneda,fecha_emision,fecha_vencimiento,estado,notas,commercial_snapshot)
    values (r.id,'FAC-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),r.cliente_nombre,r.cliente_email,r.cliente_telefono,lines,r.total,r.moneda,current_date,p_due,'borrador',null,
      jsonb_build_object('reservation_code',r.codigo,'payment_terms',r.accepted_snapshot#>'{quotation,detalles,pago}')) returning id into i;
  return i;
end; $function$;

CREATE OR REPLACE FUNCTION public.guard_receipted_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if exists(select 1 from public.payment_receipts where payment_id=old.id) then raise exception 'receipted_payment_locked'; end if;
 if tg_op='DELETE' then return old;end if;return new;
end $function$;

CREATE OR REPLACE FUNCTION public.guard_supplier_ticketing()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if new.supplier_status='emitida' and not exists(select 1 from public.reservation_travel where reservation_id=new.id and public_data->>'status'='emitida') then raise exception 'ticket_evidence_required';end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.guard_travel_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if tg_op='INSERT' then
  if new.status<>'preparado' or new.provider_id is not null or new.created_by is distinct from auth.uid() then raise exception 'invalid_delivery_attempt';end if;
  if new.receipt_id is not null and not exists(select 1 from public.payment_receipts where id=new.receipt_id and reservation_id=new.reservation_id) then raise exception 'receipt_reservation_mismatch';end if;
  return new;
 end if;
 if old.status<>'preparado' or (to_jsonb(new)-'status'-'provider_id') is distinct from (to_jsonb(old)-'status'-'provider_id') then raise exception 'delivery_snapshot_locked';end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.guard_travel_passenger_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare expected jsonb; category text; field text; wanted integer; actual integer; reviewed boolean;
begin
 select accepted_snapshot#>'{quotation,detalles,pasajeros}' into expected from public.reservations where id=new.reservation_id;
 reviewed:=coalesce((new.public_data->>'reviewed')::boolean,false) or new.public_data->>'status'<>'pendiente';
 if expected is null or jsonb_typeof(expected)<>'object' then
  if reviewed then raise exception 'accepted_passenger_counts_missing';end if;
  return new;
 end if;
 for category,field in select * from (values('adulto','adultos'),('nino','ninos'),('infante','infantes')) v(category,field) loop
  if coalesce(expected->>field,'') !~ '^\d{1,2}$' then
   if reviewed then raise exception 'accepted_passenger_counts_invalid';end if;
   return new;
  end if;
  wanted:=(expected->>field)::integer;
  select count(*) into actual from jsonb_array_elements(new.public_data->'passengers') p where p->>'category'=category;
  if actual>wanted or (reviewed and actual<>wanted) then raise exception 'accepted_passenger_count_mismatch';end if;
 end loop;
 if reviewed and jsonb_array_length(new.public_data->'passengers')=0 then raise exception 'passengers_required';end if;
 if exists(select 1 from jsonb_array_elements(new.public_data->'passengers') p where coalesce(p->>'category','') not in ('adulto','nino','infante')) then raise exception 'invalid_passenger_category';end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare allowed boolean;
begin
  insert into public.rate_limits(bucket, window_start, count)
    values (p_key, now(), 1)
  on conflict (bucket) do update
    set count = case when rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
                     then 1 else rate_limits.count + 1 end,
        window_start = case when rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
                     then now() else rate_limits.window_start end
    returning (rate_limits.count <= p_max) into allowed;
  return allowed;
end;
$function$;

CREATE OR REPLACE FUNCTION public.invoice_integrity_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare paid numeric;
begin
  if tg_op = 'UPDATE' and old.estado <> 'borrador' and (to_jsonb(new)-array['estado','updated_at']) is distinct from (to_jsonb(old)-array['estado','updated_at']) then
    raise exception 'La factura emitida no se puede sobrescribir.' using errcode = '23514'; end if;
  if tg_op = 'UPDATE' and old.estado <> 'borrador' and new.estado = 'borrador' then raise exception 'No puede volver a borrador.' using errcode = '23514'; end if;
  if tg_op = 'UPDATE' and old.estado = 'anulada' and new.estado <> 'anulada' then raise exception 'Factura anulada.' using errcode = '23514'; end if;
  if new.estado = 'pagada' then
    select coalesce(sum(monto),0) into paid from public.payments where reservation_id=new.reservation_id and moneda=new.moneda;
    if paid < new.total then raise exception 'Los pagos registrados no cubren el total.' using errcode = '23514'; end if;
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.admins where user_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.log_admin_action(p_action text, p_entity text, p_entity_id uuid, p_reference text DEFAULT NULL::text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare entry bigint;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
    values (auth.uid(), p_action, p_entity, p_entity_id, p_reference, coalesce(p_details, '{}'::jsonb))
    returning id into entry;
  return entry;
end; $function$;

CREATE OR REPLACE FUNCTION public.post_customer_message(p_reservation_id uuid, p_topic text, p_body text, p_path text, p_name text, p_mime text, p_size integer)
 RETURNS TABLE(message_id uuid, message_created_at timestamp with time zone, attachment_id uuid)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_message uuid; v_at timestamptz; v_attachment uuid;
begin
  if p_path is null and char_length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'Mensaje vacío.' using errcode = '22023';
  end if;
  insert into public.reservation_messages (reservation_id, sender, topic, body)
    values (p_reservation_id, 'cliente', p_topic, coalesce(p_body, ''))
    returning id, created_at into v_message, v_at;
  if p_path is not null then
    insert into public.reservation_message_attachments (message_id, reservation_id, path, name, mime, size, uploaded_by)
      values (v_message, p_reservation_id, p_path, p_name, p_mime, p_size, 'cliente')
      returning id into v_attachment;
  end if;
  return query select v_message, v_at, v_attachment;
end $function$;

CREATE OR REPLACE FUNCTION public.purge_reservation_travel_private(p_id uuid, p_revision integer, p_encrypted text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare prior public.reservation_travel;
begin
 if not public.is_admin() then raise exception 'forbidden';end if;
 select * into prior from public.reservation_travel where reservation_id=p_id for update;
 if not found or prior.revision<>p_revision or p_encrypted not like 'v1.%' then raise exception 'stale_travel_revision';end if;
 update public.reservation_travel set encrypted_private=p_encrypted,private_context=p_id,revision=p_revision+1,updated_at=now(),updated_by=auth.uid() where reservation_id=p_id;
 insert into public.reservation_travel_history(reservation_id,revision,public_data,changed_by) values(p_id,p_revision+1,prior.public_data,auth.uid());
end $function$;

CREATE OR REPLACE FUNCTION public.quotation_items_lock_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (select 1 from public.quotations q where q.id = coalesce(new.quotation_id, old.quotation_id) and q.estado in ('aceptada','reemplazada')) then
    raise exception 'La cotización fue aceptada y sus precios no se pueden modificar. Cree una enmienda.' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.quotation_shares_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if (new.quotation_id, new.version_id, new.canal, new.telefono, new.mensaje, new.plantilla, new.token_hash, new.expira_en, new.creado_por, new.created_at)
     is distinct from (old.quotation_id, old.version_id, old.canal, old.telefono, old.mensaje, old.plantilla, old.token_hash, old.expira_en, old.creado_por, old.created_at) then
    raise exception 'Un envío registrado no se puede modificar.' using errcode = '23514';
  end if;
  if new.aperturas < old.aperturas then raise exception 'Contador inválido.' using errcode = '23514'; end if;
  if new.estado is distinct from old.estado and not (
       (old.estado = 'preparado' and new.estado in ('confirmado', 'cancelado', 'enviado', 'fallido'))
    or (old.estado in ('confirmado', 'enviado', 'entregado', 'leido') and new.estado = 'revocado')
    or (old.estado = 'enviado' and new.estado in ('entregado', 'leido', 'fallido'))
    or (old.estado = 'entregado' and new.estado = 'leido')) then
    raise exception 'Cambio de estado del envío no permitido (% a %).', old.estado, new.estado using errcode = '23514';
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.quotation_versions_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception 'Las versiones emitidas de una cotización no se pueden modificar.' using errcode = 'check_violation';
end;
$function$;

CREATE OR REPLACE FUNCTION public.quotations_lock_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  -- Adopt a legacy acceptance only against its already recorded version; record review time now.
  if old.estado='aceptada' and old.accepted_version_id is null and old.version_aceptada is not null
    and new.accepted_version_id is not null and new.aceptada_por=auth.uid()
    and exists(select 1 from public.quotation_versions where id=new.accepted_version_id and quotation_id=old.id and version=old.version_aceptada)
    and (to_jsonb(new)-array['updated_at','accepted_version_id','aceptada_en','aceptada_por','aceptacion_notas'])
      is not distinct from (to_jsonb(old)-array['updated_at','accepted_version_id','aceptada_en','aceptada_por','aceptacion_notas']) then return new; end if;
  -- step 3: an accepted quotation is replaced only by its own accepted amendment, and nothing else changes.
  if old.estado = 'aceptada' and new.estado = 'reemplazada'
    and (to_jsonb(new) - array['updated_at','estado','reemplazada_por','reemplazada_en'])
      is not distinct from (to_jsonb(old) - array['updated_at','estado','reemplazada_por','reemplazada_en'])
    and exists (select 1 from public.quotations a where a.id = new.reemplazada_por and a.enmienda_de = old.id and a.estado = 'aceptada') then
    return new;
  end if;
  if old.estado in ('aceptada','reemplazada') and (to_jsonb(new) - array['updated_at','agente_id'])
    is distinct from (to_jsonb(old) - array['updated_at','agente_id']) then
    raise exception 'La cotización aceptada es inmutable. Cree una enmienda.' using errcode = '23514';
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.record_reservation_payment(p_request uuid, p_reservation uuid, p_amount numeric, p_currency text, p_method text, p_date date, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare previous public.payment_recording_requests; r public.reservations; body jsonb; payment uuid;
begin
 if not public.is_admin() then raise exception 'admin_required';end if;
 if p_request is null or p_reservation is null then raise exception 'invalid_request';end if;
 -- Same request serializes even when two connections submit concurrently.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 body:=jsonb_build_object('amount',p_amount,'currency',p_currency,'method',p_method,'date',p_date,'reference',nullif(p_reference,''),'notes',nullif(p_notes,''));
 select * into previous from public.payment_recording_requests where request_id=p_request;
 if found then
  if previous.reservation_id<>p_reservation or previous.payload<>body then raise exception 'payment_request_conflict';end if;
  return previous.payment_id;
 end if;
 select * into r from public.reservations where id=p_reservation for update;
 if not found then raise exception 'reservation_missing';end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount>999999999.99
  or p_currency is distinct from r.moneda or p_method is null or p_method not in ('tarjeta','transferencia','efectivo','otro')
  or p_date is null or p_date>(now() at time zone 'America/Tegucigalpa')::date
  or length(coalesce(p_reference,''))>200 or length(coalesce(p_notes,''))>5000 then raise exception 'invalid_payment';end if;
 insert into public.payments(reservation_id,monto,moneda,metodo,fecha_pago,referencia,notas)
 values(p_reservation,p_amount,p_currency,p_method,p_date,nullif(p_reference,''),nullif(p_notes,'')) returning id into payment;
 insert into public.payment_recording_requests(request_id,reservation_id,payment_id,payload,created_by)
 values(p_request,p_reservation,payment,body,auth.uid());
 return payment;
end $function$;

CREATE OR REPLACE FUNCTION public.record_reservation_refund(p_request uuid, p_reservation uuid, p_kind text, p_amount numeric, p_method text, p_date date, p_reference text, p_reason text, p_reverses uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare previous public.payment_recording_requests; r public.reservations; original public.payments; body jsonb; movement uuid; received numeric; amount numeric; method text; day date;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  if p_request is null or p_reservation is null or p_kind not in ('reembolso', 'reverso') then raise exception 'Movimiento inválido.' using errcode = '23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request::text, 0));
  body := jsonb_build_object('kind', p_kind, 'amount', p_amount, 'method', p_method, 'date', p_date, 'reference', nullif(p_reference, ''), 'reason', nullif(btrim(p_reason), ''), 'reverses', p_reverses);
  select * into previous from public.payment_recording_requests where request_id = p_request;
  if found then
    if previous.reservation_id <> p_reservation or previous.payload <> body then raise exception 'Este registro ya se usó con otros datos. Recargue el formulario.' using errcode = '23514'; end if;
    return previous.payment_id;
  end if;
  select * into r from public.reservations where id = p_reservation for update;
  if not found then raise exception 'No se encontró la reserva.' using errcode = '23514'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 or length(coalesce(p_reference, '')) > 200 then
    raise exception 'Indique el motivo (y una referencia breve, si la hay).' using errcode = '23514'; end if;
  if p_kind = 'reverso' then
    select * into original from public.payments where id = p_reverses and reservation_id = r.id for update;
    if not found or original.tipo <> 'pago' then raise exception 'Elija un pago de esta reserva.' using errcode = '23514'; end if;
    if exists (select 1 from public.payments where revierte_a = original.id) then raise exception 'Ese pago ya fue revertido.' using errcode = '23514'; end if;
    if exists (select 1 from public.payment_receipts where payment_id = original.id) then
      raise exception 'Ese pago ya tiene recibo: registre un reembolso en lugar de un reverso.' using errcode = '23514'; end if;
    select coalesce(sum(monto), 0) into received from public.payments where reservation_id = r.id and moneda = r.moneda;
    if original.moneda = r.moneda and received - original.monto < 0 then
      raise exception 'Ya se devolvió parte de este pago; revertirlo dejaría el saldo recibido en negativo. Revise las devoluciones.' using errcode = '23514'; end if;
    amount := original.monto; method := original.metodo; day := (now() at time zone 'America/Tegucigalpa')::date;
  else
    if p_reverses is not null then raise exception 'Movimiento inválido.' using errcode = '23514'; end if;
    if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) or p_amount > 999999999.99 then raise exception 'Revise el monto.' using errcode = '23514'; end if;
    if p_method is null or p_method not in ('tarjeta', 'transferencia', 'efectivo', 'otro') then raise exception 'Elija cómo se devolvió el dinero.' using errcode = '23514'; end if;
    if p_date is null or p_date > (now() at time zone 'America/Tegucigalpa')::date then raise exception 'Registre una fecha de devolución ya realizada.' using errcode = '23514'; end if;
    select coalesce(sum(monto), 0) into received from public.payments where reservation_id = r.id and moneda = r.moneda;
    if p_amount > received then
      raise exception 'Solo se puede devolver lo recibido: % %.', received, r.moneda using errcode = '23514'; end if;
    amount := p_amount; method := p_method; day := p_date;
  end if;
  insert into public.payments (reservation_id, monto, moneda, metodo, fecha_pago, referencia, notas, tipo, revierte_a, motivo, registrado_por)
    values (r.id, -amount, r.moneda, method, day, nullif(p_reference, ''), null, p_kind, case when p_kind = 'reverso' then original.id end, btrim(p_reason), auth.uid())
    returning id into movement;
  insert into public.payment_recording_requests (request_id, reservation_id, payment_id, payload, created_by)
    values (p_request, p_reservation, movement, body, auth.uid());
  return movement;
end; $function$;

CREATE OR REPLACE FUNCTION public.redeem_promo_spin(p_code text, p_segments jsonb)
 RETURNS TABLE(premio_id text, premio_label text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_spin public.promo_spins%rowtype;
  v_total integer;
  v_pick integer;
  v_sum integer := 0;
  v_segment jsonb;
begin
  select * into v_spin from public.promo_spins where code = p_code for update;
  if not found or v_spin.estado <> 'pendiente' then
    return;
  end if;
  if v_spin.expires_at <= now() then
    update public.promo_spins set estado = 'expirada' where id = v_spin.id;
    return;
  end if;
  select sum((value->>'weight')::integer) into v_total from jsonb_array_elements(p_segments);
  if v_total is null or v_total < 1 then return; end if;
  v_pick := floor(random() * v_total)::integer + 1;
  for v_segment in select value from jsonb_array_elements(p_segments) loop
    v_sum := v_sum + (v_segment->>'weight')::integer;
    if v_pick <= v_sum then
      update public.promo_spins set estado = 'usada', premio_id = v_segment->>'id',
        premio_label = v_segment->>'label_es', used_at = now()
        where id = v_spin.id and estado = 'pendiente';
      if found then
        return query select v_segment->>'id', v_segment->>'label_es';
      end if;
      return;
    end if;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.replace_quotation_items(p_quotation_id uuid, p_items jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_total numeric(12, 2);
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 50 then
    raise exception 'Lista de precios inválida.' using errcode = 'invalid_parameter_value';
  end if;
  perform 1 from public.quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'Cotización no encontrada.' using errcode = 'no_data_found';
  end if;
  delete from public.quotation_items where quotation_id = p_quotation_id;
  insert into public.quotation_items (quotation_id, descripcion, tipo, cantidad, precio_unitario, orden)
  select p_quotation_id, item ->> 'descripcion', item ->> 'tipo', (item ->> 'cantidad')::integer, (item ->> 'precio_unitario')::numeric, (position - 1)::int
  from jsonb_array_elements(p_items) with ordinality as entries(item, position);
  select coalesce(sum(case when lower(btrim(tipo)) = 'descuento' then -1 else 1 end * round(cantidad * precio_unitario, 2)), 0)
    into v_total from public.quotation_items where quotation_id = p_quotation_id;
  update public.quotations set total = v_total where id = p_quotation_id;
  return v_total;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reservation_commercial_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  editable text[] := array['estado','fecha_inicio','fecha_fin','notas','updated_at','comision','segmento','supplier_status','supplier_reference','prerreserva','promoted_at','promoted_by'];
begin
  -- The access surname may be completed once when it was never recorded; it can never be changed afterwards.
  if nullif(btrim(old.cliente_apellido), '') is null and new.cliente_apellido is distinct from old.cliente_apellido then
    if nullif(btrim(new.cliente_apellido), '') is null or length(new.cliente_apellido) > 120 then
      raise exception 'Revise el apellido de acceso del cliente.' using errcode = '23514'; end if;
    editable := array_append(editable, 'cliente_apellido');
  end if;
  -- The access e-mail may be completed once when the reservation was converted without one (WhatsApp-only
  -- customers); like the surname, it can never be changed afterwards, so Mi viaje access cannot be moved.
  if nullif(btrim(old.cliente_email), '') is null and new.cliente_email is distinct from old.cliente_email then
    if coalesce(btrim(new.cliente_email), '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(new.cliente_email) > 254 then
      raise exception 'Revise el correo de acceso del cliente.' using errcode = '23514'; end if;
    editable := array_append(editable, 'cliente_email');
  end if;
  -- step 3: only an accepted amendment of this reservation's quotation may move it to another version, and only
  -- with exactly that version's snapshot and total, in the same currency.
  if old.accepted_version_id is not null and new.accepted_version_id is distinct from old.accepted_version_id then
    if old.estado in ('cancelada','completada') or new.moneda is distinct from old.moneda
      or new.accepted_snapshot is distinct from (select snapshot from public.quotation_versions where id = new.accepted_version_id and quotation_id = new.quotation_id)
      or new.total is distinct from (new.accepted_snapshot#>>'{quotation,total}')::numeric
      or not exists (select 1 from public.quotations a where a.id = new.quotation_id and a.enmienda_de = old.quotation_id
                       and a.estado = 'aceptada' and a.accepted_version_id = new.accepted_version_id) then
      raise exception 'Solo una enmienda aceptada de esta reserva puede cambiar sus datos comerciales.' using errcode = '23514';
    end if;
    editable := editable || array['quotation_id','accepted_version_id','accepted_snapshot','total','destino'];
  end if;
  -- step 5: the cancellation record is written once, together with the cancellation.
  if old.estado <> 'cancelada' and new.estado = 'cancelada' then
    editable := editable || array['cancelacion_motivo','cancelada_en','cancelada_por'];
  end if;
  if old.accepted_version_id is not null and (to_jsonb(new) - editable) is distinct from (to_jsonb(old) - editable) then
    raise exception 'Los datos comerciales aceptados están bloqueados.' using errcode = '23514'; end if;
  if old.estado in ('cancelada','completada') and new.estado <> old.estado then raise exception 'Estado final.' using errcode = '23514'; end if;
  if new.estado in ('confirmada','en_curso','completada') and (new.prerreserva or new.supplier_status not in ('confirmada','emitida')) then
    raise exception 'Registre la confirmación del proveedor antes de confirmar la reserva.' using errcode = '23514'; end if;
  if new.supplier_status in ('confirmada','emitida') and nullif(btrim(new.supplier_reference),'') is null then
    raise exception 'Se requiere la referencia real del proveedor.' using errcode = '23514'; end if;
  if not old.prerreserva and new.prerreserva then raise exception 'No puede volver a prerreservación.' using errcode = '23514'; end if;
  if old.prerreserva and not new.prerreserva then
    if old.estado <> 'pendiente' then raise exception 'Prerreservación no elegible.' using errcode = '23514'; end if;
    new.promoted_at := now(); new.promoted_by := auth.uid();
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.reservation_items_commercial_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  frozen jsonb;
  target_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT accepted_snapshot->'items'->NEW.orden
      INTO frozen
    FROM public.reservations
    WHERE id = NEW.reservation_id
      AND accepted_version_id IS NOT NULL;

    IF EXISTS (
      SELECT 1
      FROM public.reservations
      WHERE id = NEW.reservation_id
        AND accepted_version_id IS NOT NULL
    ) THEN
      IF frozen IS NULL
         OR NEW.descripcion IS DISTINCT FROM frozen->>'descripcion'
         OR NEW.tipo IS DISTINCT FROM frozen->>'tipo'
         OR NEW.cantidad IS DISTINCT FROM (frozen->>'cantidad')::numeric
         OR NEW.precio_unitario IS DISTINCT FROM (frozen->>'precio_unitario')::numeric
         OR EXISTS (
           SELECT 1
           FROM public.reservation_items
           WHERE reservation_id = NEW.reservation_id
             AND orden = NEW.orden
         )
      THEN
        RAISE EXCEPTION 'Los servicios deben coincidir con la versión aceptada.'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    target_id := OLD.reservation_id;
    -- step 3: apply_quotation_amendment replaces the services of the reservation it is moving, and only those.
    IF current_setting('viatour.amending_reservation', true) = OLD.reservation_id::text
       AND EXISTS (
         SELECT 1
         FROM public.reservations r
         JOIN public.quotations a ON a.id = r.quotation_id
         WHERE r.id = OLD.reservation_id
           AND a.enmienda_de IS NOT NULL
           AND a.accepted_version_id = r.accepted_version_id
       )
    THEN
      RETURN OLD;
    END IF;
  ELSE
    target_id := NEW.reservation_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reservations
    WHERE id = target_id
      AND accepted_version_id IS NOT NULL
  )
  OR (
    TG_OP = 'UPDATE'
    AND EXISTS (
      SELECT 1
      FROM public.reservations
      WHERE id = OLD.reservation_id
        AND accepted_version_id IS NOT NULL
    )
  ) THEN
    RAISE EXCEPTION 'Los servicios aceptados están bloqueados.'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_reservation_record(p_id uuid, p_values jsonb, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.reservations; amount numeric;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode='42501'; end if;
  select * into strict r from public.reservations where id=p_id for update;
  if r.accepted_version_id is null then
    if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Revise los servicios.' using errcode='23514'; end if;
    delete from public.reservation_items where reservation_id=p_id;
    insert into public.reservation_items(reservation_id,descripcion,tipo,cantidad,precio_unitario,orden)
      select p_id,x->>'descripcion',x->>'tipo',(x->>'cantidad')::numeric,(x->>'precio_unitario')::numeric,(n-1)::int from jsonb_array_elements(p_items) with ordinality lines(x,n);
    select sum(case when lower(btrim(tipo))='descuento' then -1 else 1 end * round(cantidad*precio_unitario,2)) into amount from public.reservation_items where reservation_id=p_id;
    if amount < 0 then raise exception 'Total inválido.' using errcode='23514'; end if;
    if exists(select 1 from public.invoices where reservation_id=p_id and estado<>'anulada') and amount is distinct from r.total then raise exception 'No cambie los importes de una reserva facturada.' using errcode='23514'; end if;
  else amount:=r.total;
  end if;
  if p_values->>'estado' not in ('pendiente','confirmada','en_curso','completada','cancelada') then raise exception 'Estado inválido.' using errcode='23514'; end if;
  update public.reservations set estado=p_values->>'estado',fecha_inicio=nullif(p_values->>'fecha_inicio','')::date,fecha_fin=nullif(p_values->>'fecha_fin','')::date,
    notas=nullif(p_values->>'notas',''),total=amount,comision=nullif(p_values->>'comision','')::numeric,segmento=nullif(p_values->>'segmento',''),
    supplier_status=coalesce(p_values->>'supplier_status',supplier_status),supplier_reference=nullif(p_values->>'supplier_reference','') where id=p_id;
  return p_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.save_reservation_travel(p_id uuid, p_revision integer, p_public jsonb, p_encrypted text, p_context uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.reservations; prior public.reservation_travel; n integer; person jsonb; ticket jsonb; state text;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 select * into r from public.reservations where id=p_id for update;
 if not found or r.estado in ('cancelada','completada') then raise exception 'reservation_not_editable'; end if;
 if p_context is not null and p_context<>p_id and p_context is distinct from r.quotation_id then raise exception 'invalid_encryption_context';end if;
 select * into prior from public.reservation_travel where reservation_id=p_id;
 if coalesce(prior.revision,0)<>p_revision then raise exception 'stale_travel_revision'; end if;
 state:=p_public->>'status';
 if state is null or state not in ('pendiente','en_emision','emitida') or jsonb_typeof(p_public->'passengers') is distinct from 'array' or jsonb_typeof(p_public->'tickets') is distinct from 'array'
 or length(p_encrypted)>200000 or p_encrypted not like 'v1.%' or jsonb_array_length(p_public->'passengers')>30 or jsonb_array_length(p_public->'tickets')>100 then raise exception 'invalid_travel_data'; end if;
 if prior.public_data->>'status'='emitida' and state<>'emitida' then raise exception 'issued_status_locked'; end if;
 if state<>'pendiente' and (r.prerreserva or jsonb_array_length(p_public->'passengers')=0) then raise exception 'passengers_required'; end if;
 if state<>'pendiente' and p_public->>'reviewed' is distinct from 'true' then raise exception 'passenger_review_required';end if;
 if state<>'pendiente' and not coalesce(jsonb_path_exists(r.accepted_snapshot,'$.quotation.detalles.**.segmentos[*]'),false) then raise exception 'no_flight_services';end if;
 if coalesce(p_public->>'confirmedAt','')<>'' and (r.supplier_status not in ('confirmada','emitida') or coalesce(trim(r.supplier_reference),'')='') then raise exception 'supplier_confirmation_required'; end if;
 if state='emitida' then
   if prior.public_data->>'status' is distinct from 'en_emision' and prior.public_data->>'status' is distinct from 'emitida' then raise exception 'start_ticketing_first'; end if;
   if coalesce(p_public->>'confirmedAt','')='' or r.supplier_status not in ('confirmada','emitida') or coalesce(trim(r.supplier_reference),'')='' then raise exception 'supplier_confirmation_required'; end if;
   for person in select * from jsonb_array_elements(p_public->'passengers') loop
     if coalesce(trim(person->>'firstName'),'')='' or coalesce(trim(person->>'lastName'),'')='' or not exists(select 1 from jsonb_array_elements(p_public->'tickets') t where t->>'passengerId'=person->>'id') then raise exception 'ticket_evidence_required'; end if;
   end loop;
   for ticket in select * from jsonb_array_elements(p_public->'tickets') loop
     if coalesce(trim(ticket->>'number'),'')='' or coalesce(trim(ticket->>'pnr'),'')='' or coalesce(trim(ticket->>'airline'),'')='' or coalesce(trim(ticket->>'segments'),'')='' or coalesce(ticket->>'issueDate','')='' then raise exception 'ticket_evidence_required'; end if;
   end loop;
 end if;
 n:=p_revision+1;
 insert into public.reservation_travel(reservation_id,revision,public_data,encrypted_private,private_context,updated_by,updated_at) values(p_id,n,p_public,p_encrypted,coalesce(p_context,p_id),auth.uid(),now()) on conflict(reservation_id) do update set revision=n,public_data=p_public,encrypted_private=p_encrypted,private_context=coalesce(p_context,p_id),updated_by=auth.uid(),updated_at=now();
 insert into public.reservation_travel_history(reservation_id,revision,public_data,changed_by) values(p_id,n,p_public,auth.uid());
 return n;
end $function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end; $function$;

CREATE TRIGGER admin_audit_log_immutable BEFORE DELETE OR UPDATE ON public.admin_audit_log FOR EACH ROW EXECUTE FUNCTION admin_audit_log_immutable();
CREATE TRIGGER airline_catalog_audit BEFORE INSERT OR UPDATE ON public.airline_catalog FOR EACH ROW EXECUTE FUNCTION catalog_audit();
CREATE TRIGGER airline_fare_presets_audit BEFORE INSERT OR UPDATE ON public.airline_fare_presets FOR EACH ROW EXECUTE FUNCTION catalog_audit();
CREATE TRIGGER trg_blog_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_destinations_updated_at BEFORE UPDATE ON public.destinations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER hotel_catalog_audit BEFORE INSERT OR UPDATE ON public.hotel_catalog FOR EACH ROW EXECUTE FUNCTION catalog_audit();
CREATE TRIGGER audit_invoice_change AFTER INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION audit_invoice_change();
CREATE TRIGGER invoice_integrity_guard BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION invoice_integrity_guard();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER audit_passenger_profile AFTER INSERT OR DELETE OR UPDATE ON public.passenger_profiles FOR EACH ROW EXECUTE FUNCTION audit_passenger_profile();
CREATE TRIGGER passenger_profiles_updated_at BEFORE UPDATE ON public.passenger_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER audit_receipt_created AFTER INSERT ON public.payment_receipts FOR EACH ROW EXECUTE FUNCTION audit_receipt_created();
CREATE TRIGGER audit_payment_change AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION audit_payment_change();
CREATE TRIGGER receipted_payment_locked BEFORE DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION guard_receipted_payment();
CREATE TRIGGER quotation_items_lock_accepted BEFORE INSERT OR DELETE OR UPDATE ON public.quotation_items FOR EACH ROW EXECUTE FUNCTION quotation_items_lock_accepted();
CREATE TRIGGER audit_quotation_share AFTER INSERT OR UPDATE ON public.quotation_shares FOR EACH ROW EXECUTE FUNCTION audit_quotation_share();
CREATE TRIGGER quotation_shares_guard BEFORE UPDATE ON public.quotation_shares FOR EACH ROW EXECUTE FUNCTION quotation_shares_guard();
CREATE TRIGGER quotation_versions_no_update BEFORE UPDATE ON public.quotation_versions FOR EACH ROW EXECUTE FUNCTION quotation_versions_immutable();
CREATE TRIGGER audit_quotation_change AFTER INSERT OR UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION audit_quotation_change();
CREATE TRIGGER quotations_lock_accepted BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION quotations_lock_accepted();
CREATE TRIGGER trg_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER reservation_items_commercial_guard BEFORE INSERT OR DELETE OR UPDATE ON public.reservation_items FOR EACH ROW EXECUTE FUNCTION reservation_items_commercial_guard();
CREATE TRIGGER travel_passenger_counts BEFORE INSERT OR UPDATE OF public_data ON public.reservation_travel FOR EACH ROW EXECUTE FUNCTION guard_travel_passenger_counts();
CREATE TRIGGER audit_travel_revision AFTER INSERT ON public.reservation_travel_history FOR EACH ROW EXECUTE FUNCTION audit_travel_revision();
CREATE TRIGGER audit_reservation_change AFTER INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION audit_reservation_change();
CREATE TRIGGER reservation_commercial_guard BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION reservation_commercial_guard();
CREATE TRIGGER supplier_ticket_evidence BEFORE UPDATE OF supplier_status ON public.reservations FOR EACH ROW EXECUTE FUNCTION guard_supplier_ticketing();
CREATE TRIGGER trg_reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER service_catalog_audit BEFORE INSERT OR UPDATE ON public.service_catalog FOR EACH ROW EXECUTE FUNCTION catalog_audit();
CREATE TRIGGER delivery_snapshot_locked BEFORE INSERT OR UPDATE ON public.travel_deliveries FOR EACH ROW EXECUTE FUNCTION guard_travel_delivery();

alter table public.admin_audit_log enable row level security;
create policy admin_audit_log_admin_select on public.admin_audit_log as permissive for select to authenticated using (is_admin());
alter table public.admins enable row level security;
create policy "admin read admins" on public.admins as permissive for select to authenticated using (is_admin());
alter table public.airline_catalog enable row level security;
create policy airline_catalog_admin_all on public.airline_catalog as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.airline_fare_presets enable row level security;
create policy airline_fare_presets_admin_all on public.airline_fare_presets as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.blog_posts enable row level security;
create policy "admin delete posts" on public.blog_posts as permissive for delete to authenticated using (is_admin());
create policy "admin read posts" on public.blog_posts as permissive for select to authenticated using (is_admin());
create policy "admin update posts" on public.blog_posts as permissive for update to authenticated using (is_admin());
create policy "admin write posts" on public.blog_posts as permissive for insert to authenticated with check (is_admin());
create policy "anon can read published posts" on public.blog_posts as permissive for select to anon using ((publicado = true));
alter table public.customers enable row level security;
create policy "staff customers" on public.customers as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.destinations enable row level security;
create policy "admin delete destinations" on public.destinations as permissive for delete to authenticated using (is_admin());
create policy "admin read destinations" on public.destinations as permissive for select to authenticated using (is_admin());
create policy "admin update destinations" on public.destinations as permissive for update to authenticated using (is_admin());
create policy "admin write destinations" on public.destinations as permissive for insert to authenticated with check (is_admin());
create policy "anon can read published destinations" on public.destinations as permissive for select to anon using ((publicado = true));
alter table public.faqs enable row level security;
create policy "admin delete faqs" on public.faqs as permissive for delete to authenticated using (is_admin());
create policy "admin read faqs" on public.faqs as permissive for select to authenticated using (is_admin());
create policy "admin update faqs" on public.faqs as permissive for update to authenticated using (is_admin());
create policy "admin write faqs" on public.faqs as permissive for insert to authenticated with check (is_admin());
create policy "anon can read published faqs" on public.faqs as permissive for select to anon using ((publicado = true));
alter table public.hotel_catalog enable row level security;
create policy hotel_catalog_admin_all on public.hotel_catalog as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.invoices enable row level security;
create policy "staff invoices" on public.invoices as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.leads enable row level security;
create policy "admin read leads" on public.leads as permissive for select to authenticated using (is_admin());
create policy "admin update leads" on public.leads as permissive for update to authenticated using (is_admin());
create policy "anon can insert leads" on public.leads as permissive for insert to anon with check (true);
alter table public.newsletter_subscribers enable row level security;
create policy "admin read newsletter" on public.newsletter_subscribers as permissive for select to authenticated using (is_admin());
alter table public.packages enable row level security;
create policy "admin delete packages" on public.packages as permissive for delete to authenticated using (is_admin());
create policy "admin read packages" on public.packages as permissive for select to authenticated using (is_admin());
create policy "admin update packages" on public.packages as permissive for update to authenticated using (is_admin());
create policy "admin write packages" on public.packages as permissive for insert to authenticated with check (is_admin());
create policy "anon can read published packages" on public.packages as permissive for select to anon using ((publicado = true));
alter table public.passenger_profiles enable row level security;
create policy "staff passenger profiles" on public.passenger_profiles as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.payment_receipts enable row level security;
create policy receipt_admin on public.payment_receipts as permissive for select to authenticated using (is_admin());
alter table public.payment_recording_requests enable row level security;
create policy payment_recording_admin_read on public.payment_recording_requests as permissive for select to authenticated using (is_admin());
alter table public.payments enable row level security;
create policy "staff payments" on public.payments as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.portal_otps enable row level security;
create policy portal_otps_staff_only on public.portal_otps as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.promo_spins enable row level security;
create policy promo_spins_staff_only on public.promo_spins as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.quotation_items enable row level security;
create policy "staff quotation_items" on public.quotation_items as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.quotation_shares enable row level security;
create policy "staff quotation shares" on public.quotation_shares as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.quotation_versions enable row level security;
create policy quotation_versions_admin_insert on public.quotation_versions as permissive for insert to authenticated with check ((is_admin() AND (emitida_por = auth.uid())));
create policy quotation_versions_admin_select on public.quotation_versions as permissive for select to authenticated using (is_admin());
alter table public.quotations enable row level security;
create policy "staff quotations" on public.quotations as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.rate_limits enable row level security;
alter table public.reservation_items enable row level security;
create policy "staff reservation_items" on public.reservation_items as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.reservation_message_attachments enable row level security;
create policy reservation_message_attachments_admin_select on public.reservation_message_attachments as permissive for select to authenticated using (is_admin());
alter table public.reservation_messages enable row level security;
create policy reservation_messages_admin_insert on public.reservation_messages as permissive for insert to authenticated with check ((is_admin() AND (sender = 'agencia'::text) AND (admin_id = auth.uid())));
create policy reservation_messages_admin_select on public.reservation_messages as permissive for select to authenticated using (is_admin());
create policy reservation_messages_admin_update on public.reservation_messages as permissive for update to authenticated using (is_admin()) with check (is_admin());
alter table public.reservation_travel enable row level security;
create policy travel_admin_read on public.reservation_travel as permissive for select to authenticated using (is_admin());
alter table public.reservation_travel_history enable row level security;
create policy travel_history_admin_read on public.reservation_travel_history as permissive for select to authenticated using (is_admin());
alter table public.reservations enable row level security;
create policy "staff reservations" on public.reservations as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.review_invitations enable row level security;
create policy review_invitations_staff_all on public.review_invitations as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.reviews enable row level security;
create policy "admin delete reviews" on public.reviews as permissive for delete to authenticated using (is_admin());
create policy "admin read reviews" on public.reviews as permissive for select to authenticated using (is_admin());
create policy "admin update reviews" on public.reviews as permissive for update to authenticated using (is_admin());
create policy "anon can submit reviews" on public.reviews as permissive for insert to anon with check (((estado = 'pendiente'::text) AND (fuente = 'formulario'::text)));
alter table public.service_catalog enable row level security;
create policy service_catalog_admin_all on public.service_catalog as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.support_tickets enable row level security;
create policy support_tickets_staff_only on public.support_tickets as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.travel_deliveries enable row level security;
create policy delivery_admin on public.travel_deliveries as permissive for all to authenticated using (is_admin()) with check (is_admin());
alter table public.trip_feedback enable row level security;
create policy trip_feedback_admin_select on public.trip_feedback as permissive for select to authenticated using (is_admin());
alter table public.trip_service_requests enable row level security;
create policy trip_service_requests_admin_select on public.trip_service_requests as permissive for select to authenticated using (is_admin());
create policy trip_service_requests_admin_update on public.trip_service_requests as permissive for update to authenticated using (is_admin()) with check ((is_admin() AND (handled_by = auth.uid())));

-- Table and view privileges for the API roles, exactly as in production.
revoke all on public.admin_audit_log from anon, authenticated, service_role;
grant select on public.admin_audit_log to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.admin_audit_log to service_role;
revoke all on public.admins from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.admins to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.admins to service_role;
revoke all on public.airline_catalog from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.airline_catalog to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.airline_catalog to service_role;
revoke all on public.airline_fare_presets from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.airline_fare_presets to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.airline_fare_presets to service_role;
revoke all on public.blog_posts from anon, authenticated, service_role;
grant select on public.blog_posts to anon;
grant delete, insert, references, select, trigger, truncate, update on public.blog_posts to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.blog_posts to service_role;
revoke all on public.customers from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.customers to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.customers to service_role;
revoke all on public.destinations from anon, authenticated, service_role;
grant select on public.destinations to anon;
grant delete, insert, references, select, trigger, truncate, update on public.destinations to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.destinations to service_role;
revoke all on public.faqs from anon, authenticated, service_role;
grant select on public.faqs to anon;
grant delete, insert, references, select, trigger, truncate, update on public.faqs to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.faqs to service_role;
revoke all on public.hotel_catalog from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.hotel_catalog to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.hotel_catalog to service_role;
revoke all on public.invoices from anon, authenticated, service_role;
grant insert, references, select, trigger, update on public.invoices to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.invoices to service_role;
revoke all on public.leads from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.leads to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.leads to service_role;
revoke all on public.newsletter_subscribers from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.newsletter_subscribers to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.newsletter_subscribers to service_role;
revoke all on public.packages from anon, authenticated, service_role;
grant select on public.packages to anon;
grant delete, insert, references, select, trigger, truncate, update on public.packages to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.packages to service_role;
revoke all on public.passenger_profiles from anon, authenticated, service_role;
grant delete, insert, select, update on public.passenger_profiles to authenticated;
grant select, update on public.passenger_profiles to service_role;
revoke all on public.payment_receipts from anon, authenticated, service_role;
grant select on public.payment_receipts to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.payment_receipts to service_role;
revoke all on public.payment_recording_requests from anon, authenticated, service_role;
grant select on public.payment_recording_requests to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.payment_recording_requests to service_role;
revoke all on public.payments from anon, authenticated, service_role;
grant insert, references, select, trigger on public.payments to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.payments to service_role;
revoke all on public.portal_otps from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.portal_otps to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.portal_otps to service_role;
revoke all on public.promo_spins from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.promo_spins to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.promo_spins to service_role;
revoke all on public.quotation_items from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.quotation_items to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.quotation_items to service_role;
revoke all on public.quotation_shares from anon, authenticated, service_role;
grant insert, select, update on public.quotation_shares to authenticated;
grant select, update on public.quotation_shares to service_role;
revoke all on public.quotation_versions from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.quotation_versions to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.quotation_versions to service_role;
revoke all on public.quotations from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.quotations to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.quotations to service_role;
revoke all on public.rate_limits from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.rate_limits to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.rate_limits to service_role;
revoke all on public.reservation_items from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.reservation_items to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.reservation_items to service_role;
revoke all on public.reservation_message_attachments from anon, authenticated, service_role;
grant select on public.reservation_message_attachments to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.reservation_message_attachments to service_role;
revoke all on public.reservation_messages from anon, authenticated, service_role;
grant select on public.reservation_messages to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.reservation_messages to service_role;
revoke all on public.reservation_travel from anon, authenticated, service_role;
grant select on public.reservation_travel to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.reservation_travel to service_role;
revoke all on public.reservation_travel_history from anon, authenticated, service_role;
grant select on public.reservation_travel_history to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.reservation_travel_history to service_role;
revoke all on public.reservations from anon, authenticated, service_role;
grant insert, references, select, trigger, update on public.reservations to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.reservations to service_role;
revoke all on public.review_invitations from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.review_invitations to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.review_invitations to service_role;
revoke all on public.reviews from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.reviews to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.reviews to service_role;
revoke all on public.service_catalog from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.service_catalog to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.service_catalog to service_role;
revoke all on public.support_tickets from anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.support_tickets to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.support_tickets to service_role;
revoke all on public.travel_deliveries from anon, authenticated, service_role;
grant insert, select, update on public.travel_deliveries to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.travel_deliveries to service_role;
revoke all on public.trip_feedback from anon, authenticated, service_role;
grant select on public.trip_feedback to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.trip_feedback to service_role;
revoke all on public.trip_service_requests from anon, authenticated, service_role;
grant select on public.trip_service_requests to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.trip_service_requests to service_role;
revoke all on public.reviews_publicas from anon, authenticated, service_role;
grant select on public.reviews_publicas to anon;
grant select, trigger on public.reviews_publicas to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.reviews_publicas to service_role;
revoke all on public.reviews_resumen from anon, authenticated, service_role;
grant select on public.reviews_resumen to anon;
grant select, trigger on public.reviews_resumen to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.reviews_resumen to service_role;

-- Function execute privileges (from proacl; "=X" is PUBLIC).
-- accept_quotation(p_id uuid, p_version_id uuid, p_notes text)
revoke all on function public.accept_quotation(p_id uuid, p_version_id uuid, p_notes text) from public, anon, authenticated, service_role;
grant execute on function public.accept_quotation(p_id uuid, p_version_id uuid, p_notes text) to authenticated;
grant execute on function public.accept_quotation(p_id uuid, p_version_id uuid, p_notes text) to service_role;
-- admin_audit_log_immutable()
revoke all on function public.admin_audit_log_immutable() from public, anon, authenticated, service_role;
grant execute on function public.admin_audit_log_immutable() to service_role;
-- apply_quotation_amendment(p_amendment uuid)
revoke all on function public.apply_quotation_amendment(p_amendment uuid) from public, anon, authenticated, service_role;
grant execute on function public.apply_quotation_amendment(p_amendment uuid) to authenticated;
-- audit_invoice_change() · SECURITY DEFINER
revoke all on function public.audit_invoice_change() from public, anon, authenticated, service_role;
grant execute on function public.audit_invoice_change() to service_role;
-- audit_passenger_profile() · SECURITY DEFINER
revoke all on function public.audit_passenger_profile() from public, anon, authenticated, service_role;
-- audit_payment_change() · SECURITY DEFINER
revoke all on function public.audit_payment_change() from public, anon, authenticated, service_role;
grant execute on function public.audit_payment_change() to service_role;
-- audit_quotation_change() · SECURITY DEFINER
revoke all on function public.audit_quotation_change() from public, anon, authenticated, service_role;
grant execute on function public.audit_quotation_change() to service_role;
-- audit_quotation_share() · SECURITY DEFINER
revoke all on function public.audit_quotation_share() from public, anon, authenticated, service_role;
-- audit_receipt_created() · SECURITY DEFINER
revoke all on function public.audit_receipt_created() from public, anon, authenticated, service_role;
grant execute on function public.audit_receipt_created() to service_role;
-- audit_reservation_change() · SECURITY DEFINER
revoke all on function public.audit_reservation_change() from public, anon, authenticated, service_role;
grant execute on function public.audit_reservation_change() to service_role;
-- audit_travel_revision() · SECURITY DEFINER
revoke all on function public.audit_travel_revision() from public, anon, authenticated, service_role;
grant execute on function public.audit_travel_revision() to service_role;
-- cancel_reservation(p_id uuid, p_reason text, p_annul_invoices boolean)
revoke all on function public.cancel_reservation(p_id uuid, p_reason text, p_annul_invoices boolean) from public, anon, authenticated, service_role;
grant execute on function public.cancel_reservation(p_id uuid, p_reason text, p_annul_invoices boolean) to authenticated;
-- catalog_audit()
revoke all on function public.catalog_audit() from public, anon, authenticated, service_role;
grant execute on function public.catalog_audit() to public;
grant execute on function public.catalog_audit() to anon;
grant execute on function public.catalog_audit() to authenticated;
grant execute on function public.catalog_audit() to service_role;
-- confirm_quotation_share(p_share uuid)
revoke all on function public.confirm_quotation_share(p_share uuid) from public, anon, authenticated, service_role;
grant execute on function public.confirm_quotation_share(p_share uuid) to authenticated;
-- convert_accepted_quotation(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text)
revoke all on function public.convert_accepted_quotation(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text) from public, anon, authenticated, service_role;
grant execute on function public.convert_accepted_quotation(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text) to authenticated;
grant execute on function public.convert_accepted_quotation(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text) to service_role;
-- convert_quotation_with_passengers(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text, p_public jsonb, p_encrypted text) · SECURITY DEFINER
revoke all on function public.convert_quotation_with_passengers(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text, p_public jsonb, p_encrypted text) from public, anon, authenticated, service_role;
grant execute on function public.convert_quotation_with_passengers(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text, p_public jsonb, p_encrypted text) to authenticated;
grant execute on function public.convert_quotation_with_passengers(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text, p_public jsonb, p_encrypted text) to service_role;
-- create_payment_receipt(p_payment uuid) · SECURITY DEFINER
revoke all on function public.create_payment_receipt(p_payment uuid) from public, anon, authenticated, service_role;
grant execute on function public.create_payment_receipt(p_payment uuid) to authenticated;
grant execute on function public.create_payment_receipt(p_payment uuid) to service_role;
-- create_quotation_copy(p_source uuid, p_amendment boolean, p_row jsonb, p_items jsonb)
revoke all on function public.create_quotation_copy(p_source uuid, p_amendment boolean, p_row jsonb, p_items jsonb) from public, anon, authenticated, service_role;
grant execute on function public.create_quotation_copy(p_source uuid, p_amendment boolean, p_row jsonb, p_items jsonb) to authenticated;
-- create_reservation_invoice(p_id uuid, p_due date)
revoke all on function public.create_reservation_invoice(p_id uuid, p_due date) from public, anon, authenticated, service_role;
grant execute on function public.create_reservation_invoice(p_id uuid, p_due date) to authenticated;
grant execute on function public.create_reservation_invoice(p_id uuid, p_due date) to service_role;
-- guard_receipted_payment()
revoke all on function public.guard_receipted_payment() from public, anon, authenticated, service_role;
grant execute on function public.guard_receipted_payment() to public;
grant execute on function public.guard_receipted_payment() to anon;
grant execute on function public.guard_receipted_payment() to authenticated;
grant execute on function public.guard_receipted_payment() to service_role;
-- guard_supplier_ticketing()
revoke all on function public.guard_supplier_ticketing() from public, anon, authenticated, service_role;
grant execute on function public.guard_supplier_ticketing() to public;
grant execute on function public.guard_supplier_ticketing() to anon;
grant execute on function public.guard_supplier_ticketing() to authenticated;
grant execute on function public.guard_supplier_ticketing() to service_role;
-- guard_travel_delivery()
revoke all on function public.guard_travel_delivery() from public, anon, authenticated, service_role;
grant execute on function public.guard_travel_delivery() to public;
grant execute on function public.guard_travel_delivery() to anon;
grant execute on function public.guard_travel_delivery() to authenticated;
grant execute on function public.guard_travel_delivery() to service_role;
-- guard_travel_passenger_counts() · SECURITY DEFINER
revoke all on function public.guard_travel_passenger_counts() from public, anon, authenticated, service_role;
grant execute on function public.guard_travel_passenger_counts() to public;
grant execute on function public.guard_travel_passenger_counts() to anon;
grant execute on function public.guard_travel_passenger_counts() to authenticated;
grant execute on function public.guard_travel_passenger_counts() to service_role;
-- hit_rate_limit(p_key text, p_max integer, p_window_seconds integer) · SECURITY DEFINER
revoke all on function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer) from public, anon, authenticated, service_role;
grant execute on function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer) to public;
grant execute on function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer) to service_role;
-- invoice_integrity_guard()
revoke all on function public.invoice_integrity_guard() from public, anon, authenticated, service_role;
grant execute on function public.invoice_integrity_guard() to public;
grant execute on function public.invoice_integrity_guard() to anon;
grant execute on function public.invoice_integrity_guard() to authenticated;
grant execute on function public.invoice_integrity_guard() to service_role;
-- is_admin() · SECURITY DEFINER
revoke all on function public.is_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_admin() to public;
grant execute on function public.is_admin() to anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;
-- log_admin_action(p_action text, p_entity text, p_entity_id uuid, p_reference text, p_details jsonb) · SECURITY DEFINER
revoke all on function public.log_admin_action(p_action text, p_entity text, p_entity_id uuid, p_reference text, p_details jsonb) from public, anon, authenticated, service_role;
grant execute on function public.log_admin_action(p_action text, p_entity text, p_entity_id uuid, p_reference text, p_details jsonb) to authenticated;
grant execute on function public.log_admin_action(p_action text, p_entity text, p_entity_id uuid, p_reference text, p_details jsonb) to service_role;
-- post_customer_message(p_reservation_id uuid, p_topic text, p_body text, p_path text, p_name text, p_mime text, p_size integer)
revoke all on function public.post_customer_message(p_reservation_id uuid, p_topic text, p_body text, p_path text, p_name text, p_mime text, p_size integer) from public, anon, authenticated, service_role;
grant execute on function public.post_customer_message(p_reservation_id uuid, p_topic text, p_body text, p_path text, p_name text, p_mime text, p_size integer) to service_role;
-- purge_reservation_travel_private(p_id uuid, p_revision integer, p_encrypted text) · SECURITY DEFINER
revoke all on function public.purge_reservation_travel_private(p_id uuid, p_revision integer, p_encrypted text) from public, anon, authenticated, service_role;
grant execute on function public.purge_reservation_travel_private(p_id uuid, p_revision integer, p_encrypted text) to authenticated;
grant execute on function public.purge_reservation_travel_private(p_id uuid, p_revision integer, p_encrypted text) to service_role;
-- quotation_items_lock_accepted()
revoke all on function public.quotation_items_lock_accepted() from public, anon, authenticated, service_role;
grant execute on function public.quotation_items_lock_accepted() to public;
grant execute on function public.quotation_items_lock_accepted() to anon;
grant execute on function public.quotation_items_lock_accepted() to authenticated;
grant execute on function public.quotation_items_lock_accepted() to service_role;
-- quotation_shares_guard()
revoke all on function public.quotation_shares_guard() from public, anon, authenticated, service_role;
-- quotation_versions_immutable()
revoke all on function public.quotation_versions_immutable() from public, anon, authenticated, service_role;
grant execute on function public.quotation_versions_immutable() to public;
grant execute on function public.quotation_versions_immutable() to anon;
grant execute on function public.quotation_versions_immutable() to authenticated;
grant execute on function public.quotation_versions_immutable() to service_role;
-- quotations_lock_accepted()
revoke all on function public.quotations_lock_accepted() from public, anon, authenticated, service_role;
grant execute on function public.quotations_lock_accepted() to public;
grant execute on function public.quotations_lock_accepted() to anon;
grant execute on function public.quotations_lock_accepted() to authenticated;
grant execute on function public.quotations_lock_accepted() to service_role;
-- record_reservation_payment(p_request uuid, p_reservation uuid, p_amount numeric, p_currency text, p_method text, p_date date, p_reference text, p_notes text) · SECURITY DEFINER
revoke all on function public.record_reservation_payment(p_request uuid, p_reservation uuid, p_amount numeric, p_currency text, p_method text, p_date date, p_reference text, p_notes text) from public, anon, authenticated, service_role;
grant execute on function public.record_reservation_payment(p_request uuid, p_reservation uuid, p_amount numeric, p_currency text, p_method text, p_date date, p_reference text, p_notes text) to authenticated;
grant execute on function public.record_reservation_payment(p_request uuid, p_reservation uuid, p_amount numeric, p_currency text, p_method text, p_date date, p_reference text, p_notes text) to service_role;
-- record_reservation_refund(p_request uuid, p_reservation uuid, p_kind text, p_amount numeric, p_method text, p_date date, p_reference text, p_reason text, p_reverses uuid) · SECURITY DEFINER
revoke all on function public.record_reservation_refund(p_request uuid, p_reservation uuid, p_kind text, p_amount numeric, p_method text, p_date date, p_reference text, p_reason text, p_reverses uuid) from public, anon, authenticated, service_role;
grant execute on function public.record_reservation_refund(p_request uuid, p_reservation uuid, p_kind text, p_amount numeric, p_method text, p_date date, p_reference text, p_reason text, p_reverses uuid) to authenticated;
-- redeem_promo_spin(p_code text, p_segments jsonb) · SECURITY DEFINER
revoke all on function public.redeem_promo_spin(p_code text, p_segments jsonb) from public, anon, authenticated, service_role;
grant execute on function public.redeem_promo_spin(p_code text, p_segments jsonb) to service_role;
-- replace_quotation_items(p_quotation_id uuid, p_items jsonb)
revoke all on function public.replace_quotation_items(p_quotation_id uuid, p_items jsonb) from public, anon, authenticated, service_role;
grant execute on function public.replace_quotation_items(p_quotation_id uuid, p_items jsonb) to authenticated;
grant execute on function public.replace_quotation_items(p_quotation_id uuid, p_items jsonb) to service_role;
-- reservation_commercial_guard()
revoke all on function public.reservation_commercial_guard() from public, anon, authenticated, service_role;
grant execute on function public.reservation_commercial_guard() to public;
grant execute on function public.reservation_commercial_guard() to anon;
grant execute on function public.reservation_commercial_guard() to authenticated;
grant execute on function public.reservation_commercial_guard() to service_role;
-- reservation_items_commercial_guard()
revoke all on function public.reservation_items_commercial_guard() from public, anon, authenticated, service_role;
grant execute on function public.reservation_items_commercial_guard() to public;
grant execute on function public.reservation_items_commercial_guard() to anon;
grant execute on function public.reservation_items_commercial_guard() to authenticated;
grant execute on function public.reservation_items_commercial_guard() to service_role;
-- save_reservation_record(p_id uuid, p_values jsonb, p_items jsonb)
revoke all on function public.save_reservation_record(p_id uuid, p_values jsonb, p_items jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_reservation_record(p_id uuid, p_values jsonb, p_items jsonb) to authenticated;
grant execute on function public.save_reservation_record(p_id uuid, p_values jsonb, p_items jsonb) to service_role;
-- save_reservation_travel(p_id uuid, p_revision integer, p_public jsonb, p_encrypted text, p_context uuid) · SECURITY DEFINER
revoke all on function public.save_reservation_travel(p_id uuid, p_revision integer, p_public jsonb, p_encrypted text, p_context uuid) from public, anon, authenticated, service_role;
grant execute on function public.save_reservation_travel(p_id uuid, p_revision integer, p_public jsonb, p_encrypted text, p_context uuid) to authenticated;
grant execute on function public.save_reservation_travel(p_id uuid, p_revision integer, p_public jsonb, p_encrypted text, p_context uuid) to service_role;
-- set_updated_at()
revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;
grant execute on function public.set_updated_at() to public;
grant execute on function public.set_updated_at() to anon;
grant execute on function public.set_updated_at() to authenticated;
grant execute on function public.set_updated_at() to service_role;

-- Storage buckets.
-- blog-images: PUBLIC, limit 5242880, types image/jpeg image/png image/webp
-- passenger-docs: private, limit 5242880, types image/jpeg
-- portal-docs: private, limit 8388608, types application/pdf image/jpeg image/png image/webp
-- quotation-media: private, limit 5242880, types image/jpeg
-- review-photos: PUBLIC, limit 3145728, types image/jpeg image/png image/webp

-- Storage policies (storage.objects and related).
-- admin delete blog-images · DELETE · authenticated · using (((bucket_id = 'blog-images'::text) AND is_admin()))
-- admin update blog-images · UPDATE · authenticated · using (((bucket_id = 'blog-images'::text) AND is_admin()))
-- admin upload blog-images · INSERT · authenticated · check (((bucket_id = 'blog-images'::text) AND is_admin()))
-- passenger_docs_admin_delete · DELETE · authenticated · using (((bucket_id = 'passenger-docs'::text) AND is_admin()))
-- passenger_docs_admin_insert · INSERT · authenticated · check (((bucket_id = 'passenger-docs'::text) AND is_admin() AND (name ~ '^[0-9a-f-]{36}/(foto|pasaporte)-[0-9a-f]{32}\.jpg$'::text) AND (EXISTS ( SELECT 1 FROM passenger_profiles p WHERE ((p.id)::text = split_part(objects.name, '/'::text, 1))))))
-- passenger_docs_admin_select · SELECT · authenticated · using (((bucket_id = 'passenger-docs'::text) AND is_admin()))
-- portal_docs_admin_delete · DELETE · authenticated · using (((bucket_id = 'portal-docs'::text) AND is_admin()))
-- portal_docs_admin_insert · INSERT · authenticated · check (((bucket_id = 'portal-docs'::text) AND is_admin()))
-- portal_docs_admin_select · SELECT · authenticated · using (((bucket_id = 'portal-docs'::text) AND is_admin()))
-- quotation_media_admin_delete_unused · DELETE · authenticated · using (((bucket_id = 'quotation-media'::text) AND is_admin() AND (created_at < (now() - '7 days'::interval)) AND (NOT (EXISTS ( SELECT 1 FROM quotations q WHERE (POSITION((objects.name) IN ((q.detalles)::text)) > 0)))) AND (NOT (EXISTS ( SELECT 1 FROM quotation_versions v WHERE (POSITION((objects.name) IN ((v.snapshot)::text)) > 0)))) AND (NOT (EXISTS ( SELECT 1 FROM hotel_catalog h WHERE (POSITION((objects.name) IN ((h.fotos)::text)) > 0))))))
-- quotation_media_admin_insert · INSERT · authenticated · check (((bucket_id = 'quotation-media'::text) AND is_admin() AND (name ~ '^hotel/[0-9a-f]{32}\.jpg$'::text)))
-- quotation_media_admin_select · SELECT · authenticated · using (((bucket_id = 'quotation-media'::text) AND is_admin()))
