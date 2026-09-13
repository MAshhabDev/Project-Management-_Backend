import z from 'zod';

const BkashInitiateZodSchema = z.object({
  organizationId: z.string('Organization ID is required' ),
  amount: z
    .number('Payment amount is required' )
    .min(10, 'Amount must be at least 10 BDT'),
});

const BkashExecuteZodSchema = z.object({
  paymentID: z.string( 'Payment ID is required' ),
  organizationId: z.string( 'Organization ID is required' ),
});

export const PaymentValidation = {
  BkashInitiateZodSchema,
  BkashExecuteZodSchema,
};