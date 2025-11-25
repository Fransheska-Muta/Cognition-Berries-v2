import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Star, CheckCircle2 } from "lucide-react";
import { publicApiRequest } from "../../config/api";
import './FeedbackCarousel.css'


function FeedbackCarousel() {
  const [reviews, setReviews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef(null);



  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await publicApiRequest("/review", { method: "GET" });
        if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
        const data = await response.json();

        // Debug: log the data structure
        console.log("Reviews data:", data);

        // Flatten nested reviews structure
        let allReviews = data.map(review => ({
          ...review,
          courseName: review.courseName || "Unknown Course"
        }));

        console.log("Flattened reviews:", allReviews);

        console.log("Flattened reviews:", allReviews);
        if (allReviews.length > 0) {
          console.log("Sample review object:", allReviews[0]);
        }

        // Filter out reviews with no content
        const validReviews = allReviews.filter(review => {
          const hasContent =
            review.review ||
            review.comment ||
            review.title ||
            review.text ||
            review.content ||
            review.message ||
            review.reviewText;

          const hasName =
            review.studentName ||
            review.name ||
            review.username ||
            review.user ||
            review.student;

          return hasContent && hasName;
        });


        setReviews(validReviews);
        setError(null);
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setError(err.message || "Failed to load reviews");
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  // Autoplay functionality
  useEffect(() => {
    const startAuto = () => {
      stopAuto();
      if (reviews.length > 1) {
        intervalRef.current = setInterval(() => {
          handleNext();
        }, 6000);
      }
    };

    const stopAuto = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    startAuto();
    return () => stopAuto();
  }, [reviews, currentIndex]);

  const handlePrev = () => {
    if (isAnimating || reviews.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 600);
  };

  const handleNext = () => {
    if (isAnimating || reviews.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const stopAutoplay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startAutoplay = () => {
    if (!intervalRef.current && reviews.length > 1) {
      intervalRef.current = setInterval(() => handleNext(), 6000);
    }
  };

  const renderStars = (rating) => (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${i < rating
            ? "fill-amber-400 text-amber-400"
            : "fill-gray-200 text-gray-200"
            }`}
        />
      ))}
    </div>
  );

  // Get 3 visible cards for carousel effect
  const getVisibleCards = () => {
    if (reviews.length === 0) return [];
    if (reviews.length === 1) return [{ review: reviews[0], position: 0 }];
    if (reviews.length === 2) {
      return [
        { review: reviews[(currentIndex + reviews.length - 1) % reviews.length], position: -1 },
        { review: reviews[currentIndex], position: 0 }
      ];
    }

    const cards = [];
    for (let i = -1; i <= 1; i++) {
      let idx = currentIndex + i;
      if (idx < 0) idx = reviews.length + idx;
      if (idx >= reviews.length) idx = idx - reviews.length;
      cards.push({ review: reviews[idx], position: i });
    }
    return cards;
  };

  const visibleCards = getVisibleCards();

  // Loading state
  if (loading) {
    return (
      <div className="feedback-container">
        <div className="max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              What Our Students Say
            </h2>
            <p className="text-lg text-gray-600">Loading reviews...</p>
          </div>
          <div className="flex items-center justify-center carousel-height">
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
              <p className="text-gray-600">Loading student feedback...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="feedback-container">
        <div className="max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              What Our Students Say
            </h2>
          </div>
          <div className="flex items-center justify-center carousel-height">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md text-center">
              <div className="text-red-600 text-5xl mb-4">⚠</div>
              <h3 className="text-xl font-semibold text-red-900 mb-2">Unable to Load Reviews</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (reviews.length === 0) {
    return (
      <div className="feedback-container">
        <div className="max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              What Our Students Say
            </h2>
          </div>
          <div className="flex items-center justify-center carousel-height">
            <div className="bg-white rounded-2xl p-8 max-w-md text-center">
              <div className="text-gray-400 text-5xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
              <p className="text-gray-600">Be the first to share your experience!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className="feedback-container"
      aria-label="User feedback carousel"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
    >
      <div className="max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            What Our Students Say
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover why thousands of learners trust us with their education journey
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative carousel-height mb-12">
          {/* Cards */}
          <div className="cards-stage">
            {visibleCards.map(({ review, position }) => {
              const isCenter = position === 0;
              const isLeft = position === -1;

              return (
                <div
                  key={`${review._id || review.id || review.studentName}-${position}`}
                  className="absolute transition-all card-wrapper"
                  style={{
                    transform: `translateX(${position * 400}px) scale(${isCenter ? 1 : 0.85})`,
                    opacity: isCenter ? 1 : 0.4,
                    zIndex: isCenter ? 30 : isLeft ? 20 : 10,
                    pointerEvents: isCenter ? 'auto' : 'none'
                  }}
                >
                  <div className="bg-white rounded-2xl p-8 shadow-2xl card-width card-height flex flex-col">
                    {/* Rating */}
                    <div className="mb-4">{renderStars(review.rating)}</div>

                    {/* Title */}
                    {review.title && (
                      <h3 className="title">
                        {review.title}
                      </h3>
                    )}

                    {/* Review Text */}
                    <p className="comment">
                      "{review.review || review.comment || 'No review text available'}"
                    </p>

                    {/* Reviewer Info */}
                    <div className="reviewer">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="reviewer-name">
                              {review.studentName || review.name}
                            </p>
                            {review.verified && (
                              <span className="verified-badge">
                                <CheckCircle2 className="w-4 h-4" />
                                Verified
                              </span>
                            )}
                          </div>
                          {review.courseName && (
                            <p className="reviewer-role">{review.courseName}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Buttons - Only show if more than 1 review */}
          {reviews.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                disabled={isAnimating}
                className="nav-btn nav-prev"
                aria-label="Previous review"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={handleNext}
                disabled={isAnimating}
                className="nav-btn nav-next"
                aria-label="Next review"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Dots Indicator - Only show if more than 1 review */}
        {reviews.length > 1 && (
          <div className="dots-wrap">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (!isAnimating && idx !== currentIndex) {
                    setIsAnimating(true);
                    setCurrentIndex(idx);
                    setTimeout(() => setIsAnimating(false), 600);
                  }
                }}
                className={`dot ${currentIndex === idx ? 'active' : ''}`}
                aria-label={`Go to review ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default FeedbackCarousel;