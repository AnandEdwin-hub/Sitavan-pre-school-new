import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const today = new Date().toISOString().split('T')[0]

  // Skip Sundays
  const dayOfWeek = new Date().getDay()
  if (dayOfWeek === 0) {
    return new Response(JSON.stringify({ message: 'Sunday - skipping' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Check if today is a holiday or forced closure
  const { data: holidays } = await supabase
    .from('holidays')
    .select('id')
    .eq('date', today)
    .limit(1)

  if (holidays && holidays.length > 0) {
    return new Response(JSON.stringify({ message: 'Holiday/FC today - skipping' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Get attendance close time from settings
  const { data: settings } = await supabase
    .from('settings')
    .select('attendance_close_time')
    .limit(1)
    .maybeSingle()

  const closeTime = settings?.attendance_close_time ?? '11:00:00'

  // Check if current IST time has passed the close time
  const nowUTC = new Date()
  const nowIST = new Date(nowUTC.getTime() + (5.5 * 60 * 60 * 1000))
  const istTimeStr = nowIST.toTimeString().slice(0, 8) // HH:MM:SS

  if (istTimeStr < closeTime) {
    return new Response(JSON.stringify({ 
      message: `Too early - current IST time ${istTimeStr}, close time ${closeTime}` 
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Get all active students
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('status', 'Active')

  if (!students || students.length === 0) {
    return new Response(JSON.stringify({ message: 'No active students found' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Get students who already have attendance today
  const { data: existing } = await supabase
    .from('attendance')
    .select('student_id')
    .eq('date', today)

  const markedIds = new Set((existing || []).map(r => r.student_id))

  // Find students with no record today
  const unmarked = students.filter(s => !markedIds.has(s.id))

  if (unmarked.length === 0) {
    return new Response(JSON.stringify({ message: 'All students already marked' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Mark them all as Absent
  const inserts = unmarked.map(s => ({
    student_id: s.id,
    date: today,
    status: 'Absent',
    marked_by: null,
  }))

  const { error } = await supabase
    .from('attendance')
    .insert(inserts)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ 
    message: `Marked ${unmarked.length} students as Absent for ${today}` 
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})