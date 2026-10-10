import type { RequestHandler } from 'express';
import type { AuthConfig } from '../../config/auth.js';
import { cookieOptions, sessionCookie } from '../../middleware/authenticate.js';
import { sessionSeconds, type AuthService } from './auth.service.js';
import { registrationInput, loginInput } from './auth.validation.js';

export function authController(service: AuthService, config: AuthConfig) {
  const register: RequestHandler = async (request, response) => {
    const result = await service.register(registrationInput(request.body));
    response.cookie(sessionCookie, result.token, { ...cookieOptions(config), maxAge: sessionSeconds * 1000 });
    response.status(201).json({ user: result.user });
  };
  const login: RequestHandler = async (request, response) => {
    const result = await service.login(loginInput(request.body));
    response.cookie(sessionCookie, result.token, { ...cookieOptions(config), maxAge: sessionSeconds * 1000 });
    response.json({ user: result.user });
  };
  const logout: RequestHandler = async (request, response) => {
    await service.logout(request.authUser!.id);
    response.clearCookie(sessionCookie, cookieOptions(config));
    response.status(204).end();
  };
  return { register, login, logout };
}
