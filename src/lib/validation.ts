import { z } from 'zod';

export const checkInSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name too long'),
  teamName: z
    .string({ required_error: 'Team name is required' })
    .min(2, 'Team name required')
    .max(100, 'Team name too long'),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  consentMarketing: z.boolean().optional()
});

export type CheckInFormValues = z.infer<typeof checkInSchema>;
