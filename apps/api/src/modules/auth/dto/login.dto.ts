import { z } from 'zod';

// Los usuarios están bajo RLS: sin tenant no hay filas, así que el login lo recibe explícito.
export const loginSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(4).max(200),
});

export type LoginDto = z.infer<typeof loginSchema>;
