import { z } from 'zod';

export const IngestPayloadSchema = z.object({
  text: z
    .string()
    .min(5, 'Message text is too short')
    .max(2048, 'Message text exceeds 2 KB limit'),
  sender: z.string().max(64).optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
});

export const TransactionUpdateSchema = z.object({
  merchant: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  type: z.enum(['DEBIT', 'CREDIT', 'REFUND', 'TRANSFER', 'INTERNAL_TRANSFER', 'UNKNOWN']).optional(),
  amount: z.number().positive().optional(),
  is_internal_transfer: z.number().int().min(0).max(1).optional(),
});
