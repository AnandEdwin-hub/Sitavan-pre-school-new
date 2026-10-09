import * as faceapi from '@vladmandic/face-api';

// Stored with every embedding, so we can re-enroll cleanly if we switch models later.
export const FACE_MODEL_ID = 'face-api-128';

// Euclidean distance between two 128-d descriptors. Lower = more similar.
// 0.6 is the library default; 0.5 is stricter. We'll tune this with real test data.
export const MATCH_THRESHOLD = 0.5;

const MODEL_URL = '/models';
let loadPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        await faceapi.tf.setBackend('webgl');
      } catch {
        // fall back to whatever backend TensorFlow picks (slower, but works)
      }
      await faceapi.tf.ready();
      console.log('face-api backend:', faceapi.tf.getBackend());
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    })().catch((err) => {
      loadPromise = null; // allow retry after a failure
      throw err;
    });
  }
  return loadPromise;
}

export type FaceInput = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

// 'fast' = tiny detector (kiosk, phones). 'accurate' = SSD (enrollment, photos).
export async function detectFaces(input: FaceInput, mode: 'fast' | 'accurate' = 'fast') {
  const options =
    mode === 'fast'
      ? new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
      : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

  return faceapi.detectAllFaces(input, options).withFaceLandmarks().withFaceDescriptors();
}

export type DetectedFace = Awaited<ReturnType<typeof detectFaces>>[number];

// Fast pass: face box + landmarks only (no 128-d descriptor). Used for blink checks between full passes.
export async function detectFacesLight(input: FaceInput) {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  return faceapi.detectAllFaces(input, options).withFaceLandmarks();
}

export type LightFace = Awaited<ReturnType<typeof detectFacesLight>>[number];

export function euclideanDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// Head turn estimate from the 68 landmarks: returns about 0.5 when facing the camera,
// lower or higher when turned. Which direction is "left" depends on whether the preview
// is mirrored, so the Enroll page will interpret the sign.
export function headTurnRatio(face: DetectedFace): number {
  const pts = face.landmarks.positions;
  const leftJaw = pts[0];
  const rightJaw = pts[16];
  const noseTip = pts[30];
  const width = rightJaw.x - leftJaw.x;
  if (width <= 0) return 0.5;
  return (noseTip.x - leftJaw.x) / width;
}

// Simple 0-1 quality score: detector confidence, boosted by face size in the frame.
export function faceQuality(face: DetectedFace): number {
  const score = face.detection.score;
  const sizeFactor = Math.min(face.detection.box.width / 120, 1); // 120px+ is considered good
  return Number((score * sizeFactor).toFixed(3));
}