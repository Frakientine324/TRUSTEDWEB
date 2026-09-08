import { Router, type IRouter } from "express";
import healthRouter from "./health";
import apporyAppsRouter from "./appory-apps";

const router: IRouter = Router();

router.use(healthRouter);
router.use(apporyAppsRouter);

export default router;
