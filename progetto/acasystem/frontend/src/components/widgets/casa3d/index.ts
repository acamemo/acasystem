import type { PageKindDefinition } from '@/@types/launcher';
import { Casa3dKindPage } from '@/casa3d/Casa3dKindPage';

/** The 3D house page (ADR-0014): no widgets, one special full page. */
export const casa3dPages: PageKindDefinition[] = [
  { kind: 'casa3d', label: 'Casa 3D', Page: Casa3dKindPage },
];
