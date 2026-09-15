import { z } from "zod";

const createCategoryZodSchema = z.object({
	departmentId: z
		.string({ message: "Department ID is required" })
		.uuid("Invalid Department ID format"),
	name: z
		.string({ message: "Category name is required" })
		.min(2, "Category name must be at least 2 characters long")
		.max(100, "Category name must not exceed 100 characters"),
	code: z
		.string({ message: "Category code is required" })
		.min(2, "Category code must be at least 2 characters long")
		.max(50, "Category code must not exceed 50 characters"),
	description: z
		.string()
		.max(500, "Description must not exceed 500 characters")
		.optional(),
});

const updateCategoryZodSchema = z.object({
	name: z
		.string()
		.min(2, "Category name must be at least 2 characters long")
		.max(100, "Category name must not exceed 100 characters")
		.optional(),
	code: z
		.string()
		.min(2, "Category code must be at least 2 characters long")
		.max(50, "Category code must not exceed 50 characters")
		.optional(),
	description: z
		.string()
		.max(500, "Description must not exceed 500 characters")
		.optional(),
});

export const CategoryValidation = {
	createCategoryZodSchema,
	updateCategoryZodSchema,
};
