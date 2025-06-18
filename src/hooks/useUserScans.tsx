
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useUserScans = () => {
  const [remainingScans, setRemainingScans] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRemainingScans();
    }
  }, [user]);

  const fetchRemainingScans = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('remaining_scans')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching scans:', error);
      } else {
        setRemainingScans(data?.remaining_scans || 0);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const useScan = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('use_scan_credit', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error using scan credit:', error);
        toast({
          title: "Error",
          description: "Failed to use scan credit.",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        setRemainingScans(prev => Math.max(0, prev - 1));
        return true;
      } else {
        toast({
          title: "No scans available",
          description: "You don't have any remaining scans. Please purchase more.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  };

  const addScans = async (credits: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('add_scan_credits', {
        user_uuid: user.id,
        credits: credits
      });

      if (error) {
        console.error('Error adding scan credits:', error);
        return false;
      }

      if (data) {
        setRemainingScans(prev => prev + credits);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  };

  return {
    remainingScans,
    loading,
    useScan,
    addScans,
    refreshScans: fetchRemainingScans
  };
};
