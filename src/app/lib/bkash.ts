import config from "../config";
import { redisClient } from "./redis";

export const getBkashIdToken = async () => {
	try {
		const IdTokenKey = "bkash:idToken";
		const RefreshTokenKey = "bkash:refreshToken";

		let bkashIdToken = await redisClient.get(IdTokenKey);
		const bkashIdTokenTTL = await redisClient.ttl(IdTokenKey);

		const bkashRefreshToken = await redisClient.get(RefreshTokenKey);
		const bkashRefreshTokenTTL = await redisClient.ttl(RefreshTokenKey);

		// console.log({
		//     bkashIdToken,
		//     bkashIdTokenTTL,
		//     bkashRefreshToken,
		//     bkashRefreshTokenTTL
		// });

		//bkash id token remaining time is less than equal 10 minutes or bkash id is expired
		// bkash refresh token must exist
		// bkash refresh token remaining time is more than 10 minutes
		if (
			(bkashIdTokenTTL <= 600 || !bkashIdToken) &&
			bkashRefreshToken &&
			bkashRefreshTokenTTL > 600
		) {
			const refreshTokenResponse = await fetch(
				`${config.bkash_base_url}/tokenized/checkout/token/refresh`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						username: config.bkash_username,
						password: config.bkash_password,
					},
					body: JSON.stringify({
						app_key: config.bkash_app_key,
						app_secret: config.bkash_app_secret,
						refresh_token: bkashRefreshToken,
					}),
				},
			);
			if (!refreshTokenResponse.ok) {
				throw new Error("Bkash Access Token Grant Failed");
			}

			const bkashRefreshTokenResult = await refreshTokenResponse.json();

			bkashIdToken = bkashRefreshTokenResult.id_token as string;

			await redisClient.set(IdTokenKey, bkashIdToken, {
				expiration: {
					type: "EX",
					value: 60 * 60,
				},
			});

			return bkashIdToken;
		}

		if (bkashIdTokenTTL > 600) {
			return bkashIdToken;
		}

		const response = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/token/grant`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					username: config.bkash_username,
					password: config.bkash_password,
				},
				body: JSON.stringify({
					app_key: config.bkash_app_key,
					app_secret: config.bkash_app_secret,
				}),
			},
		);

		if (!response.ok) {
			throw new Error("Bkash Access Token Grant Failed");
		}

		const result = await response.json();

		//bkash id token set
		await redisClient.set(IdTokenKey, result.id_token, {
			expiration: {
				type: "EX",
				value: 60 * 60, // 1hour
			},
		});

		//bkash refresh token set
		await redisClient.set(RefreshTokenKey, result.refresh_token, {
			expiration: {
				type: "EX",
				value: 60 * 60 * 24 * 28, // 28 days
			},
		});

		bkashIdToken = result.id_token;

		return bkashIdToken;
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export interface ICreateBkashPaymentPayload {
	amount: string;
	merchantInvoiceNumber: string;
	callbackURL?: string;
	intent?: string;
	currency?: string;
}

export interface IBkashCreatePaymentResponse {
	statusCode: string;
	statusMessage: string;
	paymentID: string;
	bkashURL: string;
	callbackURL: string;
	successCallbackURL: string;
	failureCallbackURL: string;
	cancelledCallbackURL: string;
	amount: string;
	intent: string;
	currency: string;
	paymentCreateTime: string;
	transactionStatus: string;
	merchantInvoiceNumber: string;
}

export interface IBkashExecutePaymentResponse {
	statusCode: string;
	statusMessage: string;
	paymentID: string;
	payerReference: string;
	customerMsisdn: string;
	trxID: string;
	amount: string;
	transactionStatus: string;
	paymentExecuteTime: string;
	currency: string;
	intent: string;
	merchantInvoiceNumber: string;
}

export interface IBkashQueryPaymentResponse {
	statusCode: string;
	statusMessage: string;
	paymentID: string;
	payerReference: string;
	customerMsisdn?: string;
	trxID?: string;
	amount: string;
	transactionStatus: string;
	paymentExecuteTime?: string;
	currency: string;
	intent: string;
	merchantInvoiceNumber: string;
}

export const createBkashPayment = async (
	payload: ICreateBkashPaymentPayload,
): Promise<IBkashCreatePaymentResponse> => {
	const idToken = await getBkashIdToken();
	if (!idToken) {
		throw new Error("Failed to obtain bKash ID token");
	}

	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/create`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				authorization: idToken,
				"x-app-key": config.bkash_app_key,
			},
			body: JSON.stringify({
				mode: "0011",
				payerReference: payload.merchantInvoiceNumber,
				callbackURL: payload.callbackURL || config.bkash_callback_url,
				amount: payload.amount,
				currency: payload.currency || "BDT",
				intent: payload.intent || "sale",
				merchantInvoiceNumber: payload.merchantInvoiceNumber,
			}),
		},
	);

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`bKash Create Payment Failed: ${errText}`);
	}

	const data: IBkashCreatePaymentResponse = await response.json();
	return data;
};

export const executeBkashPayment = async (
	paymentID: string,
): Promise<IBkashExecutePaymentResponse> => {
	const idToken = await getBkashIdToken();
	if (!idToken) {
		throw new Error("Failed to obtain bKash ID token");
	}

	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/execute`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				authorization: idToken,
				"x-app-key": config.bkash_app_key,
			},
			body: JSON.stringify({
				paymentID,
			}),
		},
	);

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`bKash Execute Payment Failed: ${errText}`);
	}

	const data: IBkashExecutePaymentResponse = await response.json();
	return data;
};

export const queryBkashPayment = async (
	paymentID: string,
): Promise<IBkashQueryPaymentResponse> => {
	const idToken = await getBkashIdToken();
	if (!idToken) {
		throw new Error("Failed to obtain bKash ID token");
	}

	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/payment/status`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				authorization: idToken,
				"x-app-key": config.bkash_app_key,
			},
			body: JSON.stringify({
				paymentID,
			}),
		},
	);

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`bKash Query Payment Failed: ${errText}`);
	}

	const data: IBkashQueryPaymentResponse = await response.json();
	return data;
};
