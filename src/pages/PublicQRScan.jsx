import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  Shield, PhoneCall, Heart, AlertTriangle, MapPin, User, 
  FileText, CheckCircle2, Navigation, HeartPulse, ShieldAlert, 
  Flame, Car, UserSearch 
} from 'lucide-react';

const EMERGENCY_CATEGORIES = [
  { id: 'MEDICAL', label: 'Medical Emergency', icon: HeartPulse, contact: '108', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  { id: 'POLICE', label: 'Police / Security', icon: ShieldAlert, contact: '100', color: '#334155', bg: '#ffffff', border: '#e2e8f0' },
  { id: 'FIRE', label: 'Fire Emergency', icon: Flame, contact: '101', color: '#334155', bg: '#ffffff', border: '#e2e8f0' },
  { id: 'ACCIDENT', label: 'Accident', icon: Car, contact: '108', color: '#334155', bg: '#ffffff', border: '#e2e8f0' },
  { id: 'MISSING', label: 'Missing Person', icon: UserSearch, contact: 'GUARDIAN', color: '#334155', bg: '#ffffff', border: '#e2e8f0' },
  { id: 'OTHER', label: 'Other Emergency', icon: AlertTriangle, contact: '112', color: '#334155', bg: '#ffffff', border: '#e2e8f0' }
];

const PublicQRScan = ({ regIdParam }) => {
  const { regId: routeRegId } = useParams();
  const regId = routeRegId || regIdParam;

  const [pilgrim, setPilgrim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('Detecting current device location...');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [currentScanId, setCurrentScanId] = useState(null);
  const [detectedAddress, setDetectedAddress] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // New states for Emergency Reporting
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

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
          (pos) => {
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, method: 'GPS' });
          },
          async (err) => {
            console.warn('Browser HTML5 Geolocation unavailable, trying IP fallback...', err);
            try {
              const ipRes = await fetch('https://ipapi.co/json/');
              const ipData = await ipRes.json();
              if (ipData.latitude && ipData.longitude) {
                resolve({ lat: ipData.latitude, lng: ipData.longitude, city: `${ipData.city}, ${ipData.region}, ${ipData.country_name}`, method: 'IP' });
                return;
              }
            } catch (e) {
              console.error('IP Geolocation failed:', e);
            }
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        fetch('https://ipapi.co/json/')
          .then(res => res.json())
          .then(ipData => {
            if (ipData.latitude && ipData.longitude) {
              resolve({ lat: ipData.latitude, lng: ipData.longitude, city: `${ipData.city}, ${ipData.region}`, method: 'IP' });
            } else resolve(null);
          })
          .catch(() => resolve(null));
      }
    });
  };

  const processAndTransmitLocation = async (scanId, varkariObj) => {
    setFetchingLocation(true);
    setLocationStatus('Detecting precise device coordinates...');

    const coords = await getRealDeviceCoordinates();

    if (coords && coords.lat && coords.lng) {
      setCurrentCoords({ lat: coords.lat, lng: coords.lng });
      setLocationStatus('Resolving street address via Google Maps API...');
      const address = coords.city || (await reverseGeocode(coords.lat, coords.lng));
      setDetectedAddress(address);
      setPermissionGranted(true);
      setLocationStatus(`📍 Detected Location: ${address}`);

      if (scanId) {
        try {
          await supabase
            .from('qr_scans')
            .update({
              latitude: coords.lat,
              longitude: coords.lng,
              location_name: address,
              permission_granted: true
            })
            .eq('id', scanId);
        } catch (e) {
          console.error('Error updating scan location:', e);
        }
      }

      if (varkariObj) {
        try {
          await supabase
            .from('varkaris')
            .update({
              last_scanned_at: new Date().toISOString(),
              last_scan_latitude: coords.lat,
              last_scan_longitude: coords.lng,
              last_scan_location: address
            })
            .eq('id', varkariObj.id);
        } catch (e) {}
      }
    } else {
      setLocationStatus('Location access pending. Tap button below to share location.');
    }
    setFetchingLocation(false);
  };

  useEffect(() => {
    const initializeScan = async () => {
      if (!regId) return;
      setLoading(true);
      setErrorMessage(null);
      try {
        const { data, error } = await supabase
          .from('varkaris')
          .select('*')
          .eq('registration_id', regId)
          .single();

        if (error) throw error;
        setPilgrim(data);

        const { data: scanRow, error: scanErr } = await supabase
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

        if (scanErr) {
          console.error('Supabase scan insert error:', scanErr);
          if (scanErr.code === '42P01' || scanErr.message?.includes('does not exist')) {
            setErrorMessage('Table qr_scans missing in Supabase. Please run admin_schema.sql in Supabase SQL editor.');
          } else {
            setErrorMessage(scanErr.message);
          }
        } else if (scanRow) {
          setCurrentScanId(scanRow.id);
          await processAndTransmitLocation(scanRow.id, data);
        }

      } catch (err) {
        console.error('Error fetching pilgrim for QR scan:', err);
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
        location_name: detectedAddress || 'Unknown Location',
        latitude: currentCoords?.lat,
        longitude: currentCoords?.lng,
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Identifying Registered Pilgrim...</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>Detecting device location</p>
        </div>
      </div>
    );
  }

  if (!pilgrim) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
          <AlertTriangle size={40} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Invalid Safety QR</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>No registered pilgrim record found for ID: <code>{regId}</code></p>
        </div>
      </div>
    );
  }

  const isMedicalOrMissing = selectedCategory && ['MEDICAL', 'MISSING'].includes(selectedCategory.id);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, sans-serif', paddingBottom: '2.5rem' }}>
      
      {/* Top Header Bar */}
      <header style={{ background: '#ea580c', color: '#ffffff', padding: '1rem 1.25rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'Outfit, sans-serif' }}>
          <Shield size={22} color="#ffffff" />
          <span>MAULINONDH</span>
        </div>
        <span style={{ background: '#c2410c', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '9999px', letterSpacing: '0.05em' }}>
          SAFETY IDENTITY
        </span>
      </header>

      {/* Main Mobile Container */}
      <main style={{ maxWidth: '440px', margin: '1.25rem auto 0', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {errorMessage && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '12px', padding: '0.85rem', fontSize: '0.8rem', fontWeight: 600 }}>
            ⚠️ Supabase Scan Logging Alert: {errorMessage}
          </div>
        )}

        {/* 1. Profile Card Header */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem 1.25rem', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {pilgrim.photo_url ? (
            <img
              src={pilgrim.photo_url}
              alt={pilgrim.name}
              style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 0.75rem', border: '3px solid #ea580c', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
            />
          ) : (
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#ffedd5', color: '#c2410c', fontWeight: 'bold', fontSize: '2.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', border: '3px solid #ea580c' }}>
              {pilgrim.name?.charAt(0) || 'P'}
            </div>
          )}

          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
            {pilgrim.name}
          </h1>

          <div style={{ display: 'inline-block', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '9999px', marginTop: '0.5rem' }}>
            Reg ID: {pilgrim.registration_id}
          </div>

          {/* Vitals Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>AGE</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{pilgrim.age} yrs</span>
            </div>
            <div style={{ borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, display: 'block' }}>BLOOD</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#dc2626' }}>{pilgrim.blood_group}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>GENDER</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{pilgrim.gender}</span>
            </div>
          </div>
        </div>

        {/* 2. Emergency Contacts Card */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <PhoneCall size={14} color="#2563eb" /> EMERGENCY CONTACTS
          </div>

          <a
            href={`tel:${pilgrim.guardian_phone}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#16a34a',
              color: '#ffffff',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
              marginBottom: pilgrim.secondary_guardian_phone ? '0.75rem' : '0'
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', opacity: 0.95, textTransform: 'uppercase' }}>Primary Guardian ({pilgrim.guardian_relationship})</div>
              <div style={{ fontSize: '1.05rem', marginTop: '0.1rem' }}>{pilgrim.guardian_name}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{pilgrim.guardian_phone}</div>
            </div>
            <div style={{ background: '#15803d', padding: '0.6rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneCall size={20} color="#ffffff" />
            </div>
          </a>

          {pilgrim.secondary_guardian_phone && (
            <a
              href={`tel:${pilgrim.secondary_guardian_phone}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#1e293b',
                color: '#ffffff',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 700
              }}
            >
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Secondary Emergency Contact</div>
                <div style={{ fontSize: '1rem', marginTop: '0.1rem' }}>{pilgrim.secondary_guardian_name}</div>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{pilgrim.secondary_guardian_phone}</div>
              </div>
              <div style={{ background: '#334155', padding: '0.6rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PhoneCall size={18} color="#ffffff" />
              </div>
            </a>
          )}
        </div>

        {/* 3. EMERGENCY CATEGORY SECTION ("What happened?") */}
        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          What happened?
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
          {EMERGENCY_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory?.id === cat.id;
            const Icon = cat.icon;
            
            const dynamicColor = cat.id === 'MEDICAL' ? cat.color : (isSelected ? cat.color : '#334155');
            const dynamicBorder = cat.id === 'MEDICAL' ? cat.color : (isSelected ? cat.color : '#e2e8f0');
            const dynamicBg = isSelected ? cat.bg : '#ffffff';

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat);
                  setReportSuccess(false);
                }}
                style={{
                  background: dynamicBg,
                  border: `1px solid ${dynamicBorder}`,
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <Icon size={24} color={dynamicColor} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: dynamicColor, textAlign: 'center' }}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Panel for selected emergency */}
        {selectedCategory && (
          <div style={{ background: '#ffffff', border: `1px solid ${selectedCategory.border === '#e2e8f0' ? '#cbd5e1' : selectedCategory.border}`, borderRadius: '16px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ background: selectedCategory.color === '#334155' ? '#0f172a' : selectedCategory.color, width: 6, height: 20, borderRadius: 4 }}></div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>{selectedCategory.label} Response</h3>
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
                      background: '#16a34a', // Green button from screenshot
                      color: '#ffffff',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '1rem'
                    }}
                  >
                    <PhoneCall size={18} />
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
                      background: '#1e293b', // Dark button from screenshot
                      color: '#ffffff',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '1rem'
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
                    border: '1.5px solid #ea580c', // Orange bordered button from screenshot
                    color: '#ea580c',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '1rem',
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

        <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />

        {/* 4. Location Log Card */}
        <div style={{ background: permissionGranted ? '#f0fdf4' : '#eff6ff', border: permissionGranted ? '1px solid #bbf7d0' : '1px solid #bfdbfe', borderRadius: '12px', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: permissionGranted ? '#166534' : '#1e40af', fontWeight: 600 }}>
            <MapPin size={18} color={permissionGranted ? '#16a34a' : '#2563eb'} />
            <span>{locationStatus}</span>
          </div>

          {permissionGranted && (
            <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle2 size={14} /> Location coordinates & address transmitted live to Admin & Family Dashboard!
            </div>
          )}
        </div>

        {/* 5. Medical Information Card */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Heart size={14} color="#dc2626" /> MEDICAL INFORMATION
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Blood Group:</span>
              <span style={{ fontWeight: 800, color: '#dc2626' }}>{pilgrim.blood_group}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Medical Conditions:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{pilgrim.medical_conditions || 'None'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Current Medications:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{pilgrim.medications || 'None'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Known Allergies:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{pilgrim.allergies || 'None'}</span>
            </div>
          </div>
        </div>

        {/* 6. Registration Details Card */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={14} color="#0284c7" /> REGISTRATION & WARI DETAILS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>District / Address:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{pilgrim.district || pilgrim.address}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Participating With:</span>
              <span style={{ fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>{pilgrim.participating_with}</span>
            </div>
            {pilgrim.dindi_name && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Dindi / Group Name:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{pilgrim.dindi_name}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Verification Status:</span>
              <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                {pilgrim.status}
              </span>
            </div>
          </div>
        </div>

        <footer style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', paddingTop: '1.5rem' }}>
          Verified Maulinondh Safety Record • Google Maps Geocoding Integration
        </footer>
      </main>
    </div>
  );
};

export default PublicQRScan;
