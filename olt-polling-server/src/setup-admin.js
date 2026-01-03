/**
 * First Admin Setup Script
 * Run this once to create the first super_admin user
 * 
 * Usage: node src/setup-admin.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

// Admin credentials
const ADMIN_EMAIL = 'admin@isppoint.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'Super Admin';
const TENANT_NAME = 'ISP Point Admin';

async function setupAdmin() {
  console.log('🚀 Setting up first super_admin user...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Create the user in auth.users
    console.log('1️⃣ Creating user in auth system...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: ADMIN_NAME
      }
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log('   ⚠️ User already exists, fetching user...');
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === ADMIN_EMAIL);
        if (existingUser) {
          authData.user = existingUser;
        } else {
          throw authError;
        }
      } else {
        throw authError;
      }
    }

    const userId = authData.user.id;
    console.log(`   ✅ User created/found: ${userId}\n`);

    // Step 2: Create profile (trigger should do this, but ensure it exists)
    console.log('2️⃣ Ensuring profile exists...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: ADMIN_EMAIL,
        full_name: ADMIN_NAME
      }, { onConflict: 'id' });

    if (profileError) {
      console.log(`   ⚠️ Profile note: ${profileError.message}`);
    } else {
      console.log('   ✅ Profile ready\n');
    }

    // Step 3: Assign super_admin role
    console.log('3️⃣ Assigning super_admin role...');
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'super_admin'
      }, { onConflict: 'user_id' });

    if (roleError) {
      throw roleError;
    }
    console.log('   ✅ Role assigned\n');

    // Step 4: Create a tenant for the admin
    console.log('4️⃣ Creating admin tenant...');
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: TENANT_NAME,
        email: ADMIN_EMAIL,
        company_name: 'OLT Care Platform',
        status: 'active',
        owner_user_id: userId,
        max_olts: 999,
        max_users: 999
      })
      .select()
      .single();

    if (tenantError) {
      if (tenantError.message.includes('duplicate')) {
        console.log('   ⚠️ Tenant already exists');
      } else {
        throw tenantError;
      }
    } else {
      console.log(`   ✅ Tenant created: ${tenantData.id}\n`);

      // Step 5: Link user to tenant
      console.log('5️⃣ Linking user to tenant...');
      const { error: linkError } = await supabase
        .from('tenant_users')
        .insert({
          tenant_id: tenantData.id,
          user_id: userId,
          role: 'admin',
          is_owner: true
        });

      if (linkError) {
        console.log(`   ⚠️ Link note: ${linkError.message}`);
      } else {
        console.log('   ✅ User linked to tenant\n');
      }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ SETUP COMPLETE!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('🔐 Admin Login Credentials:');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupAdmin();
