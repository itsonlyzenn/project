import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  const { session } = req.query;

  if (!session) {
    return res.status(400).json({ error: "No session provided" });
  }

  try {
    // Cek session token di database Supabase
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_token', session)
      .single();

    if (error || !data) {
      return res.status(401).json({ user: null });
    }

    // Jika valid, kembalikan data user
    return res.status(200).json({
      user: {
        id: data.user_id,
        username: data.username,
        avatar: data.avatar
      }
    });

  } catch (err) {
    console.error("Check Session Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}