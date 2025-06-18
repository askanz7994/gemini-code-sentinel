
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const usePayPal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createPayPalOrder = async (credits: number, amount: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to purchase credits",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('paypal-create-order', {
        body: { credits, amount },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error creating PayPal order:', error);
        toast({
          title: "Payment Error",
          description: "Failed to create payment order. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const capturePayPalPayment = async (orderId: string, credits: number) => {
    if (!user) return false;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('paypal-capture-payment', {
        body: { orderId, credits },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error || !data?.success) {
        console.error('Error capturing PayPal payment:', error);
        toast({
          title: "Payment Error",
          description: "Failed to process payment. Please contact support.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Payment Successful",
        description: `${credits} credits have been added to your account!`,
      });

      return true;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please contact support.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createPayPalOrder,
    capturePayPalPayment,
  };
};
