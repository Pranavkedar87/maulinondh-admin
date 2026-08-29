import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabase';
import { Package, RefreshCw, Eye, CheckCircle } from 'lucide-react';

const Orders = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          varkaris (
            id,
            name,
            registration_id,
            phone,
            blood_group
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <AdminLayout title={t('admin.orders')}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>Physical QR Band Orders & Issuance</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Track physical band print and distribution status
          </p>
        </div>
        <button onClick={fetchOrders} className="btn btn-outline">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Pilgrim Name</th>
                <th>Registration ID</th>
                <th>Order Type</th>
                <th>Status</th>
                <th>Created Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-6">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-gray-500">
                    No physical band orders generated yet. Generate QR for an approved pilgrim to create an order record.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td><code>{order.id.slice(0, 8)}...</code></td>
                    <td className="font-semibold">{order.varkaris?.name || '—'}</td>
                    <td><code>{order.varkaris?.registration_id || '—'}</code></td>
                    <td><span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">{order.order_type || 'QR_BAND'}</span></td>
                    <td>
                      {order.status === 'ISSUED' ? (
                        <span className="status-badge status-issued">🟢 ISSUED</span>
                      ) : order.status === 'PDF_READY' ? (
                        <span className="status-badge status-verified">📄 PDF READY</span>
                      ) : (
                        <span className="status-badge status-pending">🟡 {order.status}</span>
                      )}
                    </td>
                    <td>{new Date(order.created_at).toLocaleString()}</td>
                    <td>
                      {order.varkari_id && (
                        <button
                          onClick={() => navigate(`/pilgrims/${order.varkari_id}`)}
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem' }}
                        >
                          <Eye size={14} /> Open Profile
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Orders;
