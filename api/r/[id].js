import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  const { id, target, session } = req.query;

  // 1. KASUS 1: MEMBUAT LINK BARU
  if (id === 'create') {
    if (!session || !target) {
      return res.status(400).json({ error: "Missing session or target URL" });
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_token', session)
        .single();

      if (sessionError || !sessionData) {
        return res.status(401).json({ error: "Sesi habis atau tidak valid. Silakan login ulang." });
      }

      const shortId = Math.random().toString(36).substring(2, 8);

      // Insert menggunakan kolom 'short_id' sesuai tabel Supabase kamu
      const { error: insertError } = await supabase
        .from('links')
        .insert([{
          short_id: shortId,
          target_url: target,
          user_id: sessionData.user_id
        }]);

      if (insertError) throw insertError;

      const shortUrl = `https://arex.my.id/api/r/${shortId}`;
      return res.status(200).json({ shortUrl });

    } catch (err) {
      console.error("Create Link Error:", err);
      return res.status(500).json({ error: "Gagal membuat link: " + err.message });
    }
  }

  // 2. KASUS 2: REDIRECT BERDASARKAN short_id
  if (id) {
    try {
      const { data: linkData, error: linkError } = await supabase
        .from('links')
        .select('*')
        .eq('short_id', id)
        .single();

      if (linkError || !linkData) {
        return res.status(404).send("Link tidak ditemukan.");
      }

      res.setHeader('Location', linkData.target_url);
      return res.status(302).end();

    } catch (err) {
      console.error("Redirect Error:", err);
      return res.status(500).send("Internal Server Error");
    }
  }

  return res.status(400).json({ error: "Bad request" });
}