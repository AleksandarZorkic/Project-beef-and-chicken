import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import RoleProtectedRoute from "./auth/RoleProtectedRoute";
import { AppRoles } from "./auth/roles";

import { CartProvider } from "./state/cart/CartContext";

import AppLayout from "./components/layout/AppLayout";
import HomeLayout from "../src/pages/home/HomeLayout";

import HomePage from "./pages/home/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MenuPage from "./pages/MenuPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import CustomerProfilePage from "./pages/CustomerProfilePage";
import ProfileAllergensPage from "./pages/ProfileAllergensPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import AllergensPage from "./pages/AllergensPage";

import AddressesPage from "./components/address/AddressesPage";

import AdminDishesPage from "./pages/AdminDishesPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminDishOptionsPage from "./pages/AdminDishOptionsPage";
import AdminOrdersHistoryPage from "./pages/AdminOrdersHistoryPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminCategoriesPage from "./pages/AdminCategoriesPage";
import AdminAnnouncementsPage from "./pages/AdminAnnouncementsPage";
import AdminRestaurantSettingsPage from "./pages/AdminRestaurantSettingsPage";

import CourierOrdersPage from "./pages/CourierOrdersPage";

function HomeShell() {
  return (
    <HomeLayout>
      <Outlet />
    </HomeLayout>
  );
}

function AppShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Public home page with its own header and footer */}
            <Route element={<HomeShell />}>
              <Route index element={<HomePage />} />
            </Route>

            {/* Public authentication pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Application pages with AppLayout */}
            <Route element={<AppShell />}>
              <Route path="/menu" element={<MenuPage />} />

              {/* Customer routes */}
              <Route
                element={
                  <RoleProtectedRoute allowedRoles={[AppRoles.Customer]} />
                }
              >
                <Route path="/profile" element={<CustomerProfilePage />} />

                <Route path="/cart" element={<CartPage />} />

                <Route path="/checkout" element={<CheckoutPage />} />

                <Route path="/addresses" element={<AddressesPage />} />

                <Route path="/my-orders" element={<MyOrdersPage />} />

                <Route
                  path="/my-allergens"
                  element={<ProfileAllergensPage />}
                />

                <Route
                  path="/success/:orderId"
                  element={<OrderSuccessPage />}
                />
              </Route>

              {/* Admin-only routes */}
              <Route
                element={<RoleProtectedRoute allowedRoles={[AppRoles.Admin]} />}
              >
                <Route
                  path="/admin/announcements"
                  element={<AdminAnnouncementsPage />}
                />

                <Route
                  path="/admin/restaurant-settings"
                  element={<AdminRestaurantSettingsPage />}
                />

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

              {/* Admin and employee routes */}
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

              {/* Courier routes */}
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
