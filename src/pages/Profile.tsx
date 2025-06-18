
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import { usePayPal } from "@/hooks/usePayPal";
import { CreditCard, Plus } from "lucide-react";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  credits: number | null;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { credits, fetchCredits } = useCredits();
  const { loading: paypalLoading, createPayPalOrder, capturePayPalPayment } = usePayPal();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchProfile();
    
    // Handle PayPal return
    const payment = searchParams.get('payment');
    const orderId = searchParams.get('token'); // PayPal returns token as orderId
    
    if (payment === 'success' && orderId) {
      handlePayPalReturn(orderId);
    } else if (payment === 'cancelled') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. No charges were made.",
        variant: "destructive",
      });
    }
  }, [user, navigate, searchParams]);

  const handlePayPalReturn = async (orderId: string) => {
    const success = await capturePayPalPayment(orderId, 25); // Assuming 25 credits package
    if (success) {
      fetchCredits(); // Refresh credit balance
      // Clear URL parameters
      navigate('/profile', { replace: true });
    }
  };

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        setProfile(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });
        fetchProfile();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseCredits = async () => {
    const orderData = await createPayPalOrder(25, "20.00");
    
    if (orderData?.approvalUrl) {
      // Redirect to PayPal for payment approval
      window.location.href = orderData.approvalUrl;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credits Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">Credits</span>
              </div>
              <div className="text-2xl font-bold text-primary">{credits}</div>
            </div>
            <Button 
              onClick={handlePurchaseCredits}
              className="w-full"
              variant="outline"
              disabled={paypalLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
              {paypalLoading ? "Creating order..." : "Buy 25 Credits for $20"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Each vulnerability scan uses 1 credit. Secure payment via PayPal.
            </p>
          </div>

          <Separator />

          {/* Profile Form */}
          <form onSubmit={updateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Profile"}
            </Button>
          </form>
          
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
