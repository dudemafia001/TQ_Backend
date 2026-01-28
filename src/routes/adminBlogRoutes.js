import express from 'express';
import Blog from '../models/Blog.js';

const router = express.Router();

// Middleware to verify admin (you should already have this)
const verifyAdmin = (req, res, next) => {
  // Add your admin verification logic here
  // For now, assuming you have this implemented
  next();
};

// Get all blogs (admin)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};

    if (status === 'published') {
      query.isPublished = true;
    } else if (status === 'draft') {
      query.isPublished = false;
    }

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Blog.countDocuments(query);

    res.json({
      blogs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalBlogs: count
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Error fetching blogs', error: error.message });
  }
});

// Get single blog (admin)
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: 'Error fetching blog', error: error.message });
  }
});

// Create blog (admin)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const blogData = req.body;

    // Generate slug if not provided
    if (!blogData.slug && blogData.title) {
      blogData.slug = blogData.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
    }

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug: blogData.slug });
    if (existingBlog) {
      blogData.slug = `${blogData.slug}-${Date.now()}`;
    }

    const blog = new Blog(blogData);
    await blog.save();

    res.status(201).json({ message: 'Blog created successfully', blog });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ message: 'Error creating blog', error: error.message });
  }
});

// Update blog (admin)
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const blogData = req.body;
    
    // If slug is changed, check for uniqueness
    if (blogData.slug) {
      const existingBlog = await Blog.findOne({ 
        slug: blogData.slug, 
        _id: { $ne: req.params.id } 
      });
      if (existingBlog) {
        return res.status(400).json({ message: 'Slug already exists' });
      }
    }

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      blogData,
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json({ message: 'Blog updated successfully', blog });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: 'Error updating blog', error: error.message });
  }
});

// Delete blog (admin)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: 'Error deleting blog', error: error.message });
  }
});

// Toggle publish status (admin)
router.patch('/:id/toggle-publish', verifyAdmin, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    blog.isPublished = !blog.isPublished;
    if (blog.isPublished && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }
    await blog.save();

    res.json({ 
      message: `Blog ${blog.isPublished ? 'published' : 'unpublished'} successfully`, 
      blog 
    });
  } catch (error) {
    console.error('Error toggling publish status:', error);
    res.status(500).json({ message: 'Error toggling publish status', error: error.message });
  }
});

// Get blog statistics (admin)
router.get('/stats/overview', verifyAdmin, async (req, res) => {
  try {
    const totalBlogs = await Blog.countDocuments();
    const publishedBlogs = await Blog.countDocuments({ isPublished: true });
    const draftBlogs = await Blog.countDocuments({ isPublished: false });
    const totalViews = await Blog.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);
    const totalLikes = await Blog.aggregate([
      { $group: { _id: null, total: { $sum: '$likes' } } }
    ]);

    res.json({
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      totalViews: totalViews[0]?.total || 0,
      totalLikes: totalLikes[0]?.total || 0
    });
  } catch (error) {
    console.error('Error fetching blog stats:', error);
    res.status(500).json({ message: 'Error fetching blog stats', error: error.message });
  }
});

export default router;
