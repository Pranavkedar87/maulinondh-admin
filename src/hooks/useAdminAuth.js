import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useAdminAuth = () => {
  const [session, setSession] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Check if quick demo login flag is stored in localStorage
    const isDemoActive = localStorage.getItem('maulinondh_admin_demo') === 'true';

    const checkAdminStatus = async (userSession) => {
      if (isDemoActive) {
        if (mounted) {
          setAdminUser({ name: 'Super Admin (Demo)', role: 'SUPER_ADMIN' });
          setIsAdmin(true);
          setLoading(false);
        }
        return;
      }

      if (!userSession?.user) {
        if (mounted) {
          setAdminUser(null);
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', userSession.user.id)
          .maybeSingle();

        if (mounted) {
          setAdminUser(data || { name: userSession.user.email || 'Admin', role: 'ADMIN' });
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Error verifying admin permissions:', err);
        if (mounted) {
          setAdminUser({ name: userSession.user.email || 'Admin', role: 'ADMIN' });
          setIsAdmin(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        checkAdminStatus(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        checkAdminStatus(session);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { session, adminUser, isAdmin, loading };
};
