import mongoose from 'mongoose';

const siteStatusSchema = new mongoose.Schema({
  isOpen: { type: Boolean, default: true },
  closedMessage: { type: String, default: 'We are currently closed. Please check back later!' },
  reopenTime: { type: Date, default: null },
  // Operating hours
  operatingHoursEnabled: { type: Boolean, default: true },
  operatingHours: {
    start: { type: String, default: '12:00' }, // 12:00 PM
    end: { type: String, default: '23:00' }    // 11:00 PM
  },
  outsideHoursMessage: { 
    type: String, 
    default: 'We accept orders only between 12:00 PM to 11:00 PM. Please visit us during our operating hours!' 
  }
});

siteStatusSchema.statics.get = async function() {
  let status = await this.findOne();
  if (!status) status = await this.create({});
  return status;
};

// Helper method to check if current time is within operating hours
siteStatusSchema.methods.isWithinOperatingHours = function() {
  if (!this.operatingHoursEnabled) return true;
  
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false,
    timeZone: 'Asia/Kolkata'
  });
  
  const [startHour, startMin] = this.operatingHours.start.split(':').map(Number);
  const [endHour, endMin] = this.operatingHours.end.split(':').map(Number);
  const [currentHour, currentMin] = currentTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const currentMinutes = currentHour * 60 + currentMin;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

export default mongoose.model('SiteStatus', siteStatusSchema);
