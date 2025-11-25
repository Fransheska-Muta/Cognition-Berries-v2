import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { API_CONFIG, getAuthHeaders, handleAuthError } from "../../config/api";
import "./ExtraMaterial.css";

function ExtraMaterial() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = await getAuthHeaders().catch((error) => {
        console.error("❌ Failed to get auth headers:", error);
        throw new Error("Authentication failed");
      });

      console.log("🔐 Auth headers obtained, fetching books...");

      const response = await fetch(`${API_CONFIG.BASE_URL}/material-books`, {
        headers,
      });

      console.log("📡 Response status:", response.status);

      if (response.status === 401) {
        console.error("❌ 401 Unauthorized - redirecting to login");
        alert("Your session has expired. Please log in again.");
        handleAuthError(navigate);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Fetch failed:", errorData);
        throw new Error(errorData.error || "Failed to fetch books");
      }

      const data = await response.json();
      console.log("✅ Books fetched successfully:", data.length, "books");
      console.log("📊 Books with images:", data.filter(b => b.displayImage).length);
      console.log("📊 Books without images:", data.filter(b => !b.displayImage).length);
      setBooks(data);
    } catch (err) {
      console.error("❌ Error fetching books:", err);
      setError(err.message || "Failed to load books. Please try again later.");

      if (err.message === "Authentication failed") {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const addToCart = async (book) => {
    try {
      const headers = await getAuthHeaders().catch(() => null);
      if (!headers) {
        alert("Please log in to add items to cart");
        navigate("/login");
        return;
      }

      const cartResponse = await fetch(`${API_CONFIG.BASE_URL}/cart`, { headers });
      if (cartResponse.status === 401) {
        handleAuthError(navigate);
        return;
      }

      let currentCart = [];
      if (cartResponse.ok) {
        currentCart = await cartResponse.json();
      }

      const existingItem = currentCart.find(item =>
        item.productId === (book._id || book.book_id) || item.title === book.title
      );

      if (existingItem) {
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

  const getBookImage = (book) => {
    if (book.displayImage) {
      console.log(`📷 Using displayImage for: ${book.title}`);
      return book.displayImage;
    }

    if (book.coverImageUrl) {
      console.log(`📷 Using coverImageUrl for: ${book.title}`);
      return book.coverImageUrl;
    }

    if (book.imageUrl) {
      console.log(`📷 Using imageUrl for: ${book.title}`);
      return `${API_CONFIG.BASE_URL}${book.imageUrl}`;
    }

    console.log(`📷 Using placeholder for: ${book.title}`);
    return './Books.png';
  };

  return (
    <>
      <Navbar />
      <div className="extra-material-container">
        <div className="extra-material-header">
          <h1 className="page-title">Extra Material</h1>
          <p className="page-subtitle">Expand your learning with our curated collection</p>
        </div>

        {error && (
          <div className="error-container">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
              <button onClick={fetchBooks} className="retry-button">
                Retry
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading books...</p>
          </div>
        ) : books.length === 0 && !error ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <p className="empty-text">No books available at the moment.</p>
            <p className="empty-subtext">Check back soon for new additions!</p>
          </div>
        ) : (
          <div className="books-grid">
            {books.map((book) => (
              <div key={book._id || book.book_id} className="book-card">
                <Link to={`/extra-material/${book._id || book.book_id}`} className="book-link">
                  <div className="book-image-container">
                    <img
                      src={getBookImage(book)}
                      alt={book.title}
                      className="book-image"
                      onError={(e) => {
                        console.log(`❌ Image failed to load for "${book.title}", using placeholder`);
                        e.target.onerror = null;
                        e.target.src = './Books.png';
                      }}
                    />
                    {book.hasImage && (
                      <div className="no-image-badge">
                        📷 No Image
                      </div>
                    )}
                    {book.isPremium && (
                      <div className="premium-badge">
                        ✨ Premium
                      </div>
                    )}
                  </div>
                </Link>

                <div className="book-content">
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">By {book.author || "Unknown Author"}</p>

                  {book.description && (
                    <p className="book-description">{book.description}</p>
                  )}

                  <div className="book-meta">
                    {book.category && (
                      <span className="book-category">{book.category}</span>
                    )}
                    {book.pages && (
                      <span className="book-pages">{book.pages} pages</span>
                    )}
                  </div>

                  <div className="book-footer">
                    <p className="book-price">R{book.price || 0}</p>
                    <Link
                      to={`/extra-material/${book._id || book.book_id}`}
                      className="view-more-button"
                    >
                      View Details
                    </Link>

                    <button
                      onClick={() => addToCart(book)}
                      className="add-to-cart-button"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="cart-link-container">
          <Link to="/cart" className="cart-link">
            <span className="cart-icon">🛒</span>
            <span>View Cart</span>
          </Link>
        </div>
      </div>
      <Footer/>
    </>
  );
}

export default ExtraMaterial;