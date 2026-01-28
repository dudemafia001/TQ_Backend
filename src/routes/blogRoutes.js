import express from 'express';
import Blog from '../models/Blog.js';

const router = express.Router();

// Public Routes - Get all published blogs
router.get('/public', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tag, search } = req.query;
    const query = { isPublished: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by tag
    if (tag) {
      query.tags = tag;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const blogs = await Blog.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content -likedBy'); // Don't send full content in listing

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

// Get single blog by slug (public)
router.get('/public/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ 
      slug: req.params.slug, 
      isPublished: true 
    });

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Increment view count
    blog.views += 1;
    await blog.save();

    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: 'Error fetching blog', error: error.message });
  }
});

// Like/Unlike blog post
router.post('/public/:slug/like', async (req, res) => {
  try {
    const { userId } = req.body; // Can be user ID or session ID
    const blog = await Blog.findOne({ 
      slug: req.params.slug, 
      isPublished: true 
    });

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const hasLiked = blog.likedBy.includes(userId);

    if (hasLiked) {
      // Unlike
      blog.likes = Math.max(0, blog.likes - 1);
      blog.likedBy = blog.likedBy.filter(id => id !== userId);
    } else {
      // Like
      blog.likes += 1;
      blog.likedBy.push(userId);
    }

    await blog.save();

    res.json({ 
      likes: blog.likes, 
      hasLiked: !hasLiked 
    });
  } catch (error) {
    console.error('Error liking blog:', error);
    res.status(500).json({ message: 'Error liking blog', error: error.message });
  }
});

// Get related blogs
router.get('/public/:slug/related', async (req, res) => {
  try {
    const currentBlog = await Blog.findOne({ 
      slug: req.params.slug, 
      isPublished: true 
    });

    if (!currentBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Find blogs with similar tags or category
    const relatedBlogs = await Blog.find({
      isPublished: true,
      _id: { $ne: currentBlog._id },
      $or: [
        { category: currentBlog.category },
        { tags: { $in: currentBlog.tags } }
      ]
    })
    .sort({ publishedAt: -1 })
    .limit(3)
    .select('-content -likedBy');

    res.json(relatedBlogs);
  } catch (error) {
    console.error('Error fetching related blogs:', error);
    res.status(500).json({ message: 'Error fetching related blogs', error: error.message });
  }
});

// Get popular blogs
router.get('/public/popular/top', async (req, res) => {
  try {
    const popularBlogs = await Blog.find({ isPublished: true })
      .sort({ likes: -1, views: -1 })
      .limit(5)
      .select('-content -likedBy');

    res.json(popularBlogs);
  } catch (error) {
    console.error('Error fetching popular blogs:', error);
    res.status(500).json({ message: 'Error fetching popular blogs', error: error.message });
  }
});

export default router;
