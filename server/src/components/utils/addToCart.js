// utils/addToCart.js
export const addToCart = (product) => {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  // Check if product already exists
  const existingItemIndex = cart.findIndex((item) => item._id === product._id);

  if (existingItemIndex !== -1) {
    // If product exists, just update quantity
    cart[existingItemIndex].quantity += 1;
  } else {
    // Else, add new product with quantity 1
    cart.push({ ...product, quantity: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
};
