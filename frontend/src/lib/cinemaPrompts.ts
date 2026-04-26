// Camera / lens / focal / aperture maps + prompt builder.
// Ported from Anil-matcha/Open-Generative-AI src/lib/promptUtils.js

export const CAMERA_MAP: Record<string, string> = {
  'Modular 8K Digital': 'modular 8K digital cinema camera',
  'Full-Frame Cine Digital': 'full-frame digital cinema camera',
  'Grand Format 70mm Film': 'grand format 70mm film camera',
  'Studio Digital S35': 'Super 35 studio digital camera',
  'Classic 16mm Film': 'classic 16mm film camera',
  'Premium Large Format Digital': 'premium large-format digital cinema camera',
}

export const LENS_MAP: Record<string, string> = {
  'Creative Tilt Lens': 'creative tilt lens effect',
  'Compact Anamorphic': 'compact anamorphic lens',
  'Extreme Macro': 'extreme macro lens',
  '70s Cinema Prime': '1970s cinema prime lens',
  'Classic Anamorphic': 'classic anamorphic lens',
  'Premium Modern Prime': 'premium modern prime lens',
  'Warm Cinema Prime': 'warm-toned cinema prime lens',
  'Swirl Bokeh Portrait': 'swirl bokeh portrait lens',
  'Vintage Prime': 'vintage prime lens',
  'Halation Diffusion': 'halation diffusion filter',
  'Clinical Sharp Prime': 'ultra-sharp clinical prime lens',
}

export const FOCAL_PERSPECTIVE: Record<number, string> = {
  8: 'ultra-wide perspective',
  14: 'wide-angle perspective',
  24: 'wide-angle dynamic perspective',
  35: 'natural cinematic perspective',
  50: 'standard portrait perspective',
  85: 'classic portrait perspective',
}

export const APERTURE_EFFECT: Record<string, string> = {
  'f/1.4': 'shallow depth of field, creamy bokeh',
  'f/4': 'balanced depth of field',
  'f/11': 'deep focus clarity, sharp foreground to background',
}

export const ASPECT_RATIOS = ['16:9', '21:9', '9:16', '1:1', '4:5'] as const
export const RESOLUTIONS = ['1K', '2K', '4K', '8K'] as const

export function buildCinemaPrompt(
  basePrompt: string,
  camera: string,
  lens: string,
  focalLength: number,
  aperture: string,
): string {
  const cameraDesc = CAMERA_MAP[camera] || camera
  const lensDesc = LENS_MAP[lens] || lens
  const perspective = FOCAL_PERSPECTIVE[focalLength] || ''
  const depthEffect = APERTURE_EFFECT[aperture] || ''

  const parts = [
    basePrompt,
    `shot on a ${cameraDesc}`,
    `using a ${lensDesc} at ${focalLength}mm${perspective ? ` (${perspective})` : ''}`,
    `aperture ${aperture}`,
    depthEffect,
    'cinematic lighting',
    'natural color science',
    'high dynamic range',
    'professional photography, ultra-detailed, 8K resolution',
  ]
  return parts.filter(p => p && p.trim() !== '').join(', ')
}
