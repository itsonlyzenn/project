export default function handler(req, res) {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const REDIRECT_URI = encodeURIComponent("https://arex.my.id/api/auth/callback");
  
  // Scope 'identify' cuma minta ID, Username, & Avatar (Sangat Aman)
  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify`;

  return res.redirect(302, discordAuthUrl);
}