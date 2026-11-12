import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userStore } from '../storage/stores.js';
import { ApiError } from '../utils/ApiError.js';

const BCRYPT_ROUNDS = 12;
const JWT_ISSUER = 'agnidesk-api';
const INVALID_CREDENTIALS = 'Invalid email or password.';

// Compared against when the email is unknown, so response time does not reveal
// whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('agnidesk-timing-equaliser', BCRYPT_ROUNDS);

/** Never send passwordHash to the client. */
export const toPublicUser = ({ id, name, email, role }) => ({ id, name, email, role });

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

export async function login({ email, password }) {
  const users = await userStore.findAll();
  const user = users.find((u) => u.email.toLowerCase() === email);

  const passwordOk = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !passwordOk) throw new ApiError(401, INVALID_CREDENTIALS);

  const token = jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: user.id,
    issuer: JWT_ISSUER,
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });

  return { token, user: toPublicUser(user) };
}

/** Returns { userId, role } or throws 401. */
export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtSecret, { issuer: JWT_ISSUER, algorithms: ['HS256'] });
    return { userId: payload.sub, role: payload.role };
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid session.';
    throw new ApiError(401, message);
  }
}

/** Loads the current user, rejecting tokens whose user has since been removed. */
export async function getCurrentUser(userId) {
  const user = await userStore.findById(userId);
  if (!user) throw new ApiError(401, 'Account no longer exists.');
  return toPublicUser(user);
}

/**
 * First-run setup: creates the owner account from OWNER_* env vars when
 * users.xlsx has no users. Does nothing once a user exists.
 */
export async function ensureOwnerAccount() {
  const users = await userStore.findAll();
  if (users.length > 0) {
    if (env.owner.password) {
      console.warn('[auth] OWNER_PASSWORD is set but ignored (owner already exists). Remove it from .env.');
    }
    return;
  }

  const { name, email, password } = env.owner;
  if (!email || password.length < 8) {
    console.error(
      '\n[auth] No user account exists yet. Set OWNER_EMAIL and OWNER_PASSWORD (min 8 characters) in backend/.env, then restart.\n',
    );
    process.exit(1);
  }

  await userStore.create({ name, email, passwordHash: await hashPassword(password), role: 'owner' });
  console.log(`[auth] Owner account created for ${email}. You can now remove OWNER_PASSWORD from .env.`);
}

/** Owner profile (name / login email). */
export async function updateProfile(userId, { name, email }) {
  const users = await userStore.findAll();
  if (users.some((u) => u.id !== userId && u.email.toLowerCase() === email)) {
    throw new ApiError(400, 'Please correct the highlighted fields.', [{ field: 'email', message: 'This email is already used by another account.' }]);
  }
  const updated = await userStore.update(userId, { name, email });
  if (!updated) throw new ApiError(401, 'Account no longer exists.');
  return toPublicUser(updated);
}

/** Requires the current password; stores only the bcrypt hash of the new one. */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userStore.findById(userId);
  if (!user) throw new ApiError(401, 'Account no longer exists.');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError(400, 'Please correct the highlighted fields.', [{ field: 'currentPassword', message: 'Current password is incorrect.' }]);
  }
  await userStore.update(userId, { passwordHash: await hashPassword(newPassword) });
}
