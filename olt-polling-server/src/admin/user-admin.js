/**
 * User Administration Module
 * Handles password reset and other admin operations using Supabase Admin API
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

// Create admin client with service role key
function getAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  // Support both naming conventions
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required for admin operations. Please add these to your .env file.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Check if user has admin or super_admin role
 */
export async function isUserAdmin(supabase, userId) {
  try {
    // Get admin client to check user roles with elevated permissions
    const adminClient = getAdminClient();
    
    // Check for super_admin role
    const { data: superAdminData, error: superAdminError } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!superAdminError && superAdminData) {
      logger.info(`User ${userId} has super_admin role`);
      return true;
    }

    // Check for admin role
    const { data: adminData, error: adminError } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminError && adminData) {
      logger.info(`User ${userId} has admin role`);
      return true;
    }

    logger.warn(`User ${userId} is not an admin`);
    return false;
  } catch (error) {
    logger.error(`Error checking admin role for user ${userId}:`, error);
    return false;
  }
}

/**
 * Update user password (admin only)
 */
export async function updateUserPassword(userId, newPassword) {
  if (!userId || !newPassword) {
    throw new Error('userId and newPassword are required');
  }

  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const adminClient = getAdminClient();

  const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    logger.error(`Error updating password for user ${userId}: ${error.message}`);
    throw error;
  }

  logger.info(`Password updated for user ${userId}`);
  return { success: true };
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  const adminClient = getAdminClient();

  const { data: { users }, error } = await adminClient.auth.admin.listUsers();

  if (error) {
    logger.error(`Error listing users: ${error.message}`);
    throw error;
  }

  return users;
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId) {
  const adminClient = getAdminClient();

  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    logger.error(`Error deleting user ${userId}: ${error.message}`);
    throw error;
  }

  logger.info(`User ${userId} deleted`);
  return { success: true };
}

/**
 * Create new user (admin only)
 */
export async function createUser(email, password, userData = {}) {
  if (!email || !password) {
    throw new Error('email and password are required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const adminClient = getAdminClient();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: userData,
  });

  if (error) {
    logger.error(`Error creating user ${email}: ${error.message}`);
    throw error;
  }

  logger.info(`User created: ${email}`);
  return data;
}
