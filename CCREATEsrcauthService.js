
// Generate verification or reset token
const generateToken = () => {
  return nanoid(32);
};

// Create token record
const createToken = (userId, type, expiresInMinutes = 1440) => {
  const token = generateToken();
  const expiresAt = Date.now() + (expiresInMinutes * 60 * 1000);

  db.prepare(`
    INSERT INTO tokens (id, user_id, token, type, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(nanoid(), userId, token, type, expiresAt);

  return token;
};

// Request email verification
export const requestEmailVerification = async (userId) => {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found');

  if (user.email_verified) {
    throw new Error('Email already verified');
  }

  const token = createToken(userId, 'email_verification', 1440); // 24 hours

  await sendVerificationEmail(user.email, user.name, token);

  return { success: true, message: 'Verification email sent' };
};

// Verify email with token
export const verifyEmail = (token) => {
  const tokenRecord = db.prepare(`
    SELECT * FROM tokens 
    WHERE token = ? AND type = 'email_verification' AND used = 0 AND expires_at > ?
  `).get(token, Date.now());

  if (!tokenRecord) {
    throw new Error('Invalid or expired verification token');
  }

  // Mark token as used
  db.prepare('UPDATE tokens SET used = 1 WHERE id = ?').run(tokenRecord.id);

  // Mark email as verified
  db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(tokenRecord.user_id);

  return { success: true, message: 'Email verified successfully' };
};

// Request password reset
export const requestPasswordReset = async (email) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);

  // Don't reveal if email exists or not (security)
  if (!user) {
    return { success: true, message: 'If that email exists, a reset link has been sent' };
  }

  const token = createToken(user.id, 'password_reset', 60); // 1 hour

  await sendPasswordResetEmail(user.email, user.name, token);

  return { success: true, message: 'If that email exists, a reset link has been sent' };
};

// Reset password with token
export const resetPassword = async (token, newPassword) => {
  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const tokenRecord = db.prepare(`
    SELECT * FROM tokens 
    WHERE token = ? AND type = 'password_reset' AND used = 0 AND expires_at > ?
  `).get(token, Date.now());

  if (!tokenRecord) {
    throw new Error('Invalid or expired reset token');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Mark token as used
  db.prepare('UPDATE tokens SET used = 1 WHERE id = ?').run(tokenRecord.id);

  // Update password
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, tokenRecord.user_id);

  return { success: true, message: 'Password reset successfully' };
};

// Change password (when logged in)
export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);

  return { success: true, message: 'Password changed successfully' };
};

// Update user profile
export const updateUserProfile = (userId, updates) => {
  const { name, email } = updates;

  if (email) {
    // Check if email is already taken
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
    if (existing) {
      throw new Error('Email already in use');
    }

    // If email changed, mark as unverified
    db.prepare('UPDATE users SET email = ?, email_verified = 0 WHERE id = ?').run(email, userId);
  }

  if (name !== undefined) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
  }

  return { success: true, message: 'Profile updated successfully' };
};

// Delete account
export const deleteAccount = async (userId, password) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error('Incorrect password');
  }

  // Soft delete (set is_active = 0)
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);

  return { success: true, message: 'Account deleted successfully' };
};
