import { z } from "zod";

const createZoneSchema = z.object({
	municipalityId: z
		.string({ message: "Municipality ID is required" })
		.uuid("Invalid Municipality ID format"),
	name: z
		.string({ message: "Zone name is required" })
		.min(2, "Name must be at least 2 characters long")
		.max(100, "Name must be at most 100 characters long"),
	code: z
		.string({ message: "Zone code is required" })
		.min(2, "Code must be at least 2 characters long")
		.max(30, "Code must be at most 30 characters long"),
	description: z.string().optional(),
});

const updateZoneSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters long")
		.max(100, "Name must be at most 100 characters long")
		.optional(),
	code: z
		.string()
		.min(2, "Code must be at least 2 characters long")
		.max(30, "Code must be at most 30 characters long")
		.optional(),
	description: z.string().optional(),
});

export const ZoneValidation = {
	createZoneSchema,
	updateZoneSchema,
};
