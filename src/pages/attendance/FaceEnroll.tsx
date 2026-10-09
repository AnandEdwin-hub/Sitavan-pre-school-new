import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search, Camera, CheckCircle2, RefreshCw, Trash2, X, ShieldAlert,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  FACE_MODEL_ID,
  MATCH_THRESHOLD,
  loadFaceModels,
  detectFaces,
  euclideanDistance,
  faceQuality,
} from '@/lib/faceEngine';

// ---------- types & constants ----------
type PersonType = 'student' | 'staff' | 'volunteer';
type Pose = 'front' | 'right' | 'left' | 'up' | 'down' | 'burst';
type Person = { id: string; type: PersonType; code: string; name: string; sub: string };
type Captured = { pose: Pose; descriptor: number[]; quality: number };
type Dir = 'left' | 'right' | 'up' | 'down';
type Guide = { arrow: Dir | null; msg: string; tone: 'ok' | 'warn' | 'idle'; progress: number | null };

const db: any = supabase; // untyped access, so the new face_embeddings table needs no generated types

const GUIDED: { pose: Pose; title: string; hint: string }[] = [
  { pose: 'front', title: 'Look straight ahead', hint: 'Face the camera with a neutral expression' },
  { pose: 'right', title: 'Turn to your right', hint: 'Slowly turn your head toward your right shoulder' },
  { pose: 'left', title: 'Turn to your left', hint: 'Slowly turn your head toward your left shoulder' },
  { pose: 'up', title: 'Lift your chin', hint: 'Tilt your head slightly up' },
  { pose: 'down', title: 'Lower your chin', hint: 'Tilt your head slightly down' },
];

const BURST_TARGET = 6;      // frames captured for children
const MIN_TO_SAVE = 3;       // minimum captures needed to save an enrollment
const MIN_QUALITY = 0.45;
const MIN_FACE_WIDTH = 90;   // px in the video frame

const ARROW_POS: Record<Dir, string> = {
  left: 'left-3 top-1/2 -translate-y-1/2',
  right: 'right-3 top-1/2 -translate-y-1/2',
  up: 'top-3 left-1/2 -translate-x-1/2',
  down: 'bottom-14 left-1/2 -translate-x-1/2',
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// ---------- pose helpers (measured on the raw camera frame) ----------
function poseMetrics(pts: faceapi.Point[]) {
  // turn: ~0.5 facing the camera, lower = subject turned to THEIR right, higher = to their left
  const turn = (pts[30].x - pts[0].x) / (pts[16].x - pts[0].x || 1);
  // pitch: nose position between the eye line and the chin; compared against the person's own front capture
  const eyeY = (pts[36].y + pts[39].y + pts[42].y + pts[45].y) / 4;
  const pitch = (pts[30].y - eyeY) / (pts[8].y - eyeY || 1);
  return { turn, pitch };
}

function poseMatches(pose: Pose, m: { turn: number; pitch: number }, basePitch: number | null): boolean {
  const centered = m.turn > 0.36 && m.turn < 0.64;
  switch (pose) {
    case 'front': return m.turn > 0.42 && m.turn < 0.58;
    case 'right': return m.turn < 0.36;
    case 'left': return m.turn > 0.64;
    case 'up': return centered && basePitch !== null && m.pitch < basePitch - 0.06;
    case 'down': return centered && basePitch !== null && m.pitch > basePitch + 0.06;
    default: return true;
  }
}

// ---------- data helpers ----------
async function fetchAllEmbeddingRows(columns: string): Promise<any[]> {
  const rows: any[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('face_embeddings')
      .select(columns)
      .eq('model', FACE_MODEL_ID)
      .order('created_at')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

const keyOf = (type: string, id: string) => `${type}:${id}`;

// ---------- component ----------
export default function FaceEnroll() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<PersonType>('student');
  const [search, setSearch] = useState('');

  // capture session
  const [selected, setSelected] = useState<Person | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [mode, setMode] = useState<'guided' | 'burst'>('guided');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [stepIdx, setStepIdx] = useState(0);
  const [captured, setCaptured] = useState<Captured[]>([]);
  const [auto, setAuto] = useState(true);
  const [burstRunning, setBurstRunning] = useState(false);
  const [hint, setHint] = useState('');
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{ name: string } | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [flash, setFlash] = useState(false);
  const [live, setLive] = useState({ faces: 0, turn: null as number | null, pitch: null as number | null, width: 0, ok: false });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const capturingRef = useRef(false);
  const streakRef = useRef(0);
  const lastBurstRef = useRef(0);
  const baselinePitchRef = useRef<number | null>(null);
  const capturedRef = useRef<Captured[]>([]);
  const prevCountRef = useRef(0);
  const ctl = useRef({ mode, stepIdx, burstRunning, auto });
  ctl.current = { mode, stepIdx, burstRunning, auto };

  // ----- people lists (same filters the QR scanner uses) -----
  const { data: people = [] } = useQuery({
    queryKey: ['face-enroll-people'],
    queryFn: async (): Promise<Person[]> => {
      if (!isSupabaseConfigured) return [];
      const [st, sf, vo] = await Promise.all([
        db.from('students').select('id, roll_no, full_name, class, group').order('full_name'),
        db.from('staff').select('id, staff_code, full_name, designation').eq('status', 'Active').eq('attendance_required', true).order('full_name'),
        db.from('volunteers').select('id, volunteer_code, full_name, organization, school_class').order('full_name'),
      ]);
      if (st.error) throw st.error;
      if (sf.error) throw sf.error;
      if (vo.error) throw vo.error;
      return [
        ...(st.data ?? []).map((s: any): Person => ({
          id: s.id, type: 'student', code: s.roll_no || '', name: s.full_name,
          sub: `${s.class || ''} ${s.group || ''}`.trim(),
        })),
        ...(sf.data ?? []).map((s: any): Person => ({
          id: s.id, type: 'staff', code: s.staff_code || '', name: s.full_name, sub: s.designation || 'Staff',
        })),
        ...(vo.data ?? []).map((v: any): Person => ({
          id: v.id, type: 'volunteer', code: v.volunteer_code || '', name: v.full_name,
          sub: `${v.organization || 'Volunteer'}${v.school_class ? ' • ' + v.school_class : ''}`,
        })),
      ];
    },
  });

  const { data: enrolledCounts = new Map<string, number>() } = useQuery({
    queryKey: ['face-enrolled-counts'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return new Map<string, number>();
      const rows = await fetchAllEmbeddingRows('person_type, person_code');
      const map = new Map<string, number>();
      rows.forEach((r) => {
        const k = keyOf(r.person_type, r.person_code);
        map.set(k, (map.get(k) ?? 0) + 1);
      });
      return map;
    },
  });

  const peopleByKey = useMemo(() => {
    const m = new Map<string, Person>();
    people.forEach((p) => m.set(keyOf(p.type, p.id), p));
    return m;
  }, [people]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter(
      (p) => p.type === typeFilter && (!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
    );
  }, [people, typeFilter, search]);

  const enrolledInGroup = people.filter((p) => p.type === typeFilter && enrolledCounts.has(keyOf(p.type, p.id))).length;
  const totalInGroup = people.filter((p) => p.type === typeFilter).length;

  // ----- camera lifecycle -----
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setStatus('loading');
    setErrorMsg('');
    (async () => {
      try {
        await loadFaceModels();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setStatus('ready');
      } catch (e: any) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(e?.message || 'Could not start the camera. Check browser camera permission.');
        }
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [selected, facing]);

  // ----- one accurate capture -----
  const captureNow = useCallback(async (pose: Pose): Promise<boolean> => {
    const video = videoRef.current;
    if (!video || capturingRef.current) return false;
    capturingRef.current = true;
    try {
      const faces = await detectFaces(video, 'accurate');
      if (faces.length !== 1) {
        setHint(faces.length === 0 ? 'No face found' : 'Only the person being enrolled should be in the frame');
        return false;
      }
      const face = faces[0];
      const quality = faceQuality(face);
      if (quality < MIN_QUALITY) {
        setHint('Face too small or unclear: move closer or improve the lighting');
        return false;
      }
      const m = poseMetrics(face.landmarks.positions);
      if (pose !== 'burst' && !poseMatches(pose, m, baselinePitchRef.current)) {
        setHint('Pose not detected, adjust the head position');
        return false;
      }
      const descriptor = Array.from(face.descriptor);
      if (pose === 'burst') {
        const tooSimilar = capturedRef.current.some((c) => euclideanDistance(c.descriptor, descriptor) < 0.08);
        if (tooSimilar) return false; // wait for a different angle or expression
      }
      if (pose === 'front') baselinePitchRef.current = m.pitch;
      const next = [...capturedRef.current, { pose, descriptor, quality }];
      capturedRef.current = next;
      setCaptured(next);
      setHint('');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      capturingRef.current = false;
    }
  }, []);

  // ----- live detection loop (light: detector + landmarks only) -----
  useEffect(() => {
    if (!selected || status !== 'ready') return;
    const id = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || busyRef.current || capturingRef.current) return;
      busyRef.current = true;
      try {
        const res = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks();
        const c = ctl.current;
        let ok = false;
        let turn: number | null = null;
        let pitch: number | null = null;
        let width = 0;
        if (res.length === 1) {
          const m = poseMetrics(res[0].landmarks.positions);
          turn = m.turn;
          pitch = m.pitch;
          width = res[0].detection.box.width;
          const bigEnough = width >= MIN_FACE_WIDTH;
          if (c.mode === 'guided' && c.stepIdx < GUIDED.length) {
            ok = bigEnough && poseMatches(GUIDED[c.stepIdx].pose, m, baselinePitchRef.current);
          } else {
            ok = bigEnough;
          }
        }
        setLive({ faces: res.length, turn, pitch, width, ok });

        if (c.mode === 'guided' && c.auto && c.stepIdx < GUIDED.length) {
          streakRef.current = ok ? streakRef.current + 1 : 0;
          if (streakRef.current >= 4) {
            streakRef.current = 0;
            if (await captureNow(GUIDED[c.stepIdx].pose)) setStepIdx((s) => s + 1);
          }
        }
        if (
          c.mode === 'burst' && c.burstRunning && ok &&
          capturedRef.current.length < BURST_TARGET &&
          Date.now() - lastBurstRef.current > 700
        ) {
          lastBurstRef.current = Date.now();
          await captureNow('burst');
        }
      } catch (e) {
        console.error(e);
      } finally {
        busyRef.current = false;
      }
    }, 300);
    return () => window.clearInterval(id);
  }, [selected, status, captureNow]);

  // ----- success flash + vibration each time a capture is taken -----
  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = captured.length;
    if (captured.length > prev) {
      setFlash(true);
      navigator.vibrate?.(60);
      const t = window.setTimeout(() => setFlash(false), 700);
      return () => window.clearTimeout(t);
    }
    setFlash(false);
  }, [captured.length]);

  // ----- actions -----
  const openCapture = (p: Person) => {
    capturedRef.current = [];
    baselinePitchRef.current = null;
    streakRef.current = 0;
    setCaptured([]);
    setStepIdx(0);
    setBurstRunning(false);
    setConflict(null);
    setHint('');
    setConsentGiven(false);
    setGuardianName('');
    setMode(p.type === 'student' ? 'burst' : 'guided');
    setSelected(p);
  };

  const startOver = () => {
    capturedRef.current = [];
    baselinePitchRef.current = null;
    streakRef.current = 0;
    setCaptured([]);
    setStepIdx(0);
    setBurstRunning(false);
    setConflict(null);
    setHint('');
  };

  const manualCapture = async () => {
    if (stepIdx >= GUIDED.length) return;
    if (await captureNow(GUIDED[stepIdx].pose)) setStepIdx((s) => s + 1);
  };

  const saveEnrollment = async (force = false) => {
    if (selected?.type === 'student' && (!consentGiven || !guardianName.trim())) {
      toast({ variant: 'destructive', title: 'Consent needed', description: 'Tick the consent box and enter the guardian name first.' });
      return;
    }
    if (!selected) return;
    if (captured.length < MIN_TO_SAVE) {
      toast({ variant: 'destructive', title: 'Not enough captures', description: `Capture at least ${MIN_TO_SAVE} angles first.` });
      return;
    }
    setSaving(true);
    try {
      if (!force) {
        // Safety check: does this face already belong to somebody else?
        const rows = await fetchAllEmbeddingRows('person_type, person_code, embedding');
        let best = { dist: Infinity, key: '' };
        for (const row of rows) {
          if (row.person_type === selected.type && row.person_code === selected.id) continue;
          for (const c of captured) {
            const d = euclideanDistance(c.descriptor, row.embedding);
            if (d < best.dist) best = { dist: d, key: keyOf(row.person_type, row.person_code) };
          }
        }
        if (best.dist < MATCH_THRESHOLD) {
          const other = peopleByKey.get(best.key);
          setConflict({ name: other ? `${other.name} (${other.type})` : 'someone who is already enrolled' });
          return;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email ?? null;

      // find the old rows first, insert the new ones, then remove the old ones (so a failure never leaves the person with nothing)
      const { data: oldRows, error: oldErr } = await db
        .from('face_embeddings')
        .select('id')
        .eq('person_type', selected.type)
        .eq('person_code', selected.id)
        .eq('model', FACE_MODEL_ID);
      if (oldErr) throw oldErr;

      const { error: insErr } = await db.from('face_embeddings').insert(
        captured.map((c) => ({
          person_type: selected.type,
          person_code: selected.id,
          model: FACE_MODEL_ID,
          pose: c.pose,
          embedding: c.descriptor,
          quality_score: c.quality,
          enrolled_by: email,
          consent_at: selected.type === 'student' ? new Date().toISOString() : null,
          consent_given_by: selected.type === 'student' ? guardianName.trim() : null,
        }))
      );
      if (insErr) throw insErr;

      const oldIds = (oldRows ?? []).map((r: any) => r.id);
      if (oldIds.length) {
        const { error: delErr } = await db.from('face_embeddings').delete().in('id', oldIds);
        if (delErr) throw delErr;
      }

      toast({ title: 'Face enrolled', description: `${selected.name}: ${captured.length} captures saved.` });
      await queryClient.invalidateQueries({ queryKey: ['face-enrolled-counts'] });
      setSelected(null);
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Could not save', description: e?.message || 'Unknown error' });
    } finally {
      setSaving(false);
    }
  };

  const removeEnrollment = async (p: Person) => {
    if (!window.confirm(`Delete the saved face data for ${p.name}?`)) return;
    const { error } = await db
      .from('face_embeddings')
      .delete()
      .eq('person_type', p.type)
      .eq('person_code', p.id)
      .eq('model', FACE_MODEL_ID);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not delete', description: error.message });
      return;
    }
    toast({ title: 'Face data deleted', description: p.name });
    queryClient.invalidateQueries({ queryKey: ['face-enrolled-counts'] });
  };

  // ----- derived UI state -----
  const guidedDone = mode === 'guided' && stepIdx >= GUIDED.length;
  const burstDone = mode === 'burst' && captured.length >= BURST_TARGET;
  const finished = guidedDone || burstDone;
  const currentStep = mode === 'guided' && stepIdx < GUIDED.length ? GUIDED[stepIdx] : null;
  const consentOk = selected?.type !== 'student' || (consentGiven && guardianName.trim().length > 0);

  // The front camera is shown mirrored (like a mirror); the rear camera is not.
  // So "the person's right" appears on the screen's right for the front camera and on the left for the rear one.
  const toScreen = (side: 'left' | 'right'): Dir =>
    facing === 'user' ? side : side === 'left' ? 'right' : 'left';

  const getGuide = (): Guide => {
    if (live.faces === 0) return { arrow: null, msg: 'No face detected: look at the camera', tone: 'idle', progress: null };
    if (live.faces > 1) return { arrow: null, msg: 'Only one person should be in the frame', tone: 'warn', progress: null };
    if (live.width < MIN_FACE_WIDTH) return { arrow: null, msg: 'Move closer to the camera', tone: 'warn', progress: null };

    if (mode === 'burst') {
      if (!consentOk) return { arrow: null, msg: 'Complete the consent box above to begin', tone: 'warn', progress: null };
      return {
        arrow: null,
        msg: burstRunning ? 'Capturing… let the child look around' : 'Face found: press Start capturing',
        tone: 'ok',
        progress: null,
      };
    }

    if (guidedDone) return { arrow: null, msg: 'All poses captured: press Save enrollment', tone: 'ok', progress: 1 };

    const pose = GUIDED[stepIdx].pose;
    const turn = live.turn ?? 0.5;
    const pitch = live.pitch ?? 0.5;
    const base = baselinePitchRef.current;

    switch (pose) {
      case 'front':
        if (live.ok) return { arrow: null, msg: 'Perfect: hold still', tone: 'ok', progress: 1 };
        return {
          arrow: toScreen(turn < 0.5 ? 'left' : 'right'),
          msg: 'Look straight at the camera',
          tone: 'warn',
          progress: clamp01(1 - (Math.abs(turn - 0.5) - 0.08) / 0.2),
        };
      case 'right':
        if (live.ok) return { arrow: null, msg: 'Good: hold still', tone: 'ok', progress: 1 };
        return {
          arrow: toScreen('right'),
          msg: turn > 0.44 ? 'Turn your head to your right' : 'A little more to your right',
          tone: 'warn',
          progress: clamp01((0.5 - turn) / 0.14),
        };
      case 'left':
        if (live.ok) return { arrow: null, msg: 'Good: hold still', tone: 'ok', progress: 1 };
        return {
          arrow: toScreen('left'),
          msg: turn < 0.56 ? 'Turn your head to your left' : 'A little more to your left',
          tone: 'warn',
          progress: clamp01((turn - 0.5) / 0.14),
        };
      case 'up': {
        if (turn <= 0.36 || turn >= 0.64) {
          return { arrow: toScreen(turn < 0.5 ? 'left' : 'right'), msg: 'Face the camera, then lift your chin', tone: 'warn', progress: null };
        }
        if (live.ok) return { arrow: null, msg: 'Good: hold still', tone: 'ok', progress: 1 };
        const lifted = base !== null ? clamp01((base - pitch) / 0.06) : 0;
        return { arrow: 'up', msg: lifted > 0.5 ? 'A little more: lift your chin' : 'Lift your chin up', tone: 'warn', progress: lifted };
      }
      case 'down': {
        if (turn <= 0.36 || turn >= 0.64) {
          return { arrow: toScreen(turn < 0.5 ? 'left' : 'right'), msg: 'Face the camera, then lower your chin', tone: 'warn', progress: null };
        }
        if (live.ok) return { arrow: null, msg: 'Good: hold still', tone: 'ok', progress: 1 };
        const lowered = base !== null ? clamp01((pitch - base) / 0.06) : 0;
        return { arrow: 'down', msg: lowered > 0.5 ? 'A little more: lower your chin' : 'Lower your chin down', tone: 'warn', progress: lowered };
      }
      default:
        return { arrow: null, msg: 'Face detected', tone: 'ok', progress: null };
    }
  };

  const guide = getGuide();
  const ringClass = guide.tone === 'ok' ? 'border-green-400' : guide.tone === 'warn' ? 'border-amber-300' : 'border-white/50';
  const barClass = guide.tone === 'ok' ? 'bg-green-600/85' : guide.tone === 'warn' ? 'bg-amber-600/85' : 'bg-black/65';

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground" />
            <h3 className="font-bold">Admin only</h3>
            <p className="text-sm text-muted-foreground">
              Face enrollment must be done by an admin who is supervising the capture.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Face Enrollment</h2>
        <p className="text-muted-foreground text-sm">
          Pick a person, then capture their face while you watch. Staff and volunteers follow the guided poses;
          for children, hold the device at eye level and let them look around.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['student', 'staff', 'volunteer'] as PersonType[]).map((t) => (
          <Button key={t} variant={typeFilter === t ? 'default' : 'outline'} onClick={() => setTypeFilter(t)} className="capitalize">
            {t}s
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name or code" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {enrolledInGroup} / {totalInGroup} enrolled
        </p>
      </div>

      <Card>
        <div className="divide-y divide-border">
          {visible.map((p) => {
            const n = enrolledCounts.get(keyOf(p.type, p.id)) ?? 0;
            return (
              <div key={keyOf(p.type, p.id)} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="font-mono">{p.code}</span>
                    {p.sub && <> • {p.sub}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      n > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {n > 0 ? `${n} faces` : 'Not enrolled'}
                  </span>
                  <Button size="sm" variant={n > 0 ? 'outline' : 'default'} onClick={() => openCapture(p)}>
                    <Camera className="w-4 h-4 mr-1" /> {n > 0 ? 'Re-enroll' : 'Enroll'}
                  </Button>
                  {n > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => removeEnrollment(p)} aria-label="Delete face data">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {visible.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No people found.</div>
          )}
        </div>
      </Card>

      {/* ---------- capture overlay ---------- */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto p-3">
          <Card className="w-full max-w-lg mx-auto">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">
                    {selected.type} • {selected.code}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setSelected(null)} aria-label="Close">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {selected.type === 'student' && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
                  <label className="flex items-start gap-2 text-sm font-medium text-amber-900">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                    />
                    Parent/guardian has given consent for this child's face data to be stored
                  </label>
                  <Input
                    placeholder="Parent/guardian name"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                  />
                </div>
              )}

              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                  style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined }}
                />
                {status === 'loading' && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/60">
                    Loading face models and camera…
                  </div>
                )}
                {status === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/80 p-4 text-center">
                    {errorMsg}
                  </div>
                )}

                {status === 'ready' && (
                  <>
                    {/* face guide ring: white = waiting, amber = adjust, green = in position */}
                    <div
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34%] h-[78%] rounded-[50%] border-4 pointer-events-none transition-colors ${ringClass}`}
                    />

                    {/* direction arrow */}
                    {guide.arrow && (
                      <div
                        className={`absolute pointer-events-none flex items-center justify-center rounded-full w-14 h-14 bg-black/50 animate-pulse text-amber-300 ${ARROW_POS[guide.arrow]}`}
                      >
                        {guide.arrow === 'left' && <ArrowLeft className="w-9 h-9" strokeWidth={3} />}
                        {guide.arrow === 'right' && <ArrowRight className="w-9 h-9" strokeWidth={3} />}
                        {guide.arrow === 'up' && <ArrowUp className="w-9 h-9" strokeWidth={3} />}
                        {guide.arrow === 'down' && <ArrowDown className="w-9 h-9" strokeWidth={3} />}
                      </div>
                    )}

                    {/* captured flash */}
                    {flash && (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 pointer-events-none animate-in fade-in zoom-in duration-200">
                        <div className="rounded-full bg-green-500 p-4">
                          <Check className="w-14 h-14 text-white" strokeWidth={4} />
                        </div>
                      </div>
                    )}

                    {/* message + progress bar */}
                    <div className={`absolute bottom-0 inset-x-0 text-white ${barClass}`}>
                      <div className="px-3 py-2 text-sm font-semibold text-center">{guide.msg}</div>
                      {guide.progress !== null && (
                        <div className="h-1.5 bg-white/25">
                          <div className="h-full bg-white transition-all duration-200" style={{ width: `${Math.round(guide.progress * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 underline"
                  onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                >
                  <RefreshCw className="w-3 h-3" /> Switch camera ({facing === 'user' ? 'front' : 'rear'})
                </button>
                <span className="font-mono">
                  turn {live.turn?.toFixed(2) ?? '–'} • pitch {live.pitch?.toFixed(2) ?? '–'} • {Math.round(live.width)}px
                </span>
              </div>

              {hint && <p className="text-sm text-amber-600">{hint}</p>}

              {/* guided mode */}
              {mode === 'guided' && (
                <div className="space-y-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {GUIDED.map((g, i) => {
                      const done = captured.some((c) => c.pose === g.pose);
                      return (
                        <span
                          key={g.pose}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            done ? 'bg-green-100 text-green-700'
                            : i === stepIdx ? 'bg-primary text-primary-foreground'
                            : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {g.pose}
                        </span>
                      );
                    })}
                  </div>
                  {currentStep && (
                    <div>
                      <p className="text-xl font-bold">{currentStep.title}</p>
                      <p className="text-sm text-muted-foreground">{currentStep.hint}</p>
                    </div>
                  )}
                  {currentStep && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button onClick={manualCapture} disabled={status !== 'ready' || !live.ok}>
                        <Camera className="w-4 h-4 mr-1" /> Capture
                      </Button>
                      {currentStep.pose !== 'front' && (
                        <Button variant="outline" onClick={() => setStepIdx((s) => s + 1)}>
                          Skip this pose
                        </Button>
                      )}
                      <label className="text-xs flex items-center gap-1.5 ml-auto">
                        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
                        Auto-capture
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* burst mode (children) */}
              {mode === 'burst' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Hold the device at the child's eye level. Let them follow a toy or your hand so the face is
                    captured at slightly different angles.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={() => setBurstRunning((r) => !r)} disabled={status !== 'ready' || burstDone || !consentOk}>
                      {burstRunning ? 'Pause' : captured.length ? 'Resume' : 'Start capturing'}
                    </Button>
                    <span className="text-sm font-medium">
                      {captured.length} / {BURST_TARGET} captured
                    </span>
                    <button
                      type="button"
                      className="text-xs underline ml-auto"
                      onClick={() => {
                        startOver();
                        setMode('guided');
                      }}
                    >
                      Use guided poses instead
                    </button>
                  </div>
                </div>
              )}

              {/* conflict warning */}
              {conflict && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
                  <p className="font-semibold text-amber-800">This face already matches {conflict.name}.</p>
                  <p className="text-amber-700">
                    Check that you picked the right person. Siblings and twins can look very alike. If this really is
                    the right person, you can save anyway.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => saveEnrollment(true)} disabled={saving}>
                      Save anyway
                    </Button>
                    <Button size="sm" variant="ghost" onClick={startOver}>
                      Discard & start over
                    </Button>
                  </div>
                </div>
              )}

              {/* save bar */}
              <div className="flex items-center gap-2 pt-1 border-t">
                {finished && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                <Button
                  onClick={() => saveEnrollment(false)}
                  disabled={saving || captured.length < MIN_TO_SAVE || !!conflict || !consentOk}
                >
                  {saving ? 'Saving…' : finished ? 'Save enrollment' : `Save with ${captured.length} captured`}
                </Button>
                <Button variant="ghost" onClick={startOver} disabled={saving || captured.length === 0}>
                  Start over
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}