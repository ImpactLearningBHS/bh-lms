import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Impact Workforce <noreply@impactworkforcesystems.com>',
      to,
      subject,
      html,
    }),
  });
  return await res.json();
}

Deno.serve(async () => {
  const today = new Date();
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);
  const in14Days = new Date(today);
  in14Days.setDate(today.getDate() + 14);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  console.log('Checking dates:', fmt(in7Days), fmt(in14Days));

  // Get all assignments due in 7 or 14 days in one query
  const { data: assignments } = await supabase
    .from('training_assignments')
    .select('training_id, organization_id, due_date')
    .or(`due_date.eq.${fmt(in7Days)},due_date.eq.${fmt(in14Days)}`)
    .eq('status', 'Active');

  console.log('Assignments found:', assignments?.length ?? 0);

  if (!assignments || assignments.length === 0) {
    return new Response(JSON.stringify({ message: 'No reminders to send today.' }), { status: 200 });
  }

  // Get all trainings in one query
  const trainingIds = [...new Set(assignments.map(a => a.training_id))];
  const { data: trainings } = await supabase
    .from('trainings')
    .select('id, title')
    .in('id', trainingIds);

  // Get all orgs in one query
  const orgIds = [...new Set(assignments.map(a => a.organization_id))];
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .in('id', orgIds);

  // Get all staff in one query
  const { data: allStaff } = await supabase
    .from('users')
    .select('id, full_name, email, organization_id')
    .in('organization_id', orgIds)
    .eq('status', 'Active')
    .not('role', 'in', '("Platform Admin","Branch Admin")');

  // Get all completions in one query
  const staffIds = allStaff?.map(s => s.id) ?? [];
  const { data: completions } = staffIds.length > 0
    ? await supabase.from('training_completions').select('training_id, staff_name').in('training_id', trainingIds)
    : { data: [] };

  let sent = 0;

  for (const assignment of assignments) {
    const daysUntilDue = assignment.due_date === fmt(in7Days) ? 7 : 14;
    const training = trainings?.find(t => t.id === assignment.training_id);
    const org = orgs?.find(o => o.id === assignment.organization_id);
    const orgStaff = allStaff?.filter(s => s.organization_id === assignment.organization_id) ?? [];

    const trainingTitle = training?.title ?? 'your assigned training';
    const orgName = org?.name ?? 'your organization';
    const dueDate = new Date(assignment.due_date).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });

    for (const staff of orgStaff) {
      const alreadyCompleted = completions?.some(
        c => c.training_id === assignment.training_id && c.staff_name === staff.full_name
      );
      if (alreadyCompleted) continue;

      const emailHtml = `
        <html>
        <body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
            <div style="background: #0D2035; padding: 32px; text-align: center;">
              <h1 style="color: white; font-size: 22px; margin: 0;">Impact Workforce</h1>
              <p style="color: #6B7280; font-size: 13px; margin: 8px 0 0;">Behavioral Health Training Platform</p>
            </div>
            <div style="padding: 36px 32px;">
              <h2 style="color: #0D2035; font-size: 18px; margin: 0 0 12px;">Training Due in ${daysUntilDue} Days</h2>
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">Hi ${staff.full_name},</p>
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                This is a reminder that your training <strong style="color: #0D2035;">${trainingTitle}</strong> is due on <strong style="color: #0D2035;">${dueDate}</strong>.
              </p>
              <a href="https://impactworkforcesystems.com/staff"
                style="display: block; background: #0D9488; color: white; text-align: center; padding: 14px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; margin-bottom: 24px;">
                Complete My Training
              </a>
              <p style="color: #9CA3AF; font-size: 12px; line-height: 1.6; margin: 0;">
                Please complete this training before the due date to stay compliant with ${orgName}'s requirements.
              </p>
            </div>
            <div style="background: #F9FAFB; padding: 20px 32px; text-align: center; border-top: 1px solid #F3F4F6;">
              <p style="color: #9CA3AF; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Impact Workforce Systems LLC</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await sendEmail(
        staff.email,
        `Reminder: ${trainingTitle} due in ${daysUntilDue} days`,
        emailHtml
      );
      console.log('Email result for', staff.email, ':', JSON.stringify(result));
      sent++;
    }
  }

  return new Response(JSON.stringify({ message: `Sent ${sent} reminder emails.` }), { status: 200 });
});