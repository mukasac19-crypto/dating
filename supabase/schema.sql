-- Dating Safety AI Database Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription TEXT DEFAULT 'free' CHECK (subscription IN ('free', 'premium')),
  analysis_count INTEGER DEFAULT 0,
  -- Stripe billing bookkeeping (see migrations/20260531_stripe_billing.sql)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  price_id TEXT,
  subscription_current_period_end TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Chat History table
CREATE TABLE public.chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL UNIQUE REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  messages JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis results table
CREATE TABLE public.analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  trust_score INTEGER NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
  escalation_index INTEGER NOT NULL CHECK (escalation_index >= 0 AND escalation_index <= 100),
  chat_content JSONB NOT NULL,
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  reciprocity_score JSONB NOT NULL,
  consistency_analysis JSONB NOT NULL,
  suggested_replies JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Saved analyses table (for premium users)
CREATE TABLE public.saved_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analysis_results(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, analysis_id)
);

-- Feedback table for improving the AI
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES public.analysis_results(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('false_positive', 'false_negative', 'helpful', 'not_helpful')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('text_analysis', 'image_analysis', 'export_report')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_analysis_results_user_id ON public.analysis_results(user_id);
CREATE INDEX idx_analysis_results_created_at ON public.analysis_results(created_at);
CREATE INDEX idx_saved_analyses_user_id ON public.saved_analyses(user_id);
CREATE INDEX idx_feedback_analysis_id ON public.feedback(analysis_id);
CREATE INDEX idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_created_at ON public.usage_tracking(created_at);

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Analysis results policies
CREATE POLICY "Users can view their own analyses"
  ON public.analysis_results FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create analyses"
  ON public.analysis_results FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Saved analyses policies
CREATE POLICY "Users can view their own saved analyses"
  ON public.saved_analyses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create saved analyses"
  ON public.saved_analyses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own saved analyses"
  ON public.saved_analyses FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own saved analyses"
  ON public.saved_analyses FOR DELETE
  USING (user_id = auth.uid());

-- Feedback policies
CREATE POLICY "Users can view their own feedback"
  ON public.feedback FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Usage tracking policies
CREATE POLICY "Users can view their own usage"
  ON public.usage_tracking FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can track usage"
  ON public.usage_tracking FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Functions

-- Function to increment analysis count
CREATE OR REPLACE FUNCTION increment_analysis_count(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET analysis_count = analysis_count + 1,
      updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old anonymous analyses (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_analyses()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.analysis_results
  WHERE user_id IS NULL
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Triggers

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_analyses_updated_at
  BEFORE UPDATE ON public.saved_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_history_updated_at
  BEFORE UPDATE ON public.chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a trigger to automatically create user record on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();