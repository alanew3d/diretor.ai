// Public project coordinates. This key has no elevated privileges; RLS protects data.
export const studioConfig = {
  url: process.env.STUDIO_SUPABASE_URL || 'https://ogvuxjtipnxodbhqvlrd.supabase.co',
  key: process.env.STUDIO_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable__pTmgW-Tk1yKiSPXecGVGQ_PJHJjN53',
};
