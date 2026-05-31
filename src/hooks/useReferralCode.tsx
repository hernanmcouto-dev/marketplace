import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const REFERRAL_CODE_KEY = 'seller_referral_code';

export const useReferralCode = () => {
  const [searchParams] = useSearchParams();
  const [sellerId, setSellerId] = useState<string | null>(null);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    
    if (refCode) {
      // Save referral code to sessionStorage
      sessionStorage.setItem(REFERRAL_CODE_KEY, refCode);
      validateAndSetSeller(refCode);
    } else {
      // Check if there's a stored referral code
      const storedCode = sessionStorage.getItem(REFERRAL_CODE_KEY);
      if (storedCode) {
        validateAndSetSeller(storedCode);
      }
    }
  }, [searchParams]);

  const validateAndSetSeller = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('id')
        .eq('code', code.toUpperCase())
        .single();

      if (error) {
        console.error('Error validating referral code:', error);
        return;
      }

      if (data) {
        setSellerId(data.id);
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
    }
  };

  const getReferralCode = () => {
    return sessionStorage.getItem(REFERRAL_CODE_KEY);
  };

  const clearReferralCode = () => {
    sessionStorage.removeItem(REFERRAL_CODE_KEY);
    setSellerId(null);
  };

  return {
    sellerId,
    referralCode: getReferralCode(),
    clearReferralCode
  };
};
