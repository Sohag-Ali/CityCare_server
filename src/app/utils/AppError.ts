export class AppError extends Error {
	public statusCode: number;

	constructor(statusCode: number, message: string, stack = "") {
		super(message); // throw new Error(message)

		this.statusCode = statusCode;

		if (stack) {
			this.stack = stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

//throw new AppError(404, "Not Found")
