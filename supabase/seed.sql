-- Insert mock users into auth.users
-- Passwords are set to 'password123'
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change
)
VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alice@example.com', crypt('password123', gen_salt('bf')), now(), '{"username":"alice", "display_name":"Alice Pro"}', now(), now(), '', '', '', '', ''),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bob@example.com', crypt('password123', gen_salt('bf')), now(), '{"username":"bob", "display_name":"Bob Noob"}', now(), now(), '', '', '', '', ''),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'charlie@example.com', crypt('password123', gen_salt('bf')), now(), '{"username":"charlie", "display_name":"Charlie T"}', now(), now(), '', '', '', '', '');

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', format('{"sub":"%s","email":"%s"}', '11111111-1111-1111-1111-111111111111', 'alice@example.com')::jsonb, 'email', 'alice@example.com', now(), now()),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222222', 'bob@example.com')::jsonb, 'email', 'bob@example.com', now(), now()),
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', format('{"sub":"%s","email":"%s"}', '33333333-3333-3333-3333-333333333333', 'charlie@example.com')::jsonb, 'email', 'charlie@example.com', now(), now());

-- Wait, the `handle_new_user` trigger automatically creates profiles for these users!
-- Add an active room in the lobby waiting for a player
INSERT INTO public.rooms (id, game_slug, name, host_id, status)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tic-tac-toe', 'Alice''s Room', '11111111-1111-1111-1111-111111111111', 'waiting');

-- Add room players (Alice is host and sitting in seat 1)
INSERT INTO public.room_players (room_id, user_id, seat)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 1);

-- Add some past match results for the Leaderboard
-- Bob vs Charlie (Bob won)
INSERT INTO public.matches (id, room_id, game_slug, state, status, winner_id, finished_at)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tic-tac-toe', '{"board":["X","X","X","O","O",null,null,null,null]}'::jsonb, 'finished', '22222222-2222-2222-2222-222222222222', now());

INSERT INTO public.match_results (match_id, game_slug, user_id, outcome, points)
VALUES 
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tic-tac-toe', '22222222-2222-2222-2222-222222222222', 'win', 3),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tic-tac-toe', '33333333-3333-3333-3333-333333333333', 'loss', 0);

-- Alice vs Bob (Draw)
INSERT INTO public.matches (id, room_id, game_slug, state, status, is_draw, finished_at)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tic-tac-toe', '{"board":["X","O","X","X","O","O","O","X","X"]}'::jsonb, 'finished', true, now());

INSERT INTO public.match_results (match_id, game_slug, user_id, outcome, points)
VALUES 
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'tic-tac-toe', '11111111-1111-1111-1111-111111111111', 'draw', 1),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'tic-tac-toe', '22222222-2222-2222-2222-222222222222', 'draw', 1);

-- Alice vs Charlie (Alice won)
INSERT INTO public.matches (id, room_id, game_slug, state, status, winner_id, finished_at)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tic-tac-toe', '{"board":["X","O",null,"X","O",null,"X",null,null]}'::jsonb, 'finished', '11111111-1111-1111-1111-111111111111', now());

INSERT INTO public.match_results (match_id, game_slug, user_id, outcome, points)
VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'tic-tac-toe', '11111111-1111-1111-1111-111111111111', 'win', 3),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'tic-tac-toe', '33333333-3333-3333-3333-333333333333', 'loss', 0);
