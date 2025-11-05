import express from 'express';
import ContactMessage from '../models/ContactMessage.js';

const router = express.Router();

// POST /api/contact - Submit a new contact message
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required fields'
      });
    }

    // Create new contact message
    const contactMessage = new ContactMessage({
      name,
      email,
      phone: phone || '',
      subject,
      message
    });

    await contactMessage.save();

    console.log('New contact message received:', {
      name,
      email,
      subject,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully! We will get back to you soon.',
      data: {
        id: contactMessage._id,
        timestamp: contactMessage.createdAt
      }
    });

  } catch (error) {
    console.error('Error submitting contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
});

// GET /api/contact - Get all contact messages (for admin)
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    // Build filter query
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch messages with pagination
    const messages = await ContactMessage.find(filter)
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalMessages = await ContactMessage.countDocuments(filter);
    const totalPages = Math.ceil(totalMessages / parseInt(limit));

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMessages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// GET /api/contact/:id - Get single contact message
router.get('/:id', async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    res.json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Error fetching contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message'
    });
  }
});

// PATCH /api/contact/:id/status - Update message status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const messageId = req.params.id;

    const validStatuses = ['new', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const updateData = { status };
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const updatedMessage = await ContactMessage.findByIdAndUpdate(
      messageId,
      updateData,
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    console.log('Contact message status updated:', {
      id: messageId,
      status,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Message status updated successfully',
      data: updatedMessage
    });

  } catch (error) {
    console.error('Error updating contact message status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message status'
    });
  }
});

// GET /api/contact/stats/summary - Get contact message statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await ContactMessage.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalMessages = await ContactMessage.countDocuments();
    
    // Format stats for easier frontend consumption
    const formattedStats = {
      total: totalMessages,
      new: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: formattedStats
    });

  } catch (error) {
    console.error('Error fetching contact message stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

export default router;