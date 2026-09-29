import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, fullName } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'Lahat ng fields ay kinakailangan (email, password, fullName).' });
      }

      const result = await AuthService.register(email, password, fullName);
      return res.status(201).json({
        message: 'Matagumpay na nakapag-register!',
        user: result.user,
        session: result.session,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'May naganap na error sa pag-register.' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Kailangan ang email at password.' });
      }

      const result = await AuthService.login(email, password);
      return res.status(200).json({
        message: 'Matagumpay na naka-login!',
        user: result.user,
        session: result.session,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Mali ang email o password.' });
    }
  }
}