// Test coupon discount calculation logic
// This simulates what happens in the frontend

const coupons = [
  {
    code: "FIRSTORDER",
    discount_type: "percent",
    discount_value: 20,
    max_discount: 200,
    min_purchase_amount: 500
  },
  {
    code: "FEAST",
    discount_type: "percent",
    discount_value: 15,
    max_discount: 250,
    min_purchase_amount: 1000
  },
  {
    code: "FLAT50",
    discount_type: "flat",
    discount_value: 50,
    max_discount: null,
    min_purchase_amount: 400
  }
];

function calculateDiscount(coupon, subtotal) {
  let discount = 0;
  
  if (coupon.discount_type === 'percent') {
    // Calculate percentage discount
    discount = (subtotal * coupon.discount_value) / 100;
    
    // Apply max_discount cap if specified
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
  } else {
    // Fixed discount (flat amount)
    discount = coupon.discount_value;
  }
  
  // Ensure discount doesn't exceed subtotal
  discount = Math.min(discount, subtotal);
  
  return discount;
}

// Test scenarios
console.log("=== COUPON DISCOUNT TESTS ===\n");

// Test 1: FIRSTORDER with ₹600 order (20% = ₹120, below max ₹200)
console.log("Test 1: FIRSTORDER on ₹600 order");
console.log("Expected: ₹120 (20% of 600)");
console.log("Actual:", calculateDiscount(coupons[0], 600));
console.log("✓ Should be ₹120\n");

// Test 2: FIRSTORDER with ₹1500 order (20% = ₹300, but max is ₹200)
console.log("Test 2: FIRSTORDER on ₹1500 order");
console.log("Expected: ₹200 (capped at max_discount)");
console.log("Actual:", calculateDiscount(coupons[0], 1500));
console.log("✓ Should be ₹200, NOT ₹300\n");

// Test 3: FEAST with ₹2000 order (15% = ₹300, but max is ₹250)
console.log("Test 3: FEAST on ₹2000 order");
console.log("Expected: ₹250 (capped at max_discount)");
console.log("Actual:", calculateDiscount(coupons[1], 2000));
console.log("✓ Should be ₹250, NOT ₹300\n");

// Test 4: FEAST with ₹1200 order (15% = ₹180, below max ₹250)
console.log("Test 4: FEAST on ₹1200 order");
console.log("Expected: ₹180 (15% of 1200)");
console.log("Actual:", calculateDiscount(coupons[1], 1200));
console.log("✓ Should be ₹180\n");

// Test 5: FLAT50 on ₹500 order
console.log("Test 5: FLAT50 on ₹500 order");
console.log("Expected: ₹50 (flat discount)");
console.log("Actual:", calculateDiscount(coupons[2], 500));
console.log("✓ Should be ₹50\n");

console.log("=== ALL TESTS COMPLETED ===");
