import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "No code provided from Discord" });
  }

  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const REDIRECT_URI = "https://arex.my.id/api/auth/callback";

  try {
    // 1. Tukar Code dengan Access Token
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error("Gagal mengambil access token dari Discord");
    }

    // 2. Ambil Profil User Discord
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();

    // 3. Simpan Sesi Ke Database Supabase
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const avatarUrl = userData.avatar 
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    const { error } = await supabase
      .from('sessions')
      .insert([{
        session_token: sessionToken,
        user_id: userData.id,
        username: userData.username,
        avatar: avatarUrl
      }]);

    if (error) throw error;

    // 4. Redirect aman ke halaman utama
    const encodedUsername = encodeURIComponent(userData.username);
    const encodedAvatar = encodeURIComponent(avatarUrl);

    res.setHeader('Location', `/?session=${sessionToken}&username=${encodedUsername}&avatar=${encodedAvatar}`);
    return res.status(302).end();

  } catch (err) {
    console.error("Auth Callback Error:", err);
    res.setHeader('Location', '/?error=auth_failed');
    return res.status(302).end();
  }
}