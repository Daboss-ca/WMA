import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { username, email, phone, password, confirmPassword } = req.body;

      if (!username || !email || !phone || !password || !confirmPassword) {
        return res.status(400).json({ error: 'All fields are required (username, email, phone, password, confirmPassword).' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
      }

      const result = await AuthService.register(username, email, phone, password);
      
      // Sinigurong lahat ng posibleng basahin ng frontend ay may laman at hindi undefined
      const userObj = result.user ? {
        ...result.user,
        username: username,
        fullName: username,
        full_name: username,
        email: email || result.user.email || '',
        phone: phone || ''
      } : null;

      // ----------------------------------------------------
      // UPDATED LOGIC: Check kung kailangan ng Email Verification
      // ----------------------------------------------------
      if (!result.session) {
        return res.status(200).json({ 
          message: 'Registration successful! Please check your email to verify your account.', 
          needsVerification: true 
        });
      }

      // Kung walang verification na kailangan, tuloy sa auto-login
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
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
      }

      const result = await AuthService.loginWithUsername(username, password);
      
      // Safe fallbacks para sa login response din
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