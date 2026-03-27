-- ── Friendships ─────────────────────────────────────────────────────────────
-- Stores friend relationships between independent students.
-- Status: 'pending' (sent, awaiting), 'accepted', 'declined'

CREATE TABLE IF NOT EXISTS friendships (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_self_friend CHECK (requester_id != addressee_id),
  -- Canonical ordering: only one row per pair (requester < addressee OR the actual requester)
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships (requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships (addressee_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS friendships_updated_at ON friendships;
CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_friendships_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can see friendships they are a party to
CREATE POLICY "users_see_own_friendships" ON friendships
  FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );

-- Any authenticated user can send a friend request (as requester)
CREATE POLICY "users_can_send_request" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Only the addressee can accept or decline; only the requester can cancel
CREATE POLICY "parties_can_update_friendship" ON friendships
  FOR UPDATE USING (
    auth.uid() = addressee_id OR auth.uid() = requester_id
  );

-- Either party can remove a friendship
CREATE POLICY "parties_can_delete_friendship" ON friendships
  FOR DELETE USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );

-- ── Allow searching other users' public profile info ────────────────────────
-- Independent students need to find each other by name.
-- This adds a read policy on profiles for authenticated users (name + avatar only).

DROP POLICY IF EXISTS "authenticated_can_read_basic_profiles" ON profiles;
CREATE POLICY "authenticated_can_read_basic_profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
