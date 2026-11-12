import * as authService from '../services/auth.service.js';

export const login = async (req, res) => {
  const result = await authService.login(req.valid.body);
  res.status(200).json({ success: true, data: result });
};

export const me = async (req, res) => {
  const user = await authService.getCurrentUser(req.auth.userId);
  res.status(200).json({ success: true, data: { user } });
};
