-- ============================================================
-- 004_seed.sql
-- Sample data for local development
-- ============================================================

-- Sample Movies
INSERT INTO movies (id, title, description, duration_minutes, genre, language, poster_url, rating, release_date, is_active) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'Kalki 2898-AD',
  'A futuristic saga set in the dystopian city of Kashi, where a bounty hunter''s destiny intertwines with an unborn child who may be the savior of humanity. A magnum opus blending mythology and science fiction.',
  181, 'Sci-Fi / Action', 'Telugu', 
  '/posters/kalki.jpg',
  8.4, '2026-06-27', true
),
(
  '22222222-2222-2222-2222-222222222222',
  'Pushpa 2: The Rule',
  'Pushpa Raj returns with a vengeance as his red sandalwood smuggling empire faces its greatest threat yet. A power-packed sequel to the blockbuster original.',
  220, 'Action / Drama', 'Telugu',
  '/posters/pushpa2.jpg',
  8.1, '2026-12-05', true
),
(
  '33333333-3333-3333-3333-333333333333',
  'Singham Again',
  'Bajirao Singham is back! The fearless cop returns on a mission to rescue his wife, leading the ultimate Cop Universe crossover event.',
  168, 'Action', 'Hindi',
  '/posters/singham.jpg',
  7.2, '2026-11-01', true
),
(
  '44444444-4444-4444-4444-444444444444',
  'The Sabarmati Report',
  'A gripping investigative thriller based on the 2002 Godhra train burning incident, following two journalists who unravel hidden truths.',
  132, 'Drama / Thriller', 'Hindi',
  '/posters/sabarmati.jpg',
  7.8, '2026-11-15', true
),
(
  '55555555-5555-5555-5555-555555555555',
  'Devara: Part 1',
  'A fearless man rules the coast by harnessing the power of fear. But when his son fails to live up to his legacy, old enemies resurface with a vengeance.',
  176, 'Action / Drama', 'Telugu',
  '/posters/devara.jpg',
  7.5, '2026-09-27', true
),
(
  '66666666-6666-6666-6666-666666666666',
  'Stree 2',
  'The women of Chanderi are being abducted by a mysterious headless entity. Stree must return to save them in this horror-comedy sequel.',
  135, 'Horror / Comedy', 'Hindi',
  '/posters/stree2.jpg',
  8.7, '2026-08-15', true
);

-- Sample Theaters
INSERT INTO theaters (id, name, city, address) VALUES
('aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PVR ICON', 'Mumbai', 'Oberoi Mall, Goregaon East, Mumbai - 400063'),
('aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'INOX Megaplex', 'Mumbai', 'R City Mall, LBS Marg, Ghatkopar West, Mumbai - 400086'),
('aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cinepolis VIP', 'Delhi', 'Ambience Mall, NH-8, Gurgaon - 122001'),
('aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PVR Prestige', 'Bangalore', 'Forum Mall, Hosur Road, Koramangala, Bangalore - 560029'),
('aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SPI Cinemas', 'Chennai', 'Express Avenue Mall, Whites Road, Chennai - 600014');

-- Sample Screens
INSERT INTO screens (id, theater_id, name, total_rows, total_columns) VALUES
('bbbb0001-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Audi 1 - Gold', 10, 15),
('bbbb0002-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Audi 2 - Silver', 8, 12),
('bbbb0003-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Screen 1 - IMAX', 12, 18),
('bbbb0004-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Audi Prime', 10, 16),
('bbbb0005-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Screen A - 4DX', 8, 14);
