// Debug route
router.get('/check-session', (req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated(),
    sessionID: req.sessionID,
    user: req.user ? {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
    } : null,
    cookie: req.headers.cookie,
    session: req.session,
  });
});
