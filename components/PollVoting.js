import { useState } from 'react';
import { supabase } from '../lib/supabase';

// **REPLACE with your department's actual OPay/Bank details**
const PAYMENT_ACCOUNT_DETAILS = {
    account_name: "Dept. Project Fund",
    account_number: "0012345678",
    bank_name: "OPay Wallet / Bank Name", 
};

export default function PollVoting({ poll, session }) {
    const [selectedOption, setSelectedOption] = useState('');
    const [step, setStep] = useState(0); // 0: Select Option, 1: Payment Details, 2: Upload Proof
    const [transactionRef, setTransactionRef] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [pollError, setPollError] = useState(null);
    const [lastSubmissionRef, setLastSubmissionRef] = useState(null);

    // Function to check if the user has a pending vote for this poll
    const checkPendingVote = async () => {
        if (!session) return;
        const { data } = await supabase
            .from('votes')
            .select('status, transaction_ref')
            .eq('poll_id', poll.id)
            .eq('user_id', session.user.id)
            .in('status', ['PENDING', 'APPROVED']) // Check if a vote is pending or already approved
            .limit(1);

        if (data && data.length > 0) {
            setLastSubmissionRef(data[0].transaction_ref);
            if (data[0].status === 'APPROVED') return 'APPROVED';
            return 'PENDING';
        }
        return null;
    };

    // --- Step 3: Upload Proof and Record Pending Vote ---
    const handleProofSubmission = async (e) => {
        e.preventDefault();
        setUploading(true);
        setPollError(null);

        if (!proofFile || !transactionRef) {
            setPollError("Please provide both the transaction reference and the screenshot.");
            setUploading(false);
            return;
        }

        const fileExtension = proofFile.name.split('.').pop();
        const filePath = `${session.user.id}/${poll.id}_${Date.now()}.${fileExtension}`;
        let proof_url = null;

        try {
            // 1. Upload the image to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('proofs') // Must match the bucket name
                .upload(filePath, proofFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Get the public URL for the file
            const { publicURL, error: urlError } = supabase.storage
                .from('proofs')
                .getPublicUrl(filePath);

            if (urlError) throw urlError;
            proof_url = publicURL;

            // 2. Record the pending vote
            const { error: insertError } = await supabase.from('votes').insert([
                {
                    poll_id: poll.id,
                    user_id: session.user.id,
                    option_voted: selectedOption,
                    transaction_ref: transactionRef,
                    proof_url: proof_url,
                    status: 'PENDING', 
                }
            ]);

            if (insertError) throw insertError;

            alert("Payment proof submitted! Your vote is pending admin approval and will count shortly.");
            setStep(0); // Return to step 0
            setLastSubmissionRef(transactionRef); // Update the state to show pending message

        } catch (error) {
            setPollError(`Submission failed: ${error.message}`);
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    // Check if the user has already voted or has a pending vote
    useEffect(() => {
        checkPendingVote().then(status => {
            if (status === 'APPROVED') setStep(99); // 99 is Voted state
            if (status === 'PENDING') setStep(98); // 98 is Pending state
        });
    }, [session, poll.id]);
    
    // --- RENDER LOGIC ---

    // Voted/Pending State
    if (step === 99) return <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>✅ You have successfully voted in this poll!</p>;
    if (step === 98) return <p style={{ color: '#ffeb3b', fontWeight: 'bold' }}>⏳ Your vote ({lastSubmissionRef}) is pending admin approval.</p>;


    // 0: Initial State / Option Selection
    if (step === 0) {
        return (
            <form onSubmit={(e) => {e.preventDefault(); if (selectedOption) setStep(1); }}>
                <fieldset style={{ border: 'none', padding: 0 }}>
                    <legend style={{ fontWeight: 'bold', marginBottom: '15px', fontSize: '1.1em', color: '#e0c0ff' }}>
                        Select your vote:
                    </legend>
                    {/* ... (Existing radio button UI for poll options) ... */}

                    <button 
                      type="submit" 
                      disabled={!selectedOption}
                      style={{ 
                        marginTop: '25px', 
                        background: 'linear-gradient(90deg, #a020f0, #8a2be2)', 
                        width: '100%', 
                        padding: '12px 20px', 
                        fontSize: '1.1em' 
                      }}
                    >
                      Confirm Selection: {selectedOption || '...'}
                    </button>
                </fieldset>
            </form>
        );
    }
    
    // 1: Payment Details Display
    if (step === 1) {
        return (
            <div style={{ background: '#4b0082', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ color: '#ffeb3b', marginTop: 0 }}>Payment Required: ₦{poll.cost_per_vote.toLocaleString()}</h4>
                <p>Please transfer **₦{poll.cost_per_vote.toLocaleString()}** to the details below, then click Next to upload your proof.</p>
                <div style={{ padding: '15px', background: '#330066', borderRadius: '6px', marginBottom: '15px', color: '#f0e6ff' }}>
                    <p style={{ margin: '5px 0' }}>**Account Name:** {PAYMENT_ACCOUNT_DETAILS.account_name}</p>
                    <p style={{ margin: '5px 0' }}>**Account Number:** {PAYMENT_ACCOUNT_DETAILS.account_number}</p>
                    <p style={{ margin: '5px 0' }}>**Bank/Wallet:** {PAYMENT_ACCOUNT_DETAILS.bank_name}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => setStep(2)}
                        style={{ background: 'linear-gradient(90deg, #a020f0, #8a2be2)', flex: 1 }}
                    >
                        I Have Paid, Upload Proof →
                    </button>
                    <button 
                        onClick={() => setStep(0)}
                        style={{ background: '#dc3545', flex: 1 }}
                    >
                        Cancel / Change Option
                    </button>
                </div>
            </div>
        );
    }

    // 2: Proof Upload Form
    if (step === 2) {
        return (
            <form onSubmit={handleProofSubmission} style={{ background: '#330066', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ color: '#ffeb3b', marginTop: 0 }}>Upload Proof for {poll.title}</h4>
                {pollError && <p style={{ color: '#dc3545', fontWeight: 'bold' }}>{pollError}</p>}

                <label style={{ display: 'block', marginBottom: '5px', color: '#e0c0ff' }}>Transaction Ref/OPay ID:</label>
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
                    style={{ marginBottom: '15px', padding: '10px', border: '1px solid #a020f0' }}
                />

                <button 
                    type="submit" 
                    disabled={uploading}
                    style={{ background: 'linear-gradient(90deg, #4CAF50, #2e8b57)', width: '100%', padding: '12px' }}
                >
                    {uploading ? 'Submitting...' : `Submit Proof for ₦${poll.cost_per_vote.toLocaleString()} Vote`}
                </button>
                <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    style={{ background: '#dc3545', marginTop: '10px', width: '100%' }}
                >
                    ← Back to Payment Details
                </button>
            </form>
        );
    }
}
