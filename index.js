import express from "express";
import config from "./utils/config.js";
import cors from "cors";
import AppRoutes from "./routes/index.js";

const app = express();

app.use(cors({
  // origin: 'http://localhost:5173', // Replace with your frontend's URL
  credentials: true, // If using cookies or authorization headers
}));
app.use(express.json({ limit: "5mb" }));

app.use(AppRoutes);

app.listen(config.PORT, () =>
  console.log(`Server listening on port ${config.PORT}`)
);