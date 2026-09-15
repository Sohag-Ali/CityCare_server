import { z } from "zod";

const createDepartmentSchema = z.object({
	municipalityId: z
		.string({ message: "Municipality ID is required" })
		.uuid("Invalid Municipality ID format"),
	name: z
		.string({ message: "Department name is required" })
		.min(2, "Name must be at least 2 characters long")
		.max(100, "Name must be at most 100 characters long"),
	code: z
		.string({ message: "Department code is required" })
		.min(1, "Code must be at least 1 character long")
		.max(30, "Code must be at most 30 characters long"),
	description: z.string().optional(),
	email: z.string().email("Invalid email format").optional(),
	phone: z.string().optional(),
});

const updateDepartmentSchema = z.object({
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
	description: z.string().optional(),
	email: z.string().email("Invalid email format").optional(),
	phone: z.string().optional(),
});

export const DepartmentValidation = {
	createDepartmentSchema,
	updateDepartmentSchema,
};
