import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Head from 'next/head';

// **IMPORTANT: Replace this with the ACTUAL email address(es) of your site administrators.**
const ADMIN_EMAILS = ['admin.user@uni.edu', 'hod@uni.edu']; 

export default function CreatePoll() {
  const [session, setSession] = useState(null);
  const [pollTitle, setPollTitle] = useState('');
  const [costPerVote, setCostPerVote] = useState(100);
  const [options, setOptions] = useState(['', '']); // Start with two options
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- 1. Authentication Check ---
  useEffect(() => {
    const currentSession = supabase.auth.session();
    setSession(currentSession);
    setLoading(false);

    if (currentSession && ADMIN_EMAILS.includes(currentSession.user.email)) {
        setIsAdmin(true);
    }
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session && ADMIN_EMAILS.includes(session.user.email)) {
            setIsAdmin(true);
        } else {
            setIsAdmin(false);
        }
      }
    );
    return () => authListener?.unsubscribe();
  }, []);

  // --- 2. Option Handlers (Dynamic Inputs) ---
  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  // --- 3. Submission Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Filter out empty options
    const validOptions = options.filter(opt => opt.trim() !== '');

    if (!pollTitle || validOptions.length < 2 || costPerVote <= 0) {
      alert('Please enter a title, at least two options, and a cost greater than zero.');
      setIsSubmitting(false);
      return;
    }

    const newPoll = {
      title: pollTitle,
      cost_per_vote: costPerVote,
      is_active: isActive,
      options: validOptions, // Supabase automatically converts a JS array to the `text[]` or `jsonb` type
      created_by: session.user.id // Track who created the poll
    };

    const { data, error } = await supabase
      .from('polls')
      .insert([newPoll]);

    if (error) {
      alert(`Error creating poll: ${error.message}`);
      console.error('Error creating poll:', error);
    } else {
      alert(`Poll "${pollTitle}" created successfully!`);
      // Reset form
      setPollTitle('');
      setCostPerVote(100);
      setOptions(['', '']);
      setIsActive(true);
    }
    setIsSubmitting(false);
  };

  // --- 4. Render Logic (UI) ---

  // Handle Loading State
  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#a020f0' }}>Loading Admin Panel...</div>
  );

  // Handle Not Logged In
  if (!session) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#f0e6ff' }}>
        <h2 style={{ color: '#a020f0' }}>Admin Access Required</h2>
        <p>Please log in with an administrator account on the <a href="/" style={{ color: '#ffeb3b', textDecoration: 'underline' }}>main page</a>.</p>
    </div>
  );

  // Handle Logged In, but Not Admin
  if (session && !isAdmin) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#f0e6ff' }}>
        <h2 style={{ color: '#a020f0' }}>Permission Denied</h2>
        <p>Your current user account (**{session.user.email}**) is not authorized to access the control panel.</p>
    </div>
  );

  // Render Admin Panel (The UI you requested)
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <Head><title>Admin Control Panel</title></Head>
      
      <h1 style={{ textAlign: 'center', background: 'linear-gradient(45deg, #a020f0, #8a2be2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '30px' }}>
        ⚙️ Poll Control Panel
      </h1>

      <div style={{ background: '#330066', borderRadius: '15px', padding: '30px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
        
        <h2 style={{ color: '#f0e6ff', borderBottom: '1px solid #4b0082', paddingBottom: '15px' }}>
            Create New Poll
        </h2>

        <form onSubmit={handleSubmit}>
          
          {/* Poll Title */}
          <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff', fontWeight: 'bold' }}>Poll Question/Title:</label>
          <input 
            type="text" 
            value={pollTitle} 
            onChange={(e) => setPollTitle(e.target.value)} 
            placeholder="e.g., Who is the best candidate for HOD?"
            required
            style={{ marginBottom: '25px' }}
          />

          {/* Poll Options */}
          <label style={{ display: 'block', marginBottom: '10px', color: '#e0c0ff', fontWeight: 'bold' }}>Voting Options (Minimum 2):</label>
          {options.map((option, index) => (
            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input 
                type="text" 
                value={option} 
                onChange={(e) => handleOptionChange(index, e.target.value)} 
                placeholder={`Option ${index + 1}`}
                required={index < 2} // Require first two options
                style={{ flexGrow: 1, marginBottom: 0 }}
              />
              {options.length > 2 && (
                <button 
                  type="button" 
                  onClick={() => removeOption(index)} 
                  style={{ background: '#dc3545', padding: '10px', width: 'auto' }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button 
            type="button" 
            onClick={addOption} 
            style={{ 
              background: 'linear-gradient(90deg, #8a2be2, #a020f0)', 
              width: '100%', 
              padding: '12px 20px', 
              marginTop: '15px',
              marginBottom: '30px'
            }}
          >
            + Add Another Option
          </button>

          {/* Settings */}
          <div style={{ display: 'flex', gap: '30px', marginBottom: '30px', borderTop: '1px solid #4b0082', paddingTop: '20px' }}>
            
            {/* Cost per Vote */}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff', fontWeight: 'bold' }}>Cost Per Vote (₦):</label>
              <input 
                type="number" 
                value={costPerVote} 
                onChange={(e) => setCostPerVote(Number(e.target.value))} 
                min="1"
                required
                style={{ marginBottom: 0 }}
              />
            </div>

            {/* Is Active Toggle */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff', fontWeight: 'bold' }}>Poll Status:</label>
                <label style={{ display: 'flex', alignItems: 'center', color: '#f0e6ff', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                        type="checkbox" 
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        style={{ width: '20px', height: '20px', marginRight: '10px', accentColor: '#a020f0' }}
                    />
                    {isActive ? 'Active (Live)' : 'Inactive (Hidden)'}
                </label>
            </div>
          </div>
          
          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              background: 'linear-gradient(90deg, #4CAF50, #2e8b57)', 
              width: '100%', 
              padding: '15px 20px', 
              fontSize: '1.2em'
            }}
          >
            {isSubmitting ? 'Publishing Poll...' : 'Publish Poll Now'}
          </button>
        </form>
      </div>
    </div>
  );
  }
