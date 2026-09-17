import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import z from "zod";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

export const validateRequest = (zodSchema: z.ZodTypeAny) => {
	return catchAsync((req: Request, res: Response, next: NextFunction) => {
		const payload = req.body ?? {};

		let target = payload;

		if (
			zodSchema instanceof z.ZodObject &&
			"body" in zodSchema.shape &&
			!("body" in payload)
		) {
			target = { body: payload };
		}

		const result = zodSchema.safeParse(target);

		if (!result.success) {
			const firstIssue = result.error.issues[0];
			const message = firstIssue ? firstIssue.message : "Validation Error";
			throw new AppError(httpStatus.BAD_REQUEST, message);
		}

		const data = result.data;
		if (data && typeof data === "object" && "body" in data) {
			req.body = data.body;
		} else {
			req.body = data;
		}

		next();
	});
};

