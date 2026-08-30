import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, AlertTriangle, ShieldAlert, Phone, Navigation } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '8px'
};

const PANDHARPUR_CENTER = {
  lat: 17.6775,
  lng: 75.3262
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
};

const LiveMap = () => {
  const [incidents, setIncidents] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Filters
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ACTIVE'); // ACTIVE = OPEN/REPORTED/IN_PROGRESS

  const [selectedIncident, setSelectedIncident] = useState(null);
  
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const fetchIncidents = async () => {
    setLoadingData(true);
    try {
      // 1. QR Alerts
      const { data: qrAlerts } = await supabase
        .from('qr_alerts')
        .select(`*, varkaris(name, registration_id)`)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      // 2. Incidents
      const { data: unifiedIncidents } = await supabase
        .from('incidents')
        .select(`*, varkaris(name, registration_id)`)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      const combined = [
        ...(qrAlerts || []).map(a => ({
          id: a.id,
          type: a.alert_type || 'Alert',
          priority: 'STANDARD',
          source: 'QR_SCAN',
          status: a.status,
          lat: parseFloat(a.latitude),
          lng: parseFloat(a.longitude),
          location: a.location_name || 'Mapped Location',
          varkari: a.varkaris,
          created_at: a.created_at
        })),
        ...(unifiedIncidents || []).map(i => ({
          id: i.id,
          type: i.type || 'Emergency',
          priority: i.priority || 'HIGH',
          source: i.source || 'WEB',
          status: i.status,
          lat: parseFloat(i.latitude),
          lng: parseFloat(i.longitude),
          location: i.address || 'Mapped Location',
          varkari: i.varkaris,
          created_at: i.created_at
        }))
      ].filter(i => !isNaN(i.lat) && !isNaN(i.lng));

      combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setIncidents(combined);

    } catch (err) {
      console.error("Error fetching map incidents:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const onLoad = useCallback(function callback(map) {
    mapRef.current = map;
    // Auto center map if we have incidents
    if (filteredIncidents.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      filteredIncidents.forEach(inc => {
        bounds.extend({ lat: inc.lat, lng: inc.lng });
      });
      map.fitBounds(bounds);
      
      // Prevent over-zooming on a single point
      const listener = window.google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 16) map.setZoom(16);
        window.google.maps.event.removeListener(listener);
      });
    } else {
      map.setCenter(PANDHARPUR_CENTER);
      map.setZoom(12);
    }
  }, [incidents]);

  const onUnmount = useCallback(function callback(map) {
    mapRef.current = null;
  }, []);

  // Compute filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      // Status
      if (filterStatus === 'ACTIVE' && i.status === 'RESOLVED') return false;
      if (filterStatus === 'RESOLVED' && i.status !== 'RESOLVED') return false;
      
      // Source
      if (filterSource === 'IVR' && i.source !== 'IVR') return false;
      if (filterSource === 'WEB_QR' && (i.source === 'IVR')) return false;
      
      // Priority
      if (filterPriority !== 'ALL' && i.priority !== filterPriority) return false;
      
      return true;
    });
  }, [incidents, filterStatus, filterSource, filterPriority]);

  // Recenter map when filters change and bounds change
  useEffect(() => {
    if (mapRef.current && filteredIncidents.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      filteredIncidents.forEach(inc => bounds.extend({ lat: inc.lat, lng: inc.lng }));
      mapRef.current.fitBounds(bounds);
    }
  }, [filteredIncidents]);

  const getMarkerIcon = (priority) => {
    // Generate simple SVG data URIs for markers based on priority
    let color = '#eab308'; // STANDARD - Yellow
    if (priority === 'CRITICAL') color = '#dc2626'; // CRITICAL - Red
    if (priority === 'HIGH') color = '#f97316'; // HIGH - Orange

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32px" height="32px" stroke="#ffffff" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const handleIncidentSelect = (incident) => {
    setSelectedIncident(incident);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: incident.lat, lng: incident.lng });
      mapRef.current.setZoom(16);
    }
  };

  // Metrics for the header
  const activeCount = incidents.filter(i => i.status !== 'RESOLVED').length;
  const criticalCount = incidents.filter(i => i.status !== 'RESOLVED' && i.priority === 'CRITICAL').length;
  const mappedCount = incidents.length;

  return (
    <AdminLayout title="Live Safety Map">
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <MapPin size={24} className="text-red-600" />
            LIVE SAFETY MAP
          </h2>
          <p className="text-slate-500 text-sm">Real-time incident locations powered by Google Maps</p>
        </div>
        
        {/* KPI Summary */}
        <div className="flex gap-4">
          <div className="bg-white border border-slate-200 rounded px-4 py-2 flex flex-col items-center min-w-[100px]">
            <span className="text-xs font-bold text-slate-500">MAPPED</span>
            <span className="text-lg font-black text-slate-800">{mappedCount}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded px-4 py-2 flex flex-col items-center min-w-[100px]">
            <span className="text-xs font-bold text-orange-600">ACTIVE</span>
            <span className="text-lg font-black text-orange-600">{activeCount}</span>
          </div>
          <div className="bg-white border border-red-200 rounded px-4 py-2 flex flex-col items-center min-w-[100px]">
            <span className="text-xs font-bold text-red-600">CRITICAL</span>
            <span className="text-lg font-black text-red-600 flex items-center gap-1">
              {criticalCount > 0 && <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>}
              {criticalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded border border-slate-200 mb-6 flex flex-wrap gap-4 items-center">
        <span className="text-sm font-bold text-slate-500 uppercase flex items-center gap-1"><Filter size={14}/> Filters:</span>
        
        <select className="select text-sm w-auto py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active (Open/Reported)</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <select className="select text-sm w-auto py-1.5" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Critical Only</option>
          <option value="HIGH">High</option>
          <option value="STANDARD">Standard</option>
        </select>

        <select className="select text-sm w-auto py-1.5" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="ALL">All Sources</option>
          <option value="WEB_QR">Web / QR Scans</option>
          <option value="IVR">IVR Only</option>
        </select>
      </div>

      <div className="flex flex-col lg:flex-row gap-6" style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}>
        
        {/* LEFT: Incident List */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 text-sm">Mapped Incidents</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">{filteredIncidents.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingData ? (
              <div className="p-8 text-center text-slate-500 text-sm">Loading incident locations...</div>
            ) : filteredIncidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No mapped incidents available matching filters.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredIncidents.map(inc => (
                  <div
                    key={inc.id}
                    onClick={() => handleIncidentSelect(inc)}
                    className={`p-3 rounded border cursor-pointer transition-colors ${selectedIncident?.id === inc.id ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${inc.priority === 'CRITICAL' ? 'bg-red-600' : inc.priority === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'}`}></span>
                        <span className="font-bold text-slate-800 text-sm">{inc.type}</span>
                      </div>
                      <span className="text-[0.65rem] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{new Date(inc.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium mb-1 truncate">
                      Varkari: {inc.varkari?.name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1 text-[0.7rem] text-slate-500 mt-2">
                      <MapPin size={10} />
                      <span className="truncate">{inc.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Google Map */}
        <div className="w-full lg:w-2/3 bg-slate-100 border border-slate-200 rounded relative shadow-sm">
          {loadError ? (
            <div className="absolute inset-0 flex items-center justify-center text-red-600 bg-red-50 font-bold p-8 text-center">
              <div>
                <AlertTriangle size={32} className="mx-auto mb-2" />
                Unable to load the safety map.<br/>Please check your Google Maps API Key configuration.
              </div>
            </div>
          ) : !isLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-bold">
              Loading Google Maps Engine...
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={PANDHARPUR_CENTER}
              zoom={12}
              options={mapOptions}
              onLoad={onLoad}
              onUnmount={onUnmount}
              onClick={() => setSelectedIncident(null)} // Click map to close info window
            >
              {filteredIncidents.map(inc => (
                <Marker
                  key={inc.id}
                  position={{ lat: inc.lat, lng: inc.lng }}
                  icon={getMarkerIcon(inc.priority)}
                  onClick={() => handleIncidentSelect(inc)}
                />
              ))}

              {selectedIncident && (
                <InfoWindow
                  position={{ lat: selectedIncident.lat, lng: selectedIncident.lng }}
                  onCloseClick={() => setSelectedIncident(null)}
                >
                  <div className="p-1 max-w-[220px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <div className="flex justify-between items-start mb-2 pb-2 border-b border-slate-200">
                      <div>
                        <div className="text-[0.65rem] font-bold text-slate-400 mb-0.5">INCIDENT #{selectedIncident.id.split('-')[0].toUpperCase()}</div>
                        <div className="font-black text-slate-800 text-sm leading-tight flex items-center gap-1">
                          {selectedIncident.source === 'IVR' && <Phone size={12} className="text-slate-500" />}
                          {selectedIncident.type}
                        </div>
                      </div>
                      <span className={`text-[0.6rem] px-1.5 py-0.5 rounded font-bold ml-2 ${selectedIncident.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' : selectedIncident.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {selectedIncident.priority}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 mb-3 text-slate-700">
                      <div className="flex gap-1.5">
                        <span className="font-bold w-12 shrink-0">Varkari:</span> 
                        <span className="truncate">{selectedIncident.varkari?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="font-bold w-12 shrink-0">Source:</span> 
                        <span>{selectedIncident.source}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="font-bold w-12 shrink-0">Status:</span> 
                        <span className={selectedIncident.status === 'RESOLVED' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{selectedIncident.status}</span>
                      </div>
                      <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100">
                        <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                        <span className="text-[0.7rem] text-slate-500 leading-tight">{selectedIncident.location}</span>
                      </div>
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedIncident.lat},${selectedIncident.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center bg-blue-50 text-blue-700 font-bold text-xs py-1.5 rounded hover:bg-blue-100 flex items-center justify-center gap-1"
                    >
                      <Navigation size={12} /> Open in Google Maps
                    </a>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default LiveMap;
