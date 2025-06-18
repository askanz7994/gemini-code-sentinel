
-- Add credits column to profiles table
ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 0;

-- Create a table to track credit transactions
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'deduct')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to credit transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for credit transactions
CREATE POLICY "Users can view their own credit transactions" 
  ON public.credit_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit transactions" 
  ON public.credit_transactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create a table to track scans and credit usage
CREATE TABLE public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  repository_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  credits_used INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add Row Level Security (RLS) to scans
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Create policies for scans
CREATE POLICY "Users can view their own scans" 
  ON public.scans 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scans" 
  ON public.scans 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans" 
  ON public.scans 
  FOR UPDATE 
  USING (auth.uid() = user_id);
