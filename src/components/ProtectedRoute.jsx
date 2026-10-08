import { Navigate } from "react-router-dom";
import { getSession } from "../api/api";

export default function ProtectedRoute(props) {
  const token = getSession("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return props.children;
}
