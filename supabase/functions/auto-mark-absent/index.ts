import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Current time in IST (UTC+5:30), read via UTC getters so the server timezone doesn't matter
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const today = nowIST.toISOString().split('T')[0]
  const istTimeStr = nowIST.toISOString().slice(11, 19) // HH:MM:SS

  // Skip Sundays
  if (nowIST.getUTCDay() === 0) {
    return json({ message: 'Sunday - skipping' })
  }

  // Check if today is a holiday or forced closure
  const { data: holidays } = await supabase
    .from('holidays')
    .select('id')
    .eq('date', today)
    .limit(1)

  if (holidays && holidays.length > 0) {
    return json({ message: 'Holiday/FC today - skipping' })
  }

  // Default attendance close time from settings
  const { data: settings } = await supabase
    .from('settings')
    .select('attendance_close_time')
    .limit(1)
    .maybeSingle()

  const defaultClose = settings?.attendance_close_time ?? '11:00:00'

  // Per-student close time overrides that are still valid today
  const { data: overrides } = await supabase
    .from('attendance_overrides')
    .select('person_id, attendance_close_time, valid_until')
    .eq('person_type', 'student')

  const closeById = new Map<string, string>()
  for (const o of overrides ?? []) {
    if (!o.valid_until || o.valid_until >= today) {
      closeById.set(o.person_id, o.attendance_close_time)
    }
  }

  // Get all active students
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('status', 'Active')

  if (!students || students.length === 0) {
    return json({ message: 'No active students found' })
  }

  // Get students who already have attendance today
  const { data: existing } = await supabase
    .from('attendance')
    .select('student_id')
    .eq('date', today)

  const markedIds = new Set((existing || []).map(r => r.student_id))

  // Unmarked students whose own close time has already passed
  const due = students.filter(s =>
    !markedIds.has(s.id) &&
    istTimeStr >= (closeById.get(s.id) ?? defaultClose)
  )

  if (due.length === 0) {
    return json({ message: `Nobody due yet - IST time ${istTimeStr}, default close ${defaultClose}` })
  }

  // Mark them as Absent
  const inserts = due.map(s => ({
    student_id: s.id,
    date: today,
    status: 'Absent',
    marked_by: null,
  }))

  const { error } = await supabase
    .from('attendance')
    .insert(inserts)

  if (error) {
    return json({ error: error.message }, 500)
  }

  return json({ message: `Marked ${due.length} students as Absent for ${today}` })
})