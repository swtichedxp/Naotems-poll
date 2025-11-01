import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, CheckCircle, Upload, AlertTriangle, ArrowLeft } from 'lucide-react';

// **REPLACE with your department's actual OPay/Bank details**
const PAYMENT_ACCOUNT_DETAILS = {
    account_name: "FPE Dept. Project Fund",
    account_number: "0012345678",
    bank_name: "OPay Wallet / FCMB / Bank Name", 
};

export default function PollVoting({ poll, session }) {
    // selectedCandidateId stores the ID of the candidate being voted for
    const [selectedCandidateId, setSelectedCandidateId] = useState('');
    const [step, setStep] = useState(0); // 0: Select Option, 1: Payment Details, 2: Upload Proof, 3: Submitted/Status
    const [transactionRef, setTransactionRef] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [pollError, setPollError] = useState(null);
    const [submissionStatus, setSubmissionStatus] = useState(null); // PENDING, APPROVED, REJECTED
    const [lastSubmissionRef, setLastSubmissionRef] = useState(null);

    // Function to check if the user has a pending vote for this poll
    const checkPendingVote = async () => {
        if (!session) return;
        setPollError(null);
        setUploading(true); // Reuse loading state for initial check

        // RLS will ensure user only sees their own votes
        const { data, error } = await supabase
            .from('votes')
            .select('status, transaction_ref')
            .eq('poll_id', poll.id)
            .eq('user_id', session.user.id)
            .in('status', ['PENDING', 'APPROVED', 'REJECTED'])
            .limit(1);

        if (error) {
            setPollError('Failed to check vote status.');
            setUploading(false);
            return;
        }

        if (data && data.length > 0) {
            setSubmissionStatus(data[0].status);
            setLastSubmissionRef(data[0].transaction_ref);
            setStep(3); // Move to status display
        }
        setUploading(false);
    };

    // Initial check when component loads or session changes
    useState(() => {
        checkPendingVote();
    }, [session, poll.id]);


    // --- File Upload and Vote Submission Handler ---
    const handleProofSubmission = async (e) => {
        e.preventDefault();
        setUploading(true);
        setPollError(null);

        if (!proofFile || !transactionRef || !selectedCandidateId) {
            setPollError('Please complete all fields.');
            setUploading(false);
            return;
        }

        try {
            // 1. Upload proof file to Supabase Storage
            const fileExt = proofFile.name.split('.').pop();
            const fileName = `${poll.id}_${session.user.id}_${Date.now()}.${fileExt}`;
            const filePath = `${session.user.id}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('proofs')
                .upload(filePath, proofFile);

            if (uploadError) throw uploadError;

            // 2. Insert vote record into the database
            const proof_url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/proofs/${filePath}`;
            
            const { error: insertError } = await supabase.from('votes').insert([
                {
                    poll_id: poll.id,
                    user_id: session.user.id,
                    candidate_id: selectedCandidateId, // CRITICAL: Use candidate_id
                    transaction_ref: transactionRef.trim(),
                    proof_url: proof_url,
                    status: 'PENDING', 
                }
            ]);

            if (insertError) {
                // If insert fails, try to delete the uploaded file
                await supabase.storage.from('proofs').remove([filePath]);
                throw insertError;
            }

            // Success
            setSubmissionStatus('PENDING');
            setLastSubmissionRef(transactionRef.trim());
            setStep(3);

        } catch (error) {
            console.error('Submission Error:', error);
            setPollError(`Submission failed: ${error.message}. Please try again.`);
        } finally {
            setUploading(false);
        }
    };


    // --- RENDER LOGIC ---

    // Style for the main container
    const cardStyle = {
        background: 'linear-gradient(135deg, #1f2b57 0%, #0c1a3f 100%)',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        color: 'white',
        marginBottom: '25px',
        border: '1px solid #3c5484'
    };

    const isVotingActive = step < 3 && !uploading;
    
    // --- Step 3: Status Display ---
    if (step === 3) {
        let statusColor, statusIcon, statusMessage;

        if (submissionStatus === 'APPROVED') {
            statusColor = '#4CAF50';
            statusIcon = <CheckCircle size={28} />;
            statusMessage = "Your vote has been APPROVED and counted! Thank you for participating.";
        } else if (submissionStatus === 'REJECTED') {
            statusColor = '#dc3545';
            statusIcon = <AlertTriangle size={28} />;
            statusMessage = `Your submission (Ref: ${lastSubmissionRef}) was REJECTED. Please contact the Admin for clarification.`;
        } else { // PENDING
            statusColor = '#ffc107';
            statusIcon = <RefreshCw size={28} className="animate-spin" />;
            statusMessage = `Your vote is PENDING approval (Ref: ${lastSubmissionRef}). Please wait 24-48 hours for the Admin to verify your payment.`;
        }

        return (
            <div style={cardStyle}>
                <h3 style={{ color: '#f0e6ff', borderBottom: '1px solid #3c5484', paddingBottom: '10px', marginBottom: '20px' }}>
                    {poll.title}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                    <div style={{ color: statusColor, marginBottom: '20px' }}>{statusIcon}</div>
                    <h4 style={{ color: statusColor, marginBottom: '10px' }}>Submission Status: {submissionStatus}</h4>
                    <p style={{ color: '#ccc', fontSize: '1.1em' }}>{statusMessage}</p>
                    <button 
                        onClick={checkPendingVote}
                        style={{ background: '#5ac8fa', marginTop: '20px', display: 'flex', alignItems: 'center' }}
                    >
                        <RefreshCw size={16} style={{ marginRight: '8px' }} /> Re-check Status
                    </button>
                </div>
            </div>
        );
    }
    
    // --- Error Display (Always visible if present) ---
    if (pollError) {
        return (
            <div style={{ ...cardStyle, borderColor: '#dc3545' }}>
                <h3 style={{ color: '#ff6b6b' }}>Error</h3>
                <p>{pollError}</p>
                <button onClick={() => setPollError(null)} style={{ background: '#dc3545' }}>
                    <ArrowLeft size={16} style={{ marginRight: '5px' }} /> Go Back
                </button>
            </div>
        );
    }

    // --- Step 0: Select Candidate ---
    if (step === 0) {
        return (
            <div style={cardStyle}>
                <h3 style={{ color: '#f0e6ff', borderBottom: '1px solid #3c5484', paddingBottom: '10px', marginBottom: '20px' }}>
                    {poll.title}
                </h3>
                <p style={{ color: '#ccc', marginBottom: '20px' }}>
                    Cost to Vote: **₦{poll.cost_per_vote.toLocaleString()}**
                </p>
                <fieldset style={{ border: 'none', padding: 0 }}>
                    {poll.candidates.map((candidate) => (
                        <label key={candidate.id} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            marginBottom: '15px', 
                            padding: '10px', 
                            borderRadius: '10px', 
                            cursor: 'pointer',
                            background: selectedCandidateId === candidate.id ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0,0,0,0.1)',
                            border: selectedCandidateId === candidate.id ? '1px solid #007aff' : '1px solid transparent',
                            transition: 'all 0.2s'
                        }}>
                            <input 
                                type="radio" 
                                name="candidate_id" 
                                value={candidate.id}
                                checked={selectedCandidateId === candidate.id}
                                onChange={() => setSelectedCandidateId(candidate.id)}
                                style={{ width: '20px', height: '20px', marginRight: '15px', accentColor: '#007aff' }}
                            />
                            {candidate.picture_url ? (
                                <img 
                                    src={candidate.picture_url} 
                                    alt={candidate.name} 
                                    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/40x40/5ac8fa/ffffff?text=C" }} // Fallback
                                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%', marginRight: '15px' }} 
                                />
                            ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '15px', background: '#5ac8fa', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>{candidate.name[0]}</div>
                            )}
                            <div style={{ flexGrow: 1 }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{candidate.name}</span>
                                {candidate.manifesto_summary && <p style={{ fontSize: '0.9em', color: '#5ac8fa', margin: '3px 0 0' }}>{candidate.manifesto_summary}</p>}
                            </div>
                        </label>
                    ))}
                    <button 
                        type="submit" 
                        disabled={!selectedCandidateId}
                        onClick={(e) => {e.preventDefault(); if (selectedCandidateId) setStep(1); }}
                        style={{ 
                            background: 'linear-gradient(90deg, #007aff, #5ac8fa)', 
                            marginTop: '20px',
                            width: '100%'
                        }}
                    >
                        Confirm Selection and Proceed to Payment
                    </button>
                </fieldset>
            </div>
        );
    }
    
    // --- Step 1: Payment Details ---
    if (step === 1) {
        return (
            <div style={cardStyle}>
                <h3 style={{ color: '#f0e6ff', borderBottom: '1px solid #3c5484', paddingBottom: '10px', marginBottom: '20px' }}>
                    Payment Instructions (₦{poll.cost_per_vote.toLocaleString()})
                </h3>
                <p style={{ color: '#ffeb3b', fontWeight: 'bold' }}>
                    Selected Candidate: {poll.candidates.find(c => c.id === selectedCandidateId)?.name || 'Unknown'}
                </p>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '10px', margin: '20px 0' }}>
                    <h4 style={{ color: '#5ac8fa', marginBottom: '10px' }}>Department Account Details:</h4>
                    <p><strong>Bank:</strong> {PAYMENT_ACCOUNT_DETAILS.bank_name}</p>
                    <p><strong>Account Name:</strong> {PAYMENT_ACCOUNT_DETAILS.account_name}</p>
                    <p><strong>Account Number:</strong> {PAYMENT_ACCOUNT_DETAILS.account_number}</p>
                    <p style={{ color: '#dc3545', marginTop: '15px', fontWeight: 'bold' }}>
                        TRANSFER EXACTLY ₦{poll.cost_per_vote.toLocaleString()}
                    </p>
                </div>
                
                <p style={{ color: '#ccc', fontSize: '0.9em' }}>
                    After payment, click "Proceed" to upload your transaction screenshot.
                </p>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button 
                        onClick={() => setStep(0)}
                        style={{ background: '#dc3545', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ArrowLeft size={16} style={{ marginRight: '5px' }} /> Change Candidate
                    </button>
                    <button 
                        onClick={() => setStep(2)}
                        style={{ background: 'linear-gradient(90deg, #4CAF50, #2e8b57)', flex: 1 }}
                    >
                        Proceed to Proof Upload →
                    </button>
                </div>
            </div>
        );
    }

    // --- Step 2: Upload Proof ---
    if (step === 2) {
        return (
            <form onSubmit={handleProofSubmission} style={cardStyle}>
                <h3 style={{ color: '#f0e6ff', borderBottom: '1px solid #3c5484', paddingBottom: '10px', marginBottom: '20px' }}>
                    Upload Payment Proof
                </h3>
                
                <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff' }}>Transaction ID / Sender Name:</label>
                <input 
                    type="text" 
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Enter OPay Transaction ID or Sender Name"
                    required
                    style={{ marginBottom: '15px' }}
                />

                <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff' }}>Payment Screenshot (PNG/JPG):</label>
                <input 
                    type="file" 
                    accept="image/png, image/jpeg"
                    onChange={(e) => setProofFile(e.target.files[0])}
                    required
                    style={{ marginBottom: '15px', padding: '10px', border: '1px solid #3c5484', background: '#1f2b57' }}
                />

                <button 
                    type="submit" 
                    disabled={uploading}
                    style={{ background: 'linear-gradient(90deg, #4CAF50, #2e8b57)', width: '100%', padding: '12px' }}
                >
                    {uploading ? 'Submitting...' : <><Upload size={18} style={{ marginRight: '8px' }} /> Submit Proof for ₦{poll.cost_per_vote.toLocaleString()} Vote</>}
                </button>
                <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    style={{ background: '#dc3545', marginTop: '10px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ArrowLeft size={16} style={{ marginRight: '5px' }} /> Back to Payment Details
                </button>
            </form>
        );
    }
            }
