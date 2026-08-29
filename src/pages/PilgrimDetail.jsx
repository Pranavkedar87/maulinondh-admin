import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabase';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  QrCode,
  Printer,
  PackageCheck,
  User,
  Heart,
  PhoneCall,
  Download,
  Copy,
  RotateCw,
  ExternalLink,
  MapPin,
  Map,
  AlertTriangle
} from 'lucide-react';

const PilgrimDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const bandPrintRef = useRef(null);

  const [pilgrim, setPilgrim] = useState(null);
  const [scanLogs, setScanLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmQRModal, setConfirmQRModal] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rlsErrorAlert, setRlsErrorAlert] = useState(false);

  const fetchPilgrimDetail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('varkaris')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPilgrim(data);

      const { data: scans } = await supabase
        .from('qr_scans')
        .select('*')
        .eq('varkari_id', data.id)
        .order('scanned_at', { ascending: false });

      if (scans) {
        setScanLogs(scans);
      }
    } catch (err) {
      console.error('Error fetching pilgrim detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPilgrimDetail();
  }, [id]);

  const getQRScanUrl = (regId) => {
    const origin = window.location.origin;
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    return `${origin}${cleanBase}u/${regId}`;
  };

  const qrSecureUrl = pilgrim ? getQRScanUrl(pilgrim.registration_id) : '';

  const getExactGoogleMapsUrl = (log) => {
    if (log.latitude && log.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`;
    }
    if (log.location_name) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(log.location_name)}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=17.6775,75.3262`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrSecureUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQRPNG = () => {
    const svgElement = document.getElementById('pilgrim-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 1000, 1000);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_${pilgrim.registration_id}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // 1-Click Approve Registration & Auto-Generate QR Code (with RLS error detection & local override)
  const handleApprove = async () => {
    if (!window.confirm(`Approve registration for ${pilgrim.name} and generate QR band identity?`)) return;
    setActionLoading(true);

    const qrToken = `QR-${pilgrim.registration_id}`;
    const now = new Date().toISOString();

    // 1. Force update local UI state immediately so admin flow is NEVER blocked!
    setPilgrim((prev) => ({
      ...prev,
      status: 'VERIFIED',
      qr_token: qrToken,
      qr_generated_at: now
    }));

    try {
      // 2. Execute Supabase update
      const { data, error } = await supabase
        .from('varkaris')
        .update({
          status: 'VERIFIED',
          qr_token: qrToken,
          qr_generated_at: now
        })
        .eq('id', pilgrim.id)
        .select();

      if (error) {
        console.error('Supabase update RLS error:', error);
        setRlsErrorAlert(true);
      } else if (!data || data.length === 0) {
        console.warn('Supabase update returned 0 modified rows. RLS policy on varkaris table might be restricting UPDATE.');
        setRlsErrorAlert(true);
      }

      // Log order row
      try {
        await supabase.from('orders').insert({
          varkari_id: pilgrim.id,
          status: 'QR_GENERATED',
          order_type: 'QR_BAND'
        });
      } catch (e) {}

    } catch (err) {
      console.error('Exception during pilgrim approval:', err);
      setRlsErrorAlert(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;

    setActionLoading(true);
    setPilgrim((prev) => ({
      ...prev,
      status: 'REJECTED',
      rejection_reason: rejectReason.trim()
    }));

    try {
      const { error } = await supabase
        .from('varkaris')
        .update({
          status: 'REJECTED',
          rejection_reason: rejectReason.trim()
        })
        .eq('id', pilgrim.id);

      if (error) {
        console.error('Reject update error:', error);
        setRlsErrorAlert(true);
      }
    } catch (err) {
      console.error('Exception during reject:', err);
      setRlsErrorAlert(true);
    } finally {
      setRejectModalOpen(false);
      setActionLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    setActionLoading(true);
    const qrToken = `QR-${pilgrim.registration_id}`;
    const now = new Date().toISOString();

    setPilgrim((prev) => ({ ...prev, qr_token: qrToken, qr_generated_at: now }));

    try {
      await supabase
        .from('varkaris')
        .update({ qr_token: qrToken, qr_generated_at: now })
        .eq('id', pilgrim.id);
    } catch (err) {
      console.error('Error generating QR:', err);
    } finally {
      setConfirmQRModal(false);
      setActionLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!bandPrintRef.current) return;
    setPdfGenerating(true);
    try {
      const canvas = await html2canvas(bandPrintRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [150, 60]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 150, 60);
      pdf.save(`Maulinondh_QR_Band_${pilgrim.registration_id}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF document');
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleMarkIssued = async () => {
    if (!window.confirm(`Mark physical band as issued to ${pilgrim.name}?`)) return;

    setActionLoading(true);
    const now = new Date().toISOString();
    setPilgrim((prev) => ({ ...prev, band_issued_at: now }));

    try {
      await supabase
        .from('varkaris')
        .update({ band_issued_at: now })
        .eq('id', pilgrim.id);
    } catch (err) {
      console.error('Error marking band as issued:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="User Profile">
        <div className="p-8 text-center card">Loading user profile...</div>
      </AdminLayout>
    );
  }

  if (!pilgrim) {
    return (
      <AdminLayout title="User Profile">
        <div className="p-8 text-center card text-red-600">User profile not found.</div>
      </AdminLayout>
    );
  }

  const isPending = pilgrim.status === 'PENDING_VERIFICATION';
  const isApproved = pilgrim.status === 'VERIFIED';
  const isRejected = pilgrim.status === 'REJECTED';
  const hasQR = Boolean(pilgrim.qr_token);
  const isIssued = Boolean(pilgrim.band_issued_at);

  return (
    <AdminLayout title={`Profile — ${pilgrim.name}`}>
      
      {rlsErrorAlert && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
          ⚠️ <strong>Supabase RLS Policy Notice:</strong> Updates are currently saved locally. To sync changes permanently to Supabase, run <code>admin_schema.sql</code> in your Supabase SQL Editor.
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-outline flex items-center gap-1"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Registrations</span>
        </button>

        <div className="flex items-center gap-2">
          {isPending && <span className="status-badge status-pending">Pending Verification</span>}
          {isApproved && <span className="status-badge status-verified">Verified & Approved</span>}
          {isRejected && <span className="status-badge status-rejected">Rejected</span>}
          {isIssued && <span className="status-badge status-issued">Band Issued & Active</span>}
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr', '@media(min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } }}>
        
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          
          {/* Personal Information */}
          <div className="card">
            <h3 className="mb-4 text-base font-bold flex items-center gap-2" style={{ color: 'var(--primary-dark)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <User size={18} /> Personal Information
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start mb-4">
              {pilgrim.photo_url ? (
                <img
                  src={pilgrim.photo_url}
                  alt={pilgrim.name}
                  style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                />
              ) : (
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                  {pilgrim.name?.charAt(0)}
                </div>
              )}
              <div className="space-y-1">
                <h2 className="text-xl font-bold">{pilgrim.name}</h2>
                <p className="text-xs text-gray-500">Registration ID: <code className="font-bold text-slate-800">{pilgrim.registration_id}</code></p>
                <p className="text-sm text-slate-600">Registered: {new Date(pilgrim.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', fontSize: '0.875rem' }}>
              <div>
                <span className="text-gray-500 block text-xs">AGE / GENDER</span>
                <span className="font-semibold">{pilgrim.age} yrs • {pilgrim.gender}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">MOBILE NUMBER</span>
                <span className="font-semibold">{pilgrim.phone}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">DISTRICT</span>
                <span className="font-semibold">{pilgrim.district}</span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="text-gray-500 block text-xs">ADDRESS / VILLAGE</span>
                <span className="font-semibold">{pilgrim.address}</span>
              </div>
            </div>
          </div>

          {/* Emergency Information */}
          <div className="card">
            <h3 className="mb-4 text-base font-bold flex items-center gap-2" style={{ color: '#2563eb', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <PhoneCall size={18} /> Emergency Contact Information
            </h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', fontSize: '0.875rem' }}>
              <div>
                <span className="text-gray-500 block text-xs">PRIMARY GUARDIAN</span>
                <span className="font-semibold">{pilgrim.guardian_name} ({pilgrim.guardian_relationship})</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">PRIMARY CONTACT</span>
                <span className="font-bold text-blue-600">{pilgrim.guardian_phone}</span>
              </div>
              {pilgrim.secondary_guardian_name && (
                <>
                  <div>
                    <span className="text-gray-500 block text-xs">SECONDARY GUARDIAN</span>
                    <span className="font-semibold">{pilgrim.secondary_guardian_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">SECONDARY CONTACT</span>
                    <span className="font-semibold">{pilgrim.secondary_guardian_phone}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Medical Information */}
          <div className="card">
            <h3 className="mb-4 text-base font-bold flex items-center gap-2" style={{ color: '#dc2626', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <Heart size={18} /> Medical Information
            </h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', fontSize: '0.875rem' }}>
              <div>
                <span className="text-gray-500 block text-xs">BLOOD GROUP</span>
                <span className="font-black text-red-600 text-lg">{pilgrim.blood_group}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">MEDICAL CONDITIONS</span>
                <span className="font-semibold">{pilgrim.medical_conditions || 'None'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">CURRENT MEDICATIONS</span>
                <span className="font-semibold">{pilgrim.medications || 'None'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">KNOWN ALLERGIES</span>
                <span className="font-semibold">{pilgrim.allergies || 'None'}</span>
              </div>
            </div>
          </div>

          {/* SCAN LOCATION HISTORY CARD */}
          <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
            <h3 className="mb-3 text-base font-bold flex items-center gap-2 text-slate-800">
              <MapPin size={18} className="text-blue-600" /> Geolocation & Scan History ({scanLogs.length} Scans)
            </h3>
            {scanLogs.length === 0 ? (
              <div className="text-sm text-gray-500 p-3 bg-slate-50 rounded">
                No scan events recorded yet for this pilgrim.
              </div>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Location / GPS Address</th>
                      <th>Exact Map Pin Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanLogs.map((log) => {
                      const mapPinUrl = getExactGoogleMapsUrl(log);

                      return (
                        <tr key={log.id}>
                          <td><code>{new Date(log.scanned_at).toLocaleString()}</code></td>
                          <td>
                            <div className="font-semibold text-slate-900" style={{ fontSize: '0.85rem' }}>
                              📍 {log.location_name || 'Pandharpur Route'}
                            </div>
                            {log.latitude && (
                              <div className="text-xs text-slate-500 font-mono">
                                Coordinates: {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                              </div>
                            )}
                          </td>
                          <td>
                            <a
                              href={mapPinUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline flex items-center gap-1 text-xs font-bold"
                              style={{ padding: '0.3rem 0.75rem', background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                            >
                              <Map size={14} />
                              <span>Pin Exact Location</span>
                              <ExternalLink size={12} />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Admin Actions & Secure QR Code */}
        <div className="flex flex-col gap-6">

          {/* Admin Actions */}
          <div className="card">
            <h3 className="mb-3 text-base font-bold">Admin Actions</h3>

            {isPending && (
              <div className="space-y-2">
                <button onClick={handleApprove} disabled={actionLoading} className="btn btn-success w-full py-2.5">
                  <CheckCircle size={16} /> Approve & Generate QR Identity
                </button>
                <button onClick={() => setRejectModalOpen(true)} disabled={actionLoading} className="btn btn-danger w-full py-2">
                  <XCircle size={16} /> Reject Application
                </button>
              </div>
            )}

            {isApproved && !hasQR && (
              <div>
                <button onClick={handleGenerateQR} disabled={actionLoading} className="btn btn-primary w-full py-2.5">
                  <QrCode size={16} /> Generate Unique QR Code
                </button>
              </div>
            )}

            {hasQR && (
              <div className="space-y-2">
                <button onClick={handleGeneratePDF} disabled={pdfGenerating} className="btn btn-outline w-full text-xs">
                  <Printer size={14} /> Download Printable PDF Band
                </button>
                <button onClick={handleGenerateQR} disabled={actionLoading} className="btn btn-outline w-full text-xs">
                  <RotateCw size={14} /> Regenerate QR Code
                </button>
                {!isIssued && (
                  <button onClick={handleMarkIssued} disabled={actionLoading} className="btn btn-success w-full py-2 text-xs">
                    <PackageCheck size={16} /> Mark Band as Issued
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Secure QR Code Card */}
          {hasQR && (
            <div className="card text-center space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Secure User QR Code</h3>
              
              <div className="p-4 bg-white border rounded-xl shadow-sm inline-block mx-auto">
                <QRCodeSVG
                  id="pilgrim-qr-svg"
                  value={qrSecureUrl}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="text-xs text-slate-500 font-mono break-all bg-slate-50 p-2 rounded border">
                {qrSecureUrl}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={handleDownloadQRPNG} className="btn btn-outline text-xs">
                  <Download size={14} /> PNG Image
                </button>
                <button onClick={handleCopyLink} className="btn btn-outline text-xs">
                  <Copy size={14} /> {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              <a
                href={qrSecureUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-orange-600 font-semibold inline-flex items-center gap-1 justify-center hover:underline pt-2"
              >
                <span>Test Mobile Scan View</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Hidden Printable PDF Template */}
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <div
              ref={bandPrintRef}
              style={{
                width: '567px',
                height: '226px',
                padding: '16px',
                background: '#ffffff',
                border: '2px solid #000000',
                fontFamily: 'Inter, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#ea580c' }}>MAULINONDH VARKARI BAND</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>{pilgrim.name}</div>
                <div style={{ fontSize: '12px' }}>ID: <strong>{pilgrim.registration_id}</strong></div>
                <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 'bold', marginTop: '4px' }}>Blood: {pilgrim.blood_group}</div>
                <div style={{ fontSize: '11px', color: '#1e40af', marginTop: '2px' }}>Emergency: {pilgrim.guardian_phone}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <QRCodeSVG value={qrSecureUrl} size={130} level="H" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal: Rejection Reason */}
      {rejectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', items: 'center', justifyCenter: 'center', zIndex: 1000 }}>
          <div className="card w-full max-w-md mx-auto" style={{ background: 'white' }}>
            <h3 className="font-bold text-red-600 mb-2">Reject Registration Application</h3>
            <textarea
              className="textarea mb-4"
              rows="3"
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectModalOpen(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleRejectSubmit} className="btn btn-danger">Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm QR Generation */}
      {confirmQRModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', items: 'center', justifyCenter: 'center', zIndex: 1000 }}>
          <div className="card w-full max-w-md mx-auto" style={{ background: 'white' }}>
            <h3 className="font-bold text-slate-900 mb-2">Generate Unique QR Identity</h3>
            <p className="text-sm text-slate-600 mb-3">Associating secure mobile scan URL for {pilgrim.name} (Reg ID: {pilgrim.registration_id})</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmQRModal(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleGenerateQR} className="btn btn-primary">Generate QR</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default PilgrimDetail;
