import { z } from "zod";
import { ServicePriority } from "../../../generated/prisma/client";

const createServiceRequestZodSchema = z.object({
	serviceId: z
		.string({ message: "Service ID is required" })
		.uuid("Invalid service ID format"),
	title: z
		.string({ message: "Title is required" })
		.trim()
		.min(3, "Title must be at least 3 characters long")
		.max(150, "Title cannot exceed 150 characters"),
	description: z
		.string({ message: "Description is required" })
		.trim()
		.min(10, "Description must be at least 10 characters long"),
	priority: z.nativeEnum(ServicePriority).optional(),
	location: z.object({
		wardId: z
			.string({ message: "Ward ID is required" })
			.uuid("Invalid ward ID format"),
		address: z
			.string({ message: "Address is required" })
			.trim()
			.min(3, "Address must be at least 3 characters long"),
		area: z.string().trim().optional(),
		latitude: z
			.number({ message: "Latitude must be a number" })
			.min(-90, "Latitude must be between -90 and 90")
			.max(90, "Latitude must be between -90 and 90")
			.optional(),
		longitude: z
			.number({ message: "Longitude must be a number" })
			.min(-180, "Longitude must be between -180 and 180")
			.max(180, "Longitude must be between -180 and 180")
			.optional(),
	}),
	attachments: z
		.array(
			z.object({
				fileUrl: z.string().url("Invalid attachment URL"),
				filePublicId: z.string().optional(),
				fileName: z.string().optional(),
				fileType: z.string().optional(),
				fileSize: z.number().optional(),
			}),
		)
		.optional(),
});

const updateServiceRequestZodSchema = z.object({
	title: z
		.string()
		.trim()
		.min(3, "Title must be at least 3 characters long")
		.max(150, "Title cannot exceed 150 characters")
		.optional(),
	description: z
		.string()
		.trim()
		.min(10, "Description must be at least 10 characters long")
		.optional(),
	priority: z.nativeEnum(ServicePriority).optional(),
	location: z
		.object({
			wardId: z.string().uuid("Invalid ward ID format").optional(),
			address: z.string().trim().min(3).optional(),
			area: z.string().trim().optional(),
			latitude: z.number().min(-90).max(90).optional(),
			longitude: z.number().min(-180).max(180).optional(),
		})
		.optional(),
});

export const ServiceRequestValidation = {
	createServiceRequestZodSchema,
	updateServiceRequestZodSchema,
};
