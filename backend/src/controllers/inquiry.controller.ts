// backend/src/controllers/inquiry.controller.ts
import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/supabaseClient';

export const createInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { user_id, full_name, email, project_type, details } = req.body;

    if (!email || !project_type) {
      res.status(400).json({ error: 'Email and project type are required.' });
      return;
    }

    const { data, error } = await supabase
      .from('inquiries')
      .insert([
        {
          user_id: user_id || null,
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