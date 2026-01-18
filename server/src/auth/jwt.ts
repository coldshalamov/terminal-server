import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JWTPayload {
  sessionId: string;
  type: 'web' | 'connector';
  iat?: number;
  exp?: number;
}

export const generateToken = (sessionId: string, type: 'web' | 'connector'): string => {
  const payload: JWTPayload = {
    sessionId,
    type,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '24h', // Token valid for 24 hours
  });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  } catch (error) {
    return null;
  }
};
