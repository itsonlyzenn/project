// FUNGSI 1: NAVIGATION TAB SWITCHER
function showTab(tabName, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById('panel-' + tabName).classList.add('active');
  btn.classList.add('active');
}

// FUNGSI 2: OSINT USERNAME SEARCH
function checkUsername() {
  const u = document.getElementById('inputUser').value.trim();
  if (!u) return alert('Isi username dulu!');
  
  const links = [
    ['GitHub', 'https://github.com/' + u],
    ['TikTok', 'https://www.tiktok.com/@' + u],
    ['Pinterest', 'https://www.pinterest.com/' + u],
    ['Telegram', 'https://t.me/' + u],
    ['Google Dork', 'https://www.google.com/search?q="' + u + '"']
  ];

  let html = '';
  links.forEach(l => {
    html += `<div class="item"><span>${l[0]}</span> <a href="${l[1]}" target="_blank" class="link">Buka -></a></div>`;
  });
  document.getElementById('resUser').innerHTML = html;
}

// FUNGSI 3: NIK PARSER
function checkNik() {
  const nik = document.getElementById('inputNik').value.trim();
  if (nik.length !== 16 || isNaN(nik)) return alert('NIK wajib 16 digit angka!');

  let day = parseInt(nik.substring(6, 8));
  const month = parseInt(nik.substring(8, 10));
  let year = parseInt(nik.substring(10, 12));
  
  let gender = "Laki-Laki";
  if (day > 40) {
    gender = "Perempuan";
    day -= 40;
  }

  const currentYearTwoDigits = parseInt(new Date().getFullYear().toString().substr(-2));
  const fullYear = (year > currentYearTwoDigits) ? (1900 + year) : (2000 + year);
  const age = new Date().getFullYear() - fullYear;

  document.getElementById('resNik').innerHTML = `
    <div class="item"><span>Gender:</span> <b>${gender}</b></div>
    <div class="item"><span>Tanggal Lahir:</span> <b>${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${fullYear}</b></div>
    <div class="item"><span>Estimasi Usia:</span> <b>${age} Tahun</b></div>
    <div class="item"><span>Kode Prov/Kab/Kec:</span> <b>${nik.substring(0,2)} / ${nik.substring(2,4)} / ${nik.substring(4,6)}</b></div>
    <div class="item"><span>No Urut Reg:</span> <b>${nik.substring(12,16)}</b></div>
  `;
}

// FUNGSI 4A: IP LOOKUP API
async function checkIp() {
  const ip = document.getElementById('inputIp').value.trim();
  const res = document.getElementById('resIp');
  res.innerHTML = "<i>Sedang melacak lokasi IP...</i>";

  try {
    const url = ip ? `https://ipapi.co/${ip}/json/` : `https://ipapi.co/json/`;
    const response = await fetch(url);
    const data = await response.json();

    if(data.error) throw new Error(data.reason);

    res.innerHTML = `
      <div class="item"><span>IP Address:</span> <b>${data.ip}</b></div>
      <div class="item"><span>Kota / Wilayah:</span> <b>${data.city}, ${data.region}</b></div>
      <div class="item"><span>Negara:</span> <b>${data.country_name}</b></div>
      <div class="item"><span>ISP / Provider:</span> <b>${data.org}</b></div>
      <div class="item"><span>Google Maps:</span> <a href="https://www.google.com/maps?q=${data.latitude},${data.longitude}" target="_blank" class="link">Lihat Peta -></a></div>
    `;
  } catch (err) {
    res.innerHTML = "<span style='color:red;'>Gagal melacak IP (Cek koneksi internet).</span>";
  }
}

// FUNGSI 4B: BROWSER GPS GEOLOCATION
function getExactLocation() {
  const res = document.getElementById('resIp');
  
  if (!navigator.geolocation) {
    alert("Browser tidak mendukung Geolocation API.");
    return;
  }

  res.innerHTML = "<i>Meminta izin lokasi presisi...</i>";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      res.innerHTML = `
        <div class="item"><span>Latitude:</span> <b>${lat}</b></div>
        <div class="item"><span>Longitude:</span> <b>${lon}</b></div>
        <div class="item"><span>Akurasi:</span> <b>Radius ±${Math.round(accuracy)} meter</b></div>
        <div class="item"><span>Google Maps:</span> <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" class="link">Lihat Lokasi Presisi -></a></div>
      `;
    },
    (error) => {
      res.innerHTML = "<span style='color:red;'>Akses lokasi ditolak atau gagal didapatkan.</span>";
    },
    { enableHighAccuracy: true }
  );
}

// FUNGSI 5: NATIVE IP LOGGER GENERATOR
function generateCustomLink() {
  const target = document.getElementById('targetUrl').value.trim();
  const res = document.getElementById('resLogger');

  if (!target) return alert('Masukkan URL tujuan dulu!');

  // Mengambil domain Vercel lu secara otomatis
  const currentDomain = window.location.origin;
  
  // Custom link yang ngarah ke Serverless API /api/log.js
  const trackingLink = `${currentDomain}/api/log?url=${encodeURIComponent(target)}`;

  res.innerHTML = `
    <div style="color: #ef4444; font-weight: bold; margin-bottom: 8px;">[ TRACKING LINK BERHASIL DIBUAT ]</div>
    <div style="margin-bottom: 10px;">
      <p style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Kirim link ini ke target:</p>
      <input type="text" value="${trackingLink}" readonly style="width:100%; padding: 8px; background:#0f172a; border:1px solid #334155; color:#34d399; font-size:12px; border-radius:4px;" onclick="this.select()">
    </div>
    <p style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
      ⚡ <b>Alur Kerja:</b> Ketika target membuka link di atas, sistem akan <b>Ngelog IP & Perangkat</b> + <b>Auto-Locate Peta Google Maps</b> di Vercel Logs, lalu target dialihkan ke <b>${target}</b>.
    </p>
  `;
}