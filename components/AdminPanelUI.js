import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PollCreationForm from './PollCreationForm'; // Extracted for clarity
import { CheckCircle, X, Search } from 'lucide-react'; // Added Lucide imports

export default function AdminPanelUI({ session, onLogout }) {
    const [pendingVotes, setPendingVotes] = useState([]);
    const [isLoadingVotes, setIsLoadingVotes] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Fetch Pending Votes ---
    const fetchPendingVotes = async () => {
        setIsLoadingVotes(true);
        // Select vote details and join the poll title and user's matric/username
        const { data, error } = await supabase
            .from('votes')
            .select(`
                id, transaction_ref, proof_url, option_voted, created_at,
                polls(title), 
                users!inner(user_metadata->>matric_number, user_metadata->>username)
            `)
            .eq('status', 'PENDING');

        if (error) {
            console.error('Error fetching pending votes:', error);
        } else {
            setPendingVotes(data);
        }
        setIsLoadingVotes(false);
    };

    useEffect(() => {
        fetchPendingVotes();
        // Optional: Set up a real-time listener here for instant updates
    }, []);

    // --- Approval Handler ---
    const handleVoteApproval = async (voteId, newStatus) => {
        const adminId = session.user.id;
        const { error } = await supabase
            .from('votes')
            .update({ status: newStatus, approved_by: adminId, approved_at: new Date().toISOString() })
            .eq('id', voteId);

        if (error) {
            console.error(`Error ${newStatus} vote:`, error);
            // Use a custom UI alert instead of 'alert()'
            console.log(`Failed to update vote ${voteId} to ${newStatus}.`);
        } else {
            // Re-fetch or locally remove the approved/rejected vote
            setPendingVotes(prev => prev.filter(vote => vote.id !== voteId));
        }
    };

    const filteredVotes = pendingVotes.filter(vote => {
        const userMatric = vote.users.matric_number?.toLowerCase() || '';
        const userName = vote.users.username?.toLowerCase() || '';
        const pollTitle = vote.polls.title?.toLowerCase() || '';
        const ref = vote.transaction_ref?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();

        return userMatric.includes(search) || userName.includes(search) || pollTitle.includes(search) || ref.includes(search);
    });
    
    // Simple utility to format timestamp
    const formatTime = (isoString) => {
        return new Date(isoString).toLocaleString();
    };


    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ color: '#f0e6ff', textAlign: 'center', marginBottom: '30px' }}>
                Department Poll Admin Dashboard
            </h1>

            {/* --- 1. Pending Votes Section --- */}
            <div style={{ background: '#330066', borderRadius: '15px', padding: '30px', marginBottom: '30px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
                <h2 style={{ color: '#f0e6ff', borderBottom: '1px solid #4b0082', paddingBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    🗳️ Pending Vote Approvals ({pendingVotes.length})
                    <button onClick={onLogout} style={{ background: '#a020f0', padding: '8px 15px', fontSize: '0.9em' }}>
                        Log Out
                    </button>
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', background: '#1a0033', borderRadius: '8px', padding: '5px 10px', margin: '15px 0' }}>
                    <Search size={20} style={{ color: '#e0c0ff', marginRight: '10px' }} />
                    <input
                        type="text"
                        placeholder="Search by Matric No, Username, or Transaction Ref..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flexGrow: 1, border: 'none', background: 'transparent', padding: '10px 0', color: '#f0e6ff' }}
                    />
                </div>

                {isLoadingVotes ? (
                    <p style={{ color: '#e0c0ff', textAlign: 'center' }}>Loading pending votes...</p>
                ) : filteredVotes.length === 0 ? (
                    <p style={{ color: '#e0c0ff', textAlign: 'center' }}>🎉 All caught up! No pending votes.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '20px', marginTop: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {filteredVotes.map((vote) => (
                            <div key={vote.id} style={{ background: '#4b0082', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)' }}>
                                <p style={{ fontWeight: 'bold', fontSize: '1.1em', marginBottom: '10px', color: '#fff' }}>
                                    Poll: {vote.polls.title}
                                </p>
                                <p><strong>User:</strong> {vote.users.username || 'N/A'} ({vote.users.matric_number || 'N/A'})</p>
                                <p><strong>Voted For:</strong> <span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>{vote.option_voted}</span></p>
                                <p><strong>Ref:</strong> <code>{vote.transaction_ref}</code></p>
                                <p><strong>Submitted:</strong> {formatTime(vote.created_at)}</p>
                                <p style={{ marginTop: '10px' }}>
                                    <a 
                                        href={vote.proof_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        style={{ color: '#e0c0ff', textDecoration: 'underline' }}
                                    >
                                        🔗 View Payment Proof
                                    </a>
                                </p>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                    <button 
                                        onClick={() => handleVoteApproval(vote.id, 'APPROVED')}
                                        style={{ background: 'linear-gradient(90deg, #4CAF50, #2e8b57)', padding: '8px 15px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <CheckCircle size={16} style={{ marginRight: '5px' }} /> Approve
                                    </button>
                                    <button 
                                        onClick={() => handleVoteApproval(vote.id, 'REJECTED')}
                                        style={{ background: 'linear-gradient(90deg, #dc3545, #a020f0)', padding: '8px 15px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <X size={16} style={{ marginRight: '5px' }} /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- 2. Create New Poll --- */}
            <div style={{ background: '#330066', borderRadius: '15px', padding: '30px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
                <h2 style={{ color: '#f0e6ff', borderBottom: '1px solid #4b0082', paddingBottom: '15px' }}>
                    ➕ Create New Poll
                </h2>
                <PollCreationForm session={session} />
            </div>
        </div>
    );
                            }
