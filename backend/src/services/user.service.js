import { userStore } from '../storage/stores.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, toPublicUser } from './auth.service.js';

/**
 * Admin accounts (Settings > Users). Every account can do everything for now;
 * `role` is kept ('owner' for the first account, 'admin' for added ones) so
 * limited employee roles can be added later.
 */

const fieldError = (field, message) => new ApiError(400, 'Please correct the highlighted fields.', [{ field, message }]);

export async function listUsers() {
  const users = await userStore.findAll();
  return {
    users: users
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
      .map((u) => ({ ...toPublicUser(u), createdAt: u.createdAt })),
    maxAdmins: env.maxAdmins,
  };
}

export async function createUser({ name, email, password }) {
  // Lock-free check is acceptable: only logged-in admins can call this, and the
  // email-uniqueness/limit race would need two admins clicking at the same instant.
  const users = await userStore.findAll();
  if (users.length >= env.maxAdmins) {
    throw new ApiError(409, `You can have at most ${env.maxAdmins} admin accounts.`);
  }
  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw fieldError('email', 'An account with this email already exists.');
  }
  const created = await userStore.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'admin',
    passwordChangedAt: new Date().toISOString(),
  });
  return toPublicUser(created);
}

/** Sets a new password for ANOTHER admin and signs them out of every device. */
export async function resetUserPassword(currentUserId, id, { password }) {
  if (id === currentUserId) {
    throw new ApiError(400, 'Use "Change password" (Profile & Password) to change your own password.');
  }
  const updated = await userStore.update(id, {
    passwordHash: await hashPassword(password),
    passwordChangedAt: new Date().toISOString(),
  });
  if (!updated) throw new ApiError(404, 'User not found.');
}

export async function deleteUser(currentUserId, id) {
  if (id === currentUserId) throw new ApiError(400, 'You cannot remove your own account.');
  const users = await userStore.findAll();
  if (!users.some((u) => u.id === id)) throw new ApiError(404, 'User not found.');
  if (users.length <= 1) throw new ApiError(400, 'At least one admin account must remain.');
  await userStore.delete(id); // their existing sessions stop working on the next request
}
