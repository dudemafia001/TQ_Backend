import mongoose from 'mongoose';

const siteStatusSchema = new mongoose.Schema({
  isOpen: { type: Boolean, default: true },
  closedMessage: { type: String, default: 'We are currently closed. Please check back later!' },
  reopenTime: { type: Date, default: null }
});

siteStatusSchema.statics.get = async function() {
  let status = await this.findOne();
  if (!status) status = await this.create({});
  return status;
};

export default mongoose.model('SiteStatus', siteStatusSchema);
