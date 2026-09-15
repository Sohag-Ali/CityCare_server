import { z } from "zod";

const createWardSchema = z.object({
	municipalityId: z
		.string({ message: "Municipality ID is required" })
		.uuid("Invalid Municipality ID format"),
	zoneId: z
		.string({ message: "Zone ID is required" })
		.uuid("Invalid Zone ID format"),
	name: z
		.string({ message: "Ward name is required" })
		.min(2, "Name must be at least 2 characters long")
		.max(100, "Name must be at most 100 characters long"),
	code: z
		.string({ message: "Ward code is required" })
		.min(1, "Code must be at least 1 character long")
		.max(30, "Code must be at most 30 characters long"),
	wardNumber: z
		.number({ message: "Ward number is required" })
		.int("Ward number must be an integer")
		.positive("Ward number must be a positive integer"),
	description: z.string().optional(),
});

const updateWardSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters long")
		.max(100, "Name must be at most 100 characters long")
		.optional(),
	code: z
		.string()
		.min(1, "Code must be at least 1 character long")
		.max(30, "Code must be at most 30 characters long")
		.optional(),
	wardNumber: z
		.number()
		.int("Ward number must be an integer")
		.positive("Ward number must be a positive integer")
		.optional(),
	description: z.string().optional(),
});

export const WardValidation = {
	createWardSchema,
	updateWardSchema,
};
