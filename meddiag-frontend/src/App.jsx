import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import useAuthStore from "./store/useAuthStore";
import { getMe } from "./api/auth";

import PrivateRoute from "./components/common/PrivateRoute";
import AdminLayout from "./components/common/AdminLayout";
import DoctorLayout from "./components/common/DoctorLayout";
import PatientLayout from "./components/common/PatientLayout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Patient pages
import PatientDashboard from "./pages/patient/Dashboard";
import Upload from "./pages/patient/Upload";
import ImageList from "./pages/patient/ImageList";
import ImageDetail from "./pages/patient/ImageDetail";
import PatientChat from "./pages/patient/Chat";
import PatientAppointments from "./pages/patient/Appointments";
import PatientNotifications from "./pages/patient/Notifications";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import AssignImages from "./pages/admin/AssignImages";
import AdminNotifications from "./pages/admin/Notifications";
import AdminAppointments from "./pages/admin/Appointments";

// Doctor pages
import DoctorDashboard from "./pages/doctor/Dashboard";
import CaseList from "./pages/doctor/CaseList";
import CaseDetail from "./pages/doctor/CaseDetail";
import DoctorChat from "./pages/doctor/Chat";
import DoctorAppointments from "./pages/doctor/Appointments";
import DoctorNotifications from "./pages/doctor/Notifications";

export default function App() {
  const { accessToken, setUser } = useAuthStore();

  useEffect(() => {
    if (accessToken) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => {});
    }
  }, [accessToken, setUser]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<Navigate to="/patient" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* PATIENT */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<PatientDashboard />} />
          <Route
            path="upload"
            element={
              <PrivateRoute roles={["patient"]}>
                <Upload />
              </PrivateRoute>
            }
          />
          <Route
            path="images"
            element={
              <PrivateRoute roles={["patient"]}>
                <ImageList />
              </PrivateRoute>
            }
          />
          <Route
            path="images/:id"
            element={
              <PrivateRoute roles={["patient"]}>
                <ImageDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="chat"
            element={
              <PrivateRoute roles={["patient"]}>
                <PatientChat />
              </PrivateRoute>
            }
          />
          <Route
            path="appointments"
            element={
              <PrivateRoute roles={["patient"]}>
                <PatientAppointments />
              </PrivateRoute>
            }
          />
          <Route
            path="notifications"
            element={
              <PrivateRoute roles={["patient"]}>
                <PatientNotifications />
              </PrivateRoute>
            }
          />
        </Route>

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <PrivateRoute roles={["admin"]}>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="images" element={<AssignImages />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="appointments" element={<AdminAppointments />} />
        </Route>

        {/* DOCTOR - Đã cập nhật từ Bước 13 */}
        <Route
          path="/doctor"
          element={
            <PrivateRoute roles={["doctor"]}>
              <DoctorLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<DoctorDashboard />} />
          <Route path="cases" element={<CaseList />} />
          <Route path="cases/:id" element={<CaseDetail />} />
          <Route path="chat" element={<DoctorChat />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="notifications" element={<DoctorNotifications />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
