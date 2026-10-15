import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { firstValidationMessage, loginSchema, registerSchema } from '../validation/schemas.js';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstValidationMessage(parsed.error) });
      const { username, email, phone, password } = parsed.data;

      const result = await AuthService.register(username, email, phone, password);

      const userObj = result.user ? {
        ...result.user,
        username: username,
        fullName: username,
        full_name: username,
        email: email || result.user.email || '',
        phone: phone || ''
      } : null;

      if (!result.session) {
        return res.status(200).json({ 
          message: 'Registration successful! Please check your email to verify your account.', 
          needsVerification: true 
        });
      }

      return res.status(201).json({
        message: 'Registration successful!',
        user: userObj,
        session: result.session,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'An error occurred during registration.' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstValidationMessage(parsed.error) });
      const { username, password } = parsed.data;

      const result = await AuthService.loginWithUsername(username, password);
      
      const userObj = result.user ? {
        ...result.user,
        username: username,
        fullName: result.user.user_metadata?.username || username,
        full_name: result.user.user_metadata?.username || username,
        email: result.user.email || '',
        phone: result.user.user_metadata?.phone || ''
      } : null;

      return res.status(200).json({
        message: 'Login successful!',
        user: userObj,
        session: result.session,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Invalid username or password.' });
    }
  }
}
