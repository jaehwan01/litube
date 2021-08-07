export const localsMiddleware = (req, res, next) => {
  res.locals.loggedIn = Boolean(req.session.loggedIn);
  res.locals.siteName = "Litube";
  res.locals.loggedInUser = req.session.user || {};
  console.log(req.session.user);
  next();
};
//only login => next()
export const protectorMiddleware = (req, res, next) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  next();
};
//only logout => next()
export const publicOnlyMiddleware = (req, res, next) => {
  if (!req.session.loggedIn) {
    return next();
  }
  return res.redirect("/");
};
