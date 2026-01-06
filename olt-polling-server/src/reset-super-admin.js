#!/usr/bin/env node
/**
 * Super Admin Password Reset Script
 * 
 * Usage (from VPS):
 *   cd /path/to/olt-polling-server
 *   node src/reset-super-admin.js <email> <newPassword>
 * 
 * Example:
 *   node src/reset-super-admin.js admin@example.com MyNewSecurePassword123
 */

import './config.js';
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('❌ Usage: node src/reset-super-admin.js <email> <newPassword>');
  console.error('   Example: node src/reset-super-admin.js admin@example.com NewPassword123');
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error('❌ Password must be at least 6 characters');
  process.exit(1);
}

async function resetPassword() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Find user by email
    console.log(`🔍 Finding user: ${email}...`);
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      console.log('\n📋 Available users:');
      users.slice(0, 10).forEach(u => console.log(`   - ${u.email}`));
      if (users.length > 10) console.log(`   ... and ${users.length - 10} more`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

    // Reset password
    console.log('🔐 Resetting password...');
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Password reset successfully!');
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log('\n🎉 You can now login with the new password.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPassword();
