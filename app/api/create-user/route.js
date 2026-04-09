import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(request) {
  const { email, full_name, role, hire_date, status, organization_id } = await request.json();

  // 1. Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 });
  }

  // 2. Insert into users table
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .insert([{
      auth_id: authData.user.id,
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
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return Response.json({ error: userError.message }, { status: 400 });
  }

  // 3. Generate password setup link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: 'https://impactworkforcesystems.com/reset-password'
    }
  });

  if (linkError) {
    console.error('Link generation error:', linkError.message);
  }

  const setupUrl = linkData?.properties?.action_link || 'https://impactworkforcesystems.com/login';

  // 4. Send welcome email via Resend
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Impact Workforce <noreply@impactworkforcesystems.com>',
      to: email,
      subject: 'Welcome to Impact Workforce — Set Up Your Account',
      html: `
        <html>
        <body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
            <div style="background: #0D2035; padding: 32px; text-align: center;">
              <h1 style="color: white; font-size: 22px; margin: 0;">Impact Workforce</h1>
              <p style="color: #6B7280; font-size: 13px; margin: 8px 0 0;">Behavioral Health Training Platform</p>
            </div>
            <div style="padding: 36px 32px;">
              <h2 style="color: #0D2035; font-size: 18px; margin: 0 0 12px;">Hi ${full_name}, welcome! 👋</h2>
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                Your account has been created on Impact Workforce. Click the button below to set up your password and access your portal.
              </p>
              <a href="${setupUrl}" style="display: block; background: #0D9488; color: white; text-align: center; padding: 14px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; margin-bottom: 24px;">
                Set Up My Account
              </a>
              <p style="color: #9CA3AF; font-size: 12px; line-height: 1.6; margin: 0;">
                This link expires in 24 hours. If you have any questions, contact your administrator.
              </p>
            </div>
            <div style="background: #F9FAFB; padding: 20px 32px; text-align: center; border-top: 1px solid #F3F4F6;">
              <p style="color: #9CA3AF; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Impact Workforce Systems LLC</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }),
  });

  return Response.json({ success: true, user: userData });
}