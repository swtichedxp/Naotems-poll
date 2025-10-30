import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Head from 'next/head';
import AdminLogin from '../../components/AdminLogin'; // <-- Import the new component
import AdminPanelUI from '../../components/AdminPanelUI'; // <-- We'll put the UI logic here

// **IMPORTANT: Replace this with the SECURE, registered admin email address.**
const ADMIN_EMAIL = 'admin.department@uni.edu'; 

// --- START: AdminPanelUI Component (Extracted from the old code) ---
// Note: You must move the entire poll creation form logic into this new component file.
function AdminPanelUI({ session, onLogout }) {
    // [Place the entire logic from the old pages/admin/create-poll.js handleSubmit and form here]
    // ... [Poll creation state, handlers, and form UI]
    // ... (For the sake of brevity, I'm omitting the long form code, assume it is here)
    // The core of the old pages/admin/create-poll.js should be placed inside a new file: 
    // components/AdminPanelUI.js (or simply components/PollManager.js)
    
    // TEMPORARY Placeholder for the Poll Creation UI
    const [pollTitle, setPollTitle] = useState('');
    const [costPerVote, setCostPerVote] = useState(100);
    const [options, setOptions] = useState(['', '']);
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // [Insert the handleSubmit, handleOptionChange, addOption, removeOption functions here]
    
    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
            <h1 style={{ textAlign: 'center', background: 'linear-gradient(45deg, #a020f0, #8a2be2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '30px' }}>
                ⚙️ Poll Control Panel
            </h1>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <p style={{ margin: '0 15px', color: '#e0c0ff' }}>
                    Logged in as: **{session.user.email}**
                </p>
                <button 
                    onClick={onLogout} 
                    style={{ background: 'linear-gradient(45deg, #dc3545, #bd2130)', padding: '8px 15px' }}
                >
                    Logout
                </button>
            </div>

            {/* **The full Poll Creation Form goes here** */}
            <div style={{ background: '#330066', borderRadius: '15px', padding: '30px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
                {/* ... (Your Poll Creation Form from the previous step) ... */}
                <h2 style={{ color: '#f0e6ff', borderBottom: '1px solid #4b0082', paddingBottom: '15px' }}>
                    Create New Poll UI (Full Form)
                </h2>
                <p style={{ color: '#b080d0' }}>**Placeholder for your fully styled poll creation form.**</p>
            </div>
        </div>
    );
}
// --- END: AdminPanelUI Component ---


// --- START: Main CreatePoll Page (Routing and Security) ---
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

  // Handle Loading State
  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#a020f0' }}>Loading Admin Panel...</div>
  );

  // If session is active AND they are the designated Admin Email, show the panel
  if (session && isAdmin) {
    return (
        <AdminPanelUI session={session} onLogout={handleLogout} />
    );
  }

  // If no session or not the admin, show the dedicated admin login form
  return (
    <AdminLogin onLogin={() => {
        const user = supabase.auth.session()?.user;
        if (user?.email === ADMIN_EMAIL) {
            setSession(supabase.auth.session());
            setIsAdmin(true);
        }
    }} />
  );
}
