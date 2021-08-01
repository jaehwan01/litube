import express from "express";
import {
  logout,
  see,
  startGithubLogin,
  finishGithubLogin,
  getEditProfile,
  postEditProfile,
} from "../controllers/userController";

const userRouter = express.Router();

userRouter.get("/logout", logout);
userRouter.route("/edit").get(getEditProfile).post(postEditProfile);
userRouter.get("/github/start", startGithubLogin);
userRouter.get("/github/finish", finishGithubLogin);
userRouter.get("/:id", see);

export default userRouter;
