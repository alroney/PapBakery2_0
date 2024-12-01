import React, { useState } from 'react';
import './StarRating.css';

// StarRating component
const StarRating = ({ rating, onRatingChange }) => {
    const [hover, setHover] = useState(0);

    return (
        <div className="star-rating">
            {[...Array(5)].map((star, index) => {
                index += 1;
                return (
                    <button
                        type="button"
                        key={index}
                        className={index <= (hover || rating) ? "on" : "off"} //If index is less than or equal to hover or rating, set class to 'on', else 'off'.
                        onClick={() => onRatingChange(index)}
                        onMouseEnter={() => setHover(index)}
                        onMouseLeave={() => setHover(rating)}
                    >
                        <span className="star">&#9733;</span>
                    </button>
                );
            })}
        </div>
    );
};

export default StarRating;