// backend/src/controllers/inquiry.controller.ts
import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/supabaseClient';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_ADMIN_UUID = '00000000-0000-0000-0000-000000000001';

function resolveUserId(rawValue: unknown): string | null {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!normalized) return null;
  if (normalized === 'admin-wma') return DEFAULT_ADMIN_UUID;
  if (UUID_REGEX.test(normalized)) return normalized;

  return DEFAULT_ADMIN_UUID;
}

export const createInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { user_id, full_name, email, project_type, details } = req.body;
    const safeUserId = resolveUserId(user_id);

    if (!email || !project_type) {
      res.status(400).json({ error: 'Email and project type are required.' });
      return;
    }

    const { data, error } = await supabase
      .from('inquiries')
      .insert([
        {
          user_id: safeUserId ?? null,
          full_name,
          email,
          project_type,
          details,
          status: 'Pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Inquiry submitted successfully!',
      data,
    });
  } catch (error: any) {
    console.error('Inquiry Error:', error);
    res.status(500).json({ error: 'Failed to submit inquiry.', details: error.message });
  }
};