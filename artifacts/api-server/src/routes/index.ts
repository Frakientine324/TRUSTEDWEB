import { Router, type IRouter } from "express";
import healthRouter from "./health";
import apporyAppsRouter from "./appory-apps";
import apporyBuyViaContactsRouter from "./appory-buy-via-contacts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(apporyAppsRouter);
router.use(apporyBuyViaContactsRouter);

export default router;
