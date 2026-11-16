import { useLocation, useNavigate } from "react-router";

// Starts the current flight step over: navigates to the same URL with the same route state
// (what the step began with), replacing the history entry. App keys its routes on the
// location, so the view mounts afresh and every bit of its local state resets.
const useRedo = () => {
  const navigate = useNavigate();
  const { pathname, search, state } = useLocation();
  return () => navigate(pathname + search, { state, replace: true });
};

export default useRedo;
