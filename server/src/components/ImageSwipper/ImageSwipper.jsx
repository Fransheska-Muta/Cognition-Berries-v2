import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import './imageSwipper.css'

const ImageSwipper = () => {
  return (
    <Swiper
      modules={[Pagination, Autoplay]}
      pagination={{ clickable: true }}
      autoplay={{ delay: 4500, disableOnInteraction: false }}
      loop
      className="cb-swiper"
    >
      <SwiperSlide>
        <div
          className="cb-slide"
          style={{ backgroundImage: "url('/Reflective-Pendant-Light-in-Study-Room.png')" }}
        >
          <div className="cb-scrim" />
          <div className="cb-cta">
            <p>Building Knowledge</p>
            <p>Creating Bright Futures</p>
          </div>
        </div>
      </SwiperSlide>
      <SwiperSlide>
        <div
          className="cb-slide"
          style={{ backgroundImage: "url('/Reflective-Pendant-Light-in-Study-Room.png')" }}
        >
          <div className="cb-scrim" />
          <div className="cb-cta">
            <p>Learn Smarter</p>
            <p>Invest with Confidence</p>
          </div>
        </div>
      </SwiperSlide>
      <SwiperSlide>
        <div
          className="cb-slide"
          style={{ backgroundImage: "url('/Reflective-Pendant-Light-in-Study-Room.png')" }}
        >
          <div className="cb-scrim" />
          <div className="cb-cta">
            <p>Practical Lessons</p>
            <p>Real‑World Skills</p>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
  );
}

export default ImageSwipper