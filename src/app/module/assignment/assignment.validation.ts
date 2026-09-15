import { z } from "zod";

const assignTechnicianZodSchema = z.object({
	body: z.object({
		technicianId: z
			.string({
				message: "Technician ID is required",
			})
			.uuid("Technician ID must be a valid UUID"),
		note: z.string().optional(),
	}),
});

const acceptAssignmentZodSchema = z.object({
	body: z.object({
		note: z.string().optional(),
	}),
});

export const AssignmentValidation = {
	assignTechnicianZodSchema,
	acceptAssignmentZodSchema,
};
