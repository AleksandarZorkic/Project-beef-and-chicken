import { BrowserRouter, Routes, Route, useOutlet } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import RoleProtectedRoute from "./auth/RoleProtectedRoute";
import { AppRoles } from "./auth/roles";

import MenuPage from "./pages/MenuPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import AddressesPage from "./components/address/AddressesPage";
import AppLayout from "./components/layout/AppLayout";
import { CartProvider } from "./state/cart/CartContext";
import AllergensPage from "./pages/AllergensPage";
import ProfileAllergensPage from "./pages/ProfileAllergensPage";
import AdminDishesPage from "./pages/AdminDishesPage";
import AdminUsersPage from "./pages/AdminUsersPage";

function AppShell() {
  const outlet = useOutlet();
  return <AppLayout>{outlet}</AppLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<AppShell />}>
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/cart" element={<CartPage />} />

              <Route element={<ProtectedRoute />}>
                <Route
                  path="/my-allergens"
                  element={<ProfileAllergensPage />}
                />
              </Route>

              <Route
                element={
                  <RoleProtectedRoute allowedRoles={[AppRoles.Customer]} />
                }
              >
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/addresses" element={<AddressesPage />} />
                <Route
                  path="/success/:orderId"
                  element={<OrderSuccessPage />}
                />
              </Route>

              <Route
                element={<RoleProtectedRoute allowedRoles={[AppRoles.Admin]} />}
              >
                <Route path="/admin/dishes" element={<AdminDishesPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/allergens" element={<AllergensPage />} />
              </Route>
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
