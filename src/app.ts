import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cookieParser from "cookie-parser";
import cors from "cors";


export const app: Application = express();

app.use(cors({ origin: true, credentials: true }));

app.use("/api/subscription/webhook", express.raw({ type: 'application/json' }))


app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());



app.get("/", (req: Request, res: Response) => {
  res.send("Welcome To The Project Management Server");
});

// app.use(globalErrorHandler);
// app.use(notFound);