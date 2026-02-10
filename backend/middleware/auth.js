export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Please login to access this resource' });
};

export const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Please login first' });
  }
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export const isCustomer = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Please login first' });
  }
  if (req.user.role !== 'Customer') {
    return res.status(403).json({ message: 'Customer access required' });
  }
  next();
};

export const isDelivery = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Please login first' });
  }
  if (req.user.role !== 'Delivery') {
    return res.status(403).json({ message: 'Delivery person access required' });
  }
  next();
};