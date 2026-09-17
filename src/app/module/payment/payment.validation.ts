import { z } from "zod";

const initiatePaymentValidationSchema = z.object({
	serviceRequestId: z
		.string({
			message: "Service Request ID is required",
		})
		.min(1, "Service Request ID cannot be empty"),
});

export const PaymentValidation = {
	initiatePaymentValidationSchema,
};

