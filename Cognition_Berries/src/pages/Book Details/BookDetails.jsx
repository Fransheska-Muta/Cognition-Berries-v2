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
          // If unauthenticated, redirect to login
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

  if (loading) return <p className="loading">Loading...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!book) return null;

  return (
    <>
      <Navbar />
      <div className="book-detail-container">
        <h1>{book.title}</h1>
        <p><strong>Author:</strong> {book.author}</p>
        <p><strong>Description:</strong> {book.description}</p>
        {book.downloadUrl && (
          <a href={book.downloadUrl} target="_blank" rel="noopener noreferrer">
            Download Book
          </a>
        )}
        <Link to="/extra-material" className="back-link">Back to All Books</Link>
      </div>
      <Footer />
    </>
  );
}

export default BookDetail;
