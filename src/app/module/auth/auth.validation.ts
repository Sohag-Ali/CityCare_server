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

const ForgotPasswordZodSchema = z.object({
	email: z.email(),
});

const ResetPasswordZodSchema = z.object({
	email: z.email(),
	newPassword: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")

		.regex(/[0-9]/, "Password must contain atleast 1 Number")
		.regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
	otp: z.string().length(6),
});

const CitizenEmailVerifyZodSchema = z.object({
	email: z.email("Not email!!"),
	otp: z.string().length(6),
});

const StaffActivationZodSchema = z.object({
	email: z.string().email("Invalid email format"),
	otp: z.string().length(6, "OTP must be 6 digits"),
	password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const AuthValidation = {
	citizenRegisterSchema,
	loginSchema,
	googleLoginSchema,
	ForgotPasswordZodSchema,
	ResetPasswordZodSchema,
	CitizenEmailVerifyZodSchema,
	StaffActivationZodSchema,
};
