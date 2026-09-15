import { z } from "zod";
import { StaffType } from "../../../generated/prisma/enums";

const createStaffSchema = z.object({
	name: z
		.string({ message: "Staff name is required" })
		.min(2, "Name must be at least 2 characters long")
		.max(100, "Name must be at most 100 characters long"),
	email: z
		.string({ message: "Email is required" })
		.email("Invalid email format"),
	departmentId: z
		.string({ message: "Department ID is required" })
		.uuid("Invalid Department ID format"),
	staffType: z.enum(
		[StaffType.OFFICER, StaffType.TECHNICIAN, StaffType.MANAGER],
		{
			message: "Invalid Staff Type. Allowed: OFFICER, TECHNICIAN, MANAGER",
		},
	),
	employeeId: z
		.string({ message: "Employee ID is required" })
		.min(2, "Employee ID must be at least 2 characters long")
		.max(30, "Employee ID must be at most 30 characters long"),
	designation: z
		.string({ message: "Designation is required" })
		.min(2, "Designation must be at least 2 characters long")
		.max(100, "Designation must be at most 100 characters long"),
	joiningDate: z
		.string({ message: "Joining date is required" })
		.refine((val) => !Number.isNaN(Date.parse(val)), {
			message: "Invalid joining date format",
		}),
	contactNumber: z.string().optional(),
});

const updateStaffSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters long")
		.max(100, "Name must be at most 100 characters long")
		.optional(),
	employeeId: z
		.string()
		.min(2, "Employee ID must be at least 2 characters long")
		.max(30, "Employee ID must be at most 30 characters long")
		.optional(),
	departmentId: z.string().uuid("Invalid Department ID format").optional(),
	staffType: z
		.enum([StaffType.OFFICER, StaffType.TECHNICIAN, StaffType.MANAGER], {
			message: "Invalid Staff Type. Allowed: OFFICER, TECHNICIAN, MANAGER",
		})
		.optional(),
	designation: z
		.string()
		.min(2, "Designation must be at least 2 characters long")
		.max(100, "Designation must be at most 100 characters long")
		.optional(),
	joiningDate: z
		.string()
		.refine((val) => !Number.isNaN(Date.parse(val)), {
			message: "Invalid joining date format",
		})
		.optional(),
	contactNumber: z.string().optional(),
	isActive: z.boolean().optional(),
});

export const StaffValidation = {
	createStaffSchema,
	updateStaffSchema,
};
