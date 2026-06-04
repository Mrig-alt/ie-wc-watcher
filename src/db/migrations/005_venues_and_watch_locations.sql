-- Venues: master list of places to watch matches (pre-seeded with Madrid pubs)
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  area VARCHAR(100),
  address VARCHAR(300),
  maps_url VARCHAR(500),
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  is_custom BOOLEAN NOT NULL DEFAULT false,
  added_by UUID REFERENCES students(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add venue_id to watch_invites (nullable — null means custom free-text entry)
ALTER TABLE watch_invites
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;

-- Pre-seed curated Madrid venues
INSERT INTO venues (name, area, address, maps_url) VALUES
  ('El Ibu', 'Salamanca / Chamartín', 'C/ Príncipe de Vergara, 103', 'https://maps.google.com/?q=El+Ibu+Principe+de+Vergara+103+Madrid'),
  ('The Irish Rover', 'Salamanca', 'C/ Serrano, 41', 'https://maps.google.com/?q=The+Irish+Rover+Serrano+41+Madrid'),
  ('Panenka Restaurant', 'Tetuán / Orense', 'C/ de Orense, 6', 'https://maps.google.com/?q=Panenka+Restaurant+Orense+6+Madrid'),
  ('87 Millas Sport Bar', 'Chamberí', 'C/ de Galileo, 75', 'https://maps.google.com/?q=87+Millas+Sport+Bar+Galileo+75+Madrid'),
  ('Fratina Sport Bar', 'Chamberí', 'C/ de Guzmán el Bueno, 56', 'https://maps.google.com/?q=Fratina+Sport+Bar+Madrid'),
  ('Beerhouse Chamberí', 'Chamberí', 'C/ Cardenal Cisneros, 16', 'https://maps.google.com/?q=Beerhouse+Chamberi+Madrid'),
  ('The Waterboy Sports Bar', 'Chamberí', 'C/ de Rodríguez San Pedro, 44', 'https://maps.google.com/?q=The+Waterboy+Sports+Bar+Madrid'),
  ('James Joyce Irish Pub', 'Centro', 'C/ de Alcalá, 59', 'https://maps.google.com/?q=James+Joyce+Irish+Pub+Alcala+Madrid'),
  ('La Fontana de Oro', 'Centro', 'C/ de la Victoria, 1', 'https://maps.google.com/?q=La+Fontana+de+Oro+Madrid'),
  ('Finnegans', 'Centro', 'C/ de los Jardines, 7', 'https://maps.google.com/?q=Finnegans+Madrid'),
  ('O''Connell Irish Pub', 'Centro', 'C/ Espoz y Mina, 7', 'https://maps.google.com/?q=O+Connell+Irish+Pub+Madrid'),
  ('Sports Pub Madrid', 'Centro', 'C/ Marqués de Santa Ana, 11', 'https://maps.google.com/?q=Sports+Pub+Madrid'),
  ('38 Sport Pub', 'Centro', 'C/ Preciados, 38', 'https://maps.google.com/?q=38+Sport+Pub+Preciados+Madrid'),
  ('La Abadía', 'Centro', 'C/ de Jacometrezo, 15', 'https://maps.google.com/?q=La+Abadia+Madrid'),
  ('LaLiga TwentyNine''s', 'Gran Vía', 'Gran Vía, 29', 'https://maps.google.com/?q=LaLiga+TwentyNines+Gran+Via+Madrid'),
  ('El Tigre', 'Gran Vía', 'C/ de las Infantas, 30', 'https://maps.google.com/?q=El+Tigre+Infantas+Madrid'),
  ('La Bicicleta Café', 'Malasaña', 'Plaza de San Ildefonso, 9', 'https://maps.google.com/?q=La+Bicicleta+Cafe+Madrid'),
  ('Beerhouse La Latina', 'La Latina', 'C/ de las Maldonadas, 5', 'https://maps.google.com/?q=Beerhouse+La+Latina+Madrid'),
  ('Taberna La Concha', 'La Latina', 'C/ de la Cava Baja, 7', 'https://maps.google.com/?q=Taberna+La+Concha+Madrid'),
  ('Finn McCool''s', 'Moncloa', 'C/ de Gaztambide, 9', 'https://maps.google.com/?q=Finn+McCools+Madrid'),
  ('Soccer Bar Cervecería', 'Pinar del Rey', 'C/ de Caleruega, 1', 'https://maps.google.com/?q=Soccer+Bar+Caleruega+Madrid'),
  ('Bar Akelarre', 'Metropolitano', 'C/ Nicolasa Gómez, 104', 'https://maps.google.com/?q=Bar+Akelarre+Metropolitano+Madrid'),
  ('Birra Bernabéu', 'Bernabéu', 'Av. Concha Espinal, 6', 'https://maps.google.com/?q=Birra+Bernabeu+Madrid'),
  ('Cervecería El Diario', 'Huertas', 'C/ del León, 9', 'https://maps.google.com/?q=Cerveceria+El+Diario+Madrid'),
  ('Cañas y Tapas', 'Centro', 'C/ Bordadores, 3', 'https://maps.google.com/?q=Canas+y+Tapas+Madrid')
ON CONFLICT DO NOTHING;
