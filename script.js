// script.js - AREX INTEL DASHBOARD (FULL CODE)

// ============================================
// 1. CEK SESSION / LOGIN STATUS
// ============================================
async function checkSession() {
  // Tangkap parameter dari URL setelah redirect Discord
  const urlParams = new URLSearchParams(window.location.search);
  const urlSession = urlParams.get('session');
  const urlUsername = urlParams.get('username');
  const urlAvatar = urlParams.get('avatar');

  // Jika ada parameter session di URL, simpan ke localStorage
  if (urlSession) {
    localStorage.setItem('session_token', urlSession);
    if (urlUsername) localStorage.setItem('username', urlUsername);
    if (urlAvatar) localStorage.setItem('avatar', urlAvatar);

    // Bersihkan URL dari parameter yang panjang supaya rapi
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Ambil data dari localStorage
  const session = localStorage.getItem('session_token');
  const username = localStorage.getItem('username');
  const avatar = localStorage.getItem('avatar');

  // Jika tidak ada session token, tampilkan halaman login
  if (!session) {
    document.getElementById('loginState').style.display = 'block';
    document.getElementById('appState').style.display = 'none';
    return;
  }

  // Jika ada session, langsung buka dashboard dan pasang data usernya
  document.getElementById('loginState').style.display = 'none';
  document.getElementById('appState').style.display = 'block';

  document.getElementById('userAvatar').src = avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
  document.getElementById('userName').textContent = username || 'User';
}

// ============================================
// 2. GENERATE MASKED LINK
// ============================================
async function generateMaskedLink() {
  const input = document.getElementById('targetUrl');
  const btn = document.querySelector('.btn-danger');
  const resBox = document.getElementById('resLogger');
  
  const target = input.value.trim();
  const session = localStorage.getItem('session_token');

  // Validasi input kosong
  if (!target) {
    resBox.className = 'result-box error';
    resBox.textContent = '❌ Masukkan URL tujuan terlebih dahulu!';
    return;
  }

  // Validasi sesi login
  if (!session) {
    resBox.className = 'result-box error';
    resBox.textContent = '❌ Silakan login terlebih dahulu!';
    return;
  }

  // Format URL target (pastikan ada protokolnya)
  let formattedTarget = target;
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    formattedTarget = 'https://' + target;
  }

  // Ubah status tombol jadi loading
  btn.disabled = true;
  btn.textContent = '⏳ Processing...';
  resBox.className = 'result-box';
  resBox.textContent = '⏳ Membuat link tracking...';

  try {
    // Memanggil endpoint backend api/r/create
    const res = await fetch(`/api/r/create?target=${encodeURIComponent(formattedTarget)}&session=${session}`);
    const data = await res.json();

    if (data.error) {
      resBox.className = 'result-box error';
      resBox.textContent = '❌ ' + data.error;
      return;
    }

    // Sukses: Tampilkan link di layar
    resBox.className = 'result-box success';
    resBox.innerHTML = `
      ✅ Link berhasil dibuat!<br>
      🔗 <a href="${data.shortUrl}" target="_blank" class="short-link">${data.shortUrl}</a>
      <br><br>
      <span style="font-size:12px; color:#64748b;">
        📍 GPS presisi &lt; 500m akan dilacak saat target mengklik link
      </span>
    `;

    // Auto copy link ke clipboard
    try {
      await navigator.clipboard.writeText(data.shortUrl);
      resBox.innerHTML += `<br><span style="font-size:12px; color:#22c55e;">📋 Link sudah disalin ke clipboard!</span>`;
    } catch (e) {
      // Abaikan jika browser memblokir clipboard otomatis
    }

  } catch (err) {
    resBox.className = 'result-box error';
    resBox.textContent = '❌ Terjadi kesalahan: ' + err.message;
  } finally {
    // Kembalikan tombol ke kondisi semula
    btn.disabled = false;
    btn.textContent = 'Bikin Link';
  }
}

// ============================================
// 3. HANDLE ENTER KEY & INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // Cek session saat halaman pertama kali dimuat
  checkSession();

  // Tombol Enter untuk shortcut bikin link
  const input = document.getElementById('targetUrl');
  if (input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        generateMaskedLink();
      }
    });

    // Auto-focus ke input URL
    setTimeout(() => input.focus(), 500);
  }
});

// ============================================
// 4. LOGOUT FUNCTION
// ============================================
function logout() {
  localStorage.clear();
  window.location.href = '/';
}