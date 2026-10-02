import { supabase } from '../config/supabaseClient.js';

export class AuthService {
  static async register(username: string, email: string, phone: string, password: string) {
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

  // Serbisyo para sa pag-login gamit ang username at password
  static async loginWithUsername(username: string, password: string) {
    // 1. Hanapin muna sa profiles table ang email na naka-link sa ibinigay na username
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username)
      .single();

    if (profileError || !profileData) {
      throw new Error('Hindi mahanap ang username na ito.');
    }

    const email = profileData.email;

    // 2. I-authenticate sa Supabase Auth gamit ang nahanap na email at password
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