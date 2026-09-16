import { z } from "zod";
import { ServicePriority } from "../../../generated/prisma/client";

const createSlaPolicyZodSchema = z.object({
	priority: z.nativeEnum(ServicePriority, {
		message: "Valid service priority is required",
	}),
	responseTimeMinutes: z
		.number({ message: "Response time in minutes must be a number" })
		.int("Response time must be an integer")
		.positive("Response time must be greater than 0"),
	resolutionTimeMinutes: z
		.number({ message: "Resolution time in minutes must be a number" })
		.int("Resolution time must be an integer")
		.positive("Resolution time must be greater than 0"),
	isActive: z.boolean().optional(),
});

const updateSlaPolicyZodSchema = z.object({
	responseTimeMinutes: z
		.number({ message: "Response time in minutes must be a number" })
		.int("Response time must be an integer")
		.positive("Response time must be greater than 0")
		.optional(),
	resolutionTimeMinutes: z
		.number({ message: "Resolution time in minutes must be a number" })
		.int("Resolution time must be an integer")
		.positive("Resolution time must be greater than 0")
		.optional(),
	isActive: z.boolean().optional(),
});

export const SlaValidation = {
	createSlaPolicyZodSchema,
	updateSlaPolicyZodSchema,
};
