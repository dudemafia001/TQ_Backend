import express from 'express';
import SiteStatus from '../models/SiteStatus.js';

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const status = await SiteStatus.get();
    const isWithinHours = status.isWithinOperatingHours();
    const canAcceptOrders = status.isOpen && isWithinHours;
    
    res.json({ 
      success: true, 
      data: { 
        isOpen: status.isOpen,
        closedMessage: status.closedMessage,
        reopenTime: status.reopenTime,
        operatingHoursEnabled: status.operatingHoursEnabled,
        operatingHours: status.operatingHours,
        outsideHoursMessage: status.outsideHoursMessage,
        isWithinOperatingHours: isWithinHours,
        canAcceptOrders: canAcceptOrders
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/update', async (req, res) => {
  try {
    const { 
      isOpen, 
      closedMessage, 
      reopenTime, 
      operatingHoursEnabled,
      operatingHours,
      outsideHoursMessage 
    } = req.body;
    
    let status = await SiteStatus.get();
    status.isOpen = isOpen;
    if (closedMessage) status.closedMessage = closedMessage;
    if (reopenTime !== undefined) status.reopenTime = reopenTime;
    if (operatingHoursEnabled !== undefined) status.operatingHoursEnabled = operatingHoursEnabled;
    if (operatingHours) status.operatingHours = operatingHours;
    if (outsideHoursMessage) status.outsideHoursMessage = outsideHoursMessage;
    
    await status.save();
    
    const isWithinHours = status.isWithinOperatingHours();
    
    res.json({ 
      success: true, 
      message: `Site ${isOpen ? 'opened' : 'closed'}`, 
      data: {
        ...status.toObject(),
        isWithinOperatingHours: isWithinHours,
        canAcceptOrders: status.isOpen && isWithinHours
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
