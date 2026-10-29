import { getSupabaseClient } from '../config/supabaseClient.js';

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

interface ProviderAuthError {
  code?: string;
  message?: string;
  status?: number;
}

const INVALID_CREDENTIAL_CODES = new Set([
  'invalid_credentials',
  'invalid_grant',
  'invalid_login_credentials',
  'incorrect_credentials',
]);

const getProviderError = (error: unknown): ProviderAuthError =>
  error && typeof error === 'object' ? error as ProviderAuthError : {};

const isInvalidCredentialError = (error: ProviderAuthError): boolean => {
  const code = error.code?.toLowerCase() ?? '';
  const message = error.message?.toLowerCase() ?? '';
  return INVALID_CREDENTIAL_CODES.has(code) ||
    /invalid (?:login )?credentials|invalid username or password|incorrect (?:username|password|credentials)/.test(message);
};

const toLoginError = (error: unknown): AuthServiceError => {
  const providerError = getProviderError(error);
  if (isInvalidCredentialError(providerError)) {
    return new AuthServiceError('Invalid username or password.', 'invalid_credentials', 401);
  }

  const status = providerError.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return new AuthServiceError(
      providerError.message || 'Sign-in could not be completed. Please try again.',
      providerError.code || 'authentication_error',
      status
    );
  }

  return new AuthServiceError(
    'Sign-in service is temporarily unavailable. Please try again.',
    'auth_service_unavailable',
    503
  );
};

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

    if (profileError?.code === 'PGRST116' || (!profileError && !profileData)) {
      throw new AuthServiceError('Invalid username or password.', 'invalid_credentials', 401);
    }
    if (profileError) {
      throw new AuthServiceError(
        'Sign-in service is temporarily unavailable. Please try again.',
        'auth_service_unavailable',
        503
      );
    }

    const email = profileData.email;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw toLoginError(error);
    }

    return data;
  }
}
