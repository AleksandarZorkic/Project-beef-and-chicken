import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MenuPage from "./pages/MenuPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import AppLayout from "./components/layout/AppLayout";
import { CartProvider } from "./state/cart/CartContext";

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/menu" replace />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/success/ :orderId" element={<OrderSuccessPage />} />
          </Routes>
        </AppLayout>
      </CartProvider>
    </BrowserRouter>
  );
}
