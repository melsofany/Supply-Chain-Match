import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import suppliersRouter from "./suppliers";
import inquiriesRouter from "./inquiries";
import quotationsRouter from "./quotations";
import purchaseOrdersRouter from "./purchase-orders";
import dashboardRouter from "./dashboard";
import priceHistoryRouter from "./price-history";
import accountingRouter from "./accounting";
import supplierRfqsRouter from "./supplier-rfqs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(suppliersRouter);
router.use(inquiriesRouter);
router.use(quotationsRouter);
router.use(purchaseOrdersRouter);
router.use(dashboardRouter);
router.use(priceHistoryRouter);
router.use(accountingRouter);
router.use(supplierRfqsRouter);

export default router;
