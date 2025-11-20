// src/Providers.jsx
import { CartProvider } from "./Context/CartContext";
import AppContextProvider from "./Context/AppContext";

export default function Providers({ children }) {
  return (
    <AppContextProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AppContextProvider>
  );
}
