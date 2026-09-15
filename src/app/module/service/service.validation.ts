import { z } from "zod";

const createServiceZodSchema = z
	.object({
		categoryId: z
			.string({ message: "Category ID is required" })
			.uuid("Invalid Category ID format"),
		name: z
			.string({ message: "Service name is required" })
			.min(2, "Service name must be at least 2 characters long")
			.max(100, "Service name must not exceed 100 characters"),
		code: z
			.string({ message: "Service code is required" })
			.min(2, "Service code must be at least 2 characters long")
			.max(50, "Service code must not exceed 50 characters"),
		description: z
			.string()
			.max(500, "Description must not exceed 500 characters")
			.optional(),
		isPaid: z.boolean().optional().default(false),
		baseFee: z
			.number()
			.min(0, "Base fee must be greater than or equal to 0")
			.optional(),
		currency: z.string().max(10, "Currency code too long").optional(),
	})
	.superRefine((data, ctx) => {
		const { isPaid, baseFee } = data;
		if (isPaid) {
			if (baseFee === undefined || baseFee === null) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Base fee is required for paid services",
					path: ["baseFee"],
				});
			}
		}
	});

const updateServiceZodSchema = z.object({
	name: z
		.string()
		.min(2, "Service name must be at least 2 characters long")
		.max(100, "Service name must not exceed 100 characters")
		.optional(),
	code: z
		.string()
		.min(2, "Service code must be at least 2 characters long")
		.max(50, "Service code must not exceed 50 characters")
		.optional(),
	description: z
		.string()
		.max(500, "Description must not exceed 500 characters")
		.optional(),
	isPaid: z.boolean().optional(),
	baseFee: z
		.number()
		.min(0, "Base fee must be greater than or equal to 0")
		.optional(),
	currency: z.string().max(10, "Currency code too long").optional(),
});

export const ServiceValidation = {
	createServiceZodSchema,
	updateServiceZodSchema,
};
