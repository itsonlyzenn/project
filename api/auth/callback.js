global.userSessions = global.userSessions || {};

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.redirect(302, '/?error=no_code');
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
    if (!tokenData.access_token) throw new Error("Gagal mengambil access token");

    // 2. Ambil Profil User Discord
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();

    // 3. Simpan Sesi User
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    global.userSessions[sessionToken] = {
      id: userData.id,
      username: userData.username,
      avatar: userData.avatar 
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`
    };

    // Redirect kembali ke Dashboard dengan membawa Token Sesi
    return res.redirect(302, `/?session=${sessionToken}`);

  } catch (err) {
    console.error(err);
    return res.redirect(302, '/?error=auth_failed');
  }
}