import React from 'react';

const NutritionLabel = ({ sku, nutritionImageUrl, nutritionImageWebpUrl }) => {
    if(!nutritionImageUrl) {
        return null;
    }

    return (
        <div className="nutrition-label">
          <h3>Nutrition Facts</h3>
          <picture>
            {nutritionImageWebpUrl && (
              <source srcSet={nutritionImageWebpUrl} type="image/webp" />
            )}
            <img 
              src={nutritionImageUrl} 
              alt={`Nutrition Facts for ${sku}`}
              loading="lazy"
              width="280" 
              height="auto"
            />
          </picture>
        </div>
      );
}

export default NutritionLabel;