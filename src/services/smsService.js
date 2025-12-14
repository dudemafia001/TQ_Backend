import axios from 'axios';

const SMS_API_KEY = '4b46a2ad8c9ea30dfe9a38e423164c3890618';
const SMS_API_URL = 'https://apihome.in/panel/api/bulksms/';

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via SMS API
 * @param {string} mobile - 10-digit mobile number
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<boolean>} Success status
 */
export const sendOTP = async (mobile, otp) => {
  try {
    const url = `${SMS_API_URL}?key=${SMS_API_KEY}&mobile=${mobile}&otp=${otp}`;
    
    console.log(`Sending OTP ${otp} to mobile: ${mobile}`);
    
    const response = await axios.get(url, {
      timeout: 10000 // 10 second timeout
    });
    
    console.log('SMS API Response:', response.data);
    
    // Check if the API call was successful
    // Adjust this based on the actual API response structure
    if (response.status === 200) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('SMS sending error:', error.message);
    if (error.response) {
      console.error('API Error Response:', error.response.data);
    }
    throw new Error('Failed to send OTP');
  }
};

/**
 * Validate mobile number format
 * @param {string} mobile - Mobile number to validate
 * @returns {boolean} Valid or not
 */
export const validateMobileNumber = (mobile) => {
  // Accepts 10-digit Indian mobile numbers
  const mobileRegex = /^[6-9][0-9]{9}$/;
  return mobileRegex.test(mobile);
};
