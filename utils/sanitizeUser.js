const sanitizeUser = (user) => {
  const userObj = user.toObject();

  delete userObj.password;
  delete userObj.refreshToken;
  delete userObj.__v;

  return userObj;
};

export default sanitizeUser;
