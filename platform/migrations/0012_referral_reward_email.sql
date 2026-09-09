-- Track referral reward thank-you email (Resend) per referral code.
ALTER TABLE referral_codes ADD COLUMN referrer_reward_email_sent_at INTEGER;
