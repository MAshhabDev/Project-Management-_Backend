import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import helmet from "helmet";
import httpStatus from "http-status";
import config from "./config";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { notFound } from "./middleware/notFound";

// Module Routes Imports
import { adminRoutes } from "./module/admin/admin.route";
import { authRoutes } from "./module/auth/auth.route";
import { organizationRoutes } from "./module/organizations/organizations.route";
import { paymentRoutes } from "./module/payments/payment.route";
import { projectRoutes } from "./module/project/project.route";
import { taskRoutes } from "./module/task/task.route";
import { teamRoutes } from "./module/team/team.route";
import { userRoutes } from "./module/user/user.route";

const app: Application = express();

app.use(helmet());

app.use(
	cors({
		origin: config.frontend_url || true,
		credentials: true,
	}),
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// 4. API Endpoints Routes Mounting
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use("/api/v1/teams", teamRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/payments", paymentRoutes);

app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to Project Management SaaS System Backend",
	});
});

// 6. Error Handling Middlewares
app.use(globalErrorHandler);
app.use(notFound);

export default app;