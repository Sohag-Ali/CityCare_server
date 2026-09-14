import { z } from "zod";

const createMunicipalitySchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters long"),
	code: z
		.string()
		.min(2, "Code must be at least 2 characters long")
		.max(20, "Code must be at most 20 characters long"),
	country: z.string().min(2, "Country must be at least 2 characters long"),
	timezone: z.string().min(2, "Timezone must be at least 2 characters long"),
	currency: z
		.string()
		.min(2, "Currency must be at least 2 characters long")
		.max(10, "Currency must be at most 10 characters long"),
	contactEmail: z.string().email("Invalid email format").optional(),
	contactPhone: z.string().optional(),
	logoUrl: z.string().optional(),
	isActive: z.boolean().optional(),
});

const updateMunicipalitySchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters long").optional(),
	code: z
		.string()
		.min(2, "Code must be at least 2 characters long")
		.max(20, "Code must be at most 20 characters long")
		.optional(),
	country: z
		.string()
		.min(2, "Country must be at least 2 characters long")
		.optional(),
	timezone: z
		.string()
		.min(2, "Timezone must be at least 2 characters long")
		.optional(),
	currency: z
		.string()
		.min(2, "Currency must be at least 2 characters long")
		.max(10, "Currency must be at most 10 characters long")
		.optional(),
	contactEmail: z.string().email("Invalid email format").optional(),
	contactPhone: z.string().optional(),
	logoUrl: z.string().optional(),
	isActive: z.boolean().optional(),
});

export const MunicipalityValidation = {
	createMunicipalitySchema,
	updateMunicipalitySchema,
};
