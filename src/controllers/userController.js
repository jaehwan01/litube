import User from "../models/User";
import Video from "../models/Video";
import fetch from "node-fetch";
import bcrypt from "bcrypt";

export const getJoin = (req, res) => res.render("join", { pageTitle: "Join" });
export const postJoin = async (req, res) => {
  const { name, username, email, password, password2, location } = req.body;
  if (password === "" || password2 === "") {
    return res.status(400).render("join", {
      pageTitle: "Join",
      errorMessagePassword: "Password is null.",
      name,
      username,
      email,
      location,
    });
  }
  if (password !== password2) {
    return res.status(400).render("join", {
      pageTitle: "Join",
      errorMessagePassword: "Password confirmation does not match.",
      name,
      username,
      email,
      location,
    });
  }
  const exists = await User.exists({ $and: [{ username }, { email }] });
  if (exists) {
    return res.status(400).render("join", {
      pageTitle: "Join",
      errorMessageUsername: "This username is already taken.",
      errorMessageEmail: "This email is already taken.",
      name,
      username,
      email,
      location,
    });
  }
  const usernameExists = await User.exists({ username });
  if (usernameExists) {
    return res.status(400).render("join", {
      pageTitle: "Join",
      errorMessageUsername: "This username is already taken.",
      name,
      username,
      email,
      location,
    });
  }
  const emailExists = await User.exists({ email });
  if (emailExists) {
    return res.status(400).render("join", {
      pageTitle: "Join",
      errorMessageEmail: "This email is already taken.",
      name,
      username,
      email,
      location,
    });
  }
  try {
    await User.create({
      name,
      username,
      email,
      password,
      location,
    });
    return res.redirect("/login");
  } catch (error) {
    return res.status(400).render("join", {
      pageTitle: "Join",
      errorMessage: error._message,
      name,
      username,
      email,
      password,
      location,
    });
  }
};
export const getLogin = (req, res) =>
  res.render("login", { pageTitle: "Login" });
export const postLogin = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, socialOnly: false });
  if (!user) {
    return res.status(400).render("login", {
      pageTitle: "Login",
      errorMessage: "An account with this username does not exists.",
      username,
    });
  }
  // check if password correct
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(400).render("login", {
      pageTitle: "Login",
      errorMessage: "Wrong password.",
      username,
    });
  }
  req.session.loggedIn = true;
  req.session.user = user;
  return res.redirect("/");
};
export const startGithubLogin = (req, res) => {
  const baseUrl = "https://github.com/login/oauth/authorize";
  const config = {
    client_id: process.env.GH_CLIENT,
    allow_signup: false,
    scope: "read:user user:email",
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  return res.redirect(finalUrl);
};
export const finishGithubLogin = async (req, res) => {
  const baseUrl = "https://github.com/login/oauth/access_token";
  const config = {
    client_id: process.env.GH_CLIENT,
    client_secret: process.env.GH_SECRET,
    code: req.query.code,
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  const tokenRequest = await (
    await fetch(finalUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    })
  ).json();
  if ("access_token" in tokenRequest) {
    const { access_token } = tokenRequest;
    const apiUrl = "https://api.github.com";
    const userData = await (
      await fetch(`${apiUrl}/user`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    const emailData = await (
      await fetch(`${apiUrl}/user/emails`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    const emailObj = emailData.find(
      (email) => email.primary === true && email.verified === true
    );
    if (!emailObj) {
      return res.redirect("/login");
    }
    let user = await User.findOne({ email: emailObj.email });
    if (!user) {
      user = await User.create({
        avatarUrl: userData.avatar_url,
        name: userData.name,
        username: userData.login,
        email: emailObj.email,
        password: "",
        socialOnly: true,
        location: userData.location,
      });
    }
    req.session.loggedIn = true;
    req.session.user = user;
    return res.redirect("/");
  } else {
    return res.redirect("/login");
  }
};
export const getEditProfile = (req, res) => {
  return res.render("edit-profile", { pageTitle: "Edit Profile" });
};
export const postEditProfile = async (req, res) => {
  // ????????? ???????????? ??????
  if (req.session.user.socialOnly) {
    const {
      session: {
        user: { _id, avatarUrl },
      },
      body: { name, username, location },
      file,
    } = req;
    // username ???????????? ?????? ????????? ??????????????? ??????
    if (req.session.user.username === username) {
      const updateUser = await User.findByIdAndUpdate(
        _id,
        {
          avatarUrl: file ? file.path : avatarUrl,
          name,
          location,
        },
        { new: true }
      );
      req.session.user = updateUser;
      return res.redirect("/users/edit");
    }
    // username??? ??????????????? ??????(db??? ?????? username)
    if (req.session.user.username !== username) {
      const exists = await User.exists({ username });
      if (exists) {
        return res.status(400).render("edit-profile", {
          pageTitle: "Edit Profile",
          errorMessageUsername: "This username is already taken.",
          name,
          username,
          location,
        });
      } else {
        const updateUser = await User.findByIdAndUpdate(
          _id,
          {
            avatarUrl: file ? file.path : avatarUrl,
            name,
            username,
            location,
          },
          { new: true }
        );
        req.session.user = updateUser;
        return res.redirect("/users/edit");
      }
    }
  }
  // ?????? ???????????? ??????
  const {
    session: {
      user: { _id, avatarUrl },
    },
    body: { name, email, username, location },
    file,
  } = req;
  // email, username ???????????? ??????
  if (
    req.session.user.email === email &&
    req.session.user.username === username
  ) {
    const updateUser = await User.findByIdAndUpdate(
      _id,
      {
        avatarUrl: file ? file.path : avatarUrl,
        name,
        location,
      },
      { new: true }
    );
    req.session.user = updateUser;
    return res.redirect("/users/edit");
  }
  // email ???????????? username ???????????? ??????
  if (
    req.session.user.email === email &&
    req.session.user.username !== username
  ) {
    const exists = await User.exists({ username });
    if (exists) {
      return res.status(400).render("edit-profile", {
        pageTitle: "Edit Profile",
        errorMessageUsername: "This username is already taken.",
        name,
        email,
        username,
        location,
      });
    }
    const updateUser = await User.findByIdAndUpdate(
      _id,
      {
        avatarUrl: file ? file.path : avatarUrl,
        name,
        username,
        location,
      },
      { new: true }
    );
    req.session.user = updateUser;
    return res.redirect("/users/edit");
  }
  // username ???????????? email ???????????? ??????
  if (
    req.session.user.email !== email &&
    req.session.user.username === username
  ) {
    const exists = await User.exists({ email });
    if (exists) {
      return res.status(400).render("edit-profile", {
        pageTitle: "Edit Profile",
        errorMessageEmail: "This email is already taken.",
        name,
        email,
        username,
        location,
      });
    }
    const updateUser = await User.findByIdAndUpdate(
      _id,
      {
        avatarUrl: file ? file.path : avatarUrl,
        name,
        email,
        location,
      },
      { new: true }
    );
    req.session.user = updateUser;
    return res.redirect("/users/edit");
  }
  // email, username ?????? ???????????? ??????
  if (
    req.session.user.email !== email &&
    req.session.user.username !== username
  ) {
    const existsEamil = await User.exists({ email });
    const existsUsername = await User.exists({ username });
    if (existsEamil && existsUsername) {
      return res.status(400).render("edit-profile", {
        pageTitle: "Edit Profile",
        errorMessageEmail: "This email is already taken.",
        errorMessageUsername: "This username is already taken.",
        name,
        email,
        username,
        location,
      });
    }
    if (existsEamil) {
      return res.status(400).render("edit-profile", {
        pageTitle: "Edit Profile",
        errorMessageEmail: "This email is already taken.",
        name,
        email,
        username,
        location,
      });
    }
    if (existsUsername) {
      return res.status(400).render("edit-profile", {
        pageTitle: "Edit Profile",
        errorMessageUsername: "This username is already taken.",
        name,
        email,
        username,
        location,
      });
    }
    const updateUser = await User.findByIdAndUpdate(
      _id,
      {
        avatarUrl: file ? file.path : avatarUrl,
        name,
        email,
        username,
        location,
      },
      { new: true }
    );
    req.session.user = updateUser;
    return res.redirect("/users/edit");
  }
};
export const logout = (req, res) => {
  req.session.destroy();
  return res.redirect("/");
};

export const getChangePassword = (req, res) => {
  if (req.session.user.socialOnly === true) {
    return res.redirect("/");
  }
  return res.render("users/change-password", { pageTitle: "Change Password" });
};

export const postChangePassword = async (req, res) => {
  const {
    session: {
      user: { _id, password },
    },
    body: { oldPassword, newPassword, newPasswordConfirmation },
  } = req;
  const ok = await bcrypt.compare(oldPassword, password);
  if (!ok) {
    return res.status(400).render("users/change-password", {
      pageTitle: "Change Password",
      errorMessage: "The current password is incorrect",
    });
  }
  if (newPassword !== newPasswordConfirmation) {
    return res.status(400).render("users/change-password", {
      pageTitle: "Change Password",
      errorMessage: "The password does not match the confirmation",
    });
  }
  const user = await User.findById(_id);
  user.password = newPassword;
  await user.save();
  req.session.user.password = user.password;
  // send notification
  return res.redirect("/");
};

export const see = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).populate({
    path: "videos",
    populate: {
      path: "owner",
      model: "User",
    },
  });
  if (!user) {
    return res.status(404).render("404", { pageTitle: "User not found." });
  }
  return res.render("users/profile", {
    pageTitle: user.name,
    user,
  });
};
