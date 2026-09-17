import z from "zod";

export const createAdminSchema = z.object({
	name: z.string().min(2, "Name is required").max(100),
	email: z.string().email("Invalid email format"),
	contactNumber: z.string().optional(),
	designation: z.string().optional(),
});

export const activateAdminSchema = z.object({
	email: z.string().email("Invalid email format"),
	otp: z.string().length(6, "OTP must be 6 digits"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateAdminSchema = z.object({
	name: z.string().min(2).max(100).optional(),
	contactNumber: z.string().optional(),
	designation: z.string().optional(),
});

export const AdminValidation = {
	createAdminSchema,
	activateAdminSchema,
	updateAdminSchema,
};
