import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { email, full_name, role, hire_date, status, organization_id } = await request.json();

  // 1. Invite the user — this creates the auth account AND sends the welcome email
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'https://bh-lms.vercel.app/reset-password'
  });

  if (inviteError) {
    return Response.json({ error: inviteError.message }, { status: 400 });
  }

  // 2. Insert into users table
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .insert([{
      auth_id: inviteData.user.id,
      full_name,
      email,
      role,
      hire_date,
      status,
      organization_id
    }])
    .select()
    .single();

  if (userError) {
    // Rollback the auth user if DB insert fails
    await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
    return Response.json({ error: userError.message }, { status: 400 });
  }

  return Response.json({ success: true, user: userData });
}