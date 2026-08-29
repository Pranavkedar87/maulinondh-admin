import React, { useState } from 'react';
import { IvrService, EMERGENCY_TYPES } from '../services/ivr/ivr.service.js';
import { Phone, CheckCircle, AlertTriangle, User, Hash, MapPin } from 'lucide-react';

const IvrDemo = () => {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState(null);
  const [tagCode, setTagCode] = useState('');
  const [varkari, setVarkari] = useState(null);
  const [emergencyType, setEmergencyType] = useState(null);
  const [locationDesc, setLocationDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [incident, setIncident] = useState(null);

  const handleLanguageSelect = (lang) => {
    setLanguage(lang);
    setStep(2);
  };

  const handleTagSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Remove any trailing # for lookup
      const cleanTag = tagCode.replace('#', '');
      const found = await IvrService.lookupVarkari(cleanTag);
      setVarkari(found || 'UNKNOWN');
    } catch (err) {
      console.error(err);
      setVarkari('UNKNOWN');
    }
    setLoading(false);
    setStep(3);
  };

  const handleEmergencySelect = (key) => {
    setEmergencyType(key);
    setStep(4);
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const emergencyData = EMERGENCY_TYPES[emergencyType];
      
      const newIncident = await IvrService.createIncident({
        varkariId: varkari !== 'UNKNOWN' ? varkari.id : null,
        tagCode: tagCode,
        emergencyType: emergencyData.id,
        priority: emergencyData.priority,
        locationDesc: locationDesc || 'Unknown',
        reporterPhone: '+91 9999999999 (Simulated)'
      });
      setIncident(newIncident);
      setStep(5);
    } catch (err) {
      console.error('Failed to create simulated incident', err);
      alert('Error creating incident');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        
        {/* Header */}
        <header style={{ background: '#1e293b', color: '#fff', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Phone size={24} color="#38bdf8" />
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>IVR DEMO MODE</h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Browser Simulation of the Maulinondh Phone Emergency System</p>
        </header>

        {/* Content Body */}
        <div style={{ padding: '2rem' }}>
          
          {/* Step 1: Language */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#0f172a' }}>Step 1: Select Language (Voice Prompt)</h2>
              <p style={{ fontStyle: 'italic', color: '#64748b', marginBottom: '1.5rem', background: '#f1f5f9', padding: '1rem', borderRadius: '8px' }}>
                "माऊलीनोंद में आपका स्वागत है। भाषा चुनने के लिए कृपया एक दबाएँ।"
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button onClick={() => handleLanguageSelect('1')} style={btnStyle}>1 - English</button>
                <button onClick={() => handleLanguageSelect('2')} style={btnStyle}>2 - Hindi</button>
                <button onClick={() => handleLanguageSelect('3')} style={btnStyle}>3 - Marathi</button>
              </div>
            </div>
          )}

          {/* Step 2: Tag Code */}
          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#0f172a' }}>Step 2: Enter Unique Tag Code</h2>
              <p style={{ fontStyle: 'italic', color: '#64748b', marginBottom: '1.5rem', background: '#f1f5f9', padding: '1rem', borderRadius: '8px' }}>
                "Please enter the unique code written on the safety tag followed by the hash key."
              </p>
              <form onSubmit={handleTagSubmit}>
                <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 1rem', marginBottom: '1rem' }}>
                  <Hash size={20} color="#94a3b8" />
                  <input 
                    type="text" 
                    value={tagCode}
                    onChange={(e) => setTagCode(e.target.value)}
                    placeholder="e.g. MN-2026-000123#"
                    required
                    style={{ border: 'none', outline: 'none', flex: 1, padding: '0.5rem', fontSize: '1.1rem' }}
                  />
                </div>
                <button type="submit" disabled={loading} style={{ ...btnStyle, background: '#0284c7', color: '#fff' }}>
                  {loading ? 'Searching...' : 'Submit Keypad Entry'}
                </button>
              </form>
            </div>
          )}

          {/* Step 3: Emergency Menu */}
          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '1rem', background: varkari === 'UNKNOWN' ? '#fee2e2' : '#dcfce7', borderRadius: '8px', color: varkari === 'UNKNOWN' ? '#991b1b' : '#166534' }}>
                {varkari === 'UNKNOWN' ? <AlertTriangle size={20} /> : <User size={20} />}
                <strong>Backend Lookup:</strong> {varkari === 'UNKNOWN' ? 'Varkari Not Found (Continuing anyway)' : `Found ${varkari.name}`}
              </div>

              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#0f172a' }}>Step 3: Select Emergency</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button onClick={() => handleEmergencySelect('1')} style={btnStyle}>1 - Medical</button>
                <button onClick={() => handleEmergencySelect('2')} style={btnStyle}>2 - Lost & Found</button>
                <button onClick={() => handleEmergencySelect('3')} style={btnStyle}>3 - SOS</button>
                <button onClick={() => handleEmergencySelect('4')} style={btnStyle}>4 - Fire</button>
                <button onClick={() => handleEmergencySelect('5')} style={btnStyle}>5 - Accident</button>
                <button onClick={() => handleEmergencySelect('6')} style={btnStyle}>6 - Other</button>
              </div>
            </div>
          )}

          {/* Step 4: Location (Admin asks) */}
          {step === 4 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#0f172a' }}>Step 4: Connect to Admin & Provide Location</h2>
              <p style={{ fontStyle: 'italic', color: '#64748b', marginBottom: '1.5rem', background: '#f1f5f9', padding: '1rem', borderRadius: '8px' }}>
                [Call connects to Demo Admin Number]<br/><br/>
                Admin: "Please provide your current location or nearest landmark."
              </p>
              <form onSubmit={handleLocationSubmit}>
                <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 1rem', marginBottom: '1rem' }}>
                  <MapPin size={20} color="#94a3b8" />
                  <input 
                    type="text" 
                    value={locationDesc}
                    onChange={(e) => setLocationDesc(e.target.value)}
                    placeholder="e.g. Near Checkpoint 12, Vitthal Temple"
                    required
                    style={{ border: 'none', outline: 'none', flex: 1, padding: '0.5rem', fontSize: '1.1rem' }}
                  />
                </div>
                <button type="submit" disabled={loading} style={{ ...btnStyle, background: '#ea580c', color: '#fff' }}>
                  {loading ? 'Creating Incident...' : 'Admin Logs Incident in Dashboard'}
                </button>
              </form>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <div style={{ animation: 'fadeIn 0.3s', textAlign: 'center' }}>
              <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#065f46' }}>Incident Created Successfully</h2>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                Your emergency report has been recorded. Help is being coordinated.
              </p>
              
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', textAlign: 'left' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Created Database Record</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <div><strong>ID:</strong> {incident?.id}</div>
                  <div><strong>Type:</strong> <span style={{ color: '#ea580c', fontWeight: 600 }}>{incident?.type}</span></div>
                  <div><strong>Priority:</strong> <span style={{ color: '#dc2626', fontWeight: 600 }}>{incident?.priority}</span></div>
                  <div><strong>Location:</strong> {incident?.address}</div>
                  <div><strong>Source:</strong> {incident?.source}</div>
                </div>
              </div>

              <button onClick={() => window.location.reload()} style={{ ...btnStyle, marginTop: '2rem', background: '#334155', color: '#fff' }}>
                Restart Simulation
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const btnStyle = {
  width: '100%',
  padding: '1rem',
  background: '#ffffff',
  border: '2px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: 600,
  color: '#334155',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textAlign: 'center'
};

export default IvrDemo;
