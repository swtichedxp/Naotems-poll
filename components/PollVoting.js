import { useState } from 'react';
import { supabase } from '../lib/supabase';

const PAYSTACK_PUBLIC_KEY = 'YOUR_PAYSTACK_PUBLIC_KEY'; 

export default function PollVoting({ poll, session }) {
  const [selectedOption, setSelectedOption] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVote = (e) => {
    e.preventDefault();
    if (!selectedOption) {
      alert('Please select an option before voting.');
      return;
    }
    if (!session?.user?.email) {
        alert('You must be logged in to vote.');
        return;
    }
    
    const amountInKobo = poll.cost_per_vote * 100;
    const reference = `poll_${poll.id}_user_${session.user.id}_${Date.now()}`;
    
    setIsProcessing(true);

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: session.user.email,
      amount: amountInKobo,
      ref: reference, 
      metadata: {
        poll_id: poll.id,
        user_id: session.user.id,
        option_voted: selectedOption,
        custom_fields: [{
            display_name: "Matric No",
            variable_name: "matric_no",
            value: session.user.user_metadata.matric_number
        }]
      },
      callback: (response) => {
        verifyPaymentAndRecordVote(response.reference, poll.id, session.user.id, selectedOption);
      },
      onClose: () => {
        alert('Payment cancelled by user.');
        setIsProcessing(false);
      },
    });

    handler.openIframe();
  };

  const verifyPaymentAndRecordVote = async (ref, pollId, userId, optionVoted) => {
    try {
        const { error } = await supabase.from('votes').insert([
            { 
                poll_id: pollId, 
                user_id: userId, 
                option_voted: optionVoted, 
                transaction_ref: ref,
            }
        ]);

        if (error) throw error;

        alert(`Vote for '${optionVoted}' recorded successfully! Transaction Ref: ${ref}`);

    } catch (error) {
        console.error('Error recording vote:', error.message);
        alert(`Vote failed to record. Please contact support. Error: ${error.message}`);
    } finally {
        setIsProcessing(false);
        setSelectedOption('');
    }
  };

  return (
    <form onSubmit={handleVote}>
      <fieldset disabled={isProcessing} style={{ border: 'none', padding: 0, margin: '20px 0 0 0' }}>
        <legend style={{ fontWeight: 'bold', marginBottom: '15px', fontSize: '1.1em', color: '#e0c0ff' }}>
          Select your vote:
        </legend>
        
        {Array.isArray(poll.options) && poll.options.map((option, index) => (
          <div key={index} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
            <input 
              type="radio" 
              id={`poll-${poll.id}-option-${index}`} 
              name={`poll-option-${poll.id}`} 
              value={option}
              checked={selectedOption === option}
              onChange={(e) => setSelectedOption(e.target.value)}
              required
              // Custom radio button styling
              style={{
                display: 'none', // Hide default radio
              }}
            />
            <label 
              htmlFor={`poll-${poll.id}-option-${index}`} 
              style={{ 
                marginLeft: '8px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                color: '#e0c0ff' 
              }}
            >
              {/* Custom radio button appearance */}
              <span 
                style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid #a020f0',
                  marginRight: '10px',
                  position: 'relative',
                  backgroundColor: selectedOption === option ? '#a020f0' : 'transparent',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                }}
              >
                {selectedOption === option && (
                  <span 
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'white', // Inner dot color
                    }}
                  ></span>
                )}
              </span>
              {option}
            </label>
          </div>
        ))}

        <button 
          type="submit" 
          disabled={!selectedOption || isProcessing}
          style={{ 
            marginTop: '25px', 
            background: 'linear-gradient(90deg, #a020f0, #8a2be2)', 
            width: '100%', 
            padding: '12px 20px', 
            fontSize: '1.1em' 
          }}
        >
          {isProcessing ? 'Processing Payment...' : `Pay ₦${poll.cost_per_vote.toLocaleString()} and Vote`}
        </button>
      </fieldset>
      {isProcessing && <p style={{ color: '#ffeb3b', textAlign: 'center', marginTop: '15px', fontSize: '0.9em' }}>
        Do not close this window until payment is complete.
      </p>}
    </form>
  );
}
