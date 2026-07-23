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
import AdminOrdersPage from "./pages/AdminOrdersPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import AdminDishOptionsPage from "./pages/AdminDishOptionsPage";
import CourierOrdersPage from "./pages/CourierOrdersPage";
import AdminOrdersHistoryPage from "./pages/AdminOrdersHistoryPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminCategoriesPage from "./pages/AdminCategoriesPage";

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
                <Route path="/my-orders" element={<MyOrdersPage />} />
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
                <Route
                  path="/admin/categories"
                  element={<AdminCategoriesPage />}
                />
                <Route path="/allergens" element={<AllergensPage />} />
                <Route
                  path="/admin/dish-options"
                  element={<AdminDishOptionsPage />}
                />
              </Route>

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={[AppRoles.Admin, AppRoles.Employee]}
                  />
                }
              >
                <Route
                  path="/admin/dashboard"
                  element={<AdminDashboardPage />}
                />
                <Route path="/admin/orders" element={<AdminOrdersPage />} />
                <Route
                  path="/admin/orders/history"
                  element={<AdminOrdersHistoryPage />}
                />
              </Route>
              <Route
                element={
                  <RoleProtectedRoute allowedRoles={[AppRoles.Courier]} />
                }
              >
                <Route path="/courier/orders" element={<CourierOrdersPage />} />
              </Route>
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
