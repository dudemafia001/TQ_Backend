import express from 'express';
import SiteStatus from '../models/SiteStatus.js';

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const status = await SiteStatus.get();
    res.json({ success: true, data: { isOpen: status.isOpen, closedMessage: status.closedMessage } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/update', async (req, res) => {
  try {
    const { isOpen, closedMessage } = req.body;
    let status = await SiteStatus.get();
    status.isOpen = isOpen;
    if (closedMessage) status.closedMessage = closedMessage;
    await status.save();
    res.json({ success: true, message: `Site ${isOpen ? 'opened' : 'closed'}`, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
