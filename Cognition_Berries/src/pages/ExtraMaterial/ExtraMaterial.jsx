import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import { API_CONFIG, getAuthHeaders, handleAuthError } from "../../config/api";
import "./ExtraMaterial.css";

function ExtraMaterial() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // ✅ Add this
  const navigate = useNavigate();

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      // ✅ FIX: use /material-books instead of /material-courses
      const response = await fetch(`${API_CONFIG.BASE_URL}/material-books`, {
        headers,
      });

      if (!response.ok) throw new Error("Failed to fetch materials");
      const data = await response.json();
      setBooks(data); // ✅ FIX: use setBooks instead of setMaterials
    } catch (err) {
      console.error("Error fetching materials:", err);
      setError("Failed to load materials."); // ✅ FIX: now defined
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const addToCart = async (book) => {
    try {
      // await the auth headers
      const headers = await getAuthHeaders().catch(() => null);
      if (!headers) {
        alert("Please log in to add items to cart");
        navigate("/login");
        return;
      }

      // Get current cart items to check for duplicates
      const cartResponse = await fetch(`${API_CONFIG.BASE_URL}/cart`, { headers });
      if (cartResponse.status === 401) {
        handleAuthError(navigate);
        return;
      }

      let currentCart = [];
      if (cartResponse.ok) {
        currentCart = await cartResponse.json();
      }

      // Check if item already exists in cart
      const existingItem = currentCart.find(item =>
        item.productId === (book._id || book.book_id) || item.title === book.title
      );

      if (existingItem) {
        // Update quantity of existing item
        const updateResponse = await fetch(`${API_CONFIG.BASE_URL}/cart/${existingItem._id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            quantity: (existingItem.quantity || 1) + 1
          }),
        });

        if (updateResponse.status === 401) {
          handleAuthError(navigate);
          return;
        }

        if (!updateResponse.ok) {
          throw new Error("Failed to update cart item");
        }

        alert(`${book.title} quantity updated in cart!`);
      } else {
        // Add new item to cart
        const addResponse = await fetch(`${API_CONFIG.BASE_URL}/cart`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: book.title,
            price: book.price || 0,
            author: book.author || "Unknown",
            description: book.description || "",
            quantity: 1,
            productId: book._id || book.book_id
          }),
        });

        if (addResponse.status === 401) {
          handleAuthError(navigate);
          return;
        }

        if (!addResponse.ok) {
          const errorData = await addResponse.json();
          throw new Error(errorData.error || "Failed to add item to cart");
        }

        alert(`${book.title} added to cart!`);
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert(`Error adding item to cart: ${err.message}`);
    }
  };

  return (
    <>
      <Navbar />
      <div className="extra-material">
        <h2 className="page-title">📚 Extra Material</h2>

        {loading ? (
          <p>Loading books...</p>
        ) : books.length === 0 ? (
          <p>No books available at the moment.</p>
        ) : (
          <div className="books-grid">
            {books.map((book) => (
              <div key={book._id || book.book_id} className="book-card">
                <Link to={`/extra-material/${book._id || book.book_id}`}>
                  <img src='./Books.png' alt={book.title} style={{ cursor: "pointer" }} />
                </Link>
                <h3>{book.title}</h3>
                <p>{book.description}</p>
                <p className="author">By: {book.author}</p>
                <p className="price">R{book.price}</p>
                <button onClick={() => addToCart(book)}>Add to Cart</button>
              </div>
            ))}
          </div>
        )}

        <div className="cart-link">
          <Link to="/cart">🛒 Go to Cart</Link>
        </div>
      </div>
    </>
  );
}

export default ExtraMaterial;