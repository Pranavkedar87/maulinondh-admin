import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  Shield, 
  MapPin, 
  AlertTriangle,
  HeartPulse,
  ShieldAlert,
  Flame,
  Car,
  UserSearch,
  PhoneCall,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  User
} from 'lucide-react';

const EMERGENCY_CATEGORIES = [
  { id: 'MEDICAL', label: 'Medical Emergency', icon: HeartPulse, contact: '108', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  { id: 'POLICE', label: 'Police / Security', icon: ShieldAlert, contact: '100', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'FIRE', label: 'Fire Emergency', icon: Flame, contact: '101', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  { id: 'ACCIDENT', label: 'Accident', icon: Car, contact: '108', color: '#eab308', bg: '#fefce8', border: '#fef08a' },
  { id: 'MISSING', label: 'Missing Person', icon: UserSearch, contact: 'GUARDIAN', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'OTHER', label: 'Other Emergency', icon: AlertTriangle, contact: '112', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' }
];

const PublicQRScan = ({ regIdParam }) => {
  const { regId: routeRegId } = useParams();
  const regId = routeRegId || regIdParam;

  const [pilgrim, setPilgrim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('Detecting current device location...');
  const [locationData, setLocationData] = useState(null);
  const [currentScanId, setCurrentScanId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCSut4ogDQ24FaPUn3C4RmRLYHGGAw2I1U';

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleMapsKey}`);
      const json = await res.json();
      if (json.results && json.results.length > 0) {
        return json.results[0].formatted_address;
      }
    } catch (e) {
      console.error('Google Maps Reverse Geocode API error:', e);
    }
    return `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const getRealDeviceCoordinates = () => {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          async (err) => {
            console.warn('Geolocation blocked, trying IP fallback...');
            try {
              const ipRes = await fetch('https://ipapi.co/json/');
              const ipData = await ipRes.json();
              if (ipData.latitude && ipData.longitude) {
                resolve({ lat: ipData.latitude, lng: ipData.longitude, city: `${ipData.city}, ${ipData.region}` });
                return;
              }
            } catch (e) {
              console.error('IP Geolocation failed:', e);
            }
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else resolve(null);
    });
  };

  const processLocation = async (scanId, varkariObj) => {
    setLocationStatus('Detecting precise location...');
    const coords = await getRealDeviceCoordinates();

    if (coords && coords.lat && coords.lng) {
      const address = coords.city || (await reverseGeocode(coords.lat, coords.lng));
      setLocationData({ lat: coords.lat, lng: coords.lng, address });
      setLocationStatus(`📍 ${address}`);

      if (scanId) {
        await supabase.from('qr_scans').update({
          latitude: coords.lat,
          longitude: coords.lng,
          location_name: address,
          permission_granted: true
        }).eq('id', scanId);
      }
      if (varkariObj) {
        await supabase.from('varkaris').update({
          last_scanned_at: new Date().toISOString(),
          last_scan_latitude: coords.lat,
          last_scan_longitude: coords.lng,
          last_scan_location: address
        }).eq('id', varkariObj.id);
      }
    } else {
      setLocationStatus('Location access pending.');
    }
  };

  useEffect(() => {
    const initializeScan = async () => {
      if (!regId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('varkaris')
          .select('*')
          .eq('registration_id', regId)
          .single();

        if (error) throw error;
        setPilgrim(data);

        const { data: scanRow } = await supabase
          .from('qr_scans')
          .insert({
            varkari_id: data.id,
            registration_id: regId,
            location_name: 'Pandharpur Route',
            permission_granted: false,
            user_agent: navigator.userAgent
          })
          .select()
          .single();

        if (scanRow) {
          setCurrentScanId(scanRow.id);
          await processLocation(scanRow.id, data);
        }
      } catch (err) {
        console.error('Error fetching pilgrim:', err);
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    };
    initializeScan();
  }, [regId]);

  const handleReportEmergency = async () => {
    if (!selectedCategory) return;
    setReporting(true);
    try {
      const { error } = await supabase.from('qr_alerts').insert({
        varkari_id: pilgrim.id,
        registration_id: pilgrim.registration_id,
        alert_type: selectedCategory.id,
        message: `Emergency reported: ${selectedCategory.label}`,
        location_name: locationData?.address || 'Unknown Location',
        latitude: locationData?.lat,
        longitude: locationData?.lng,
        status: 'OPEN'
      });
      if (error) throw error;
      setReportSuccess(true);
    } catch (err) {
      console.error('Error reporting emergency:', err);
      alert('Failed to report emergency. Please CALL the emergency number directly.');
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
          <Shield size={40} color="#ea580c" style={{ margin: '0 auto 1rem', animation: 'pulse 1.5s infinite' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Initializing Assistance Protocol...</h3>
        </div>
      </div>
    );
  }

  if (!pilgrim) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
          <AlertTriangle size={40} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Invalid QR Scan</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>This ID could not be verified.</p>
        </div>
      </div>
    );
  }

  const isMedicalOrMissing = selectedCategory && ['MEDICAL', 'MISSING'].includes(selectedCategory.id);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif', paddingBottom: '3rem' }}>
      
      {/* HEADER */}
      <header style={{ background: '#ffffff', padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ background: '#ea580c', padding: '0.5rem', borderRadius: '8px' }}>
          <Shield size={20} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Emergency Assistance</h1>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Maulinondh Safety Network</p>
        </div>
      </header>

      <main style={{ maxWidth: '440px', margin: '0 auto', padding: '1.25rem 1rem' }}>
        
        <p style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500, marginBottom: '1.25rem', lineHeight: 1.5 }}>
          You're at the right place. Select the type of assistance you need. Your location will be shared with the response team.
        </p>

        {/* LOCATION PILL */}
        <div style={{ background: locationData ? '#ecfdf5' : '#f1f5f9', border: locationData ? '1px solid #a7f3d0' : '1px solid #e2e8f0', borderRadius: '999px', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: locationData ? '#059669' : '#64748b', fontWeight: 600, marginBottom: '2rem' }}>
          {locationData ? <CheckCircle2 size={16} /> : <MapPin size={16} />}
          {locationStatus}
        </div>

        {/* CATEGORY SELECTION */}
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>What happened?</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
          {EMERGENCY_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory?.id === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat);
                  setReportSuccess(false);
                }}
                style={{
                  background: isSelected ? cat.bg : '#ffffff',
                  border: `2px solid ${isSelected ? cat.color : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 4px 12px ${cat.color}20` : '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <Icon size={28} color={isSelected ? cat.color : '#64748b'} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? cat.color : '#334155', textAlign: 'center' }}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ACTION PANEL */}
        {selectedCategory && (
          <div style={{ background: '#ffffff', border: `1px solid ${selectedCategory.border}`, borderRadius: '16px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ background: selectedCategory.color, width: 8, height: 24, borderRadius: 4 }}></div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{selectedCategory.label} Response</h3>
            </div>

            {reportSuccess ? (
              <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', padding: '1rem', borderRadius: '12px', textAlign: 'center', fontWeight: 700 }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem' }} />
                Emergency Alert Sent!
                <p style={{ fontSize: '0.8rem', fontWeight: 500, marginTop: '0.25rem', color: '#065f46' }}>Response teams have received your exact location.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                
                {selectedCategory.contact !== 'GUARDIAN' && (
                  <a
                    href={`tel:${selectedCategory.contact}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: '#16a34a',
                      color: '#ffffff',
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontWeight: 800,
                      fontSize: '1rem',
                      boxShadow: '0 2px 8px rgba(22,163,74,0.3)'
                    }}
                  >
                    <PhoneCall size={20} />
                    Call {selectedCategory.contact}
                  </a>
                )}

                {isMedicalOrMissing && pilgrim.guardian_phone && (
                  <a
                    href={`tel:${pilgrim.guardian_phone}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: '#1e293b',
                      color: '#ffffff',
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontWeight: 800,
                      fontSize: '0.9rem'
                    }}
                  >
                    <PhoneCall size={18} />
                    Call Guardian ({pilgrim.guardian_relationship})
                  </a>
                )}

                <button
                  onClick={handleReportEmergency}
                  disabled={reporting}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #ea580c',
                    color: '#ea580c',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {reporting ? 'Transmitting Alert...' : (
                    <>
                      <AlertTriangle size={18} />
                      Send Alert to Admin Dashboard
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '2rem 0' }} />

        {/* COLLAPSIBLE PROFILE DETAILS */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <button
            onClick={() => setShowProfileDetails(!showProfileDetails)}
            style={{ width: '100%', background: 'transparent', border: 'none', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} /> View Pilgrim Identity Details
            </div>
            {showProfileDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {showProfileDetails && (
            <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                {pilgrim.photo_url ? (
                  <img src={pilgrim.photo_url} alt="Profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #cbd5e1' }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#64748b' }}>
                    {pilgrim.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{pilgrim.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{pilgrim.registration_id}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
                <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Blood Group</span>
                  <strong style={{ color: '#dc2626', fontSize: '1rem' }}>{pilgrim.blood_group}</strong>
                </div>
                <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Age</span>
                  <strong style={{ color: '#0f172a', fontSize: '1rem' }}>{pilgrim.age} yrs</strong>
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                  <Activity size={14} color="#dc2626"/> Medical Notes
                </strong>
                <div style={{ color: '#475569' }}>
                  <span style={{ fontWeight: 600 }}>Conditions:</span> {pilgrim.medical_conditions || 'None'}<br/>
                  <span style={{ fontWeight: 600 }}>Allergies:</span> {pilgrim.allergies || 'None'}
                </div>
              </div>

            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default PublicQRScan;
