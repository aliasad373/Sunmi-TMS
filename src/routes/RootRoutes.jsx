import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import LoginPage from "../pages/login/LoginPage.jsx";
import AppLayout from "../common/layouts/AppLayout.jsx";
import DashboardPage from "../pages/dashboard/DashboardPage.jsx";
import OnboardMerchantPage from "../pages/onboard/OnboardMerchantPage.jsx";
import UserManagementPage from "../pages/user-management/UserManagementPage.jsx";
import CreateUserPage from "../pages/user-management/CreateUserPage.jsx";
import OrganizationPage from "../pages/user-management/OrganizationPage.jsx";
import ReportsPage from "../pages/user-management/ReportsPage.jsx";
import TerminalsPage from "../pages/terminals/TerminalsPage.jsx";
import CreateTerminalPage from "../pages/terminals/CreateTerminalPage.jsx";
import TerminalReportingPage from "../pages/terminals/TerminalReportingPage.jsx";
import MerchantPage from "../pages/onboard/MerchantPage.jsx";
import ReportingPage from "../pages/reporting/ReportingPage.jsx";
import MerchantDailyTransactionsPage from "../pages/reporting/MerchantDailyTransactionsPage.jsx";
import MerchantReportsPage from "../pages/reporting/MerchantReportsPage.jsx";
import TerminalReportsPage from "../pages/reporting/TerminalReportsPage.jsx";
import QrReportsPage from "../pages/reporting/QrReportsPage.jsx";
import UserReportsPage from "../pages/reporting/UserReportsPage.jsx";
import PortfolioReportPage from "../pages/reporting/PortfolioReportPage.jsx";
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
            path: "users/organization",
            element: <OrganizationPage />,
          },
          {
            path: "users/reports",
            element: <ReportsPage />,
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
            path: "terminals/reporting",
            element: <TerminalReportingPage />,
          },
          {
            path: "reporting",
            element: <ReportingPage />,
          },
          {
            path: "merchant-daily-transactions",
            element: <MerchantDailyTransactionsPage />,
          },
          {
            path: "merchant-reports",
            element: <MerchantReportsPage />,
          },
          {
            path: "terminal-reports",
            element: <TerminalReportsPage />,
          },
          {
            path: "qr-reports",
            element: <QrReportsPage />,
          },
          {
            path: "user-reports",
            element: <UserReportsPage />,
          },
          {
            path: "portfolio-report",
            element: <PortfolioReportPage />,
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
