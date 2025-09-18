import axios from "axios";

// this was the first version, we just changed it at the end of the tutorial
// const BASE_URL =
//   import.meta.env.MODE === "development"
//     ? "https://online-meeting-3.onrender.com"
//     : "https://slack-backend-lime.vercel.app/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
