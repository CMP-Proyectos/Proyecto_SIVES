import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "https://pdfswyaxuomaodfcinke.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZnN3eWF4dW9tYW9kZmNpbmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjIxNDYsImV4cCI6MjA5NTYzODE0Nn0.mLMnbMWbuOHLVFQ1Y_ImoZfce2oAelR9asSjalLVyTw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
