
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useCredits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    if (!user) {
      setCredits(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
        toast({
          title: "Error",
          description: "Failed to fetch credit balance",
          variant: "destructive",
        });
        return;
      }

      setCredits(data?.credits || 0);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const deductCredits = async (amount: number = 1): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check if user has enough credits
      if (credits < amount) {
        toast({
          title: "Insufficient Credits",
          description: `You need ${amount} credit${amount > 1 ? 's' : ''} to perform this action. You have ${credits} credit${credits !== 1 ? 's' : ''}.`,
          variant: "destructive",
        });
        return false;
      }

      // Update credits in profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          credits: credits - amount,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating credits:", updateError);
        toast({
          title: "Error",
          description: "Failed to deduct credits",
          variant: "destructive",
        });
        return false;
      }

      // Record the transaction
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: user.id,
          amount: -amount,
          type: 'deduct',
          description: 'Vulnerability scan'
        });

      if (transactionError) {
        console.error("Error recording transaction:", transactionError);
      }

      // Update local state
      setCredits(credits - amount);
      
      return true;
    } catch (error) {
      console.error("Error deducting credits:", error);
      return false;
    }
  };

  const addCredits = async (amount: number, description: string = 'Credit purchase') => {
    if (!user) return false;

    try {
      // Update credits in profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          credits: credits + amount,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error adding credits:", updateError);
        return false;
      }

      // Record the transaction
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: user.id,
          amount: amount,
          type: 'purchase',
          description: description
        });

      if (transactionError) {
        console.error("Error recording transaction:", transactionError);
      }

      // Update local state
      setCredits(credits + amount);
      
      toast({
        title: "Credits Added",
        description: `${amount} credit${amount !== 1 ? 's' : ''} added to your account!`,
      });

      return true;
    } catch (error) {
      console.error("Error adding credits:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [user]);

  return {
    credits,
    loading,
    fetchCredits,
    deductCredits,
    addCredits,
  };
};
