-- Opcional. Ejecutar DESPUÉS de quotations_v6.sql para empezar el catálogo de aerolíneas con nombres y
-- códigos públicos (IATA / OACI) de aerolíneas frecuentes en viajes desde Honduras. No crea plantillas de
-- tarifa ni equipaje: esas condiciones las registra el equipo después de verificarlas con cada aerolínea.
-- Se puede volver a ejecutar: omite las que ya existan.
insert into public.airline_catalog (nombre, iata, icao, pais) values
  ('American Airlines', 'AA', 'AAL', 'Estados Unidos'),
  ('United Airlines', 'UA', 'UAL', 'Estados Unidos'),
  ('Delta Air Lines', 'DL', 'DAL', 'Estados Unidos'),
  ('Spirit Airlines', 'NK', 'NKS', 'Estados Unidos'),
  ('Frontier Airlines', 'F9', 'FFT', 'Estados Unidos'),
  ('JetBlue', 'B6', 'JBU', 'Estados Unidos'),
  ('Southwest Airlines', 'WN', 'SWA', 'Estados Unidos'),
  ('Copa Airlines', 'CM', 'CMP', 'Panamá'),
  ('Avianca', 'AV', 'AVA', 'Colombia'),
  ('Aeroméxico', 'AM', 'AMX', 'México'),
  ('Volaris', 'Y4', 'VOI', 'México'),
  ('Viva Aerobus', 'VB', 'VIV', 'México'),
  ('Iberia', 'IB', 'IBE', 'España'),
  ('Air Europa', 'UX', 'AEA', 'España'),
  ('Air Canada', 'AC', 'ACA', 'Canadá'),
  ('KLM', 'KL', 'KLM', 'Países Bajos'),
  ('Air France', 'AF', 'AFR', 'Francia'),
  ('British Airways', 'BA', 'BAW', 'Reino Unido'),
  ('Lufthansa', 'LH', 'DLH', 'Alemania'),
  ('Turkish Airlines', 'TK', 'THY', 'Turquía')
on conflict do nothing;
