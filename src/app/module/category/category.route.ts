import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { CategoryController } from "./category.controller";
import { CategoryValidation } from "./category.validation";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(CategoryValidation.createCategoryZodSchema),
	CategoryController.createCategory,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	CategoryController.getAllCategories,
);

router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	CategoryController.getCategoryById,
);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(CategoryValidation.updateCategoryZodSchema),
	CategoryController.updateCategory,
);

router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	CategoryController.deleteCategory,
);

export const CategoryRoutes = router;
