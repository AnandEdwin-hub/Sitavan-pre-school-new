import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RefreshCw, CalendarOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { STATUS_CODE, PersonRole } from '@/types/database';
import {
  loadFaceModels,
  detectFaces,
  euclideanDistance,
  MATCH_THRESHOLD,
  FACE_MODEL_ID,
  detectFacesLight,
  type LightFace,
} from '@/lib/faceEngine';

type KioskFace = LightFace & { descriptor?: Float32Array };

// ---- Same defaults as Scan.tsx ----
const DEFAULT_START_TIME = '09:00';
const DEFAULT_LATE_MINS = 5;
const DEFAULT_VERY_LATE_MINS = 10;

// ---- Kiosk tuning ----
const CONFIRM_FRAMES = 3;      // consecutive frames with the same match before we accept
const MATCH_MARGIN = 0.08;     // best match must beat the 2nd best person by at least this
const MIN_FACE_PX = 70;        // faces narrower than this (in video pixels) are ignored
const MISS_FRAMES = 3;         // frames of no-match before a track forgets its person
const TRACK_TTL_MS = 1500;     // drop a track if its face disappears this long
const COOLDOWN_MS = 60_000;    // don't re-process the same person within this time

type KioskPerson = {
  id: string;
  code: string;
  full_name: string;
  subtitle: string;
  role: PersonRole;
};

type GalleryPerson = {
  key: string;
  person: KioskPerson;
  descriptors: Float32Array[];
};

type Track = {
  id: number;
  box: { x: number; y: number; width: number; height: number };
  lastSeen: number;
  candidateKey: string | null;
  candidate: GalleryPerson | null;
  hits: number;
  misses: number;
  confirmedKey: string | null;
  confirmedName: string;
  statusText: string;
  lastKind: 'small' | 'outside' | 'unknown' | 'ambiguous' | 'match';
  label: string;
  color: string;
  live?: { key: string; base: number; closed: boolean; blinked: boolean; ear?: number; dt?: number; t?: number; min?: number; minT?: number };
};

type FeedItem = {
  id: string;
  name: string;
  role: PersonRole;
  code: string;
  status: string;
  time: string;
  kind: 'recorded' | 'already' | 'test' | 'blocked' | 'error';
};

type Groups = { student: boolean; staff: boolean; volunteer: boolean };

// ---- Liveness: blink check ----
// Roles that must blink once before attendance is recorded. Students are skipped (low spoof risk).
const LIVENESS_ROLES: PersonRole[] = ['staff', 'volunteer'];

// Eye aspect ratio from the 68 landmarks: about 0.25-0.35 with eyes open, much lower when closed.
function eyeAspectRatio(face: LightFace): number {
  const p = face.landmarks.positions;
  const ear = (a: number) => {
    const d = (i: number, j: number) => Math.hypot(p[a + i].x - p[a + j].x, p[a + i].y - p[a + j].y);
    return (d(1, 5) + d(2, 4)) / (2 * d(0, 3));
  };
  return (ear(36) + ear(42)) / 2;
}

// Return 'pass' to allow attendance, 'fail' to block, 'pending' to wait another frame.
function checkLiveness(
  track: Track,
  face: LightFace,
  _video: HTMLVideoElement
): 'pass' | 'fail' | 'pending' {
  const role = track.candidate?.person.role;
  if (!role || !LIVENESS_ROLES.includes(role)) return 'pass';

  const key = track.candidateKey;
  if (!key) return 'pending';
  if (!track.live || track.live.key !== key) {
    track.live = { key, base: 0, closed: false, blinked: false };
  }
  const live = track.live;
  if (live.blinked) return 'pass';

  const ear = eyeAspectRatio(face);
  const nowMs = performance.now();
  live.dt = live.t ? Math.round(nowMs - live.t) : 0;
  live.t = nowMs;
  live.ear = ear;
  if (!live.minT || nowMs - live.minT > 3000) {
    live.min = ear;
    live.minT = nowMs;
  } else {
    live.min = Math.min(live.min ?? ear, ear);
  }
  live.base = Math.max(ear, live.base * 0.98); // recent "eyes open" level
  if (live.base < 0.2) return 'pending'; // eyes not clearly visible yet

  if (ear < live.base * 0.90) {
    live.closed = true; // eyelids dropped
  } else if (live.closed && ear > live.base * 0.93) {
    live.blinked = true; // eyelids back up: one full blink
  }
  return live.blinked ? 'pass' : 'pending';
}

export default function FaceKiosk() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const today = new Date();
  const todayDateStr = format(today, 'yyyy-MM-dd');
  const isSunday = today.getDay() === 0;

  // ---------- UI state ----------
  const [camState, setCamState] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
  const [camError, setCamError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [videoAspect, setVideoAspect] = useState('16 / 9');
  const [groups, setGroups] = useState<Groups>({ student: true, staff: true, volunteer: true });
  const [testMode, setTestMode] = useState(true);
  const [faceCount, setFaceCount] = useState(0);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [galleryCounts, setGalleryCounts] = useState<Record<keyof Groups, number>>({
    student: 0, staff: 0, volunteer: 0,
  });

  // ---------- Refs used inside the camera loop ----------
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopTokenRef = useRef(0);
  const tracksRef = useRef<Track[]>([]);
  const nextTrackIdRef = useRef(1);
  const galleryRef = useRef<GalleryPerson[]>([]);
  const cooldownRef = useRef<Map<string, number>>(new Map());
  const statusTextByKeyRef = useRef<Map<string, string>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());
  const markedRef = useRef<Set<string>>(new Set());

  const groupsRef = useRef(groups);
  const testModeRef = useRef(testMode);
  const isAdminRef = useRef(isAdmin);
  const toastRef = useRef(toast);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  useEffect(() => { testModeRef.current = testMode; }, [testMode]);
  useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  // ---------- Data (same sources as Scan.tsx) ----------
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return null;
      const { data, error } = await supabase.from('settings').select('*').order('id').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['attendance-overrides'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data, error } = await supabase.from('attendance_overrides').select('*');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: todayHoliday } = useQuery({
    queryKey: ['holiday-today', todayDateStr],
    queryFn: async () => {
      if (!isSupabaseConfigured) return null;
      const { data, error } = await supabase.from('holidays').select('*').eq('date', todayDateStr).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [], isSuccess: studentsLoaded } = useQuery({
    queryKey: ['students-kiosk'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, roll_no, full_name, class, group')
        .eq('status', 'Active');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: staff = [], isSuccess: staffLoaded } = useQuery({
    queryKey: ['staff-scan'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data, error } = await supabase
        .from('staff')
        .select('id, staff_code, full_name, designation')
        .eq('status', 'Active')
        .eq('attendance_required', true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: volunteers = [], isSuccess: volunteersLoaded } = useQuery({
    queryKey: ['volunteers-kiosk'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data, error } = await supabase
        .from('volunteers')
        .select('id, volunteer_code, full_name, organization, school_class')
        .eq('status', 'Active');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: todayAttendance = [], refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase
        .from('attendance').select('*').eq('date', todayDateStr).order('scanned_at', { ascending: false });
      return data || [];
    },
  });

  const { data: todayStaffAttendance = [], refetch: refetchStaffAttendance } = useQuery({
    queryKey: ['staff-attendance-today'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase
        .from('staff_attendance').select('*').eq('date', todayDateStr).order('scanned_in_at', { ascending: false });
      return data || [];
    },
  });

  // Face embeddings, loaded in pages of 1000 (Supabase row limit)
  const {
    data: embeddingRows = [],
    refetch: refetchEmbeddings,
    isFetching: embeddingsFetching,
    isSuccess: embeddingsLoaded,
  } = useQuery({
    queryKey: ['face-embeddings-kiosk'],
    queryFn: async () => {
      const rows: any[] = [];
      const PAGE = 1000;
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from('face_embeddings')
          .select('person_type, person_code, embedding')
          .eq('model', FACE_MODEL_ID)
          .order('id')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }
      return rows;
    },
  });

  // ---------- Closure (holiday / Sunday) ----------
  const closureReason: 'Weekly Holiday' | 'Forced Closure' | 'Holiday' | null = todayHoliday
    ? todayHoliday.type === 'Forced Closure' ? 'Forced Closure' : 'Holiday'
    : isSunday ? 'Weekly Holiday'
    : null;

  // ---------- Ref mirrors (so the camera loop never reads stale state) ----------
  const settingsRef = useRef<any>(settings);
  const overridesRef = useRef<any[]>(overrides);
  const todayAttendanceRef = useRef<any[]>(todayAttendance);
  const todayStaffAttendanceRef = useRef<any[]>(todayStaffAttendance);
  const closureRef = useRef(closureReason);
  const readyRef = useRef(false);
  const refetchAttendanceRef = useRef(refetchAttendance);
  const refetchStaffAttendanceRef = useRef(refetchStaffAttendance);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { overridesRef.current = overrides; }, [overrides]);
  useEffect(() => { todayAttendanceRef.current = todayAttendance; }, [todayAttendance]);
  useEffect(() => { todayStaffAttendanceRef.current = todayStaffAttendance; }, [todayStaffAttendance]);
  useEffect(() => { closureRef.current = closureReason; }, [closureReason]);
  refetchAttendanceRef.current = refetchAttendance;
  refetchStaffAttendanceRef.current = refetchStaffAttendance;

  const directoryLoaded = studentsLoaded && staffLoaded && volunteersLoaded;
  useEffect(() => {
    readyRef.current = directoryLoaded && embeddingsLoaded && (!isSupabaseConfigured || !!settings);
  }, [directoryLoaded, embeddingsLoaded, settings]);

  // Reload at midnight so "today" never goes stale on a kiosk left running
  useEffect(() => {
    const reloadIfNewDay = () => {
      if (format(new Date(), 'yyyy-MM-dd') !== todayDateStr) window.location.reload();
    };
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 5, 0);
    const timer = setTimeout(reloadIfNewDay, nextMidnight.getTime() - Date.now());
    document.addEventListener('visibilitychange', reloadIfNewDay);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', reloadIfNewDay);
    };
  }, [todayDateStr]);

  // ---------- Build the in-memory face gallery ----------
  // Only people who are in the active directory make it in. Directors/advisers
  // (attendance_required = false) and resigned staff are never in `staff`, so they drop out here.
  useEffect(() => {
    const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));
    const staffMap = new Map<string, any>(staff.map((s: any) => [s.id, s]));
    const volunteerMap = new Map<string, any>(volunteers.map((v: any) => [v.id, v]));

    const map = new Map<string, GalleryPerson>();
    for (const r of embeddingRows) {
      let person: KioskPerson | null = null;
      if (r.person_type === 'student') {
        const s = studentMap.get(r.person_code);
        if (s) {
          person = {
            id: s.id,
            code: s.roll_no,
            full_name: s.full_name,
            subtitle: `${s.class || ''} ${s.group || ''}`.trim(),
            role: 'student',
          };
        }
      } else if (r.person_type === 'staff') {
        const s = staffMap.get(r.person_code);
        if (s) {
          person = {
            id: s.id,
            code: s.staff_code,
            full_name: s.full_name,
            subtitle: s.designation || 'Staff',
            role: 'staff',
          };
        }
      } else if (r.person_type === 'volunteer') {
        const v = volunteerMap.get(r.person_code);
        if (v) {
          person = {
            id: v.id,
            code: v.volunteer_code,
            full_name: v.full_name,
            subtitle: `${v.organization || 'Volunteer'}${v.school_class ? ' • ' + v.school_class : ''}`,
            role: 'volunteer',
          };
        }
      }
      if (!person) continue;

      const key = `${person.role}:${person.id}`;
      let g = map.get(key);
      if (!g) {
        g = { key, person, descriptors: [] };
        map.set(key, g);
      }
      g.descriptors.push(Float32Array.from(r.embedding as number[]));
    }

    const list = Array.from(map.values());
    galleryRef.current = list;
    setGalleryCounts({
      student: list.filter((g) => g.person.role === 'student').length,
      staff: list.filter((g) => g.person.role === 'staff').length,
      volunteer: list.filter((g) => g.person.role === 'volunteer').length,
    } as any);
  }, [embeddingRows, students, staff, volunteers]);

  // ---------- Timing rules (copied from Scan.tsx) ----------
  const getTimingForRole = (role: PersonRole, personId?: string) => {
    const s = settingsRef.current;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const override = personId
      ? overridesRef.current.find((o: any) =>
          o.person_type === role &&
          o.person_id === personId &&
          (!o.valid_until || o.valid_until >= todayStr))
      : undefined;
    if (override) {
      return {
        startTime: String(override.start_time).slice(0, 5),
        lateMins: override.late_threshold_minutes,
        veryLateMins: override.very_late_threshold_minutes,
      };
    }
    if (role === 'staff') {
      return {
        startTime: s?.staff_start_time?.slice(0, 5) || DEFAULT_START_TIME,
        lateMins: s?.staff_late_threshold_minutes ?? DEFAULT_LATE_MINS,
        veryLateMins: s?.staff_very_late_threshold_minutes ?? DEFAULT_VERY_LATE_MINS,
      };
    }
    if (role === 'volunteer') {
      return {
        startTime: s?.volunteer_start_time?.slice(0, 5) || DEFAULT_START_TIME,
        lateMins: s?.volunteer_late_threshold_minutes ?? DEFAULT_LATE_MINS,
        veryLateMins: s?.volunteer_very_late_threshold_minutes ?? DEFAULT_VERY_LATE_MINS,
      };
    }
    return {
      startTime: s?.school_start_time?.slice(0, 5) || DEFAULT_START_TIME,
      lateMins: s?.late_threshold_minutes ?? DEFAULT_LATE_MINS,
      veryLateMins: s?.very_late_threshold_minutes ?? DEFAULT_VERY_LATE_MINS,
    };
  };

  const getStatusForTime = (role: PersonRole, personId?: string): 'Present' | 'Late' | 'Very Late' => {
    const { startTime, lateMins, veryLateMins } = getTimingForRole(role, personId);
    const now = new Date();
    const [startHour, startMin] = startTime.split(':').map(Number);
    const minsPastStart = now.getHours() * 60 + now.getMinutes() - (startHour * 60 + startMin);
    if (minsPastStart <= lateMins) return 'Present';
    if (minsPastStart <= veryLateMins) return 'Late';
    return 'Very Late';
  };

  // ---------- Face matching ----------
  // Compare against EVERYONE enrolled (so a staff member is never mistaken for a student),
  // then only accept if the winner belongs to a selected group.
  const matchFace = (descriptor: Float32Array) => {
    let best: GalleryPerson | null = null;
    let bestD = Infinity;
    let secondD = Infinity;
    for (const g of galleryRef.current) {
      let d = Infinity;
      for (const e of g.descriptors) {
        const x = euclideanDistance(descriptor, e);
        if (x < d) d = x;
      }
      if (d < bestD) {
        secondD = bestD;
        bestD = d;
        best = g;
      } else if (d < secondD) {
        secondD = d;
      }
    }
    if (!best || bestD >= MATCH_THRESHOLD) return { kind: 'unknown' as const, g: null, dist: bestD };
    if (secondD - bestD < MATCH_MARGIN) return { kind: 'ambiguous' as const, g: null, dist: bestD };
    if (!groupsRef.current[best.person.role]) return { kind: 'outside' as const, g: null, dist: bestD };
    return { kind: 'match' as const, g: best, dist: bestD };
  };

  const pushFeed = (item: Omit<FeedItem, 'id' | 'time'>) => {
    setFeed((prev) =>
      [{ ...item, id: `${Date.now()}-${Math.random()}`, time: new Date().toISOString() }, ...prev].slice(0, 12)
    );
  };

  // ---------- Record attendance (same rules as Scan.tsx) ----------
  const confirmPerson = async (g: GalleryPerson, track: Track) => {
    const key = g.key;
    const person = g.person;
    const now = Date.now();

    const setText = (text: string) => {
      track.statusText = text;
      statusTextByKeyRef.current.set(key, text);
    };

    if (inFlightRef.current.has(key)) return;
    const last = cooldownRef.current.get(key);
    if (last && now - last < COOLDOWN_MS) {
      track.statusText = statusTextByKeyRef.current.get(key) ?? '';
      return;
    }
    cooldownRef.current.set(key, now);
    inFlightRef.current.add(key);

    try {
      if (closureRef.current && !testModeRef.current) {
        setText('School closed');
        return;
      }

      if (person.role === 'staff' && !isAdminRef.current) {
        setText('Admin only');
        pushFeed({ name: person.full_name, role: person.role, code: person.code, status: 'Admin only', kind: 'blocked' });
        return;
      }

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const alreadyLogged =
        markedRef.current.has(key) ||
        (person.role === 'student'
          ? todayAttendanceRef.current.some((a: any) => a.student_id === person.id)
          : todayStaffAttendanceRef.current.some(
              (a: any) => a.person_id === person.id && a.person_type === person.role
            ));
      if (alreadyLogged) {
        setText('Already marked');
        pushFeed({ name: person.full_name, role: person.role, code: person.code, status: 'Already marked', kind: 'already' });
        return;
      }

      const status = getStatusForTime(person.role, person.id);
      const code = STATUS_CODE[status] || status;

      if (testModeRef.current) {
        setText(`TEST ${code}`);
        pushFeed({ name: person.full_name, role: person.role, code: person.code, status, kind: 'test' });
        return;
      }

      const nowIso = new Date().toISOString();
      if (isSupabaseConfigured) {
        if (person.role === 'student') {
          const { error } = await supabase.from('attendance').upsert(
            { student_id: person.id, date: todayStr, status, scanned_at: nowIso },
            { onConflict: 'student_id,date' }
          );
          if (error) throw error;
          refetchAttendanceRef.current();
        } else {
          const { error } = await supabase.from('staff_attendance').upsert(
            { person_id: person.id, person_type: person.role, date: todayStr, status, scanned_in_at: nowIso },
            { onConflict: 'person_id,person_type,date' }
          );
          if (error) throw error;
          refetchStaffAttendanceRef.current();
        }
      }
      markedRef.current.add(key);
      setText(code);
      pushFeed({ name: person.full_name, role: person.role, code: person.code, status, kind: 'recorded' });
    } catch (err) {
      console.error(err);
      cooldownRef.current.delete(key); // allow a retry
      setText('Save failed');
      pushFeed({ name: person.full_name, role: person.role, code: person.code, status: 'Save failed', kind: 'error' });
      toastRef.current({ variant: 'destructive', title: 'Save failed', description: `Could not record attendance for ${person.full_name}` });
    } finally {
      inFlightRef.current.delete(key);
    }
  };

  // ---------- Per-frame tracking ----------
  const updateTrack = (t: Track, face: KioskFace, video: HTMLVideoElement) => {
    if (t.box.width < MIN_FACE_PX) {
      t.lastKind = 'small';
      t.candidateKey = null;
      t.candidate = null;
      t.hits = 0;
    } else {
      const res = face.descriptor ? matchFace(face.descriptor) : null;
      if (!res) {
        // fast frame: no new descriptor, keep the current identity state
      } else if (res.kind === 'match' && res.g) {
        t.misses = 0;
        t.lastKind = 'match';
        if (t.candidateKey === res.g.key) {
          t.hits++;
        } else {
          t.candidateKey = res.g.key;
          t.candidate = res.g;
          t.hits = 1;
        }
      } else {
        t.lastKind = res.kind;
        t.misses++;
        if (t.misses >= MISS_FRAMES) {
          t.candidateKey = null;
          t.candidate = null;
          t.hits = 0;
          t.confirmedKey = null;
          t.statusText = '';
        }
      }

      if (
        t.candidate &&
        t.candidateKey &&
        t.hits >= CONFIRM_FRAMES &&
        t.confirmedKey !== t.candidateKey &&
        readyRef.current
      ) {
        const live = checkLiveness(t, face, video);
        if (live === 'pass') {
          t.confirmedKey = t.candidateKey;
          t.confirmedName = t.candidate.person.full_name;
          t.statusText = '';
          void confirmPerson(t.candidate, t);
        }
        // 'fail' / 'pending' handled in step 5 (liveness)
      }
    }

    // Label + colour for the overlay
    if (t.confirmedKey && t.candidateKey === t.confirmedKey) {
      t.label = t.confirmedName;
      t.color = '#16a34a';
    } else if (t.candidateKey) {
      t.label =
        t.live && t.live.key === t.candidateKey && !t.live.blinked && t.hits >= CONFIRM_FRAMES
          ? 'Blink a few times'
          : 'Recognising…';
      t.color = '#d97706';
    } else if (t.lastKind === 'small') {
      t.label = 'Come closer';
      t.color = '#6b7280';
    } else if (t.lastKind === 'outside') {
      t.label = 'Not in this group';
      t.color = '#6b7280';
    } else if (t.lastKind === 'ambiguous') {
      t.label = 'Checking…';
      t.color = '#d97706';
    } else {
      t.label = 'Unknown';
      t.color = '#dc2626';
    }
  };

  const drawTrack = (ctx: CanvasRenderingContext2D, t: Track, fontPx: number) => {
    const { x, y, width, height } = t.box;
    ctx.lineWidth = Math.max(3, fontPx / 6);
    ctx.strokeStyle = t.color;
    ctx.strokeRect(x, y, width, height);

    const text = t.statusText ? `${t.label} • ${t.statusText}` : t.label;
    ctx.font = `bold ${fontPx}px sans-serif`;
    const tw = ctx.measureText(text).width + 12;
    const th = fontPx + 10;
    const ty = y - th >= 0 ? y - th : y + height;
    ctx.fillStyle = t.color;
    ctx.fillRect(x, ty, tw, th);
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 6, ty + th / 2);
  };

  const processFrame = (faces: KioskFace[], video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    const tracks = tracksRef.current;
    const used = new Set<number>();
    const fontPx = Math.max(16, Math.round(canvas.width / 50));

    for (const face of faces) {
      const b = face.detection.box;
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;

      let track: Track | null = null;
      let bestDist = Infinity;
      for (const t of tracks) {
        if (used.has(t.id)) continue;
        const d = Math.hypot(cx - (t.box.x + t.box.width / 2), cy - (t.box.y + t.box.height / 2));
        if (d < bestDist && d < Math.max(b.width, b.height) * 0.8) {
          bestDist = d;
          track = t;
        }
      }
      if (!track) {
        track = {
          id: nextTrackIdRef.current++,
          box: { x: b.x, y: b.y, width: b.width, height: b.height },
          lastSeen: now,
          candidateKey: null,
          candidate: null,
          hits: 0,
          misses: 0,
          confirmedKey: null,
          confirmedName: '',
          statusText: '',
          lastKind: 'unknown',
          label: '',
          color: '#6b7280',
        };
        tracks.push(track);
      }
      used.add(track.id);
      track.box = { x: b.x, y: b.y, width: b.width, height: b.height };
      track.lastSeen = now;

      updateTrack(track, face, video);
      drawTrack(ctx, track, fontPx);
    }

    tracksRef.current = tracks.filter((t) => now - t.lastSeen < TRACK_TTL_MS);
    setFaceCount(faces.length);
  };

  // ---------- Camera ----------
  const detectLoop = async (token: number) => {
    let frameNo = 0;
    const FULL_EVERY = 6; // full descriptor pass at least every 6th frame
    while (loopTokenRef.current === token) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const needFull =
            frameNo++ % FULL_EVERY === 0 ||
            tracksRef.current.length === 0 ||
            tracksRef.current.some((t) => !t.candidateKey);
          const faces: KioskFace[] = needFull
            ? await detectFaces(video, 'fast')
            : await detectFacesLight(video);
          if (loopTokenRef.current !== token) break;
          processFrame(faces, video, canvas);
        } catch (e) {
          console.error('Detection error', e);
        }
      }
      await new Promise((r) => setTimeout(r, 40));
    }
  };

  const stopCamera = (updateState = true) => {
    loopTokenRef.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    tracksRef.current = [];
    setFaceCount(0);
    if (updateState) setCamState('idle');
  };

  const startCamera = async (facing: 'user' | 'environment' = facingMode) => {
    setCamState('starting');
    setCamError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera needs HTTPS (or localhost). Open the HTTPS link of the site.');
      }
      await loadFaceModels();
      stopCamera(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Video element missing');
      video.srcObject = stream;
      await video.play();
      tracksRef.current = [];
      const token = ++loopTokenRef.current;
      setCamState('running');
      void detectLoop(token);
    } catch (e: any) {
      console.error(e);
      setCamError(e?.message || 'Could not start the camera');
      setCamState('error');
    }
  };

  const flipCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    if (camState === 'running') void startCamera(next);
  };

  useEffect(() => {
    return () => stopCamera(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Group selection ----------
  const toggleGroup = (g: keyof Groups) => {
    setGroups({ student: false, staff: false, volunteer: false, [g]: true });
  };
  const allSelected = groups.student && groups.staff && groups.volunteer;
  const selectedEnrolled =
    (groups.student ? galleryCounts.student : 0) +
    (groups.staff ? galleryCounts.staff : 0) +
    (groups.volunteer ? galleryCounts.volunteer : 0);

  const loadingMsg = !directoryLoaded
    ? 'Loading directory…'
    : !embeddingsLoaded
    ? 'Loading enrolled faces…'
    : isSupabaseConfigured && !settings
    ? 'Loading attendance rules…'
    : null;

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
      active ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-border hover:bg-gray-50'
    }`;

  const kindClasses: Record<FeedItem['kind'], string> = {
    recorded: 'bg-green-100 text-green-700',
    already: 'bg-amber-100 text-amber-700',
    test: 'bg-blue-100 text-blue-700',
    blocked: 'bg-red-100 text-red-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Face Attendance</h2>
        <p className="text-muted-foreground">{format(today, 'EEEE, d MMMM yyyy')}</p>
      </div>

      {closureReason && (
        <Card className="border-2 border-gray-300 bg-gray-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarOff className="w-8 h-8 text-gray-500 shrink-0" />
            <p className="text-sm text-gray-600">
              {closureReason === 'Forced Closure' ? 'School closed today (forced closure).'
                : closureReason === 'Weekly Holiday' ? 'Weekly holiday (Sunday).'
                : 'Holiday today.'}{' '}
              {testMode
                ? 'Test mode is on, so recognition still runs, but nothing is saved.'
                : 'Attendance is disabled for the day.'}
            </p>
          </CardContent>
        </Card>
      )}

      <div
        className={`rounded-lg px-4 py-2 text-sm font-semibold text-center ${
          testMode ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
        }`}
      >
        {testMode
          ? 'TEST MODE — faces are recognised but attendance is NOT saved'
          : 'LIVE — attendance is being saved'}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Camera */}
        <div className="lg:col-span-2 space-y-3">
          <Card className="overflow-hidden border-2 border-primary/20 shadow-md">
            <div className="relative bg-black w-full" style={{ aspectRatio: videoAspect }}>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 w-full h-full"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (v.videoWidth && v.videoHeight) setVideoAspect(`${v.videoWidth} / ${v.videoHeight}`);
                }}
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
              {camState !== 'running' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white p-4 text-center">
                  {camState === 'starting' && <p>Loading face models and starting camera…</p>}
                  {camState === 'idle' && <p>Camera is off</p>}
                  {camState === 'error' && <p className="text-red-300">{camError}</p>}
                </div>
              )}
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            {camState !== 'running' ? (
              <Button onClick={() => startCamera()} disabled={camState === 'starting'}>
                <Camera className="w-4 h-4 mr-2" /> Start camera
              </Button>
            ) : (
              <Button variant="outline" onClick={() => stopCamera()}>
                <CameraOff className="w-4 h-4 mr-2" /> Stop camera
              </Button>
            )}
            <Button variant="outline" onClick={flipCamera} disabled={camState === 'starting'}>
              <RefreshCw className="w-4 h-4 mr-2" /> {facingMode === 'user' ? 'Front camera' : 'Back camera'}
            </Button>
            <span className="text-sm text-muted-foreground ml-auto">
              {camState === 'running' ? `${faceCount} face${faceCount === 1 ? '' : 's'} in view` : ''}
            </span>
          </div>
        </div>

        {/* Controls + feed */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Who to scan</p>
              <div className="flex flex-wrap gap-2">
                <button className={chip(allSelected)} onClick={() => setGroups({ student: true, staff: true, volunteer: true })}>
                  Everyone
                </button>
                <button className={chip(!allSelected && groups.student)} onClick={() => toggleGroup('student')}>
                  Students
                </button>
                <button className={chip(!allSelected && groups.staff)} onClick={() => toggleGroup('staff')}>
                  Staff
                </button>
                <button className={chip(!allSelected && groups.volunteer)} onClick={() => toggleGroup('volunteer')}>
                  Volunteers
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enrolled: {galleryCounts.student} students, {galleryCounts.staff} staff, {galleryCounts.volunteer} volunteers
                {selectedEnrolled === 0 && embeddingsLoaded ? ' — nobody enrolled in the selected group' : ''}
              </p>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
                  Test mode (don't save attendance)
                </label>
                <Button variant="outline" size="sm" onClick={() => refetchEmbeddings()} disabled={embeddingsFetching}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${embeddingsFetching ? 'animate-spin' : ''}`} /> Reload faces
                </Button>
              </div>
              {loadingMsg && <p className="text-xs text-amber-700">{loadingMsg}</p>}
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              This session ({feed.length})
            </h3>
            <Card>
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {feed.map((f) => (
                  <div key={f.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{f.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {f.code} • {f.role}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${kindClasses[f.kind]}`}>
                        {f.kind === 'test' ? `TEST ${f.status}` : f.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(f.time), 'hh:mm:ss a')}</p>
                    </div>
                  </div>
                ))}
                {feed.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">No faces confirmed yet.</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}