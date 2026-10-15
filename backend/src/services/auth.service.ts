import { getSupabaseClient } from '../config/supabaseClient.js';

export class AuthService {
  static async register(username: string, email: string, phone: string, password: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          phone,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: data.user.id, username, email },
          { onConflict: 'id' }
        );

      if (profileError) {
        throw new Error(`Account was created, but its profile could not be saved: ${profileError.message}`);
      }
    }

    return data;
  }

  static async loginWithUsername(username: string, password: string) {
    const supabase = getSupabaseClient();
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username)
      .single();

    if (profileError || !profileData) {
      throw new Error('The username could not be found.');
    }

    const email = profileData.email;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
