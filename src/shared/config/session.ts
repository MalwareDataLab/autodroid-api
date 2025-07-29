import { SessionOptions } from "express-session";

const getSessionConfig = (): SessionOptions => {
  return {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  };
};

export { getSessionConfig };
