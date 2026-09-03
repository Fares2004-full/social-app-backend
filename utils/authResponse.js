
import { generateAccessToken, generateRefreshToken } from "./generateJWT.js";

 const issueAuthTokens = async (user, res) => {
  const payload = {
    email: user.email,
    id: user._id,
    role: user.role,
  };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save();

  return { accessToken, refreshToken };
};

export { issueAuthTokens };