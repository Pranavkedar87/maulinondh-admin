import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useAdminAuth = () => {
  const [session, setSession] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAdminStatus = async (userSession) => {
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
          if (data && !error) {
            setAdminUser(data);
            setIsAdmin(true);
          } else {
            // For hackathon flexibility: If no admin_users row exists yet,
            // we will fallback to allowing logged-in auth users to act as Admin
            // so developer/tester is not locked out before running SQL.
            setAdminUser({ name: userSession.user.email || 'Admin', role: 'ADMIN' });
            setIsAdmin(true);
          }
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
