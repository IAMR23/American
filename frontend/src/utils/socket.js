import { io } from "socket.io-client";
import { API_URL } from "../config";
import { getToken } from "./auth";

const token = getToken();

export const socket = io(API_URL, {
  auth: {
    token,
    userId: token ? JSON.parse(atob(token.split(".")[1])).userId : null,
  },
});
