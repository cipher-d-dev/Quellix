import express from "express";
import authRoutes from "./routes/auth.ts";
import { baseHTMLResponse } from "./constants/responseConstants.ts";

const app = express();
const PORT = process.env.PORT || 8080;

// API ROUTES
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.status(200).send(baseHTMLResponse);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
