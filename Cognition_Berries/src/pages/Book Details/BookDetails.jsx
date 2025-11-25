import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getAuthHeaders, API_CONFIG, handleAuthError } from "../../config/api";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./BookDetail.css";

function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders().catch(() => null);
        if (!headers) {
          handleAuthError(navigate);
          return;
        }

        const res = await fetch(`${API_CONFIG.BASE_URL}/material-books/${id}`, { headers });

        if (res.status === 401) {
          handleAuthError(navigate);
          return;
        }

        if (!res.ok) {
          if (res.status === 404) throw new Error("Book not found");
          throw new Error("Failed to fetch book");
        }

        const data = await res.json();
        setBook(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load book");
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id, navigate]);

  // ADD TO CART FUNCTION - This was missing!
  const addToCart = async (book) => {
    try {
      const headers = await getAuthHeaders().catch(() => null);
      if (!headers) {
        alert("Please log in to add items to cart");
        navigate("/login");
        return;
      }

      // First, check if item already exists in cart
      const cartResponse = await fetch(`${API_CONFIG.BASE_URL}/cart`, { headers });
      
      if (cartResponse.status === 401) {
        handleAuthError(navigate);
        return;
      }

      let currentCart = [];
      if (cartResponse.ok) {
        currentCart = await cartResponse.json();
      }

      // Check if book already in cart
      const existingItem = currentCart.find(item =>
        item.productId === (book._id || book.book_id) || item.title === book.title
      );

      if (existingItem) {
        // Update quantity
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
        // Add new item
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

  if (loading) return <p className="loading">Loading...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!book) return null;

  return (
    <>
      <Navbar />
      <div className="book-detail-container">
        <div className="book-detail-content">
          <div className="book-image-wrapper">
            <img
              src={getBookImage(book)}
              alt={book.title}
              className="book-cover-image"
              onError={(e) => {
                console.log(`❌ Image failed to load for "${book.title}", using placeholder`);
                e.target.onerror = null;
                e.target.src = './Books.png';
              }}
            />
            {book.isPremium && (
              <div className="premium-badge">
                ✨ Premium
              </div>
            )}
          </div>

          <div className="book-info">
            <h1 className="book-title">{book.title}</h1>

            <div className="book-meta">
              <p className="book-author">
                <strong>Author:</strong> {book.author || "Unknown Author"}
              </p>
              {book.category && (
                <p className="book-category-tag">
                  <strong>Category:</strong> {book.category}
                </p>
              )}
              {book.pages && (
                <p className="book-pages-info">
                  <strong>Pages:</strong> {book.pages}
                </p>
              )}
              {book.price !== undefined && (
                <p className="book-price-info">
                  <strong>Price:</strong> R{book.price}
                </p>
              )}
            </div>

            <div className="book-description">
              <h2>Description</h2>
              <p>{book.description || "No description available."}</p>
            </div>

            <div className="book-actions">
              {book.downloadUrl && (
                <a
                  href={book.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="download-btn"
                >
                  📥 Download Book
                </a>
              )}
              <Link to="/extra-material" className="back-link">
                ← Back to All Books
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
      </div>
      <Footer />
    </>
  );
}

export default BookDetail;