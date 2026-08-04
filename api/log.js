export default function handler(req, res) {
  // Ambil IP asli target dari header proxy Vercel
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

  // Header geolokasi bawaan edge network Vercel
  const city = req.headers['x-vercel-ip-city'] || 'Unknown City';
  const country = req.headers['x-vercel-ip-country'] || 'Unknown Country';
  const region = req.headers['x-vercel-ip-country-region'] || 'Unknown Region';
  const userAgent = req.headers['user-agent'] || 'Unknown Device';

  // Set response CORS agar bisa dipanggil frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  res.status(200).json({
    status: 'success',
    ip: ip,
    location: {
      city: decodeURIComponent(city),
      region: region,
      country: country
    },
    userAgent: userAgent,
    timestamp: new Date().toISOString()
  });
}