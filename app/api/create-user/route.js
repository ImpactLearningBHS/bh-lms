import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { email, full_name, role, hire_date, status, organization_id } = await request.json();

  // 1. Create the auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'TempPassword123!',
    email_confirm: true,
  });

  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 });
  }

  // 2. Insert into users table — NOW including auth_id and organization_id
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .insert([{
      auth_id: authData.user.id,   // ← the missing link
      full_name,
      email,
      role,
      hire_date,
      status,
      organization_id              // ← scopes them to the right org
    }])
    .select()
    .single();

  if (userError) {
    // Rollback the auth user if DB insert fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return Response.json({ error: userError.message }, { status: 400 });
  }
// Send welcome email with password setup link
await supabaseAdmin.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://bh-lms.vercel.app/reset-password'
});
  return Response.json({ success: true, user: userData });
}