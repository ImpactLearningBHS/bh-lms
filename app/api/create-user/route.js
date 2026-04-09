import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendWelcomeEmail(email, full_name, role, orgName, setupUrl) {
  const isBranchAdmin = role === 'Branch Admin';

  const subject = isBranchAdmin
    ? "Welcome to Impact Workforce — Let's Get Started!"
    : `You've been added to ${orgName}'s training portal`;

  const html = isBranchAdmin ? `
    <html>
    <body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 40px 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
        <div style="background: #0D2035; padding: 32px; text-align: center;">
          <h1 style="color: white; font-size: 22px; margin: 0;">Impact Workforce</h1>
          <p style="color: #6B7280; font-size: 13px; margin: 8px 0 0;">Behavioral Health Training Platform</p>
        </div>
        <div style="padding: 36px 32px;">
          <h2 style="color: #0D2035; font-size: 18px; margin: 0 0 12px;">Welcome aboard, ${full_name}! 👋</h2>
          <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Your organization has been set up on Impact Workforce — a training and compliance platform built for behavioral health teams. Here's how to get started:
          </p>
          <div style="background: #F9FAFB; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px; font-size: 14px;"><span style="color: #0D9488; font-weight: 700;">Step 1</span> — <strong style="color: #0D2035;">Set up your password</strong><br/><span style="color: #6B7280; font-size: 13px;">Click the button below to create your password and access your dashboard.</span></p>
            <p style="margin: 0 0 12px; font-size: 14px;"><span style="color: #0D9488; font-weight: 700;">Step 2</span> — <strong style="color: #0D2035;">Add your staff members</strong><br/><span style="color: #6B7280; font-size: 13px;">Go to My Staff and add each team member. They'll receive their own welcome email automatically.</span></p>
            <p style="margin: 0 0 12px; font-size: 14px;"><span style="color: #0D9488; font-weight: 700;">Step 3</span> — <strong style="color: #0D2035;">View your assigned trainings</strong><br/><span style="color: #6B7280; font-size: 13px;">Check the Trainings tab to see what's been assigned to your organization and due dates.</span></p>
            <p style="margin: 0; font-size: 14px;"><span style="color: #0D9488; font-weight: 700;">Step 4</span> — <strong style="color: #0D2035;">Track completions</strong><br/><span style="color: #6B7280; font-size: 13px;">Monitor your team's progress and print certificates from the Completions tab.</span></p>
          </div>
          <a href="${setupUrl}" style="display: block; background: #0D9488; color: white; text-align: center; padding: 14px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; margin-bottom: 24px;">
            Set Up My Account
          </a>
          <p style="color: #9CA3AF; font-size: 12px; line-height: 1.6; margin: 0;">
            This link expires in 24 hours. Questions? Contact us at impactlearningbhs@gmail.com.
          </p>
        </div>
        <div style="background: #F9FAFB; padding: 20px 32px; text-align: center; border-top: 1px solid #F3F4F6;">
          <p style="color: #9CA3AF; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Impact Workforce Systems LLC</p>
        </div>
      </div>
    </body>
    </html>
  ` : `
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
            You've been added to <strong style="color: #0D2035;">${orgName}</strong>'s training portal on Impact Workforce. Click below to set up your account and get started with your assigned trainings.
          </p>
          <div style="background: #F9FAFB; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px; font-size: 14px;"><span style="color: #0D9488; font-weight: 700;">Step 1</span> — <strong style="color: #0D2035;">Set up your password</strong><br/><span style="color: #6B7280; font-size: 13px;">Click the button below to create your account.</span></p>
            <p style="margin: 0 0 12px; font-size: 14px;"><span style="color: #0D9488; font-weight: 700;">Step 2</span> — <strong style="color: #0D2035;">Log in to your portal</strong><br/><span style="color: #6B7280; font-size: 13px;">Visit impactworkforcesystems.com and log in with your email.</span></p>
            <p style="margin: 0; font-size: 14px;"><span style="color: #0D9488; font-weight: 700;">Step 3</span> — <strong style="color: #0D2035;">Complete your trainings</strong><br/><span style="color: #6B7280; font-size: 13px;">View and complete your assigned trainings before their due dates.</span></p>
          </div>
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
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Impact Workforce <noreply@impactworkforcesystems.com>',
      to: email,
      subject,
      html,
    }),
  });
  const result = await response.json();
  console.log('Resend result:', JSON.stringify(result));
  return result;
}

export async function POST(request) {
  const { email, full_name, role, hire_date, status, organization_id } = await request.json();

  // 1. Use inviteUserByEmail — creates auth account and generates invite link
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'https://impactworkforcesystems.com/reset-password'
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
    await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
    return Response.json({ error: userError.message }, { status: 400 });
  }

  // 3. Get org name
  let orgName = 'your organization';
  if (organization_id) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single();
    if (org) orgName = org.name;
  }

  // 4. Get the invite link from inviteData
  const setupUrl = inviteData.user?.action_link || 'https://impactworkforcesystems.com/login';

  console.log('About to send welcome email to:', email, 'role:', role, 'RESEND_KEY exists:', !!RESEND_API_KEY);
// 5. Send role-based welcome email via Resend
await sendWelcomeEmail(email, full_name, role, orgName, setupUrl);
  // 5. Send role-based welcome email via Resend
  await sendWelcomeEmail(email, full_name, role, orgName, setupUrl);

  return Response.json({ success: true, user: userData });
}