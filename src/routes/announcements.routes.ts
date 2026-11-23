import { Router } from "express";
import {
  list,
  getOne,
  create,
  update,
  remove,
} from "../controllers/announcements.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  idParamSchema,
  listQuerySchema,
} from "../validators/announcements.validator.js";

const router = Router();

router.get("/", validateQuery(listQuerySchema), list);
router.get("/:id", validateParams(idParamSchema), getOne);
router.post("/", authenticate, validateBody(createAnnouncementSchema), create);
router.patch(
  "/:id",
  authenticate,
  validateParams(idParamSchema),
  validateBody(updateAnnouncementSchema),
  update,
);
router.delete("/:id", authenticate, validateParams(idParamSchema), remove);

export default router;
