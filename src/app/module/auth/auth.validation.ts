import z from "zod";

const citizenRegisterSchema = z.object({
	name: z
		.string()
		.min(3, "Name must be at least 3 characters long")
		.max(50, "Name must be at most 50 characters long"),
	email: z.string().email("Email is not in correct format"),
	password: z
		.string()
		.min(6, "Password must be at least 6 characters long")
		.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
		.regex(/[a-z]/, "Password must contain at least one lowercase letter")
		.regex(/[0-9]/, "Password must contain at least one number")
		.regex(
			/[!@#$%^&*]/,
			"Password must contain at least one special character",
		),
	citizen: z
		.object({
			contactNumber: z.string().optional(),
			address: z.string().optional(),
			gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
			age: z.number().optional(),
			region: z.string().optional(),
			permanentAddress: z.string().optional(),
		})
		.optional(),
});

const loginSchema = z.object({
	email: z.email("Email is not in correct format"),
	password: z.string().min(6, "Password must be at least 6 characters long"),
});

const googleLoginSchema = z.object({
	idToken: z.string(),
});

export const AuthValidation = {
	citizenRegisterSchema,
	loginSchema,
	googleLoginSchema,
};
