import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import LoginPage from "../pages/login/LoginPage.jsx";
import AppLayout from "../common/layouts/AppLayout.jsx";
import DashboardPage from "../pages/dashboard/DashboardPage.jsx";
import OnboardMerchantPage from "../pages/onboard/OnboardMerchantPage.jsx";
import UserManagementPage from "../pages/user-management/UserManagementPage.jsx";
import CreateUserPage from "../pages/user-management/CreateUserPage.jsx";
import TerminalsPage from "../pages/terminals/TerminalsPage.jsx";
import CreateTerminalPage from "../pages/terminals/CreateTerminalPage.jsx";
import MerchantPage from "../pages/onboard/MerchantPage.jsx";
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
      {
        element: <AppLayout />,
        children: [
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          {
            path: "users",
            element: <UserManagementPage />,
          },
          {
            path: "users/create",
            element: <CreateUserPage />,
          },
          {
            path: "terminals",
            element: <TerminalsPage />,
          },
          {
            path: "terminals/create",
            element: <CreateTerminalPage />,
          },
          {
            path:"merchants",
            element:<MerchantPage/>
          },
           {
            path: "merchants/onboard",
            element: <OnboardMerchantPage />,
          },
        ],
      },
    ],
  },
]);

export default router;
