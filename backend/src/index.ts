import "dotenv/config";
import express from "express";
import { apiKey } from "./serverClient.js";
import cors from "cors";
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);
app.get("/", (req, res) => {
  res.json({
    message: "AI writing assistant server is running",
    apikey: apiKey,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
