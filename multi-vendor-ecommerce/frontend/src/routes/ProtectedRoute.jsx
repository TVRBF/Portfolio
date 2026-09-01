import { Navigate } from "react-router-dom";

const ProtectedRoute = ({
  children,
  user,
  role,
}) => {

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (role && user.user.role !== role) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;