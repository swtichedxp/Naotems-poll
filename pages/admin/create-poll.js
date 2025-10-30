import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Head from 'next/head';
import AdminLogin from '../../components/AdminLogin';
import AdminPanelUI from '../../components/AdminPanelUI';

const ADMIN_EMAIL = 'admin.department@uni.edu'; // Must match AdminLogin.js

export default function CreatePoll() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const currentSession = supabase.auth.session();
    setSession(currentSession);
    
    if (currentSession && currentSession.user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
    }
    setLoading(false);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setIsAdmin(session?.user?.email === ADMIN_EMAIL);
      }
    );
    return () => authListener?.unsubscribe();
  }, []);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    alert('Admin logged out!');
  };

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#a020f0' }}>Loading Admin Panel...</div>
  );

  // If session is active AND they are the designated Admin Email, show the panel
  if (session && isAdmin) {
    return (
        <>
        <Head><title>Admin Control Panel</title></Head>
        <AdminPanelUI session={session} onLogout={handleLogout} />
        </>
    );
  }

  // If no session or not the admin, show the dedicated admin login form
  return (
    <>
    <Head><title>Admin Login</title></Head>
    <AdminLogin onLogin={() => {
        const user = supabase.auth.session()?.user;
        if (user?.email === ADMIN_EMAIL) {
            setSession(supabase.auth.session());
            setIsAdmin(true);
        }
    }} />
    </>
  );
}
