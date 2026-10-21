-- Generado con: node scripts/package-insert-sql.mjs --destination=panama panama-ciudad-canal-casco-historico panama-ciudad-playa-blanca-todo-incluido escapada-fin-de-semana-panama
-- No editar a mano: cambie data/packages.json y vuelva a generarlo.
--
-- Inserta los paquetes SIN publicar (publicado = false). Si un slug ya existe, no lo toca.
-- Requiere docs/sql/packages_ficha.sql (columna ficha).

begin;

-- panama-ciudad-canal-casco-historico
insert into public.packages (slug, nombre, destino, resumen, descripcion, incluye, no_incluye, itinerario, duracion, imagen_url, galeria, destacado, publicado, orden, categoria, etiquetas, precio_desde, moneda, ficha, destination_id)
select r.slug, r.nombre, r.destino, r.resumen, r.descripcion, r.incluye, r.no_incluye, r.itinerario, r.duracion, r.imagen_url, r.galeria, r.destacado, r.publicado, r.orden, r.categoria, r.etiquetas, r.precio_desde, r.moneda, r.ficha, (select id from public.destinations where slug = 'panama')
from jsonb_populate_record(null::public.packages, $pkg${
  "slug": "panama-ciudad-canal-casco-historico",
  "nombre": "Panamá Espectacular: Ciudad, Canal y Casco Histórico",
  "destino": "Ciudad de Panamá",
  "resumen": "El Canal de Panamá en Miraflores, el Casco Antiguo con guía y la ciudad moderna frente a la bahía, en cuatro días de ritmo cómodo desde Honduras.",
  "descripcion": "Panamá Espectacular reúne en cuatro días lo esencial de la capital panameña: la ingeniería del Canal, la historia del Casco Antiguo, declarado Patrimonio de la Humanidad por la UNESCO, y el horizonte de rascacielos que se levanta frente a la bahía.\n\nUsted elige su hotel entre cinco opciones, desde un hotel confortable con desayuno incluido hasta un hotel de lujo frente al mar en el Casco Antiguo. El segundo día visita el Centro de Visitantes de Miraflores, con la entrada incluida, y recorre a pie con un guía las plazas e iglesias del Casco Antiguo. El tercero conoce la ciudad moderna y la Calzada de Amador en un recorrido panorámico, y la tarde queda libre.\n\nEs un viaje pensado para parejas, familias y viajeros que visitan Panamá por primera vez. Su asesor ajusta fechas, hotel, vuelos y servicios adicionales en una cotización personalizada.",
  "incluye": [
    "3 noches de alojamiento en Ciudad de Panamá, en el hotel que elija entre las opciones propuestas",
    "Desayuno diario",
    "Traslado de llegada del Aeropuerto Internacional de Tocumen a su hotel",
    "Traslado de salida de su hotel al Aeropuerto Internacional de Tocumen",
    "Excursión al Canal de Panamá con entrada al Centro de Visitantes de Miraflores",
    "Recorrido guiado a pie por el Casco Antiguo",
    "Recorrido panorámico de medio día por la ciudad moderna, la Cinta Costera y la Calzada de Amador",
    "Transporte y guía de habla hispana en las excursiones incluidas",
    "Asistencia de nuestro equipo antes y durante el viaje"
  ],
  "no_incluye": [
    "Boleto aéreo desde Honduras (se cotiza por separado según sus fechas)",
    "Almuerzos, cenas y bebidas",
    "Entradas a atracciones no mencionadas, como el Biomuseo o Panamá Viejo",
    "Excursiones opcionales",
    "Seguro o asistencia de viaje",
    "Propinas, gastos personales y compras",
    "Equipaje adicional y otros cargos de la aerolínea",
    "Impuestos o cargos que se paguen en el destino, salvo que su cotización indique lo contrario",
    "Cualquier servicio que no aparezca como incluido"
  ],
  "itinerario": "Día 1 — Bienvenidos a la Ciudad de Panamá. Recepción en el Aeropuerto Internacional de Tocumen y traslado a su hotel. Después del registro de entrada (habitualmente desde las 15:00), tarde libre. Le sugerimos un primer paseo por la Cinta Costera al atardecer o una cena en el Casco Antiguo.\nDía 2 — Canal de Panamá y Casco Antiguo. Por la mañana, visita al Centro de Visitantes de Miraflores, con entrada incluida, para observar las esclusas desde sus terrazas y recorrer sus exhibiciones. Por la tarde, recorrido a pie con guía por el Casco Antiguo: la Plaza de la Independencia y la Catedral Metropolitana, la Iglesia de San José y su Altar de Oro, la Plaza de Francia y el Paseo Esteban Huertas. Regreso al hotel.\nDía 3 — La Panamá moderna. Recorrido panorámico de medio día por la Avenida Balboa y la Cinta Costera, el área bancaria y la Calzada de Amador, con parada para fotografías frente al horizonte de la ciudad y el Puente de las Américas. Tarde libre para compras en Multiplaza o Albrook Mall, visitar el Biomuseo o disfrutar la gastronomía de la ciudad.\nDía 4 — Hasta pronto, Panamá. Registro de salida (habitualmente antes de las 12:00) y traslado al Aeropuerto Internacional de Tocumen según el horario de su vuelo. Fin de los servicios.",
  "duracion": "4 días / 3 noches",
  "imagen_url": "/paquetes/panama-ciudad-canal-casco-historico/1.jpg",
  "galeria": [
    "/paquetes/panama-ciudad-canal-casco-historico/1.jpg",
    "/paquetes/panama-ciudad-canal-casco-historico/2.jpg",
    "/paquetes/panama-ciudad-canal-casco-historico/3.jpg",
    "/paquetes/panama-ciudad-canal-casco-historico/4.jpg",
    "/paquetes/panama-ciudad-canal-casco-historico/5.jpg",
    "/paquetes/panama-ciudad-canal-casco-historico/6.jpg",
    "/paquetes/panama-ciudad-canal-casco-historico/7.jpg",
    "/paquetes/panama-ciudad-canal-casco-historico/8.jpg",
    "/paquetes/panama-ciudad-canal-casco-historico/9.jpg",
    "/paquetes/panama-ciudad-canal-casco-historico/10.jpg",
    "/paquetes/panama-ciudad-canal-casco-historico/11.jpg"
  ],
  "destacado": false,
  "publicado": false,
  "orden": 35,
  "categoria": "Centroamérica",
  "etiquetas": [
    "cultura",
    "parejas",
    "familias"
  ],
  "precio_desde": null,
  "moneda": null,
  "ficha": {
    "subtitulo": "Cuatro días para conocer el Canal, recorrer el Casco Antiguo con guía y disfrutar la Ciudad de Panamá moderna.",
    "destacados": [
      "Entrada al Centro de Visitantes de Miraflores, con terrazas frente a las esclusas",
      "Recorrido guiado a pie por el Casco Antiguo, Patrimonio de la Humanidad",
      "Recorrido panorámico por la ciudad moderna y la Calzada de Amador",
      "Cinco hoteles para elegir, del confort al lujo, con desayuno diario",
      "Traslados de aeropuerto y tiempo libre para compras y gastronomía"
    ],
    "estancias": [
      {
        "id": "ciudad",
        "campo": "hotel",
        "titulo": "Su hotel en la Ciudad de Panamá",
        "noches": "3 noches",
        "plan": "Desayuno diario",
        "descripcion": "Elija la zona y la categoría que prefiera: el área bancaria, la Avenida Balboa frente a la bahía o el propio Casco Antiguo.",
        "portada": {
          "archivo": "/paquetes/panama-ciudad-canal-casco-historico/1.jpg",
          "alt": "Vista aérea de la Ciudad de Panamá, con sus rascacielos frente a la bahía"
        },
        "hoteles": [
          {
            "id": "hampton-by-hilton-panama",
            "nombre": "Hampton by Hilton Panamá",
            "categoria": "Confort",
            "zona": "Calle Eusebio A. Morales, El Cangrejo",
            "descripcion": "Hotel práctico y moderno en una zona de restaurantes y cafés, cerca del área bancaria y de Vía España. Una base cómoda para quien pasa el día fuera y prefiere el desayuno incluido en la tarifa.",
            "habitacion": "Habitación estándar (tipo de cama según disponibilidad)",
            "plan": "Desayuno bufé incluido en la tarifa del hotel",
            "amenidades": [
              "Desayuno bufé diario",
              "Piscina al aire libre con bar",
              "Terraza en la azotea",
              "Wifi"
            ],
            "ideal": "Viajeros que buscan buena ubicación y desayuno incluido en una categoría confortable.",
            "condiciones": [
              "Tarifa y disponibilidad se confirman al cotizar",
              "El trayecto al Casco Antiguo y a los centros comerciales es en taxi"
            ],
            "mejoras": [
              "Cambio a un hotel de categoría superior"
            ],
            "fotos": []
          },
          {
            "id": "riu-plaza-panama",
            "nombre": "Hotel Riu Plaza Panamá",
            "categoria": "Superior",
            "zona": "Calle 50, Marbella (área bancaria)",
            "descripcion": "Gran hotel urbano de la cadena RIU en pleno centro financiero, con tres restaurantes, piscina al aire libre y gimnasio. Muy bien conectado con Calle 50, la Cinta Costera y los centros comerciales.",
            "habitacion": "Habitación doble estándar",
            "plan": "Alojamiento con desayuno, según la tarifa que se confirme",
            "amenidades": [
              "Tres restaurantes y bares, entre ellos uno junto a la piscina",
              "Piscina al aire libre",
              "Gimnasio",
              "Salones de eventos y centro de negocios"
            ],
            "ideal": "Familias y viajeros que buscan un hotel completo en el centro financiero, cerca de restaurantes y compras.",
            "condiciones": [
              "El desayuno depende de la tarifa: su cotización indica si está incluido",
              "El estacionamiento tiene costo"
            ],
            "mejoras": [
              "Habitación superior o suite, según disponibilidad"
            ],
            "fotos": [
              {
                "archivo": "/hoteles/riu-plaza-panama/1.jpg",
                "alt": "Fachada del Hotel Riu Plaza Panamá, en Marbella"
              },
              {
                "archivo": "/hoteles/riu-plaza-panama/2.jpg",
                "alt": "Vestíbulo del Hotel Riu Plaza Panamá"
              }
            ]
          },
          {
            "id": "hilton-panama",
            "nombre": "Hilton Panamá",
            "categoria": "Superior",
            "zona": "Avenida Balboa y Aquilino de la Guardia, frente a la bahía",
            "descripcion": "Torre sobre la Avenida Balboa, a pasos de la Cinta Costera y a dos cuadras del área bancaria, con vista a la bahía desde muchas de sus habitaciones.",
            "habitacion": "Habitación estándar; con vista a la bahía según la categoría",
            "plan": "Alojamiento con desayuno, según la tarifa que se confirme",
            "amenidades": [
              "Piscina climatizada en la azotea con vista a la bahía",
              "Spa y gimnasio",
              "Salón ejecutivo en las habitaciones de categoría ejecutiva",
              "A pasos de la Cinta Costera"
            ],
            "ideal": "Quienes quieren caminar por la Cinta Costera y despertar con vista a la bahía.",
            "condiciones": [
              "El desayuno no siempre está incluido: depende de la tarifa",
              "No confundir con el Hampton by Hilton, que es otro hotel"
            ],
            "mejoras": [
              "Habitación con vista a la bahía",
              "Habitación ejecutiva con acceso al salón ejecutivo"
            ],
            "fotos": []
          },
          {
            "id": "central-hotel-panama",
            "nombre": "Central Hotel Panamá",
            "categoria": "Boutique en el Casco Antiguo",
            "zona": "Plaza de la Independencia, Casco Antiguo",
            "descripcion": "Edificio histórico restaurado frente a la Plaza de la Independencia y la Catedral Metropolitana, junto al Museo del Canal Interoceánico. Permite vivir el Casco Antiguo desde adentro y salir caminando a plazas, iglesias y restaurantes.",
            "habitacion": "Habitación estándar; con vista a la plaza según disponibilidad",
            "plan": "Alojamiento con desayuno, según la tarifa que se confirme",
            "amenidades": [
              "Piscina en la azotea",
              "Algunas habitaciones con vista a la plaza y a la Catedral",
              "Ubicación para recorrer el Casco Antiguo a pie"
            ],
            "ideal": "Viajeros interesados en la historia que prefieren alojarse en el centro histórico.",
            "condiciones": [
              "El Casco Antiguo tiene calles adoquinadas y vida nocturna: algunas habitaciones pueden recibir ruido",
              "El trayecto al área bancaria y a los centros comerciales es en taxi"
            ],
            "mejoras": [
              "Habitación con vista a la Plaza de la Independencia"
            ],
            "fotos": [
              {
                "archivo": "/hoteles/central-hotel-panama/1.jpg",
                "alt": "Fachada restaurada del Central Hotel Panamá, en la Plaza de la Independencia"
              }
            ],
            "recomendado": true
          },
          {
            "id": "sofitel-legend-casco-viejo",
            "nombre": "Sofitel Legend Casco Viejo",
            "categoria": "Lujo",
            "zona": "Calle 1a Oeste, Casco Antiguo, frente al mar",
            "descripcion": "Ocupa el antiguo edificio del Club Unión, restaurado y abierto en 2022 como hotel de la colección Sofitel Legend, frente a la bahía y con vista a los rascacielos de la ciudad.",
            "habitacion": "Habitación clásica; con vista al mar según la categoría",
            "plan": "Alojamiento; desayuno según la tarifa que se confirme",
            "amenidades": [
              "Piscina al aire libre frente a la bahía",
              "Spa",
              "Restaurante y bar",
              "Habitaciones con vista al mar, algunas con balcón"
            ],
            "ideal": "Viajes especiales: aniversarios, lunas de miel o una ocasión para celebrar.",
            "condiciones": [
              "Es la opción de mayor categoría del paquete; la diferencia de tarifa se indica en su cotización"
            ],
            "mejoras": [
              "Habitación frente al mar o suite"
            ],
            "fotos": [
              {
                "archivo": "/hoteles/sofitel-legend-casco-viejo/1.jpg",
                "alt": "Sofitel Legend Casco Viejo iluminado de noche frente a la bahía, con la ciudad al fondo"
              }
            ]
          }
        ]
      }
    ],
    "dias": [
      {
        "titulo": "Bienvenidos a la Ciudad de Panamá",
        "descripcion": "Recepción en el Aeropuerto Internacional de Tocumen y traslado a su hotel. Después del registro de entrada (habitualmente desde las 15:00), tarde libre. Le sugerimos un primer paseo por la Cinta Costera al atardecer o una cena en el Casco Antiguo.",
        "comidas": null,
        "alojamiento": "Su hotel en la Ciudad de Panamá"
      },
      {
        "titulo": "Canal de Panamá y Casco Antiguo",
        "descripcion": "Por la mañana, visita al Centro de Visitantes de Miraflores, con entrada incluida, para observar las esclusas desde sus terrazas y recorrer sus exhibiciones. Por la tarde, recorrido a pie con guía por el Casco Antiguo: la Plaza de la Independencia y la Catedral Metropolitana, la Iglesia de San José y su Altar de Oro, la Plaza de Francia y el Paseo Esteban Huertas. Regreso al hotel.",
        "comidas": "Desayuno",
        "alojamiento": "Su hotel en la Ciudad de Panamá"
      },
      {
        "titulo": "La Panamá moderna",
        "descripcion": "Recorrido panorámico de medio día por la Avenida Balboa y la Cinta Costera, el área bancaria y la Calzada de Amador, con parada para fotografías frente al horizonte de la ciudad y el Puente de las Américas. Tarde libre para compras en Multiplaza o Albrook Mall, visitar el Biomuseo o disfrutar la gastronomía de la ciudad.",
        "comidas": "Desayuno",
        "alojamiento": "Su hotel en la Ciudad de Panamá"
      },
      {
        "titulo": "Hasta pronto, Panamá",
        "descripcion": "Registro de salida (habitualmente antes de las 12:00) y traslado al Aeropuerto Internacional de Tocumen según el horario de su vuelo. Fin de los servicios.",
        "comidas": "Desayuno",
        "alojamiento": null
      }
    ],
    "experiencias": [
      {
        "id": "canal-miraflores",
        "titulo": "Visita al Canal de Panamá en Miraflores",
        "modalidad": "incluido",
        "foto": {
          "archivo": "/experiencias/canal-miraflores.jpg",
          "alt": "Vista de las esclusas de Miraflores desde el Centro de Visitantes"
        },
        "descripcion": "Las esclusas de Miraflores, en el lado Pacífico del Canal, suben y bajan los barcos en dos escalones entre el lago Miraflores y el océano. Desde las terrazas del Centro de Visitantes se observan de cerca las compuertas, las locomotoras que guían a los buques y, si coincide un tránsito, el paso de un barco.",
        "destacados": [
          "Terrazas de observación frente a las esclusas",
          "Exhibiciones sobre la historia y el funcionamiento del Canal",
          "Locomotoras eléctricas que guían a los buques"
        ],
        "duracion": "Alrededor de 2 a 3 horas con los traslados (estimado)",
        "lugar": "Centro de Visitantes de Miraflores, a unos 20 a 30 minutos del centro de la ciudad",
        "entradas": "Entrada al Centro de Visitantes incluida",
        "preparacion": "Lleve gorra o sombrero y protector solar: las terrazas son al aire libre.",
        "notas": [
          "La Autoridad del Canal informó obras de modernización del Centro de Visitantes hasta finales de 2026: algunas áreas pueden no estar disponibles y la espera puede ser mayor en horas de alta afluencia.",
          "El paso de buques depende de la programación del Canal: no es posible garantizar un tránsito durante su visita."
        ]
      },
      {
        "id": "casco-antiguo",
        "titulo": "Recorrido guiado por el Casco Antiguo",
        "modalidad": "incluido",
        "foto": {
          "archivo": "/experiencias/casco-antiguo.jpg",
          "alt": "Plaza arbolada y edificios históricos del Casco Antiguo"
        },
        "descripcion": "El barrio fundado en 1673, tras la destrucción de Panamá Viejo, conserva plazas, iglesias y casonas de varios siglos, hoy restauradas con hoteles, cafés y museos. Es parte del sitio declarado Patrimonio de la Humanidad por la UNESCO.",
        "destacados": [
          "Plaza de la Independencia y Catedral Metropolitana",
          "Iglesia de San José y su Altar de Oro",
          "Plaza de Francia y el Paseo Esteban Huertas, con vista a la bahía",
          "El Palacio de las Garzas, sede de la Presidencia, visto desde el exterior"
        ],
        "duracion": "Alrededor de 2 a 3 horas a pie (estimado)",
        "lugar": "Casco Antiguo (San Felipe), Ciudad de Panamá",
        "entradas": "Visita por plazas y calles con guía; no incluye entradas a museos",
        "preparacion": "Calzado cómodo y ropa que cubra hombros y rodillas para entrar a las iglesias.",
        "notas": [
          "Las iglesias pueden cerrar durante misas o celebraciones."
        ]
      },
      {
        "id": "ciudad-moderna",
        "titulo": "Recorrido panorámico: ciudad moderna y Calzada de Amador",
        "modalidad": "incluido",
        "foto": {
          "archivo": "/experiencias/ciudad-moderna.jpg",
          "alt": "Torres del área bancaria y la Cinta Costera de la Ciudad de Panamá"
        },
        "descripcion": "Un recorrido en vehículo por la Avenida Balboa y la Cinta Costera, el área bancaria y la Calzada de Amador, construida con roca de la excavación del Canal para unir varias islas de la bahía con tierra firme.",
        "destacados": [
          "Avenida Balboa y Cinta Costera",
          "Vistas del horizonte de la ciudad y del Puente de las Américas",
          "Parada para fotografías en la Calzada de Amador",
          "Exterior del Biomuseo, obra de Frank Gehry"
        ],
        "duracion": "Medio día (estimado)",
        "lugar": "Ciudad de Panamá",
        "entradas": "Sin entradas incluidas",
        "preparacion": "Lleve agua y protector solar; las paradas para fotografías son al aire libre.",
        "notas": []
      },
      {
        "id": "panama-viejo",
        "titulo": "Panamá Viejo",
        "modalidad": "opcional",
        "foto": {
          "archivo": "/experiencias/panama-viejo.jpg",
          "alt": "Torre de la catedral y ruinas del sitio arqueológico de Panamá Viejo"
        },
        "descripcion": "Ruinas de la primera ciudad española en la costa del Pacífico de América, fundada en 1519 y abandonada tras el ataque de Henry Morgan en 1671. La torre de la antigua catedral y el museo del sitio son su mayor atractivo.",
        "destacados": [
          "Torre de la antigua catedral, con mirador",
          "Ruinas de conventos y casas coloniales",
          "Museo del sitio arqueológico"
        ],
        "duracion": "2 a 3 horas (estimado)",
        "lugar": "Al este de la ciudad, camino al aeropuerto",
        "entradas": "Entrada con costo, no incluida",
        "preparacion": "Calzado cómodo y protector solar: el recorrido es al aire libre.",
        "notas": []
      },
      {
        "id": "biomuseo",
        "titulo": "Biomuseo",
        "modalidad": "opcional",
        "foto": {
          "archivo": "/experiencias/biomuseo.jpg",
          "alt": "Edificio de colores del Biomuseo, en la Calzada de Amador"
        },
        "descripcion": "Museo de la biodiversidad en la entrada de la Calzada de Amador, el primer edificio diseñado por Frank Gehry en América Latina. Explica cómo el surgimiento del istmo de Panamá cambió la vida en el planeta.",
        "destacados": [
          "Arquitectura de Frank Gehry",
          "Galerías sobre la biodiversidad y la formación del istmo",
          "Parque botánico exterior"
        ],
        "duracion": "1 a 2 horas (estimado)",
        "lugar": "Calzada de Amador",
        "entradas": "Entrada con costo, no incluida",
        "preparacion": null,
        "notas": []
      },
      {
        "id": "san-blas",
        "titulo": "Islas de San Blas (Guna Yala)",
        "modalidad": "opcional",
        "foto": {
          "archivo": "/experiencias/san-blas.jpg",
          "alt": "Isla con palmeras y cabañas en el archipiélago de San Blas (Guna Yala)"
        },
        "descripcion": "Archipiélago del Caribe administrado por el pueblo guna, con islas de arena blanca y aguas transparentes. Es una excursión de día completo con salida de madrugada: un trayecto por carretera de montaña hasta el puerto y luego en lancha.",
        "destacados": [
          "Islas de arena blanca y mar turquesa",
          "Snorkel en aguas tranquilas, según el operador",
          "Cultura del pueblo guna"
        ],
        "duracion": "Día completo, con salida de madrugada",
        "lugar": "Comarca Guna Yala, en el Caribe",
        "entradas": "Las tasas de la comarca y de las islas se informan en su cotización",
        "preparacion": "Pasaporte, traje de baño, protector solar biodegradable y una bolsa seca.",
        "notas": [
          "El camino tiene muchas curvas y el mar puede estar picado."
        ]
      }
    ],
    "secciones": [
      {
        "titulo": "Traslados y transporte",
        "parrafos": [
          "Los traslados entre el Aeropuerto Internacional de Tocumen y su hotel se programan según los horarios de sus vuelos, en servicio compartido o privado según su cotización. El trayecto suele tomar entre 30 y 60 minutos, según el tráfico y la ubicación del hotel.",
          "Las excursiones incluidas tienen transporte desde y hacia su hotel; el recorrido por el Casco Antiguo se hace a pie."
        ],
        "items": []
      },
      {
        "titulo": "Plan de comidas",
        "parrafos": [
          "Incluye el desayuno diario en su hotel. Los almuerzos y las cenas quedan a su elección, entre la oferta gastronómica del Casco Antiguo, la Calzada de Amador y los restaurantes cercanos a su hotel."
        ],
        "items": []
      },
      {
        "titulo": "Información importante",
        "parrafos": [],
        "items": [
          "El orden de las excursiones puede cambiar según la operación local, el clima o los horarios de su vuelo.",
          "El Palacio de las Garzas, sede de la Presidencia, se observa desde el exterior.",
          "Antes de viajar, revise los requisitos de entrada a Panamá para su nacionalidad; su asesor le orienta."
        ]
      },
      {
        "titulo": "Recomendaciones para su viaje",
        "parrafos": [],
        "items": [
          "Use ropa ligera, protector solar y calzado cómodo: el Casco Antiguo se recorre a pie.",
          "De mayo a noviembre son frecuentes las lluvias por la tarde; lleve un paraguas pequeño o un impermeable.",
          "En Panamá circula el dólar estadounidense, y las tarjetas se aceptan en la mayoría de hoteles, restaurantes y centros comerciales.",
          "Si planea hacer compras, revise la franquicia de equipaje de su boleto aéreo."
        ]
      },
      {
        "titulo": "Condiciones de reserva",
        "parrafos": [],
        "items": [
          "Esta es una configuración propuesta: los hoteles, operadores y servicios se confirman con cada proveedor al preparar su cotización.",
          "Mencionar un hotel no significa que tenga cupo ni una tarifa reservada.",
          "Ningún servicio queda reservado hasta que su asesor lo confirme por escrito.",
          "Las condiciones de pago, cambios y cancelación de cada proveedor se indican en su cotización antes de cualquier pago."
        ]
      }
    ],
    "adicionales": [
      "Boleto aéreo desde Honduras",
      "Noche adicional en Ciudad de Panamá",
      "Excursión a las islas de San Blas",
      "Visita a Panamá Viejo",
      "Entrada al Biomuseo",
      "Traslados privados",
      "Asistencia de viaje"
    ],
    "aviso": "No publicamos precios: dependen de sus fechas, de la cantidad de viajeros, del hotel que elija y de la disponibilidad de cada proveedor. Su asesor le confirma servicios, hotel y tarifa en una cotización personalizada, sin costo ni compromiso.",
    "seo": {
      "titulo": "viatour | Paquete a Panamá: Canal y Casco Antiguo",
      "descripcion": "Paquete a Ciudad de Panamá desde Honduras: 4 días con entrada a Miraflores, Casco Antiguo con guía, hotel a elegir y traslados. Cotice con viatour."
    },
    "creditos": [
      {
        "archivo": "/paquetes/panama-ciudad-canal-casco-historico/1.jpg",
        "alt": "Vista aérea de la Ciudad de Panamá, con sus rascacielos frente a la bahía",
        "autor": "Dronepicr",
        "licencia": "CC BY 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panama_City_financial_district.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-canal-casco-historico/2.jpg",
        "alt": "Buque en las esclusas de Miraflores del Canal de Panamá",
        "autor": "Ivo Kruusamägi",
        "licencia": "CC BY-SA 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Miraflores_Locks,_Panama_-_08.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-canal-casco-historico/3.jpg",
        "alt": "Edificio del Centro de Visitantes de Miraflores, en el Canal de Panamá",
        "autor": "MusikAnimal",
        "licencia": "CC BY-SA 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Miraflores_Visitors_Center_at_the_Panama_Canal.JPG"
      },
      {
        "archivo": "/paquetes/panama-ciudad-canal-casco-historico/4.jpg",
        "alt": "Crucero dentro de las esclusas de Miraflores, junto a las locomotoras del Canal",
        "autor": "Alexey Komarov",
        "licencia": "CC BY-SA 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Cruise_ship_passing_Miraflores_Locks_2019-10-24.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-canal-casco-historico/5.jpg",
        "alt": "Catedral Metropolitana y glorieta de la Plaza de la Independencia, en el Casco Antiguo",
        "autor": "RB Photo",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Casco_Viejo,_Panama_City,_Panama_-_54302468541.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-canal-casco-historico/6.jpg",
        "alt": "Altar de Oro de la Iglesia de San José, en el Casco Antiguo",
        "autor": "Pancho507",
        "licencia": "CC BY 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Reredos_iglesia_de_San_Jos%C3%A9_Panam%C3%A1.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-canal-casco-historico/7.jpg",
        "alt": "Calle del Casco Antiguo con balcones y fachadas restauradas",
        "autor": "RB Photo",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Casco_Viejo,_Panama_City,_Panama_20250129230809.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-canal-casco-historico/8.jpg",
        "alt": "Obelisco de la Plaza de Francia, en el Casco Antiguo",
        "autor": "JMartinC from Panama, Panama",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:08-078-DMHN_Plaza_de_Francia_2_-_Panama_-_Flickr_-_JMartinC.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-canal-casco-historico/9.jpg",
        "alt": "El Casco Antiguo visto desde la Cinta Costera, al otro lado de la bahía",
        "autor": "Felipe Valduga",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Casco_viejo_desde_la_Cinta_Costera.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-canal-casco-historico/10.jpg",
        "alt": "Puente de las Américas visto desde la Calzada de Amador al atardecer",
        "autor": "Felipe Valduga",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Amador_Causeway_-_22929854980.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-canal-casco-historico/11.jpg",
        "alt": "Ciudad de Panamá de noche, con la Cinta Costera iluminada",
        "autor": "Dronepicr",
        "licencia": "CC BY 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panama_City_2016.jpg"
      },
      {
        "archivo": "/hoteles/riu-plaza-panama/1.jpg",
        "alt": "Fachada del Hotel Riu Plaza Panamá, en Marbella",
        "autor": "Christian Córdova",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Hotel_Riu_Plaza_Panam%C3%A1.jpg"
      },
      {
        "archivo": "/hoteles/riu-plaza-panama/2.jpg",
        "alt": "Vestíbulo del Hotel Riu Plaza Panamá",
        "autor": "Christian Córdova",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Hall_Hotel_Riu_Plaza_Panam%C3%A1.jpg"
      },
      {
        "archivo": "/hoteles/central-hotel-panama/1.jpg",
        "alt": "Fachada restaurada del Central Hotel Panamá, en la Plaza de la Independencia",
        "autor": "Ssaucedoc",
        "licencia": "CC BY-SA 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:El_Gran_Evenia_Hotel_Central.jpg"
      },
      {
        "archivo": "/hoteles/sofitel-legend-casco-viejo/1.jpg",
        "alt": "Sofitel Legend Casco Viejo iluminado de noche frente a la bahía, con la ciudad al fondo",
        "autor": "RB Photo",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Sofitel_Legend_Casco_Viejo,_Panama_City,_Panama.jpg"
      },
      {
        "archivo": "/experiencias/canal-miraflores.jpg",
        "alt": "Vista de las esclusas de Miraflores desde el Centro de Visitantes",
        "autor": "Adam Jones",
        "licencia": "CC BY-SA 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:View_over_Miraflores_Locks_from_Visitor%27s_Center_(02).jpg"
      },
      {
        "archivo": "/experiencias/casco-antiguo.jpg",
        "alt": "Plaza arbolada y edificios históricos del Casco Antiguo",
        "autor": "RB Photo",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Casco_Viejo,_Panama_City,_Panama_-_54301629817.jpg"
      },
      {
        "archivo": "/experiencias/ciudad-moderna.jpg",
        "alt": "Torres del área bancaria y la Cinta Costera de la Ciudad de Panamá",
        "autor": "Dronepicr",
        "licencia": "CC BY 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panama_City-2.jpg"
      },
      {
        "archivo": "/experiencias/panama-viejo.jpg",
        "alt": "Torre de la catedral y ruinas del sitio arqueológico de Panamá Viejo",
        "autor": "xiquinhosilva",
        "licencia": "CC BY 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panam%C3%A1_Viejo.jpg"
      },
      {
        "archivo": "/experiencias/biomuseo.jpg",
        "alt": "Edificio de colores del Biomuseo, en la Calzada de Amador",
        "autor": "Editorpana",
        "licencia": "CC BY-SA 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Biomuseo_panama.jpg"
      },
      {
        "archivo": "/experiencias/san-blas.jpg",
        "alt": "Isla con palmeras y cabañas en el archipiélago de San Blas (Guna Yala)",
        "autor": "Ayaita",
        "licencia": "CC BY 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Guna_Yala_Island.jpg"
      }
    ]
  }
}$pkg$::jsonb) as r
on conflict (slug) do nothing;

-- panama-ciudad-playa-blanca-todo-incluido
insert into public.packages (slug, nombre, destino, resumen, descripcion, incluye, no_incluye, itinerario, duracion, imagen_url, galeria, destacado, publicado, orden, categoria, etiquetas, precio_desde, moneda, ficha, destination_id)
select r.slug, r.nombre, r.destino, r.resumen, r.descripcion, r.incluye, r.no_incluye, r.itinerario, r.duracion, r.imagen_url, r.galeria, r.destacado, r.publicado, r.orden, r.categoria, r.etiquetas, r.precio_desde, r.moneda, r.ficha, (select id from public.destinations where slug = 'panama')
from jsonb_populate_record(null::public.packages, $pkg${
  "slug": "panama-ciudad-playa-blanca-todo-incluido",
  "nombre": "Panamá Doble Paraíso: Ciudad y Playa Blanca Todo Incluido",
  "destino": "Ciudad de Panamá y Playa Blanca",
  "resumen": "Tres noches todo incluido frente al Pacífico en Playa Blanca y dos noches en la Ciudad de Panamá, con desayuno, recorrido por el Casco Antiguo y todos los traslados.",
  "descripcion": "Panamá Doble Paraíso combina dos viajes en uno: el descanso de un resort todo incluido en Playa Blanca, en la costa del Pacífico, y la energía de la Ciudad de Panamá, con su Casco Antiguo, sus paseos frente al mar y sus centros comerciales.\n\nEmpieza por la playa. Desde el aeropuerto viaja directo al resort que elija, donde pasa tres noches con comidas, snacks, bebidas y entretenimiento según el plan todo incluido de ese resort. Después se traslada a la ciudad para dos noches con desayuno en el hotel que prefiera, un recorrido guiado de medio día por el Casco Antiguo y la Calzada de Amador, y tiempo libre para compras. Terminar en la ciudad hace que el traslado al aeropuerto sea corto y que sus compras no tengan que viajar a la playa.\n\nEl todo incluido corresponde a la estadía en el resort. En la ciudad, el plan es de alojamiento con desayuno. Su asesor ajusta fechas, resort, hotel, vuelos y servicios adicionales en una cotización personalizada.",
  "incluye": [
    "3 noches en el resort todo incluido que elija en Playa Blanca, en habitación estándar",
    "Plan todo incluido del resort elegido, según sus condiciones: comidas, snacks y bebidas de la carta del plan, actividades y entretenimiento",
    "2 noches en el hotel que elija en Ciudad de Panamá, con desayuno diario",
    "Traslado del Aeropuerto Internacional de Tocumen al resort en Playa Blanca",
    "Traslado del resort a su hotel en Ciudad de Panamá",
    "Traslado de su hotel en Ciudad de Panamá al Aeropuerto Internacional de Tocumen",
    "Recorrido guiado de medio día por el Casco Antiguo y la Calzada de Amador, con transporte",
    "Asistencia de nuestro equipo antes y durante el viaje"
  ],
  "no_incluye": [
    "Boleto aéreo desde Honduras (se cotiza por separado según sus fechas)",
    "Almuerzos, cenas y bebidas durante la estadía en Ciudad de Panamá",
    "Mejoras de habitación o planes superiores del resort, como Todo Incluido Plus",
    "Bebidas premium, cenas especiales y restaurantes, bares o servicios con cargo dentro del resort",
    "Golf, deportes acuáticos motorizados, spa y excursiones que ofrece el resort",
    "Visita al Centro de Visitantes de Miraflores (disponible como servicio adicional)",
    "Seguro o asistencia de viaje",
    "Propinas, gastos personales y compras",
    "Equipaje adicional y otros cargos de la aerolínea",
    "Impuestos o cargos que se paguen en el destino, salvo que su cotización indique lo contrario",
    "Cualquier servicio que no aparezca como incluido"
  ],
  "itinerario": "Día 1 — Llegada y traslado a Playa Blanca. Recepción en el Aeropuerto Internacional de Tocumen y traslado por carretera a su resort en Playa Blanca, a unos 140 kilómetros; el trayecto toma alrededor de dos horas, según el tráfico. Registro de entrada desde las 15:00 e inicio de su plan todo incluido.\nDía 2 — Playa Blanca todo incluido. Día completo en el resort: playa, piscinas, desayuno y almuerzo tipo bufé, cena a la carta con reserva previa o en el bufé, snacks y bebidas según el plan, y el programa diario de actividades y entretenimiento nocturno.\nDía 3 — Un día más frente al Pacífico. Disfrute las instalaciones del resort o los deportes acuáticos no motorizados de su plan, como kayak o paddle. Si lo desea, agregue con costo adicional una excursión a El Valle de Antón, golf o deportes motorizados.\nDía 4 — De la playa a la ciudad. Registro de salida (a más tardar a las 12:00) y traslado a su hotel en la Ciudad de Panamá, de unas dos horas. Tarde libre: le sugerimos la Cinta Costera al atardecer y una cena en el Casco Antiguo. Desde este día, su plan de comidas es de desayuno.\nDía 5 — Ciudad de Panamá. Recorrido guiado de medio día por el Casco Antiguo, con la Plaza de la Independencia, la Plaza de Francia y el Paseo Esteban Huertas, y por la Calzada de Amador, con vista a la ciudad y al Puente de las Américas. Tarde libre para compras. Con costo adicional, puede sumar una visita al Centro de Visitantes de Miraflores.\nDía 6 — Hasta pronto, Panamá. Registro de salida y traslado al Aeropuerto Internacional de Tocumen según el horario de su vuelo. Fin de los servicios.",
  "duracion": "6 días / 5 noches",
  "imagen_url": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/1.jpg",
  "galeria": [
    "/paquetes/panama-ciudad-playa-blanca-todo-incluido/1.jpg",
    "/paquetes/panama-ciudad-playa-blanca-todo-incluido/2.jpg",
    "/paquetes/panama-ciudad-playa-blanca-todo-incluido/3.jpg",
    "/paquetes/panama-ciudad-playa-blanca-todo-incluido/4.jpg",
    "/paquetes/panama-ciudad-playa-blanca-todo-incluido/5.jpg",
    "/paquetes/panama-ciudad-playa-blanca-todo-incluido/6.jpg",
    "/paquetes/panama-ciudad-playa-blanca-todo-incluido/7.jpg",
    "/paquetes/panama-ciudad-playa-blanca-todo-incluido/8.jpg"
  ],
  "destacado": false,
  "publicado": false,
  "orden": 36,
  "categoria": "Centroamérica",
  "etiquetas": [
    "familias",
    "parejas"
  ],
  "precio_desde": null,
  "moneda": null,
  "ficha": {
    "subtitulo": "Tres noches todo incluido frente al Pacífico y dos noches para descubrir la Ciudad de Panamá, en un solo viaje.",
    "destacados": [
      "3 noches en un resort todo incluido frente al mar en Playa Blanca, a elegir entre tres",
      "Comidas, snacks, bebidas y entretenimiento según el plan del resort",
      "2 noches en la Ciudad de Panamá con desayuno, en el hotel que prefiera",
      "Recorrido guiado por el Casco Antiguo y la Calzada de Amador",
      "Todos los traslados por tierra: aeropuerto, playa, ciudad y regreso",
      "Termina en la ciudad: regreso corto al aeropuerto y tiempo para compras"
    ],
    "estancias": [
      {
        "id": "playa",
        "campo": "resort",
        "titulo": "Playa Blanca: resort todo incluido",
        "noches": "3 noches",
        "plan": "Todo incluido del resort",
        "descripcion": "Comidas, snacks, bebidas y entretenimiento según el plan del resort que elija. Cada resort tiene sus propias reglas: revise qué incluye cada uno.",
        "portada": {
          "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/1.jpg",
          "alt": "Vista aérea de la costa de Playa Blanca, en Antón (Coclé), frente al océano Pacífico"
        },
        "hoteles": [
          {
            "id": "grand-decameron-panama",
            "nombre": "Grand Decameron Panamá",
            "categoria": "Todo incluido · Ideal para familias",
            "zona": "Farallón, Río Hato (Coclé), frente al mar",
            "descripcion": "Gran resort de playa de la cadena Decameron, con habitaciones en edificios bajos entre jardines, seis piscinas, restaurantes de varias cocinas y un programa de actividades de día y de noche.",
            "habitacion": "Habitación estándar con vista al jardín",
            "plan": "Todo incluido del resort: desayuno, almuerzo y cena tipo bufé, cenas a la carta con reserva, snacks y bebidas nacionales e importadas con y sin alcohol de la carta del plan",
            "amenidades": [
              "Seis piscinas para adultos y niños, una con toboganes",
              "Restaurantes de cocina mediterránea, italiana, mexicana, asiática, panameña, mariscos y carnes",
              "Programa diario de actividades, actividades para niños y espectáculos nocturnos",
              "Kayak, paddle, windsurf y velero incluidos",
              "Gimnasio, cancha de tenis y wifi"
            ],
            "ideal": "Familias y grupos que quieren variedad de restaurantes y actividades sin salir del resort.",
            "condiciones": [
              "Las cenas a la carta requieren reserva por la aplicación o el código QR del resort",
              "Registro de entrada desde las 15:00 y salida a más tardar a las 12:00",
              "Golf, deportes motorizados, excursiones, tiendas y otros servicios tienen costo adicional",
              "El resort considera niños de 2 a 11 años"
            ],
            "mejoras": [
              "Plan Todo Incluido Plus: restaurante y piscina exclusivos, bares adicionales, minibar y bebidas premium",
              "Habitación con vista al mar, según disponibilidad"
            ],
            "fotos": [],
            "recomendado": true
          },
          {
            "id": "riu-playa-blanca",
            "nombre": "Hotel Riu Playa Blanca",
            "categoria": "Todo incluido 24 horas",
            "zona": "Playa Blanca, Farallón (Coclé), frente al mar",
            "descripcion": "Resort de la cadena RIU frente a la playa, con todo incluido las 24 horas, piscinas con área infantil y programas de entretenimiento para niños y adultos.",
            "habitacion": "Habitación doble con vista al jardín o al mar",
            "plan": "Todo incluido 24 horas: comidas y bebidas en sus restaurantes y bares, según las condiciones del hotel",
            "amenidades": [
              "Restaurante bufé y restaurantes temáticos: italiano, asiático y asador",
              "Bares en el vestíbulo y en la piscina",
              "Piscinas con área infantil y toboganes",
              "Club infantil RiuLand y programa de entretenimiento Fun4All",
              "Gimnasio abierto las 24 horas"
            ],
            "ideal": "Familias con niños que quieren un todo incluido sin horarios fijos.",
            "condiciones": [
              "Registro de entrada desde las 15:00 y salida a las 12:00",
              "Golf, deportes acuáticos y otros servicios externos pueden tener costo"
            ],
            "mejoras": [
              "Habitación con vista al mar",
              "Suite con vista al mar"
            ],
            "fotos": []
          },
          {
            "id": "playa-blanca-beach-resort",
            "nombre": "Playa Blanca Beach Resort",
            "categoria": "Todo incluido · Piscina de agua salada",
            "zona": "Río Hato (Coclé)",
            "descripcion": "Resort conocido por su gran piscina de agua salada y sus toboganes, con restaurantes y bares incluidos en el plan y otros con cargo adicional.",
            "habitacion": "Habitación con vista al jardín o a la piscina",
            "plan": "Todo incluido del resort; algunos restaurantes y bares tienen cargo adicional",
            "amenidades": [
              "Gran piscina de agua salada y toboganes",
              "Restaurante bufé y restaurantes a la carta con reserva",
              "Club de playa frente al mar",
              "Club de niños con actividades supervisadas"
            ],
            "ideal": "Familias atraídas por la piscina de agua salada y los toboganes.",
            "condiciones": [
              "El teppanyaki, el sushi y otros restaurantes y bares tienen cargo adicional",
              "Los deportes acuáticos de la marina se alquilan aparte",
              "Algunas suites del Town Center no tienen acceso al área del resort: se confirma al cotizar"
            ],
            "mejoras": [
              "Habitación con vista a la piscina"
            ],
            "fotos": []
          }
        ]
      },
      {
        "id": "ciudad",
        "campo": "hotel",
        "titulo": "Ciudad de Panamá: hotel con desayuno",
        "noches": "2 noches",
        "plan": "Desayuno diario",
        "descripcion": "Alojamiento con desayuno. Los almuerzos, las cenas y las bebidas en la ciudad no están incluidos.",
        "portada": {
          "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/3.jpg",
          "alt": "Rascacielos de la Ciudad de Panamá frente a la bahía, con botes pesqueros"
        },
        "hoteles": [
          {
            "id": "riu-plaza-panama",
            "nombre": "Hotel Riu Plaza Panamá",
            "categoria": "Superior",
            "zona": "Calle 50, Marbella (área bancaria)",
            "descripcion": "Gran hotel urbano de la cadena RIU en pleno centro financiero, con tres restaurantes, piscina al aire libre y gimnasio. Muy bien conectado con Calle 50, la Cinta Costera y los centros comerciales.",
            "habitacion": "Habitación doble estándar",
            "plan": "Alojamiento con desayuno, según la tarifa que se confirme",
            "amenidades": [
              "Tres restaurantes y bares, entre ellos uno junto a la piscina",
              "Piscina al aire libre",
              "Gimnasio",
              "Salones de eventos y centro de negocios"
            ],
            "ideal": "Familias y viajeros que buscan un hotel completo en el centro financiero, cerca de restaurantes y compras.",
            "condiciones": [
              "El desayuno depende de la tarifa: su cotización indica si está incluido",
              "El estacionamiento tiene costo"
            ],
            "mejoras": [
              "Habitación superior o suite, según disponibilidad"
            ],
            "fotos": [
              {
                "archivo": "/hoteles/riu-plaza-panama/1.jpg",
                "alt": "Fachada del Hotel Riu Plaza Panamá, en Marbella"
              },
              {
                "archivo": "/hoteles/riu-plaza-panama/2.jpg",
                "alt": "Vestíbulo del Hotel Riu Plaza Panamá"
              }
            ],
            "recomendado": true
          },
          {
            "id": "hilton-panama",
            "nombre": "Hilton Panamá",
            "categoria": "Superior",
            "zona": "Avenida Balboa y Aquilino de la Guardia, frente a la bahía",
            "descripcion": "Torre sobre la Avenida Balboa, a pasos de la Cinta Costera y a dos cuadras del área bancaria, con vista a la bahía desde muchas de sus habitaciones.",
            "habitacion": "Habitación estándar; con vista a la bahía según la categoría",
            "plan": "Alojamiento con desayuno, según la tarifa que se confirme",
            "amenidades": [
              "Piscina climatizada en la azotea con vista a la bahía",
              "Spa y gimnasio",
              "Salón ejecutivo en las habitaciones de categoría ejecutiva",
              "A pasos de la Cinta Costera"
            ],
            "ideal": "Quienes quieren caminar por la Cinta Costera y despertar con vista a la bahía.",
            "condiciones": [
              "El desayuno no siempre está incluido: depende de la tarifa",
              "No confundir con el Hampton by Hilton, que es otro hotel"
            ],
            "mejoras": [
              "Habitación con vista a la bahía",
              "Habitación ejecutiva con acceso al salón ejecutivo"
            ],
            "fotos": []
          },
          {
            "id": "jw-marriott-panama",
            "nombre": "JW Marriott Panama",
            "categoria": "Premium",
            "zona": "Punta Pacífica, frente al mar",
            "descripcion": "La torre en forma de vela de Punta Pacífica, frente al mar y a pocos minutos de Multiplaza. Habitaciones amplias con balcón, varias piscinas con vista al océano, spa y casino en el complejo.",
            "habitacion": "Habitación de lujo con balcón",
            "plan": "Alojamiento; desayuno según la tarifa que se confirme",
            "amenidades": [
              "Varias piscinas al aire libre con vista al océano",
              "Spa y gimnasio",
              "Restaurantes y bares, entre ellos uno junto a la piscina",
              "Casino en el complejo"
            ],
            "ideal": "Parejas y viajeros que buscan una categoría alta, vista al mar y cercanía a Multiplaza.",
            "condiciones": [
              "El desayuno, el spa y el casino no están incluidos, salvo que su cotización lo indique"
            ],
            "mejoras": [
              "Suite o habitación con vista al mar, según disponibilidad"
            ],
            "fotos": [
              {
                "archivo": "/hoteles/jw-marriott-panama/1.jpg",
                "alt": "Torre en forma de vela del JW Marriott Panama, en Punta Pacífica"
              }
            ]
          }
        ]
      }
    ],
    "dias": [
      {
        "titulo": "Llegada y traslado a Playa Blanca",
        "descripcion": "Recepción en el Aeropuerto Internacional de Tocumen y traslado por carretera a su resort en Playa Blanca, a unos 140 kilómetros; el trayecto toma alrededor de dos horas, según el tráfico. Registro de entrada desde las 15:00 e inicio de su plan todo incluido.",
        "comidas": "Todo incluido desde el registro de entrada",
        "alojamiento": "Resort en Playa Blanca"
      },
      {
        "titulo": "Playa Blanca todo incluido",
        "descripcion": "Día completo en el resort: playa, piscinas, desayuno y almuerzo tipo bufé, cena a la carta con reserva previa o en el bufé, snacks y bebidas según el plan, y el programa diario de actividades y entretenimiento nocturno.",
        "comidas": "Todo incluido",
        "alojamiento": "Resort en Playa Blanca"
      },
      {
        "titulo": "Un día más frente al Pacífico",
        "descripcion": "Disfrute las instalaciones del resort o los deportes acuáticos no motorizados de su plan, como kayak o paddle. Si lo desea, agregue con costo adicional una excursión a El Valle de Antón, golf o deportes motorizados.",
        "comidas": "Todo incluido",
        "alojamiento": "Resort en Playa Blanca"
      },
      {
        "titulo": "De la playa a la ciudad",
        "descripcion": "Registro de salida (a más tardar a las 12:00) y traslado a su hotel en la Ciudad de Panamá, de unas dos horas. Tarde libre: le sugerimos la Cinta Costera al atardecer y una cena en el Casco Antiguo. Desde este día, su plan de comidas es de desayuno.",
        "comidas": "Desayuno en el resort",
        "alojamiento": "Su hotel en la Ciudad de Panamá"
      },
      {
        "titulo": "Ciudad de Panamá",
        "descripcion": "Recorrido guiado de medio día por el Casco Antiguo, con la Plaza de la Independencia, la Plaza de Francia y el Paseo Esteban Huertas, y por la Calzada de Amador, con vista a la ciudad y al Puente de las Américas. Tarde libre para compras. Con costo adicional, puede sumar una visita al Centro de Visitantes de Miraflores.",
        "comidas": "Desayuno",
        "alojamiento": "Su hotel en la Ciudad de Panamá"
      },
      {
        "titulo": "Hasta pronto, Panamá",
        "descripcion": "Registro de salida y traslado al Aeropuerto Internacional de Tocumen según el horario de su vuelo. Fin de los servicios.",
        "comidas": "Desayuno",
        "alojamiento": null
      }
    ],
    "experiencias": [
      {
        "id": "playa-blanca-todo-incluido",
        "titulo": "Experiencia todo incluido en Playa Blanca",
        "modalidad": "incluido",
        "foto": {
          "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/1.jpg",
          "alt": "Vista aérea de la costa de Playa Blanca, en Antón (Coclé), frente al océano Pacífico"
        },
        "descripcion": "Playa Blanca está en la costa del Pacífico de la provincia de Coclé, con arena clara y mar abierto, a unas dos horas por carretera de la Ciudad de Panamá. Los resorts todo incluido de la zona reúnen comidas, bebidas, piscinas y entretenimiento en un mismo lugar.",
        "destacados": [
          "Playa frente al resort",
          "Comidas y bebidas según el plan del resort elegido",
          "Piscinas, actividades y espectáculos nocturnos",
          "Deportes acuáticos no motorizados en algunos resorts"
        ],
        "duracion": "3 noches",
        "lugar": "Farallón y Río Hato, provincia de Coclé",
        "entradas": "Según el plan todo incluido del resort elegido",
        "preparacion": "Traje de baño, protector solar y sandalias. Reserve las cenas a la carta al llegar al resort.",
        "notas": [
          "Lo que incluye el plan cambia de un resort a otro: revise la ficha de cada uno.",
          "El Pacífico tiene oleaje y mareas variables: siga las indicaciones del resort."
        ]
      },
      {
        "id": "casco-antiguo",
        "titulo": "Recorrido guiado por el Casco Antiguo y la Calzada de Amador",
        "modalidad": "incluido",
        "foto": {
          "archivo": "/experiencias/casco-antiguo.jpg",
          "alt": "Plaza arbolada y edificios históricos del Casco Antiguo"
        },
        "descripcion": "El barrio fundado en 1673, tras la destrucción de Panamá Viejo, conserva plazas, iglesias y casonas de varios siglos, hoy restauradas con hoteles, cafés y museos. Es parte del sitio declarado Patrimonio de la Humanidad por la UNESCO.",
        "destacados": [
          "Plaza de la Independencia y Catedral Metropolitana",
          "Iglesia de San José y su Altar de Oro",
          "Plaza de Francia y el Paseo Esteban Huertas, con vista a la bahía",
          "El Palacio de las Garzas, sede de la Presidencia, visto desde el exterior"
        ],
        "duracion": "Medio día (estimado)",
        "lugar": "Casco Antiguo (San Felipe), Ciudad de Panamá",
        "entradas": "Visita por plazas y calles con guía; no incluye entradas a museos",
        "preparacion": "Calzado cómodo y ropa que cubra hombros y rodillas para entrar a las iglesias.",
        "notas": [
          "Las iglesias pueden cerrar durante misas o celebraciones."
        ]
      },
      {
        "id": "compras",
        "titulo": "Compras en Multiplaza y Albrook Mall",
        "modalidad": "libre",
        "foto": {
          "archivo": "/paquetes/escapada-fin-de-semana-panama/2.jpg",
          "alt": "Entrada del centro comercial Multiplaza, en la Ciudad de Panamá"
        },
        "descripcion": "Multiplaza, en Punta Pacífica, y Albrook Mall, junto a la terminal de Albrook, reúnen tiendas de marcas internacionales, tiendas por departamento, restaurantes y cines.",
        "destacados": [
          "Marcas internacionales y tiendas por departamento",
          "Restaurantes y patios de comidas",
          "Cines y áreas de juego para niños"
        ],
        "duracion": "A su ritmo",
        "lugar": "Punta Pacífica y Albrook, Ciudad de Panamá",
        "entradas": "Sin costo de entrada; el traslado es por su cuenta o con el recorrido de compras opcional",
        "preparacion": "Revise la franquicia de equipaje de su boleto aéreo antes de comprar.",
        "notas": []
      },
      {
        "id": "canal-miraflores",
        "titulo": "Visita al Canal de Panamá en Miraflores",
        "modalidad": "opcional",
        "foto": {
          "archivo": "/experiencias/canal-miraflores.jpg",
          "alt": "Vista de las esclusas de Miraflores desde el Centro de Visitantes"
        },
        "descripcion": "Las esclusas de Miraflores, en el lado Pacífico del Canal, suben y bajan los barcos en dos escalones entre el lago Miraflores y el océano. Desde las terrazas del Centro de Visitantes se observan de cerca las compuertas, las locomotoras que guían a los buques y, si coincide un tránsito, el paso de un barco.",
        "destacados": [
          "Terrazas de observación frente a las esclusas",
          "Exhibiciones sobre la historia y el funcionamiento del Canal",
          "Locomotoras eléctricas que guían a los buques"
        ],
        "duracion": "Alrededor de 2 a 3 horas con los traslados (estimado)",
        "lugar": "Centro de Visitantes de Miraflores, a unos 20 a 30 minutos del centro de la ciudad",
        "entradas": "Entrada y traslado con costo adicional, si la agrega",
        "preparacion": "Lleve gorra o sombrero y protector solar: las terrazas son al aire libre.",
        "notas": [
          "La Autoridad del Canal informó obras de modernización del Centro de Visitantes hasta finales de 2026: algunas áreas pueden no estar disponibles y la espera puede ser mayor en horas de alta afluencia.",
          "El paso de buques depende de la programación del Canal: no es posible garantizar un tránsito durante su visita."
        ]
      },
      {
        "id": "el-valle-de-anton",
        "titulo": "El Valle de Antón",
        "modalidad": "opcional",
        "foto": {
          "archivo": "/experiencias/el-valle-de-anton.jpg",
          "alt": "Atardecer en El Valle de Antón, con las montañas al fondo"
        },
        "descripcion": "Pueblo de montaña construido dentro del cráter de un antiguo volcán, conocido por su clima fresco, sus cascadas, como El Chorro El Macho, y su mercado de artesanías. Está a alrededor de una hora del área de Playa Blanca.",
        "destacados": [
          "Mercado de artesanías, frutas y plantas",
          "Cascada El Chorro El Macho",
          "Senderos y miradores de montaña"
        ],
        "duracion": "Medio día o día completo, según el operador",
        "lugar": "El Valle de Antón, provincia de Coclé",
        "entradas": "Las entradas a cascadas y reservas se pagan aparte",
        "preparacion": "Lleve un abrigo ligero: en El Valle refresca más que en la playa.",
        "notas": []
      },
      {
        "id": "san-blas",
        "titulo": "Islas de San Blas (Guna Yala)",
        "modalidad": "opcional",
        "foto": {
          "archivo": "/experiencias/san-blas.jpg",
          "alt": "Isla con palmeras y cabañas en el archipiélago de San Blas (Guna Yala)"
        },
        "descripcion": "Archipiélago del Caribe administrado por el pueblo guna, con islas de arena blanca y aguas transparentes. Es una excursión de día completo con salida de madrugada: un trayecto por carretera de montaña hasta el puerto y luego en lancha.",
        "destacados": [
          "Islas de arena blanca y mar turquesa",
          "Snorkel en aguas tranquilas, según el operador",
          "Cultura del pueblo guna"
        ],
        "duracion": "Día completo, con salida de madrugada",
        "lugar": "Comarca Guna Yala, en el Caribe",
        "entradas": "Las tasas de la comarca y de las islas se informan en su cotización",
        "preparacion": "Pasaporte, traje de baño, protector solar biodegradable y una bolsa seca.",
        "notas": [
          "El camino tiene muchas curvas y el mar puede estar picado."
        ]
      }
    ],
    "secciones": [
      {
        "titulo": "Dos planes de comidas distintos",
        "parrafos": [
          "En Playa Blanca, el plan todo incluido del resort aplica desde su registro de entrada hasta su registro de salida, según las condiciones de ese resort.",
          "En la Ciudad de Panamá, su hotel incluye solo el desayuno. Los almuerzos, las cenas y las bebidas en la ciudad no están incluidos."
        ],
        "items": []
      },
      {
        "titulo": "Traslados",
        "parrafos": [],
        "items": [
          "Aeropuerto Internacional de Tocumen al resort en Playa Blanca: unos 140 kilómetros, alrededor de dos horas según el tráfico",
          "Resort a su hotel en Ciudad de Panamá: alrededor de dos horas, después del registro de salida del resort",
          "Hotel en Ciudad de Panamá al Aeropuerto Internacional de Tocumen: entre 30 y 60 minutos, según el tráfico",
          "Los traslados se programan según los horarios de sus vuelos, en servicio compartido o privado según su cotización"
        ]
      },
      {
        "titulo": "Información importante",
        "parrafos": [],
        "items": [
          "El orden playa y ciudad puede invertirse si sus vuelos lo hacen más conveniente. Recomendamos terminar en la ciudad: el traslado de salida es más corto y no depende del horario de salida del resort.",
          "La tarifa del resort depende de la ocupación de la habitación y de la edad de los niños.",
          "Los menores que viajen sin uno de sus padres pueden necesitar documentación adicional para registrarse en el resort; su asesor le indica qué presentar.",
          "Las instalaciones, los horarios y los restaurantes los define cada resort y pueden cambiar; su asesor le confirma el plan vigente en su cotización.",
          "Antes de viajar, revise los requisitos de entrada a Panamá para su nacionalidad; su asesor le orienta."
        ]
      },
      {
        "titulo": "Recomendaciones para su viaje",
        "parrafos": [],
        "items": [
          "Lleve traje de baño, protector solar, sombrero y sandalias para la playa, y calzado cómodo para la ciudad.",
          "Haga sus reservas de cenas a la carta al llegar al resort.",
          "De mayo a noviembre son frecuentes las lluvias por la tarde; lleve un impermeable ligero.",
          "Si planea hacer compras en la ciudad, revise la franquicia de equipaje de su boleto aéreo."
        ]
      },
      {
        "titulo": "Condiciones de reserva",
        "parrafos": [],
        "items": [
          "Esta es una configuración propuesta: el resort, el hotel, los operadores y los servicios se confirman con cada proveedor al preparar su cotización.",
          "Mencionar un hotel no significa que tenga cupo ni una tarifa reservada.",
          "Ningún servicio queda reservado hasta que su asesor lo confirme por escrito.",
          "Las condiciones de pago, cambios y cancelación de cada proveedor se indican en su cotización antes de cualquier pago."
        ]
      }
    ],
    "adicionales": [
      "Boleto aéreo desde Honduras",
      "Visita al Centro de Visitantes de Miraflores",
      "Excursión a El Valle de Antón",
      "Plan superior o mejora de habitación en el resort",
      "Noche adicional en la playa",
      "Noche adicional en la ciudad",
      "Excursión a las islas de San Blas",
      "Traslados privados",
      "Asistencia de viaje"
    ],
    "aviso": "No publicamos precios: dependen de sus fechas, de la cantidad de viajeros y sus edades, del resort y el hotel que elija y de la disponibilidad de cada proveedor. Su asesor le confirma servicios y tarifa en una cotización personalizada, sin costo ni compromiso.",
    "seo": {
      "titulo": "viatour | Panamá ciudad y Playa Blanca todo incluido",
      "descripcion": "Paquete a Panamá desde Honduras: 3 noches todo incluido en Playa Blanca y 2 en la ciudad con desayuno, Casco Antiguo y traslados. Cotice con viatour."
    },
    "creditos": [
      {
        "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/1.jpg",
        "alt": "Vista aérea de la costa de Playa Blanca, en Antón (Coclé), frente al océano Pacífico",
        "autor": "geo.edgonzalez",
        "licencia": "CC BY-SA 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panama_riviera_-_panoramio.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/2.jpg",
        "alt": "Playa de arena con tumbonas y palmeras en la costa de Playa Blanca, en Coclé",
        "autor": "geo.edgonzalez",
        "licencia": "CC BY-SA 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panama_beach_-_panoramio.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/3.jpg",
        "alt": "Rascacielos de la Ciudad de Panamá frente a la bahía, con botes pesqueros",
        "autor": "Marissa Strniste",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panama_City_Skyline.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/4.jpg",
        "alt": "Plaza del Casco Antiguo iluminada por la noche",
        "autor": "RB Photo",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Casco_Viejo,_Panama_City,_Panama_-_54319827771.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/5.jpg",
        "alt": "Edificios históricos del Casco Antiguo frente al mar al atardecer",
        "autor": "RB Photo",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Casco_Viejo,_Panama_City,_Panama_-_54300325876.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/6.jpg",
        "alt": "Pérgola y jardines de la Cinta Costera, con los rascacielos al fondo",
        "autor": "Felipe Valduga",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Cinta_Costera.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/7.jpg",
        "alt": "Plaza de la Independencia y su glorieta, en el Casco Antiguo",
        "autor": "dave massie",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Plaza_de_la_Independencia_de_Panam%C3%A1.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/8.jpg",
        "alt": "Marina con yates en la Calzada de Amador, junto a las islas",
        "autor": "Ayaita",
        "licencia": "CC BY 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:YatesAmador.JPG"
      },
      {
        "archivo": "/hoteles/riu-plaza-panama/1.jpg",
        "alt": "Fachada del Hotel Riu Plaza Panamá, en Marbella",
        "autor": "Christian Córdova",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Hotel_Riu_Plaza_Panam%C3%A1.jpg"
      },
      {
        "archivo": "/hoteles/riu-plaza-panama/2.jpg",
        "alt": "Vestíbulo del Hotel Riu Plaza Panamá",
        "autor": "Christian Córdova",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Hall_Hotel_Riu_Plaza_Panam%C3%A1.jpg"
      },
      {
        "archivo": "/hoteles/jw-marriott-panama/1.jpg",
        "alt": "Torre en forma de vela del JW Marriott Panama, en Punta Pacífica",
        "autor": "Mariordo (Mario Roberto Duran Ortiz)",
        "licencia": "CC BY-SA 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panama_08_2013_Trump_Ocean_Club_Tower_7089.JPG"
      },
      {
        "archivo": "/experiencias/casco-antiguo.jpg",
        "alt": "Plaza arbolada y edificios históricos del Casco Antiguo",
        "autor": "RB Photo",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Casco_Viejo,_Panama_City,_Panama_-_54301629817.jpg"
      },
      {
        "archivo": "/paquetes/escapada-fin-de-semana-panama/2.jpg",
        "alt": "Entrada del centro comercial Multiplaza, en la Ciudad de Panamá",
        "autor": "Harminon",
        "licencia": "CC BY 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Multiplaza_Mall_-_Panama.jpg"
      },
      {
        "archivo": "/experiencias/canal-miraflores.jpg",
        "alt": "Vista de las esclusas de Miraflores desde el Centro de Visitantes",
        "autor": "Adam Jones",
        "licencia": "CC BY-SA 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:View_over_Miraflores_Locks_from_Visitor%27s_Center_(02).jpg"
      },
      {
        "archivo": "/experiencias/el-valle-de-anton.jpg",
        "alt": "Atardecer en El Valle de Antón, con las montañas al fondo",
        "autor": "Randy Navarro B.",
        "licencia": "CC BY-SA 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Atardecer_en_El_Valle_de_Ant%C3%B3n.jpg"
      },
      {
        "archivo": "/experiencias/san-blas.jpg",
        "alt": "Isla con palmeras y cabañas en el archipiélago de San Blas (Guna Yala)",
        "autor": "Ayaita",
        "licencia": "CC BY 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Guna_Yala_Island.jpg"
      }
    ]
  }
}$pkg$::jsonb) as r
on conflict (slug) do nothing;

-- escapada-fin-de-semana-panama
insert into public.packages (slug, nombre, destino, resumen, descripcion, incluye, no_incluye, itinerario, duracion, imagen_url, galeria, destacado, publicado, orden, categoria, etiquetas, precio_desde, moneda, ficha, destination_id)
select r.slug, r.nombre, r.destino, r.resumen, r.descripcion, r.incluye, r.no_incluye, r.itinerario, r.duracion, r.imagen_url, r.galeria, r.destacado, r.publicado, r.orden, r.categoria, r.etiquetas, r.precio_desde, r.moneda, r.ficha, (select id from public.destinations where slug = 'panama')
from jsonb_populate_record(null::public.packages, $pkg${
  "slug": "escapada-fin-de-semana-panama",
  "nombre": "Escapada de Fin de Semana en Panamá: Ciudad, Compras y Diversión",
  "destino": "Ciudad de Panamá",
  "resumen": "Tres días en la Ciudad de Panamá con hotel y traslados de aeropuerto, para compras, paseos y gastronomía, con la opción de sumar una noche todo incluido en Playa Blanca por un costo adicional.",
  "descripcion": "La Escapada de Fin de Semana en Panamá es un viaje corto y flexible: dos noches en el hotel que elija en la Ciudad de Panamá, con traslados de aeropuerto y todo el tiempo libre para recorrer la ciudad a su manera.\n\nAproveche para hacer compras en Multiplaza o Albrook Mall, caminar por la Cinta Costera y la Calzada de Amador o cenar en el Casco Antiguo. Si quiere sumar algo más, su asesor le agrega con costo adicional una visita al Canal, un recorrido guiado, una noche adicional o un traslado privado.\n\nLa escapada base es un paquete de hotel en la ciudad, no un todo incluido. Si desea una experiencia todo incluido, puede elegir la opción B: cambia una de las dos noches en la ciudad por una noche en un resort todo incluido en Playa Blanca, con un costo adicional que su asesor le cotiza aparte.",
  "incluye": [
    "2 noches de alojamiento en el hotel que elija en la Ciudad de Panamá",
    "Desayuno diario, cuando la tarifa del hotel elegido lo incluye",
    "Traslado de llegada del Aeropuerto Internacional de Tocumen a su hotel",
    "Traslado de salida de su hotel al Aeropuerto Internacional de Tocumen",
    "Tiempo libre para compras, paseos y gastronomía",
    "Asesoría para personalizar su escapada con servicios adicionales"
  ],
  "no_incluye": [
    "Boleto aéreo desde Honduras (se cotiza por separado según sus fechas)",
    "Experiencia todo incluido en Playa Blanca (opción B, con costo adicional)",
    "Tours, excursiones y entradas",
    "Almuerzos, cenas y bebidas",
    "Desayuno, si la tarifa del hotel elegido no lo incluye",
    "Seguro o asistencia de viaje",
    "Propinas, gastos personales y compras",
    "Equipaje adicional y otros cargos de la aerolínea",
    "Impuestos o cargos que se paguen en el destino, salvo que su cotización indique lo contrario",
    "Cualquier servicio que no aparezca como incluido"
  ],
  "itinerario": "Día 1 — Bienvenidos a Panamá. Recepción en el Aeropuerto Internacional de Tocumen y traslado a su hotel. Registro de entrada (habitualmente desde las 15:00) y tiempo libre para salir a cenar, recorrer la Cinta Costera o visitar un centro comercial.\nDía 2 — Panamá a su manera. Día libre para compras en Multiplaza o Albrook Mall, o para pasear por el Casco Antiguo y la Calzada de Amador. Con costo adicional, puede sumar una visita al Canal de Panamá, un recorrido guiado por la ciudad u otra excursión.\nDía 3 — Hasta pronto, Panamá. Registro de salida y traslado al Aeropuerto Internacional de Tocumen según el horario de su vuelo. Fin de los servicios.",
  "duracion": "3 días / 2 noches",
  "imagen_url": "/paquetes/escapada-fin-de-semana-panama/1.jpg",
  "galeria": [
    "/paquetes/escapada-fin-de-semana-panama/1.jpg",
    "/paquetes/escapada-fin-de-semana-panama/2.jpg",
    "/paquetes/escapada-fin-de-semana-panama/3.jpg",
    "/paquetes/escapada-fin-de-semana-panama/4.jpg",
    "/paquetes/escapada-fin-de-semana-panama/5.jpg",
    "/paquetes/escapada-fin-de-semana-panama/6.jpg",
    "/paquetes/escapada-fin-de-semana-panama/7.jpg",
    "/paquetes/escapada-fin-de-semana-panama/8.jpg"
  ],
  "destacado": false,
  "publicado": false,
  "orden": 37,
  "categoria": "Centroamérica",
  "etiquetas": [
    "parejas",
    "grupos",
    "familias"
  ],
  "precio_desde": null,
  "moneda": null,
  "ficha": {
    "subtitulo": "Tres días para desconectarse, descubrir la ciudad y disfrutar Panamá a su manera. Personalice su viaje con experiencias adicionales.",
    "destacados": [
      "2 noches en el hotel que elija en la Ciudad de Panamá",
      "Traslados de llegada y salida del Aeropuerto Internacional de Tocumen",
      "Tiempo libre para compras en Multiplaza, Albrook Mall y más",
      "Opción de sumar una noche todo incluido en Playa Blanca, con costo adicional",
      "Experiencias opcionales: Canal de Panamá, Casco Antiguo, noches adicionales"
    ],
    "opciones_titulo": "Elija cómo vivir su escapada",
    "opciones": [
      {
        "id": "a",
        "titulo": "Opción A: Escapada en Ciudad de Panamá",
        "cotizacion": "Opción A: Escapada Panamá — Hotel en Ciudad",
        "descripcion": "La escapada base: 2 noches en el hotel que elija en la Ciudad de Panamá, desayuno cuando la tarifa lo incluye y traslados de aeropuerto. Ideal para compras, paseos y gastronomía. No es un plan todo incluido.",
        "cambios": [],
        "costo_adicional": false,
        "foto": {
          "archivo": "/paquetes/escapada-fin-de-semana-panama/1.jpg",
          "alt": "Paseo con palmeras frente a la bahía y el horizonte de la Ciudad de Panamá"
        }
      },
      {
        "id": "b",
        "titulo": "Opción B: Escapada con experiencia todo incluido",
        "cotizacion": "Opción B: Escapada Panamá + Experiencia Todo Incluido (Costo Adicional)",
        "descripcion": "Cambia una de sus dos noches en la ciudad por una noche en un resort todo incluido en Playa Blanca. No es un pasadía ni un plan que se agrega al hotel de la ciudad: es una noche completa en el resort que elija.",
        "cambios": [
          "Hotel: 1 noche en el resort todo incluido y 1 noche en la Ciudad de Panamá, en lugar de 2 noches en la ciudad.",
          "Itinerario: día 1, del aeropuerto al resort; día 2, del resort a la ciudad; día 3, de la ciudad al aeropuerto.",
          "Comidas: en el resort, el plan todo incluido aplica desde el registro de entrada (15:00) hasta la salida (12:00), según sus condiciones; en la ciudad, desayuno cuando la tarifa lo incluye.",
          "Traslados: el traslado de llegada va del aeropuerto al resort, a unas dos horas por carretera, y se agrega el traslado del resort a su hotel en la ciudad, también de unas dos horas.",
          "Hora de llegada: funciona mejor con un vuelo que llegue a Panamá antes del mediodía; si su vuelo llega más tarde, su asesor le propone otro orden o una noche adicional en el resort.",
          "En un viaje de tres días el tiempo en la playa es corto: si desea disfrutar más el resort, considere agregar una noche.",
          "Precio: es un costo adicional que se cotiza aparte, según sus fechas y la disponibilidad del resort."
        ],
        "costo_adicional": true,
        "foto": {
          "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/1.jpg",
          "alt": "Vista aérea de la costa de Playa Blanca, en Antón (Coclé), frente al océano Pacífico"
        }
      }
    ],
    "estancias": [
      {
        "id": "ciudad",
        "campo": "hotel",
        "titulo": "Su hotel en la Ciudad de Panamá",
        "noches": "2 noches (1 noche en la opción B)",
        "plan": "Desayuno cuando la tarifa lo incluye",
        "descripcion": "Hoteles en zonas céntricas y cómodas para compras y restaurantes. Ninguno de estos hoteles tiene plan todo incluido.",
        "portada": {
          "archivo": "/paquetes/escapada-fin-de-semana-panama/1.jpg",
          "alt": "Paseo con palmeras frente a la bahía y el horizonte de la Ciudad de Panamá"
        },
        "hoteles": [
          {
            "id": "hampton-by-hilton-panama",
            "nombre": "Hampton by Hilton Panamá",
            "categoria": "Confort",
            "zona": "Calle Eusebio A. Morales, El Cangrejo",
            "descripcion": "Hotel práctico y moderno en una zona de restaurantes y cafés, cerca del área bancaria y de Vía España. Una base cómoda para quien pasa el día fuera y prefiere el desayuno incluido en la tarifa.",
            "habitacion": "Habitación estándar (tipo de cama según disponibilidad)",
            "plan": "Desayuno bufé incluido en la tarifa del hotel",
            "amenidades": [
              "Desayuno bufé diario",
              "Piscina al aire libre con bar",
              "Terraza en la azotea",
              "Wifi"
            ],
            "ideal": "Viajeros que buscan buena ubicación y desayuno incluido en una categoría confortable.",
            "condiciones": [
              "Tarifa y disponibilidad se confirman al cotizar",
              "El trayecto al Casco Antiguo y a los centros comerciales es en taxi"
            ],
            "mejoras": [
              "Cambio a un hotel de categoría superior"
            ],
            "fotos": []
          },
          {
            "id": "riu-plaza-panama",
            "nombre": "Hotel Riu Plaza Panamá",
            "categoria": "Superior",
            "zona": "Calle 50, Marbella (área bancaria)",
            "descripcion": "Gran hotel urbano de la cadena RIU en pleno centro financiero, con tres restaurantes, piscina al aire libre y gimnasio. Muy bien conectado con Calle 50, la Cinta Costera y los centros comerciales.",
            "habitacion": "Habitación doble estándar",
            "plan": "Alojamiento con desayuno, según la tarifa que se confirme",
            "amenidades": [
              "Tres restaurantes y bares, entre ellos uno junto a la piscina",
              "Piscina al aire libre",
              "Gimnasio",
              "Salones de eventos y centro de negocios"
            ],
            "ideal": "Familias y viajeros que buscan un hotel completo en el centro financiero, cerca de restaurantes y compras.",
            "condiciones": [
              "El desayuno depende de la tarifa: su cotización indica si está incluido",
              "El estacionamiento tiene costo"
            ],
            "mejoras": [
              "Habitación superior o suite, según disponibilidad"
            ],
            "fotos": [
              {
                "archivo": "/hoteles/riu-plaza-panama/1.jpg",
                "alt": "Fachada del Hotel Riu Plaza Panamá, en Marbella"
              },
              {
                "archivo": "/hoteles/riu-plaza-panama/2.jpg",
                "alt": "Vestíbulo del Hotel Riu Plaza Panamá"
              }
            ],
            "recomendado": true
          },
          {
            "id": "hilton-panama",
            "nombre": "Hilton Panamá",
            "categoria": "Superior",
            "zona": "Avenida Balboa y Aquilino de la Guardia, frente a la bahía",
            "descripcion": "Torre sobre la Avenida Balboa, a pasos de la Cinta Costera y a dos cuadras del área bancaria, con vista a la bahía desde muchas de sus habitaciones.",
            "habitacion": "Habitación estándar; con vista a la bahía según la categoría",
            "plan": "Alojamiento con desayuno, según la tarifa que se confirme",
            "amenidades": [
              "Piscina climatizada en la azotea con vista a la bahía",
              "Spa y gimnasio",
              "Salón ejecutivo en las habitaciones de categoría ejecutiva",
              "A pasos de la Cinta Costera"
            ],
            "ideal": "Quienes quieren caminar por la Cinta Costera y despertar con vista a la bahía.",
            "condiciones": [
              "El desayuno no siempre está incluido: depende de la tarifa",
              "No confundir con el Hampton by Hilton, que es otro hotel"
            ],
            "mejoras": [
              "Habitación con vista a la bahía",
              "Habitación ejecutiva con acceso al salón ejecutivo"
            ],
            "fotos": []
          },
          {
            "id": "jw-marriott-panama",
            "nombre": "JW Marriott Panama",
            "categoria": "Premium",
            "zona": "Punta Pacífica, frente al mar",
            "descripcion": "La torre en forma de vela de Punta Pacífica, frente al mar y a pocos minutos de Multiplaza. Habitaciones amplias con balcón, varias piscinas con vista al océano, spa y casino en el complejo.",
            "habitacion": "Habitación de lujo con balcón",
            "plan": "Alojamiento; desayuno según la tarifa que se confirme",
            "amenidades": [
              "Varias piscinas al aire libre con vista al océano",
              "Spa y gimnasio",
              "Restaurantes y bares, entre ellos uno junto a la piscina",
              "Casino en el complejo"
            ],
            "ideal": "Parejas y viajeros que buscan una categoría alta, vista al mar y cercanía a Multiplaza.",
            "condiciones": [
              "El desayuno, el spa y el casino no están incluidos, salvo que su cotización lo indique"
            ],
            "mejoras": [
              "Suite o habitación con vista al mar, según disponibilidad"
            ],
            "fotos": [
              {
                "archivo": "/hoteles/jw-marriott-panama/1.jpg",
                "alt": "Torre en forma de vela del JW Marriott Panama, en Punta Pacífica"
              }
            ]
          }
        ]
      },
      {
        "id": "playa",
        "campo": "resort",
        "opcion": "b",
        "titulo": "Solo en la opción B: resort todo incluido",
        "noches": "1 noche",
        "plan": "Todo incluido del resort",
        "descripcion": "La noche en Playa Blanca de la opción B, con costo adicional. Nunca forma parte de la escapada base.",
        "portada": {
          "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/1.jpg",
          "alt": "Vista aérea de la costa de Playa Blanca, en Antón (Coclé), frente al océano Pacífico"
        },
        "hoteles": [
          {
            "id": "grand-decameron-panama",
            "nombre": "Grand Decameron Panamá",
            "categoria": "Todo incluido · Ideal para familias",
            "zona": "Farallón, Río Hato (Coclé), frente al mar",
            "descripcion": "Gran resort de playa de la cadena Decameron, con habitaciones en edificios bajos entre jardines, seis piscinas, restaurantes de varias cocinas y un programa de actividades de día y de noche.",
            "habitacion": "Habitación estándar con vista al jardín",
            "plan": "Todo incluido del resort: desayuno, almuerzo y cena tipo bufé, cenas a la carta con reserva, snacks y bebidas nacionales e importadas con y sin alcohol de la carta del plan",
            "amenidades": [
              "Seis piscinas para adultos y niños, una con toboganes",
              "Restaurantes de cocina mediterránea, italiana, mexicana, asiática, panameña, mariscos y carnes",
              "Programa diario de actividades, actividades para niños y espectáculos nocturnos",
              "Kayak, paddle, windsurf y velero incluidos",
              "Gimnasio, cancha de tenis y wifi"
            ],
            "ideal": "Familias y grupos que quieren variedad de restaurantes y actividades sin salir del resort.",
            "condiciones": [
              "Las cenas a la carta requieren reserva por la aplicación o el código QR del resort",
              "Registro de entrada desde las 15:00 y salida a más tardar a las 12:00",
              "Golf, deportes motorizados, excursiones, tiendas y otros servicios tienen costo adicional",
              "El resort considera niños de 2 a 11 años"
            ],
            "mejoras": [
              "Plan Todo Incluido Plus: restaurante y piscina exclusivos, bares adicionales, minibar y bebidas premium",
              "Habitación con vista al mar, según disponibilidad"
            ],
            "fotos": [],
            "recomendado": true
          },
          {
            "id": "riu-playa-blanca",
            "nombre": "Hotel Riu Playa Blanca",
            "categoria": "Todo incluido 24 horas",
            "zona": "Playa Blanca, Farallón (Coclé), frente al mar",
            "descripcion": "Resort de la cadena RIU frente a la playa, con todo incluido las 24 horas, piscinas con área infantil y programas de entretenimiento para niños y adultos.",
            "habitacion": "Habitación doble con vista al jardín o al mar",
            "plan": "Todo incluido 24 horas: comidas y bebidas en sus restaurantes y bares, según las condiciones del hotel",
            "amenidades": [
              "Restaurante bufé y restaurantes temáticos: italiano, asiático y asador",
              "Bares en el vestíbulo y en la piscina",
              "Piscinas con área infantil y toboganes",
              "Club infantil RiuLand y programa de entretenimiento Fun4All",
              "Gimnasio abierto las 24 horas"
            ],
            "ideal": "Familias con niños que quieren un todo incluido sin horarios fijos.",
            "condiciones": [
              "Registro de entrada desde las 15:00 y salida a las 12:00",
              "Golf, deportes acuáticos y otros servicios externos pueden tener costo"
            ],
            "mejoras": [
              "Habitación con vista al mar",
              "Suite con vista al mar"
            ],
            "fotos": []
          }
        ]
      }
    ],
    "dias": [
      {
        "titulo": "Bienvenidos a Panamá",
        "descripcion": "Recepción en el Aeropuerto Internacional de Tocumen y traslado a su hotel. Registro de entrada (habitualmente desde las 15:00) y tiempo libre para salir a cenar, recorrer la Cinta Costera o visitar un centro comercial.",
        "comidas": null,
        "alojamiento": "Su hotel en la Ciudad de Panamá"
      },
      {
        "titulo": "Panamá a su manera",
        "descripcion": "Día libre para compras en Multiplaza o Albrook Mall, o para pasear por el Casco Antiguo y la Calzada de Amador. Con costo adicional, puede sumar una visita al Canal de Panamá, un recorrido guiado por la ciudad u otra excursión.",
        "comidas": "Desayuno, si su tarifa lo incluye",
        "alojamiento": "Su hotel en la Ciudad de Panamá"
      },
      {
        "titulo": "Hasta pronto, Panamá",
        "descripcion": "Registro de salida y traslado al Aeropuerto Internacional de Tocumen según el horario de su vuelo. Fin de los servicios.",
        "comidas": "Desayuno, si su tarifa lo incluye",
        "alojamiento": null
      }
    ],
    "experiencias": [
      {
        "id": "compras",
        "titulo": "Compras en Multiplaza y Albrook Mall",
        "modalidad": "libre",
        "foto": {
          "archivo": "/paquetes/escapada-fin-de-semana-panama/2.jpg",
          "alt": "Entrada del centro comercial Multiplaza, en la Ciudad de Panamá"
        },
        "descripcion": "Multiplaza, en Punta Pacífica, y Albrook Mall, junto a la terminal de Albrook, reúnen tiendas de marcas internacionales, tiendas por departamento, restaurantes y cines.",
        "destacados": [
          "Marcas internacionales y tiendas por departamento",
          "Restaurantes y patios de comidas",
          "Cines y áreas de juego para niños"
        ],
        "duracion": "A su ritmo",
        "lugar": "Punta Pacífica y Albrook, Ciudad de Panamá",
        "entradas": "Sin costo de entrada; el traslado es por su cuenta o con el recorrido de compras opcional",
        "preparacion": "Revise la franquicia de equipaje de su boleto aéreo antes de comprar.",
        "notas": []
      },
      {
        "id": "casco-antiguo",
        "titulo": "Paseo por el Casco Antiguo",
        "modalidad": "libre",
        "foto": {
          "archivo": "/experiencias/casco-antiguo.jpg",
          "alt": "Plaza arbolada y edificios históricos del Casco Antiguo"
        },
        "descripcion": "El barrio fundado en 1673, tras la destrucción de Panamá Viejo, conserva plazas, iglesias y casonas de varios siglos, hoy restauradas con hoteles, cafés y museos. Es parte del sitio declarado Patrimonio de la Humanidad por la UNESCO.",
        "destacados": [
          "Plaza de la Independencia y Catedral Metropolitana",
          "Iglesia de San José y su Altar de Oro",
          "Plaza de Francia y el Paseo Esteban Huertas, con vista a la bahía",
          "El Palacio de las Garzas, sede de la Presidencia, visto desde el exterior"
        ],
        "duracion": "Alrededor de 2 a 3 horas a pie (estimado)",
        "lugar": "Casco Antiguo (San Felipe), Ciudad de Panamá",
        "entradas": "Por su cuenta; recorrido con guía disponible con costo adicional",
        "preparacion": "Calzado cómodo y ropa que cubra hombros y rodillas para entrar a las iglesias.",
        "notas": [
          "Las iglesias pueden cerrar durante misas o celebraciones."
        ]
      },
      {
        "id": "canal-miraflores",
        "titulo": "Visita al Canal de Panamá en Miraflores",
        "modalidad": "opcional",
        "foto": {
          "archivo": "/experiencias/canal-miraflores.jpg",
          "alt": "Vista de las esclusas de Miraflores desde el Centro de Visitantes"
        },
        "descripcion": "Las esclusas de Miraflores, en el lado Pacífico del Canal, suben y bajan los barcos en dos escalones entre el lago Miraflores y el océano. Desde las terrazas del Centro de Visitantes se observan de cerca las compuertas, las locomotoras que guían a los buques y, si coincide un tránsito, el paso de un barco.",
        "destacados": [
          "Terrazas de observación frente a las esclusas",
          "Exhibiciones sobre la historia y el funcionamiento del Canal",
          "Locomotoras eléctricas que guían a los buques"
        ],
        "duracion": "Alrededor de 2 a 3 horas con los traslados (estimado)",
        "lugar": "Centro de Visitantes de Miraflores, a unos 20 a 30 minutos del centro de la ciudad",
        "entradas": "Entrada y traslado con costo adicional, si la agrega",
        "preparacion": "Lleve gorra o sombrero y protector solar: las terrazas son al aire libre.",
        "notas": [
          "La Autoridad del Canal informó obras de modernización del Centro de Visitantes hasta finales de 2026: algunas áreas pueden no estar disponibles y la espera puede ser mayor en horas de alta afluencia.",
          "El paso de buques depende de la programación del Canal: no es posible garantizar un tránsito durante su visita."
        ]
      },
      {
        "id": "panama-viejo",
        "titulo": "Panamá Viejo",
        "modalidad": "opcional",
        "foto": {
          "archivo": "/experiencias/panama-viejo.jpg",
          "alt": "Torre de la catedral y ruinas del sitio arqueológico de Panamá Viejo"
        },
        "descripcion": "Ruinas de la primera ciudad española en la costa del Pacífico de América, fundada en 1519 y abandonada tras el ataque de Henry Morgan en 1671. La torre de la antigua catedral y el museo del sitio son su mayor atractivo.",
        "destacados": [
          "Torre de la antigua catedral, con mirador",
          "Ruinas de conventos y casas coloniales",
          "Museo del sitio arqueológico"
        ],
        "duracion": "2 a 3 horas (estimado)",
        "lugar": "Al este de la ciudad, camino al aeropuerto",
        "entradas": "Entrada con costo, no incluida",
        "preparacion": "Calzado cómodo y protector solar: el recorrido es al aire libre.",
        "notas": []
      },
      {
        "id": "biomuseo",
        "titulo": "Biomuseo",
        "modalidad": "opcional",
        "foto": {
          "archivo": "/experiencias/biomuseo.jpg",
          "alt": "Edificio de colores del Biomuseo, en la Calzada de Amador"
        },
        "descripcion": "Museo de la biodiversidad en la entrada de la Calzada de Amador, el primer edificio diseñado por Frank Gehry en América Latina. Explica cómo el surgimiento del istmo de Panamá cambió la vida en el planeta.",
        "destacados": [
          "Arquitectura de Frank Gehry",
          "Galerías sobre la biodiversidad y la formación del istmo",
          "Parque botánico exterior"
        ],
        "duracion": "1 a 2 horas (estimado)",
        "lugar": "Calzada de Amador",
        "entradas": "Entrada con costo, no incluida",
        "preparacion": null,
        "notas": []
      },
      {
        "id": "playa-blanca-todo-incluido",
        "titulo": "Experiencia todo incluido en Playa Blanca",
        "modalidad": "opcional",
        "foto": {
          "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/1.jpg",
          "alt": "Vista aérea de la costa de Playa Blanca, en Antón (Coclé), frente al océano Pacífico"
        },
        "descripcion": "Playa Blanca está en la costa del Pacífico de la provincia de Coclé, con arena clara y mar abierto, a unas dos horas por carretera de la Ciudad de Panamá. Los resorts todo incluido de la zona reúnen comidas, bebidas, piscinas y entretenimiento en un mismo lugar.",
        "destacados": [
          "Playa frente al resort",
          "Comidas y bebidas según el plan del resort elegido",
          "Piscinas, actividades y espectáculos nocturnos",
          "Deportes acuáticos no motorizados en algunos resorts"
        ],
        "duracion": "1 noche (opción B)",
        "lugar": "Farallón y Río Hato, provincia de Coclé",
        "entradas": "Según el plan todo incluido del resort elegido",
        "preparacion": "Traje de baño, protector solar y sandalias. Reserve las cenas a la carta al llegar al resort.",
        "notas": [
          "Lo que incluye el plan cambia de un resort a otro: revise la ficha de cada uno.",
          "El Pacífico tiene oleaje y mareas variables: siga las indicaciones del resort."
        ]
      }
    ],
    "secciones": [
      {
        "titulo": "Traslados",
        "parrafos": [
          "Los traslados entre el Aeropuerto Internacional de Tocumen y su hotel se programan según los horarios de sus vuelos, en servicio compartido o privado según su cotización. El trayecto suele tomar entre 30 y 60 minutos, según el tráfico. Los traslados a centros comerciales u otros paseos no están incluidos, salvo que los agregue."
        ],
        "items": []
      },
      {
        "titulo": "Información importante",
        "parrafos": [],
        "items": [
          "El desayuno depende de la tarifa del hotel que elija; su cotización indica si está incluido.",
          "La opción B cambia el alojamiento, los traslados y el plan de comidas; nunca se incluye en la escapada base.",
          "Antes de viajar, revise los requisitos de entrada a Panamá para su nacionalidad; su asesor le orienta."
        ]
      },
      {
        "titulo": "Recomendaciones para su viaje",
        "parrafos": [],
        "items": [
          "Si viaja a hacer compras, revise la franquicia de equipaje de su boleto aéreo antes de salir.",
          "De mayo a noviembre son frecuentes las lluvias por la tarde; lleve un paraguas pequeño.",
          "En Panamá circula el dólar estadounidense, y las tarjetas se aceptan en la mayoría de comercios."
        ]
      },
      {
        "titulo": "Condiciones de reserva",
        "parrafos": [],
        "items": [
          "Esta es una configuración propuesta: hoteles, resort, operadores y servicios se confirman con cada proveedor al preparar su cotización.",
          "Mencionar un hotel no significa que tenga cupo ni una tarifa reservada.",
          "Ningún servicio queda reservado hasta que su asesor lo confirme por escrito.",
          "Las condiciones de pago, cambios y cancelación de cada proveedor se indican en su cotización antes de cualquier pago."
        ]
      }
    ],
    "adicionales": [
      "Boleto aéreo desde Honduras",
      "Visita al Canal de Panamá (Miraflores)",
      "Recorrido guiado por el Casco Antiguo",
      "Recorrido de compras con transporte",
      "Noche adicional",
      "Traslados privados",
      "Asistencia de viaje"
    ],
    "aviso": "No publicamos precios: dependen de sus fechas, de la cantidad de viajeros, del hotel y de la opción que elija. La experiencia todo incluido de la opción B tiene un costo adicional que se cotiza aparte. Su asesor le confirma servicios y tarifa en una cotización personalizada, sin costo ni compromiso.",
    "seo": {
      "titulo": "viatour | Fin de semana en Panamá: 3 días y 2 noches",
      "descripcion": "Escapada a Panamá desde Honduras: 3 días y 2 noches con hotel a elegir y traslados, compras y opción todo incluido en Playa Blanca con costo adicional."
    },
    "creditos": [
      {
        "archivo": "/paquetes/escapada-fin-de-semana-panama/1.jpg",
        "alt": "Paseo con palmeras frente a la bahía y el horizonte de la Ciudad de Panamá",
        "autor": "Terry Ott",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Downtown_Panama_City.jpg"
      },
      {
        "archivo": "/paquetes/escapada-fin-de-semana-panama/2.jpg",
        "alt": "Entrada del centro comercial Multiplaza, en la Ciudad de Panamá",
        "autor": "Harminon",
        "licencia": "CC BY 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Multiplaza_Mall_-_Panama.jpg"
      },
      {
        "archivo": "/paquetes/escapada-fin-de-semana-panama/3.jpg",
        "alt": "Carrusel y área de juegos dentro de Albrook Mall",
        "autor": "Cttm 25",
        "licencia": "CC0",
        "licencia_url": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "fuente": "https://commons.wikimedia.org/wiki/File:Playtime_at_Albrook_Mall.jpg"
      },
      {
        "archivo": "/paquetes/escapada-fin-de-semana-panama/4.jpg",
        "alt": "Fachada y estacionamiento de Albrook Mall",
        "autor": "randreu",
        "licencia": "CC BY 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panama_-_Albrook_Mall_-_panoramio.jpg"
      },
      {
        "archivo": "/paquetes/escapada-fin-de-semana-panama/5.jpg",
        "alt": "Calle del Casco Antiguo con balcones floridos y la bandera de Panamá",
        "autor": "RB Photo",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Casco_Viejo,_Panama_City,_Panama_-_54311684313.jpg"
      },
      {
        "archivo": "/paquetes/escapada-fin-de-semana-panama/6.jpg",
        "alt": "Vista del Casco Antiguo, con sus plazas y edificios coloniales",
        "autor": "RB Photo",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Casco_Viejo,_Panama_City,_Panama_-_54372053320.jpg"
      },
      {
        "archivo": "/paquetes/escapada-fin-de-semana-panama/7.jpg",
        "alt": "Personas caminando por el paseo arbolado de la Calzada de Amador",
        "autor": "Editorpana",
        "licencia": "CC BY 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Calzada_de_amador.jpg"
      },
      {
        "archivo": "/paquetes/escapada-fin-de-semana-panama/8.jpg",
        "alt": "Torres del centro de la Ciudad de Panamá",
        "autor": "Eric Titcombe",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panama_City_Skyline_180107.jpg"
      },
      {
        "archivo": "/paquetes/panama-ciudad-playa-blanca-todo-incluido/1.jpg",
        "alt": "Vista aérea de la costa de Playa Blanca, en Antón (Coclé), frente al océano Pacífico",
        "autor": "geo.edgonzalez",
        "licencia": "CC BY-SA 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panama_riviera_-_panoramio.jpg"
      },
      {
        "archivo": "/hoteles/riu-plaza-panama/1.jpg",
        "alt": "Fachada del Hotel Riu Plaza Panamá, en Marbella",
        "autor": "Christian Córdova",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Hotel_Riu_Plaza_Panam%C3%A1.jpg"
      },
      {
        "archivo": "/hoteles/riu-plaza-panama/2.jpg",
        "alt": "Vestíbulo del Hotel Riu Plaza Panamá",
        "autor": "Christian Córdova",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Hall_Hotel_Riu_Plaza_Panam%C3%A1.jpg"
      },
      {
        "archivo": "/hoteles/jw-marriott-panama/1.jpg",
        "alt": "Torre en forma de vela del JW Marriott Panama, en Punta Pacífica",
        "autor": "Mariordo (Mario Roberto Duran Ortiz)",
        "licencia": "CC BY-SA 3.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/3.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panama_08_2013_Trump_Ocean_Club_Tower_7089.JPG"
      },
      {
        "archivo": "/experiencias/casco-antiguo.jpg",
        "alt": "Plaza arbolada y edificios históricos del Casco Antiguo",
        "autor": "RB Photo",
        "licencia": "CC BY 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Casco_Viejo,_Panama_City,_Panama_-_54301629817.jpg"
      },
      {
        "archivo": "/experiencias/canal-miraflores.jpg",
        "alt": "Vista de las esclusas de Miraflores desde el Centro de Visitantes",
        "autor": "Adam Jones",
        "licencia": "CC BY-SA 2.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/2.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:View_over_Miraflores_Locks_from_Visitor%27s_Center_(02).jpg"
      },
      {
        "archivo": "/experiencias/panama-viejo.jpg",
        "alt": "Torre de la catedral y ruinas del sitio arqueológico de Panamá Viejo",
        "autor": "xiquinhosilva",
        "licencia": "CC BY 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Panam%C3%A1_Viejo.jpg"
      },
      {
        "archivo": "/experiencias/biomuseo.jpg",
        "alt": "Edificio de colores del Biomuseo, en la Calzada de Amador",
        "autor": "Editorpana",
        "licencia": "CC BY-SA 4.0",
        "licencia_url": "https://creativecommons.org/licenses/by-sa/4.0",
        "fuente": "https://commons.wikimedia.org/wiki/File:Biomuseo_panama.jpg"
      }
    ]
  }
}$pkg$::jsonb) as r
on conflict (slug) do nothing;

commit;

-- Verificación (solo lectura):
-- select slug, publicado, destacado, orden, destination_id is not null as con_destino,
--        jsonb_typeof(ficha) as ficha, galeria is not null as con_fotos
-- from public.packages where slug in ('panama-ciudad-canal-casco-historico', 'panama-ciudad-playa-blanca-todo-incluido', 'escapada-fin-de-semana-panama') order by orden;
