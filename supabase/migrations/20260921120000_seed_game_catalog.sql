INSERT INTO public.games (slug, name, tagline, description, min_players, max_players, is_active)
VALUES (
  'tic-tac-toe',
  'Tic-Tac-Toe',
  'Three in a row wins',
  'Classic 3x3 duel. Claim a line before your opponent does.',
  2,
  2,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  min_players = EXCLUDED.min_players,
  max_players = EXCLUDED.max_players,
  is_active = EXCLUDED.is_active;